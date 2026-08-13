import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SystemHeartbeatManifest {
  schemaVersion: number;
  generatedAt: string;
  status: "healthy" | "degraded" | "critical";
  summary: { passed: number; warned: number; failed: number };
  checks: Array<{ id: string; status: "pass" | "warn" | "fail"; evidence: unknown }>;
  prioritizedActions: Array<{ priority: string; check: string; action: string }>;
  boundaries: { externalActions: "denied"; canonicalQueueWrite: false };
}

export interface SystemHeartbeatEvidence {
  manifest: SystemHeartbeatManifest;
  outputHash: string;
}

export function isSystemHeartbeatRequest(prompt: string): boolean {
  return /\b(?:system\s+)?heartbeat\b/i.test(prompt);
}

function isHeartbeatManifest(value: unknown): value is SystemHeartbeatManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<SystemHeartbeatManifest>;
  return manifest.schemaVersion === 1
    && typeof manifest.generatedAt === "string"
    && ["healthy", "degraded", "critical"].includes(manifest.status ?? "")
    && typeof manifest.summary?.passed === "number"
    && typeof manifest.summary?.warned === "number"
    && typeof manifest.summary?.failed === "number"
    && Array.isArray(manifest.checks)
    && Array.isArray(manifest.prioritizedActions)
    && manifest.boundaries?.externalActions === "denied"
    && manifest.boundaries?.canonicalQueueWrite === false;
}

export async function captureSystemHeartbeat(): Promise<SystemHeartbeatEvidence> {
  const projectRoot = process.cwd();
  const scriptPath = path.join(projectRoot, "scripts", "run-system-heartbeat.mjs");
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1_048_576,
  });
  const manifest = JSON.parse(stdout) as unknown;
  if (!isHeartbeatManifest(manifest)) {
    throw new Error("The local system heartbeat returned an invalid evidence manifest.");
  }
  const outputHash = createHash("sha256").update(JSON.stringify(manifest)).digest("hex").slice(0, 12);
  return { manifest, outputHash };
}

export function heartbeatPromptEvidence(evidence: SystemHeartbeatEvidence): string {
  const { manifest, outputHash } = evidence;
  return [
    "ROCKBOT-VERIFIED SYSTEM HEARTBEAT",
    "Rockbot already executed the fixed local heartbeat in its trusted host runtime. Do not rerun it inside the model sandbox.",
    `Evidence hash: sha256:${outputHash}`,
    JSON.stringify({
      generatedAt: manifest.generatedAt,
      status: manifest.status,
      summary: manifest.summary,
      checks: manifest.checks,
      prioritizedActions: manifest.prioritizedActions,
      boundaries: manifest.boundaries,
    }, null, 2),
  ].join("\n");
}
