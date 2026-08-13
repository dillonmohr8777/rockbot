import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const knowledgeRoot = process.env.ROCKBOT_KNOWLEDGE_ROOT
  || "C:\\Users\\dillo\\repos\\dillon-os\\11_Agents\\Rockbot Operating System";
const manifestPath = path.join(
  knowledgeRoot,
  "recorded-training",
  "2026-08-11-grok-bot-routine-recording-manifest.json",
);
const benchPath = path.join(
  knowledgeRoot,
  "recorded-training",
  "2026-08-11-grok-specialist-bench.workflow.json",
);
const sourceIndexPath = path.join(knowledgeRoot, "SYNC-MANIFEST.json");
const generatedRoot = path.join(projectRoot, "src", "generated");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeAtomic(target, value) {
  const temp = `${target}.tmp`;
  await writeFile(temp, value, { encoding: "utf8" });
  await rename(temp, target);
}

async function requiredText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    throw new Error(`Required Rockbot knowledge source is unavailable: ${file}`, { cause: error });
  }
}

const manifestText = await requiredText(manifestPath);
const benchText = await requiredText(benchPath);
const sourceIndexText = await requiredText(sourceIndexPath);
const manifest = JSON.parse(manifestText);
const bench = JSON.parse(benchText);
const sourceIndex = JSON.parse(sourceIndexText);

const routines = manifest.routines ?? [];
const uniqueIds = new Set(routines.map((routine) => routine.id));
if (routines.length !== 54 || uniqueIds.size !== 54) {
  throw new Error(`Expected 54 unique routines; found ${routines.length} rows and ${uniqueIds.size} IDs.`);
}

const cadence = routines.reduce((counts, routine) => {
  counts[routine.cadence] = (counts[routine.cadence] ?? 0) + 1;
  return counts;
}, {});

await mkdir(generatedRoot, { recursive: true });

await writeAtomic(path.join(generatedRoot, "routines.json"), stableJson({
  schema_version: manifest.schema_version,
  prepared_at: manifest.prepared_at,
  source: {
    relative_path: path.relative(knowledgeRoot, manifestPath),
    sha256: sha256(manifestText),
  },
  policy: manifest.recording_policy,
  cadence,
  routines,
}));

await writeAtomic(path.join(generatedRoot, "knowledge-index.json"), stableJson({
  schema_version: "1.0",
  source_root: knowledgeRoot,
  source_index_sha256: sha256(sourceIndexText),
  source_index_entries: Array.isArray(sourceIndex.files) ? sourceIndex.files.length : null,
  workflow: bench,
  source_state: {
    manifest_mtime: (await stat(manifestPath)).mtime.toISOString(),
    bench_mtime: (await stat(benchPath)).mtime.toISOString(),
  },
}));

console.log(JSON.stringify({
  status: "synced",
  routines: routines.length,
  cadence,
  generated_root: generatedRoot,
}, null, 2));
