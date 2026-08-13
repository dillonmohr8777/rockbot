import { spawn, spawnSync } from "node:child_process";
import readline from "node:readline";
import { commandVersion, resolveCommand } from "@/lib/providers/command";
import { AsyncPushQueue } from "@/lib/providers/queue";
import { redact } from "@/lib/orchestrator/safety";
import type { ProviderAdapter, ProviderChunk, ProviderResult } from "@/lib/providers/types";

export const grokAdapter: ProviderAdapter = {
  id: "grok",
  async health() {
    const command = resolveCommand("grok");
    if (!command) {
      return { id: "grok", label: "Grok", state: "unavailable", installed: false, detail: "Grok Build was not found.", models: [], capabilities: ["chat", "reasoning"] };
    }
    const result = spawnSync(command, ["models"], { encoding: "utf8", windowsHide: true, timeout: 10_000 });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const models = [...output.matchAll(/^\s*[*-]\s+([A-Za-z0-9._:/-]+)/gm)].map((match) => ({ id: match[1], label: match[1] }));
    const needsAuth = /not authenticated|login/i.test(output);
    return {
      id: "grok",
      label: "Grok",
      state: needsAuth ? "needs_auth" : result.status === 0 ? "ready" : "offline",
      installed: true,
      version: commandVersion(command),
      detail: needsAuth ? "Installed; Grok Build needs its own local sign-in." : result.status === 0 ? "Authenticated through Grok Build." : "Installed, but provider health could not be confirmed.",
      models: models.length ? models : [{ id: "default", label: "Account default" }],
      capabilities: ["chat", "reasoning"],
    };
  },
  async *execute(context): AsyncGenerator<ProviderChunk, ProviderResult> {
    const command = resolveCommand("grok");
    if (!command) throw new Error("Grok Build is unavailable.");
    const args = ["--no-auto-update", "--permission-mode", "plan", "--no-memory"];
    if (context.model && context.model !== "default") args.push("--model", context.model);
    args.push("agent", "stdio");

    const processHandle = spawn(command, args, {
      cwd: context.workingDirectory,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    const queue = new AsyncPushQueue<ProviderChunk>();
    const pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
    const lines = readline.createInterface({ input: processHandle.stdout, crlfDelay: Infinity });
    let nextId = 1;
    let fullText = "";
    const stderr: Buffer[] = [];
    processHandle.stderr.on("data", (chunk: Buffer) => {
      if (stderr.reduce((sum, entry) => sum + entry.length, 0) < 12_000) stderr.push(chunk);
    });

    const request = (method: string, params: Record<string, unknown>, timeoutMs = 90_000) => {
      const id = nextId++;
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out.`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        processHandle.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });
    };

    lines.on("line", (line) => {
      try {
        const message = JSON.parse(line) as Record<string, unknown>;
        if (message.method === "session/update") {
          const params = message.params as Record<string, unknown> | undefined;
          const update = params?.update as Record<string, unknown> | undefined;
          const content = update?.content as Record<string, unknown> | undefined;
          if (update?.sessionUpdate === "agent_message_chunk" && typeof content?.text === "string") {
            const chunk = redact(content.text);
            fullText += chunk;
            queue.push({ type: "delta", content: chunk });
          } else if (typeof update?.sessionUpdate === "string") {
            queue.push({ type: "activity", content: update.sessionUpdate.replaceAll("_", " ") });
          }
          return;
        }
        if (typeof message.id === "number") {
          const entry = pending.get(message.id);
          if (!entry) return;
          clearTimeout(entry.timer);
          pending.delete(message.id);
          const rpcError = message.error as { message?: string } | undefined;
          if (rpcError) entry.reject(new Error(rpcError.message ?? "Grok ACP request failed."));
          else entry.resolve((message.result as Record<string, unknown>) ?? {});
        }
      } catch {
        // Ignore non-JSON protocol noise. Stderr is retained for bounded errors.
      }
    });

    const abort = () => processHandle.kill();
    context.signal?.addEventListener("abort", abort, { once: true });

    void (async () => {
      try {
        const init = await request("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
        const methods = new Set(((init.authMethods as Array<{ id?: string }> | undefined) ?? []).map((method) => method.id));
        const methodId = methods.has("cached_token") ? "cached_token" : process.env.XAI_API_KEY && methods.has("xai.api_key") ? "xai.api_key" : null;
        if (!methodId) throw new Error("Grok Build is installed but not authenticated. Run `grok login` in a human-controlled terminal first.");
        await request("authenticate", { methodId, _meta: { headless: true } });
        const session = await request("session/new", { cwd: context.workingDirectory, mcpServers: [] });
        const sessionId = session.sessionId;
        if (typeof sessionId !== "string") throw new Error("Grok ACP did not return a session ID.");
        await request("session/prompt", { sessionId, prompt: [{ type: "text", text: context.prompt }] }, 600_000);
        queue.close();
      } catch (error) {
        const fallback = redact(Buffer.concat(stderr).toString("utf8")).trim().slice(-1_500);
        queue.fail(error instanceof Error ? error : new Error(fallback || "Grok ACP failed."));
      } finally {
        lines.close();
        processHandle.kill();
      }
    })();

    for await (const chunk of queue) yield chunk;
    context.signal?.removeEventListener("abort", abort);
    return { text: fullText.trim(), externalActionAttempted: false, boundary: "grok_plan_no_tools" };
  },
};
