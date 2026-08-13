import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RunReceipt } from "@/lib/contracts";

const runsRoot = path.join(process.cwd(), "runtime", "runs");

function normalizeReceipt(stored: Partial<RunReceipt> & Pick<RunReceipt, "runId" | "outcome" | "provider" | "model" | "workingDirectory" | "permissionMode" | "agents" | "privacy" | "externalActionAttempted" | "canonicalQueueWrite" | "checks" | "approvalState" | "nextSafestAction" | "startedAt" | "completedAt">): RunReceipt {
  return {
    ...stored,
    schemaVersion: 2,
    artifactState: stored.artifactState ?? "none",
    artifacts: stored.artifacts,
    deliveryState: stored.deliveryState ?? "not_attempted",
    verificationState: stored.verificationState ?? "unverified",
  } satisfies RunReceipt;
}

async function ensureRoot() {
  await mkdir(runsRoot, { recursive: true });
}

export async function saveReceipt(receipt: RunReceipt): Promise<void> {
  await ensureRoot();
  const target = path.join(runsRoot, `${receipt.runId}.json`);
  const temp = `${target}.tmp`;
  await writeFile(temp, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  await rename(temp, target);
}

export async function getReceipt(runId: string): Promise<RunReceipt | undefined> {
  if (!/^rb-[A-Za-z0-9-]+$/.test(runId)) return undefined;
  await ensureRoot();
  try {
    const stored = JSON.parse(await readFile(path.join(runsRoot, `${runId}.json`), "utf8")) as Parameters<typeof normalizeReceipt>[0];
    return normalizeReceipt(stored);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function listReceipts(limit = 24): Promise<RunReceipt[]> {
  await ensureRoot();
  const files = (await readdir(runsRoot)).filter((file) => file.endsWith(".json")).sort().reverse().slice(0, limit);
  const receipts = await Promise.all(files.map(async (file) => {
    const stored = JSON.parse(await readFile(path.join(runsRoot, file), "utf8")) as Partial<RunReceipt> & Pick<RunReceipt, "runId" | "outcome" | "provider" | "model" | "workingDirectory" | "permissionMode" | "agents" | "privacy" | "externalActionAttempted" | "canonicalQueueWrite" | "checks" | "approvalState" | "nextSafestAction" | "startedAt" | "completedAt">;
    return normalizeReceipt(stored);
  }));
  return receipts.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
