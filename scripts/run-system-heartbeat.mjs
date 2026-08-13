import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const runtimeRoot = path.join(projectRoot, "runtime");
const checks = [];
const actions = [];

function record(id, status, evidence, action, priority = "medium") {
  checks.push({ id, status, evidence });
  if (action) actions.push({ priority, check: id, action });
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
}

function duplicates(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

const routinesDoc = await readJson("src/generated/routines.json");
const indexDoc = await readJson("src/generated/knowledge-index.json");
const workflow = await readJson("config/workflows/operating-team.json");
const heartbeatContract = await readJson("config/workflows/system-heartbeat.json");
const revenueLoop = await readJson("config/workflows/bounded-revenue-loop.json");
const agentSource = await readFile(path.join(projectRoot, "src/data/agents.ts"), "utf8");
const scheduleSource = await readFile(path.join(projectRoot, "src/data/schedules.ts"), "utf8");

const routines = routinesDoc.routines ?? [];
const routineIds = routines.map((routine) => routine.id);
const duplicateRoutineIds = duplicates(routineIds);
const expectedCadence = { daily: 26, weekly: 9, "weekly-twice": 2, monthly: 5, event: 12 };
const cadenceMatches = Object.entries(expectedCadence).every(([key, value]) => routinesDoc.cadence?.[key] === value);
record(
  "routine-registry",
  routines.length === 54 && new Set(routineIds).size === 54 && !duplicateRoutineIds.length && cadenceMatches ? "pass" : "fail",
  { count: routines.length, unique: new Set(routineIds).size, duplicates: duplicateRoutineIds, cadence: routinesDoc.cadence },
  routines.length === 54 && new Set(routineIds).size === 54 && !duplicateRoutineIds.length && cadenceMatches ? undefined : "Reconcile the generated routine registry with the sealed source manifest.",
  "critical",
);

const agentIds = [...agentSource.matchAll(/^\s{4}id:\s*"([^"]+)"/gm)].map((match) => match[1]);
const duplicateAgentIds = duplicates(agentIds);
const specialistIds = workflow.specialists ?? [];
const missingSpecialists = specialistIds.filter((id) => !agentIds.includes(id));
const agentRegistryPasses = agentIds.length === 22 && !duplicateAgentIds.length && agentIds.includes("marketing-chief") && !missingSpecialists.length;
record(
  "agent-registry",
  agentRegistryPasses ? "pass" : "fail",
  { count: agentIds.length, duplicates: duplicateAgentIds, canonicalOrchestrator: agentIds.includes("marketing-chief"), missingSpecialists },
  agentRegistryPasses ? undefined : "Remove shadow identities and restore every workflow specialist plus Marketing Chief to the agent registry.",
  "critical",
);

const scheduleIds = [...scheduleSource.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((match) => match[1]);
const duplicateScheduleIds = duplicates(scheduleIds);
record(
  "schedule-templates",
  scheduleIds.length === 12 && !duplicateScheduleIds.length ? "pass" : "fail",
  { count: scheduleIds.length, duplicates: duplicateScheduleIds, state: "recorded-template" },
  scheduleIds.length === 12 && !duplicateScheduleIds.length ? undefined : "Reconcile schedule templates and keep them clearly separated from live scheduler state.",
  "high",
);

const authorityPasses = workflow.orchestrator?.agent === "marketing-chief"
  && workflow.orchestrator?.canonical_queue_writer === true
  && workflow.orchestrator?.final_verifier === true
  && workflow.execution?.max_parallel === 3
  && workflow.execution?.max_evaluator_loops === 2
  && workflow.external_actions_default === "denied"
  && heartbeatContract.external_actions === "denied"
  && heartbeatContract.canonical_queue_write === false
  && revenueLoop.external_actions === "denied"
  && revenueLoop.canonical_queue_writer === "marketing-chief";
record(
  "authority-contract",
  authorityPasses ? "pass" : "fail",
  {
    orchestrator: workflow.orchestrator,
    maxParallel: workflow.execution?.max_parallel,
    maxEvaluatorLoops: workflow.execution?.max_evaluator_loops,
    externalActions: workflow.external_actions_default,
  },
  authorityPasses ? undefined : "Restore Marketing Chief authority, the three-specialist and two-loop caps, and denied external actions before another run.",
  "critical",
);

const sourceManifest = path.join(indexDoc.source_root, routinesDoc.source.relative_path);
try {
  const sourceBytes = await readFile(sourceManifest);
  const actualHash = createHash("sha256").update(sourceBytes).digest("hex");
  const sourceStats = await stat(sourceManifest);
  const ageHours = (Date.now() - sourceStats.mtimeMs) / 3_600_000;
  const hashMatches = actualHash === routinesDoc.source.sha256;
  record(
    "source-parity",
    hashMatches ? (ageHours <= 24 * 14 ? "pass" : "warn") : "fail",
    { source: sourceManifest, expectedHash: routinesDoc.source.sha256, actualHash, ageHours: Math.round(ageHours * 10) / 10 },
    !hashMatches ? "Regenerate the knowledge projection from the exact source manifest." : ageHours > 24 * 14 ? "Refresh or revalidate the source manifest before relying on it as current operating evidence." : undefined,
    hashMatches ? "medium" : "critical",
  );
} catch (error) {
  record("source-parity", "fail", { source: sourceManifest, error: error instanceof Error ? error.message : String(error) }, "Restore the recorded source manifest and rerun knowledge synchronization.", "critical");
}

const productAndDesign = await Promise.allSettled([
  stat(path.join(projectRoot, "PRODUCT.md")),
  stat(path.join(projectRoot, "DESIGN.md")),
  stat(path.join(projectRoot, ".impeccable/design.json")),
]);
const authorityFilesPass = productAndDesign.every((result) => result.status === "fulfilled");
record("product-design-authority", authorityFilesPass ? "pass" : "fail", { product: productAndDesign[0].status, design: productAndDesign[1].status, sidecar: productAndDesign[2].status }, authorityFilesPass ? undefined : "Restore the missing product or design authority file before expanding the system.", "high");

const receiptRoot = path.join(runtimeRoot, "runs");
let receiptFiles = [];
try {
  receiptFiles = (await readdir(receiptRoot)).filter((file) => file.endsWith(".json"));
} catch {
  // The first heartbeat can run before any provider receipt exists.
}
const receipts = await Promise.all(receiptFiles.map(async (file) => readJson(path.join("runtime/runs", file))));
const providers = ["demo", "codex", "claude", "grok", "ollama"];
for (const provider of providers) {
  const latest = receipts.filter((receipt) => receipt.provider === provider).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!latest) {
    record(`provider-${provider}`, "warn", { receipt: "missing" }, `Run the bounded ${provider} provider canary before treating that route as verified.`, "high");
    continue;
  }
  const ageHours = (Date.now() - Date.parse(latest.startedAt)) / 3_600_000;
  const truthful = latest.schemaVersion === 2 && latest.externalActionAttempted === false && latest.canonicalQueueWrite === false;
  const status = !truthful ? "fail" : latest.outcome === "blocked" || ageHours > 24 ? "warn" : "pass";
  const action = !truthful
    ? `Quarantine the ${provider} route and inspect its latest receipt for authority drift.`
    : latest.outcome === "blocked"
      ? latest.nextSafestAction
      : ageHours > 24
        ? `Refresh the ${provider} canary because its evidence is older than 24 hours.`
        : undefined;
  record(`provider-${provider}`, status, { runId: latest.runId, outcome: latest.outcome, verification: latest.verificationState, ageHours: Math.round(ageHours * 10) / 10 }, action, truthful ? "medium" : "critical");
}

const statusRank = { critical: 0, high: 1, medium: 2, low: 3 };
actions.sort((a, b) => statusRank[a.priority] - statusRank[b.priority] || a.check.localeCompare(b.check));
const failed = checks.filter((check) => check.status === "fail").length;
const warned = checks.filter((check) => check.status === "warn").length;
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: failed ? "critical" : warned ? "degraded" : "healthy",
  summary: { passed: checks.filter((check) => check.status === "pass").length, warned, failed },
  checks,
  prioritizedActions: actions,
  boundaries: { externalActions: "denied", canonicalQueueWrite: false },
};

await mkdir(runtimeRoot, { recursive: true });
await writeFile(path.join(runtimeRoot, "heartbeat-latest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
if (failed) process.exitCode = 1;
