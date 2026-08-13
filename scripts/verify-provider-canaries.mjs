import path from "node:path";
import process from "node:process";

const endpoint = process.env.ROCKBOT_URL ?? "http://127.0.0.1:3434";
const workingDirectory = path.resolve(process.cwd());
const allProviders = [
  { provider: "demo", model: "protocol-54-fixture" },
  { provider: "codex", model: "default" },
  { provider: "claude", model: "default" },
  { provider: "grok", model: "grok-4.6" },
  { provider: "ollama", model: "phi4-mini:latest" },
];
const requestedProviders = new Set((process.env.ROCKBOT_PROVIDER ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const providers = requestedProviders.size
  ? allProviders.filter(({ provider }) => requestedProviders.has(provider))
  : allProviders;

if (!providers.length) throw new Error(`No supported provider matched ROCKBOT_PROVIDER=${process.env.ROCKBOT_PROVIDER}.`);

async function runCanary({ provider, model }) {
  const marker = `ROCKBOT_${provider.toUpperCase()}_CANARY_20260813`;
  const response = await fetch(`${endpoint}/api/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: `Return the exact marker ${marker}. Do not perform external actions.`,
      provider,
      model,
      agentId: "delivery-evidence-auditor",
      workingDirectory,
      permissionMode: "observe",
      teamMode: false,
    }),
  });
  if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);

  const body = await response.text();
  const events = body.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const receiptEvent = events.find((event) => event.type === "receipt");
  const failedEvent = events.find((event) => event.type === "run_failed");
  const blockedEvent = events.find((event) => event.type === "run_blocked");
  const receipt = receiptEvent?.detail;
  const normalizedText = events
    .filter((event) => event.type === "agent_delta" || event.type === "synthesis_delta")
    .map((event) => event.content ?? "")
    .join("");
  const expectedEvidencePresent = provider === "demo"
    ? normalizedText.includes("54-routine manifest is present") && normalizedText.includes("external action attempted = none")
    : normalizedText.includes(marker);
  const terminalMessage = blockedEvent?.content ?? failedEvent?.content ?? "";
  const blockedExternal = /usage or spend limit is exhausted|monthly spend limit|rate limit/i.test(`${normalizedText} ${terminalMessage}`);
  const passed = Boolean(
    expectedEvidencePresent
      && receipt?.schemaVersion === 2
      && receipt?.outcome === "complete"
      && receipt?.externalActionAttempted === false
      && receipt?.deliveryState === "not_attempted"
      && receipt?.verificationState === "local_verified",
  );
  return {
    provider,
    model,
    runId: receipt?.runId ?? events[0]?.runId ?? null,
    evidenceCheck: provider === "demo" ? "deterministic_fixture" : "exact_marker",
    expectedEvidencePresent,
    receiptSchema: receipt?.schemaVersion ?? null,
    outcome: receipt?.outcome ?? null,
    externalActionAttempted: receipt?.externalActionAttempted ?? null,
    terminalEvent: blockedEvent ? "run_blocked+receipt" : receipt ? "receipt" : failedEvent ? "run_failed" : "missing",
    failure: terminalMessage.slice(0, 240) || null,
    status: passed ? "passed" : blockedExternal ? "blocked_external" : "failed",
    passed,
  };
}

const results = [];
for (const provider of providers) {
  let result;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      result = { ...(await runCanary(provider)), attempt };
    } catch (error) {
      result = { provider: provider.provider, model: provider.model, attempt, passed: false, error: error instanceof Error ? error.message : String(error) };
    }
    if (result.passed) break;
  }
  results.push(result);
}

console.log(JSON.stringify({ endpoint, checkedAt: new Date().toISOString(), results }, null, 2));
if (results.some((result) => !result.passed)) process.exitCode = 1;
