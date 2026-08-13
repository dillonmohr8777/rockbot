import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type { ProviderBoundary, ProviderChunk, ProviderContext, ProviderResult } from "@/lib/providers/types";
import { redact } from "@/lib/orchestrator/safety";

export function resolveCommand(name: string): string | undefined {
  const finder = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(finder, [name], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return undefined;
  const candidates = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (process.platform === "win32") {
    const commandShim = candidates.find((candidate) => /\.cmd$/i.test(candidate));
    if (commandShim && name === "codex") {
      const targetTriple = process.arch === "arm64" ? "aarch64-pc-windows-msvc" : "x86_64-pc-windows-msvc";
      const platformPackage = process.arch === "arm64" ? "codex-win32-arm64" : "codex-win32-x64";
      const nativeCodex = path.join(
        path.dirname(commandShim),
        "node_modules",
        "@openai",
        "codex",
        "node_modules",
        "@openai",
        platformPackage,
        "vendor",
        targetTriple,
        "bin",
        "codex.exe",
      );
      if (existsSync(nativeCodex)) return nativeCodex;
    }
    const executable = candidates.find((candidate) => /\.exe$/i.test(candidate));
    if (executable) return executable;

    if (commandShim && name === "claude") {
      const nativeClaude = path.join(path.dirname(commandShim), "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
      if (existsSync(nativeClaude)) return nativeClaude;
    }
    return undefined;
  }
  return candidates[0];
}

export function commandVersion(command: string): string | undefined {
  const result = spawnSync(command, ["--version"], { encoding: "utf8", windowsHide: true, timeout: 5_000 });
  const value = `${result.stdout ?? ""} ${result.stderr ?? ""}`.trim();
  return value ? redact(value.split(/\r?\n/)[0]).slice(0, 120) : undefined;
}

export function extractEventText(value: unknown, depth = 0): string[] {
  if (depth > 6 || value == null) return [];
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((entry) => extractEventText(entry, depth + 1));
  if (typeof value !== "object") return [];

  const object = value as Record<string, unknown>;
  const preferred = ["text", "content", "message", "delta", "output_text", "final_output"];
  for (const key of preferred) {
    if (key in object) {
      const found = extractEventText(object[key], depth + 1);
      if (found.length) return found;
    }
  }
  const containers = ["item", "result", "data", "payload", "response"];
  for (const key of containers) {
    if (key in object) {
      const found = extractEventText(object[key], depth + 1);
      if (found.length) return found;
    }
  }
  return [];
}

export function extractProviderFailure(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const object = value as Record<string, unknown>;
  const type = String(object.type ?? object.event ?? "");
  const error = String(object.error ?? "");
  const status = Number(object.api_error_status ?? 0);
  const rateLimitInfo = object.rate_limit_info && typeof object.rate_limit_info === "object"
    ? object.rate_limit_info as Record<string, unknown>
    : undefined;
  if (
    type === "rate_limit_event"
    || error === "rate_limit"
    || status === 429
    || String(rateLimitInfo?.status ?? "") === "rejected"
  ) {
    return "The provider is authenticated, but its current usage or spend limit is exhausted.";
  }
  if (object.is_error === true && typeof object.result === "string") return redact(object.result).slice(0, 500);
  if (type === "error" && typeof object.message === "string") {
    const message = redact(object.message).slice(0, 500);
    if (!/skills context budget/i.test(message)) return message;
  }
  return undefined;
}

function activityLabel(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const object = value as Record<string, unknown>;
  const rawType = String(object.type ?? object.event ?? object.kind ?? "");
  if (/tool|command|exec|reasoning|thinking|plan/i.test(rawType)) {
    return rawType.replaceAll("_", " ").slice(0, 120);
  }
  return undefined;
}

export async function* runJsonLineCommand(
  command: string,
  args: string[],
  context: ProviderContext,
  stdinText: string,
  boundary: ProviderBoundary,
): AsyncGenerator<ProviderChunk, ProviderResult> {
  const childEnv = { ...process.env };
  delete childEnv.CODEX_THREAD_ID;
  const child = spawn(command, args, {
    cwd: context.workingDirectory,
    env: childEnv,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    shell: false,
  });
  const abort = () => child.kill();
  context.signal?.addEventListener("abort", abort, { once: true });

  child.stdin.end(stdinText, "utf8");
  const stderr: Buffer[] = [];
  child.stderr.on("data", (chunk: Buffer) => {
    if (stderr.reduce((sum, entry) => sum + entry.length, 0) < 16_000) stderr.push(chunk);
  });

  let finalText = "";
  let terminalError: string | undefined;
  const workspaceChanges: NonNullable<ProviderResult["workspaceChanges"]> = [];
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as unknown;
      terminalError ??= extractProviderFailure(event);
      if (event && typeof event === "object") {
        const object = event as Record<string, unknown>;
        const item = object.item && typeof object.item === "object" ? object.item as Record<string, unknown> : undefined;
        const itemType = String(item?.type ?? "");
        if (itemType === "error" && typeof item?.message === "string" && /skills context budget/i.test(item.message)) {
          continue;
        }
        if (itemType === "command_execution" && item?.status === "declined") {
          terminalError ??= "The provider command was blocked by its execution policy.";
        }
        if (itemType === "file_change" && item?.status === "completed" && Array.isArray(item.changes)) {
          for (const change of item.changes) {
            if (!change || typeof change !== "object") continue;
            const entry = change as Record<string, unknown>;
            if (typeof entry.path !== "string") continue;
            const kind = entry.kind === "add" ? "created" : entry.kind === "delete" ? "deleted" : "modified";
            workspaceChanges.push({ path: entry.path, kind });
          }
        }
        if (itemType === "file_change" && (item?.status === "failed" || item?.status === "declined")) {
          terminalError ??= "The provider did not complete the requested workspace file change.";
        }
      }
      const texts = extractEventText(event).map(redact).filter((text) => text.length > 0);
      if (texts.length) {
        const content = texts.join("\n");
        finalText += content;
        yield { type: "delta", content };
      } else {
        const activity = activityLabel(event);
        if (activity) yield { type: "activity", content: activity };
      }
    } catch {
      const content = redact(line);
      finalText += `${content}\n`;
      yield { type: "delta", content };
    }
  }

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  context.signal?.removeEventListener("abort", abort);

  if (terminalError) throw new Error(terminalError);
  if (exitCode !== 0) {
    const errorText = redact(Buffer.concat(stderr).toString("utf8")).trim().slice(-2_000);
    throw new Error(terminalError || errorText || `Provider process exited with code ${exitCode}.`);
  }
  return { text: finalText.trim(), externalActionAttempted: false, boundary, workspaceChanges };
}
