import path from "node:path";
import type { PermissionMode } from "@/lib/contracts";

const secretPatterns: Array<[RegExp, string]> = [
  [/\b(?:sk|xai)-[A-Za-z0-9_-]{16,}\b/gi, "API credential"],
  [/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{16,}\b/gi, "GitHub credential"],
  [/\bBearer\s+[A-Za-z0-9._~-]{16,}\b/gi, "bearer token"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi, "private key"],
  [/\b(?:password|passwd|api[_ -]?key|access[_ -]?token)\s*[:=]\s*\S{8,}/gi, "secret field"],
];

function canonical(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLocaleLowerCase("en-US") : resolved;
}

export function allowedRoots(): string[] {
  const configured = process.env.ROCKBOT_ALLOWED_ROOTS
    ?? "C:\\Users\\dillo\\Documents\\Codex;C:\\Users\\dillo\\repos";
  return configured.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => path.resolve(entry));
}

export function assertAllowedWorkingDirectory(workingDirectory: string): string {
  const target = path.resolve(workingDirectory);
  const normalized = canonical(target);
  const permitted = allowedRoots().some((root) => {
    const normalizedRoot = canonical(root);
    return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}${path.sep}`);
  });
  if (!permitted) {
    throw new Error("The working directory is outside Rockbot's allowlisted local roots.");
  }
  return target;
}

export function assertPromptHasNoLikelySecret(prompt: string): void {
  for (const [pattern, label] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(prompt)) {
      throw new Error(`Rockbot stopped before transmission because the prompt appears to contain a ${label}. Remove the secret and reference its approved locator instead.`);
    }
  }
}

export function redact(value: string): string {
  let result = value;
  for (const [pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, "[REDACTED]");
  }
  result = result.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
  return result;
}

export function governancePrompt(permissionMode: PermissionMode): string {
  return [
    "ROCKBOT OPERATING CONTRACT",
    "You are a bounded specialist working for Codex acting as Marketing Chief.",
    "Codex remains the only canonical queue writer and final verifier.",
    `Authority for this run: ${permissionMode === "observe" ? "observe and propose only" : "workspace edits inside the exact working directory only"}.`,
    "Do not send, post, publish, deploy, spend, change an account, change permissions, delete broadly, expose secrets, or mutate a canonical queue.",
    "Fail closed when required evidence is unavailable. Never estimate missing facts.",
    "Return outcome, work performed, evidence paths, checks, uncertainty, approval state, next owner, and exactly: external action attempted = none.",
  ].join("\n");
}
