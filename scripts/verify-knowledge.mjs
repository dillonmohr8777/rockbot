import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const routinesPath = path.join(projectRoot, "src", "generated", "routines.json");
const indexPath = path.join(projectRoot, "src", "generated", "knowledge-index.json");
const requiredRoutineFields = [
  "id",
  "cadence",
  "name",
  "owner_bot",
  "trigger",
  "demo_input",
  "steps",
  "output",
  "approval_boundary",
  "success_evidence",
];
const secretPatterns = [
  /\b(?:sk|xai|ghp|github_pat)-[A-Za-z0-9_-]{16,}\b/i,
  /\bBearer\s+[A-Za-z0-9._~-]{16,}\b/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
];

const routinesDoc = JSON.parse(await readFile(routinesPath, "utf8"));
const indexDoc = JSON.parse(await readFile(indexPath, "utf8"));
const routines = routinesDoc.routines ?? [];
const ids = new Set();
const findings = [];

for (const routine of routines) {
  for (const field of requiredRoutineFields) {
    if (!(field in routine) || routine[field] === "" || routine[field] == null) {
      findings.push(`${routine.id ?? "unknown"}: missing ${field}`);
    }
  }
  if (ids.has(routine.id)) findings.push(`${routine.id}: duplicate ID`);
  ids.add(routine.id);
  if (!Array.isArray(routine.steps) || routine.steps.length < 3) {
    findings.push(`${routine.id}: steps must contain at least three actions`);
  }
}

if (routines.length !== 54) findings.push(`expected 54 routines, found ${routines.length}`);
if (ids.size !== 54) findings.push(`expected 54 unique IDs, found ${ids.size}`);

const expectedCadence = { daily: 26, weekly: 9, "weekly-twice": 2, monthly: 5, event: 12 };
for (const [key, expected] of Object.entries(expectedCadence)) {
  if (routinesDoc.cadence?.[key] !== expected) {
    findings.push(`cadence ${key}: expected ${expected}, found ${routinesDoc.cadence?.[key] ?? 0}`);
  }
}

const serialized = JSON.stringify({ routinesDoc, indexDoc });
for (const pattern of secretPatterns) {
  if (pattern.test(serialized)) findings.push(`secret-scan pattern matched: ${pattern}`);
}

if (indexDoc.workflow?.execution?.max_parallel !== 3) {
  findings.push("workflow max_parallel must remain 3");
}
if (indexDoc.workflow?.execution?.max_evaluator_loops !== 2) {
  findings.push("workflow max_evaluator_loops must remain 2");
}
if (indexDoc.workflow?.external_actions_default !== "denied") {
  findings.push("workflow external actions must default to denied");
}

if (findings.length) {
  console.error(JSON.stringify({ status: "failed", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "verified",
  routines: routines.length,
  unique_ids: ids.size,
  cadence: routinesDoc.cadence,
  source_sha256: routinesDoc.source?.sha256,
}, null, 2));
