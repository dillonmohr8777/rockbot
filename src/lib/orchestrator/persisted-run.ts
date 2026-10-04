import type { ProviderId } from "@/lib/contracts";

export interface PersistedRun {
  runId: string;
  localId: string;
  prompt: string;
  provider: ProviderId;
  model: string;
  agentId: string;
  startedAt: string;
}

export function parsePersistedRun(raw: string): PersistedRun | null {
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
  const fields = saved as Record<string, unknown>;
  if (typeof fields.runId !== "string" || !/^rb-[A-Za-z0-9-]+$/.test(fields.runId)) return null;
  const text = (value: unknown, fallback: string) => typeof value === "string" && value ? value : fallback;
  const provider = ["codex", "claude", "grok", "ollama", "demo"].find((candidate) => candidate === fields.provider) as ProviderId | undefined;
  const startedAt = typeof fields.startedAt === "string" && Number.isFinite(Date.parse(fields.startedAt))
    ? fields.startedAt
    : new Date().toISOString();

  return {
    runId: fields.runId,
    localId: text(fields.localId, `recovered-${fields.runId}`),
    prompt: text(fields.prompt, "Recover the interrupted Rockbot run"),
    provider: provider ?? "codex",
    model: text(fields.model, "default"),
    agentId: text(fields.agentId, "marketing-chief"),
    startedAt,
  };
}
