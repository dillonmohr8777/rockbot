import { createHash, randomUUID } from "node:crypto";
import type { AgentDefinition } from "@/data/agents";
import type { RunEvent, RunReceipt, RunRequest } from "@/lib/contracts";
import { getProvider } from "@/lib/providers";
import { routeTask } from "@/lib/orchestrator/router";
import { assertAllowedWorkingDirectory, assertPromptHasNoLikelySecret, governancePrompt, redact } from "@/lib/orchestrator/safety";
import { getRoutine } from "@/lib/routines";
import { saveReceipt } from "@/lib/orchestrator/run-store";

type Emit = (event: RunEvent) => void;

function executionBoundary(parentSignal: AbortSignal | undefined, timeoutSeconds: number, label: string) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`${label} exceeded its ${timeoutSeconds}-second execution limit.`));
  }, timeoutSeconds * 1_000);

  return {
    signal: controller.signal,
    normalize(error: unknown) {
      return timedOut ? new Error(`${label} exceeded its ${timeoutSeconds}-second execution limit.`) : error;
    },
    close() {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", abortFromParent);
    },
  };
}

function event(runId: string, type: RunEvent["type"], values: Omit<RunEvent, "id" | "runId" | "type" | "timestamp"> = {}): RunEvent {
  return { id: randomUUID(), runId, type, timestamp: new Date().toISOString(), ...values };
}

function specialistPrompt(request: RunRequest, agent: AgentDefinition, routeId: string): string {
  const routine = getRoutine(request.routineId);
  return [
    governancePrompt(request.permissionMode),
    "",
    `AGENT: ${agent.name}`,
    `PURPOSE: ${agent.purpose}`,
    `ROUTE: ${routeId}`,
    routine ? `ROUTINE: ${routine.id} — ${routine.name}\nTRIGGER: ${routine.trigger}\nSUCCESS EVIDENCE: ${routine.success_evidence}\nAPPROVAL BOUNDARY: ${routine.approval_boundary}` : "ROUTINE: on-demand",
    `WORKING DIRECTORY: ${request.workingDirectory}`,
    "",
    "TASK",
    request.prompt,
  ].join("\n");
}

function synthesisPrompt(request: RunRequest, outputs: Array<{ agent: AgentDefinition; text: string }>): string {
  return [
    governancePrompt("observe"),
    "",
    "You are Marketing Chief performing fan-in. Reconcile the bounded specialist returns below.",
    "Do not repeat unsupported claims or upgrade drafted, local, partial, or blocked work to complete.",
    "Return one concise outcome, evidence, risks, approval state, and next safest action.",
    "",
    `ORIGINAL TASK: ${request.prompt}`,
    "",
    ...outputs.map(({ agent, text }) => `--- ${agent.name} ---\n${text}`),
  ].join("\n\n");
}

export function requiresExternalApproval(prompt: string): boolean {
  const requestsExternalAction = /\b(send|post|publish|deploy|launch|spend|purchase|change\s+(?:an?\s+)?account|grant\s+permission|write\s+(?:to\s+)?(?:the\s+)?canonical\s+queue)\b/i.test(prompt);
  const declaresLocalOnlyBoundary = /\b(draft\s+only|local\s+only|preview\s+only|do\s+not|don't|never|without)\b.{0,100}\b(send(?:ing)?|post(?:ing)?|publish(?:ing)?|deploy(?:ing)?|launch(?:ing)?|spend(?:ing)?|purchas(?:e|ing))\b/is.test(prompt);
  return requestsExternalAction && !declaresLocalOnlyBoundary;
}

export function deriveArtifactState(prompt: string, capturedOutputHashes: string[]): RunReceipt["artifactState"] {
  if (!capturedOutputHashes.length) return "none";
  const hasPositiveIntent = (pattern: RegExp) => [...prompt.matchAll(new RegExp(pattern.source, "gi"))].some((match) => {
    const prefix = prompt.slice(Math.max(0, (match.index ?? 0) - 120), match.index ?? 0);
    const clause = prefix.split(/[.;\n]/).at(-1) ?? "";
    return !/\b(?:do not|don't|never|must not|should not|without)\b/i.test(clause);
  });
  if (hasPositiveIntent(/\b(stage|staging|preview|mockup)\b/i)) return "staged";
  if (hasPositiveIntent(/\b(draft|compose|write|prepare)\b/i)) return "drafted";
  return "none";
}

export function hasRequiredProviderAttestation(output: string): boolean {
  return /(?:^|\n)\s*external action attempted\s*=\s*none\s*(?:$|\n)/im.test(output);
}

function blockedNextAction(message: string): string {
  if (/usage|spend|rate limit/i.test(message)) return "Switch to another ready model or restore provider capacity, then rerun the same bounded request.";
  if (/auth|sign.?in|login/i.test(message)) return "Restore the provider session, confirm readiness in the model picker, and rerun.";
  if (/output|evidence/i.test(message)) return "Inspect the provider output and evidence source, then rerun without upgrading the result state.";
  return "Inspect the blocker, choose another ready provider if useful, and rerun the bounded request.";
}

export async function executeRun(request: RunRequest, emit: Emit, signal?: AbortSignal): Promise<RunReceipt> {
  const runId = `rb-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const checks: string[] = [];
  let plannedAgentIds: string[] = [];
  emit(event(runId, "run_started", { detail: { provider: request.provider, model: request.model || "default", permissionMode: request.permissionMode } }));
  try {
    request.workingDirectory = assertAllowedWorkingDirectory(request.workingDirectory);
    checks.push("working directory allowlist");
    assertPromptHasNoLikelySecret(request.prompt);
    checks.push("prompt secret scan");
    const plan = routeTask(request.prompt, request.agentId, request.teamMode);
    const provider = getProvider(request.provider);
    plannedAgentIds = plan.agents.map((agent) => agent.id);
    if (plannedAgentIds.length > 3) throw new Error("The execution plan exceeded the three-specialist cap.");
    checks.push("three-specialist cap");
    emit(event(runId, "plan_created", { content: plan.rationale, detail: { routeId: plan.routeId, agents: plannedAgentIds, makerChecker: plan.makerChecker } }));

    const outputs = await Promise.all(plan.agents.map(async (agent) => {
      emit(event(runId, "agent_started", { agentId: agent.id, content: agent.purpose }));
      let text = "";
      const timeoutSeconds = Math.min(request.timeoutSeconds ?? agent.timeoutSeconds, agent.timeoutSeconds);
      const boundary = executionBoundary(signal, timeoutSeconds, agent.name);
      const context = {
        runId,
        agent,
        prompt: specialistPrompt(request, agent, plan.routeId),
        model: request.model,
        workingDirectory: request.workingDirectory,
        permissionMode: request.permissionMode,
        signal: boundary.signal,
      };
      try {
        const iterator = provider.execute(context);
        while (true) {
          const next = await iterator.next();
          if (next.done) {
            if (next.value?.text) text = next.value.text;
            break;
          }
          const chunk = next.value;
          if (chunk.type === "delta") {
            text += chunk.content;
            emit(event(runId, "agent_delta", { agentId: agent.id, content: chunk.content }));
          } else emit(event(runId, "agent_activity", { agentId: agent.id, content: chunk.content }));
        }
      } catch (error) {
        throw boundary.normalize(error);
      } finally {
        boundary.close();
      }
      const redactedText = redact(text).trim();
      if (!redactedText) throw new Error(`${agent.name} returned no usable output evidence.`);
      if (!hasRequiredProviderAttestation(redactedText)) {
        throw new Error(`${agent.name} returned output without the required external-action attestation.`);
      }
      const outputHash = createHash("sha256").update(redactedText).digest("hex").slice(0, 12);
      emit(event(runId, "agent_completed", { agentId: agent.id, detail: { outputHash } }));
      return { agent, text: redactedText, outputHash };
    }));

    const capturedOutputHashes = outputs.map(({ agent, outputHash }) => {
      checks.push(`provider output captured: ${agent.id} sha256:${outputHash}`);
      return outputHash;
    });
    if (outputs.length > 1) {
      emit(event(runId, "synthesis_started", { agentId: "marketing-chief", content: "Reconciling specialist evidence." }));
      const timeoutSeconds = Math.min(request.timeoutSeconds ?? 900, 900);
      const boundary = executionBoundary(signal, timeoutSeconds, "Marketing Chief synthesis");
      const synthesisContext = {
        runId,
        agent: { ...plan.agents[0], id: "marketing-chief", name: "Marketing Chief", purpose: "Final synthesis" },
        prompt: synthesisPrompt(request, outputs),
        model: request.model,
        workingDirectory: request.workingDirectory,
        permissionMode: "observe" as const,
        signal: boundary.signal,
      };
      let synthesisText = "";
      try {
        const synthesis = provider.execute(synthesisContext);
        while (true) {
          const next = await synthesis.next();
          if (next.done) {
            if (next.value?.text) synthesisText = next.value.text;
            break;
          }
          if (next.value.type === "delta") {
            synthesisText += next.value.content;
            emit(event(runId, "synthesis_delta", { agentId: "marketing-chief", content: next.value.content }));
          } else emit(event(runId, "agent_activity", { agentId: "marketing-chief", content: next.value.content }));
        }
      } catch (error) {
        throw boundary.normalize(error);
      } finally {
        boundary.close();
      }
      const redactedSynthesis = redact(synthesisText).trim();
      if (!redactedSynthesis) throw new Error("Marketing Chief synthesis returned no usable output evidence.");
      if (!hasRequiredProviderAttestation(redactedSynthesis)) {
        throw new Error("Marketing Chief synthesis returned output without the required external-action attestation.");
      }
      const synthesisHash = createHash("sha256").update(redactedSynthesis).digest("hex").slice(0, 12);
      capturedOutputHashes.push(synthesisHash);
      checks.push(`provider output captured: marketing-chief sha256:${synthesisHash}`);
    }

    checks.push("redaction boundary applied");
    const evidenceVerified = outputs.length > 0 && capturedOutputHashes.length >= outputs.length;
    const approvalRequired = requiresExternalApproval(request.prompt);
    const artifactState = deriveArtifactState(request.prompt, capturedOutputHashes);
    if (approvalRequired) emit(event(runId, "approval_required", { content: "The requested outcome contains a consequential action. Rockbot completed only the local bounded portion; exact delivery remains approval-gated." }));
    const receipt: RunReceipt = {
      schemaVersion: 2,
      runId,
      outcome: approvalRequired ? "partial" : "complete",
      artifactState,
      deliveryState: "not_attempted",
      verificationState: evidenceVerified ? "local_verified" : "unverified",
      provider: request.provider,
      model: request.model || "default",
      workingDirectory: request.workingDirectory,
      permissionMode: request.permissionMode,
      agents: plannedAgentIds,
      routineId: request.routineId,
      privacy: "redacted",
      externalActionAttempted: false,
      canonicalQueueWrite: false,
      checks,
      approvalState: approvalRequired ? "required" : "not_required",
      nextSafestAction: approvalRequired ? "Review the exact local artifact or preview before authorizing any external action." : "Review the captured, hashed provider evidence and choose the next bounded run.",
      startedAt,
      completedAt: new Date().toISOString(),
    };
    await saveReceipt(receipt);
    emit(event(runId, "receipt", { detail: receipt as unknown as Record<string, unknown> }));
    emit(event(runId, "run_finished", { content: `Run finished with ${receipt.outcome} outcome. External action attempted = none.`, detail: { outcome: receipt.outcome } }));
    return receipt;
  } catch (error) {
    const blocker = redact(error instanceof Error ? error.message : "Rockbot could not establish usable provider evidence.").slice(0, 600);
    const receipt: RunReceipt = {
      schemaVersion: 2,
      runId,
      outcome: "blocked",
      artifactState: "none",
      deliveryState: "not_attempted",
      verificationState: "unverified",
      provider: request.provider,
      model: request.model || "default",
      workingDirectory: request.workingDirectory,
      permissionMode: request.permissionMode,
      agents: plannedAgentIds,
      routineId: request.routineId,
      privacy: "redacted",
      externalActionAttempted: false,
      canonicalQueueWrite: false,
      checks,
      approvalState: "not_required",
      nextSafestAction: blockedNextAction(blocker),
      startedAt,
      completedAt: new Date().toISOString(),
    };
    await saveReceipt(receipt);
    emit(event(runId, "run_blocked", { content: blocker }));
    emit(event(runId, "receipt", { detail: receipt as unknown as Record<string, unknown> }));
    emit(event(runId, "run_finished", { content: "Run finished blocked. External action attempted = none.", detail: { outcome: receipt.outcome } }));
    return receipt;
  }
}
