import { createHash, randomUUID } from "node:crypto";
import type { AgentDefinition } from "@/data/agents";
import type { PermissionMode, RunEvent, RunReceipt, RunRequest } from "@/lib/contracts";
import { getProvider } from "@/lib/providers";
import { routeTask } from "@/lib/orchestrator/router";
import { assertAllowedWorkingDirectory, assertPromptHasNoLikelySecret, governancePrompt, redact } from "@/lib/orchestrator/safety";
import { getRoutine } from "@/lib/routines";
import { saveReceipt } from "@/lib/orchestrator/run-store";
import type { ProviderResult } from "@/lib/providers/types";
import { captureSystemHeartbeat, heartbeatPromptEvidence, isSystemHeartbeatRequest, type SystemHeartbeatEvidence } from "@/lib/orchestrator/heartbeat";

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

type SpecialistOutput = {
  agent: AgentDefinition;
  text: string;
  outputHash: string;
  boundary: ProviderResult["boundary"];
  workspaceChanges: NonNullable<ProviderResult["workspaceChanges"]>;
};

function specialistPrompt(
  request: RunRequest,
  agent: AgentDefinition,
  routeId: string,
  permissionMode: PermissionMode,
  heartbeat?: SystemHeartbeatEvidence,
  priorOutputs: SpecialistOutput[] = [],
): string {
  const routine = getRoutine(request.routineId);
  return [
    governancePrompt(permissionMode),
    "",
    `AGENT: ${agent.name}`,
    `PURPOSE: ${agent.purpose}`,
    `ROUTE: ${routeId}`,
    routine ? `ROUTINE: ${routine.id} — ${routine.name}\nTRIGGER: ${routine.trigger}\nSUCCESS EVIDENCE: ${routine.success_evidence}\nAPPROVAL BOUNDARY: ${routine.approval_boundary}` : "ROUTINE: on-demand",
    `WORKING DIRECTORY: ${request.workingDirectory}`,
    heartbeat ? `\n${heartbeatPromptEvidence(heartbeat)}` : "",
    priorOutputs.length
      ? `\nMAKER HANDOFF\nThe maker stage has completed. Inspect the current workspace and independently verify the requested result. Do not recreate or edit the artifact.\n${priorOutputs.map(({ agent: priorAgent, text }) => `--- ${priorAgent.name} ---\n${text}`).join("\n\n")}`
      : "\nSTAGE\nYou are the maker. Complete the bounded task and verify the actual result before reporting it.",
    "",
    "TASK",
    request.prompt,
  ].join("\n");
}

function synthesisPrompt(request: RunRequest, outputs: Array<{ agent: AgentDefinition; text: string }>, heartbeat?: SystemHeartbeatEvidence): string {
  return [
    governancePrompt("observe"),
    "",
    "You are Marketing Chief performing fan-in. Reconcile the bounded specialist returns below.",
    "Do not repeat unsupported claims or upgrade drafted, local, partial, or blocked work to complete.",
    "Return one concise outcome, evidence, risks, approval state, and next safest action.",
    "",
    `ORIGINAL TASK: ${request.prompt}`,
    heartbeat ? heartbeatPromptEvidence(heartbeat) : "",
    "",
    ...outputs.map(({ agent, text }) => `--- ${agent.name} ---\n${text}`),
  ].join("\n\n");
}

export function requiresExternalApproval(prompt: string): boolean {
  const requestsExternalAction = /\b(send|post|publish|deploy|launch|spend|purchase|change\s+(?:an?\s+)?account|grant\s+permission|write\s+(?:to\s+)?(?:the\s+)?canonical\s+queue)\b/i.test(prompt);
  const declaresLocalOnlyBoundary = /\b(draft\s+only|local\s+only|preview\s+only|do\s+not|don't|never|without)\b.{0,100}\b(send(?:ing)?|post(?:ing)?|publish(?:ing)?|deploy(?:ing)?|launch(?:ing)?|spend(?:ing)?|purchas(?:e|ing))\b/is.test(prompt);
  return requestsExternalAction && !declaresLocalOnlyBoundary;
}

export function deriveArtifactState(
  prompt: string,
  capturedOutputHashes: string[],
  workspaceChanges: NonNullable<ProviderResult["workspaceChanges"]> = [],
): RunReceipt["artifactState"] {
  if (!capturedOutputHashes.length) return "none";
  if (workspaceChanges.some(({ kind }) => kind === "created")) return "created";
  if (workspaceChanges.length) return "modified";
  const hasPositiveIntent = (pattern: RegExp) => [...prompt.matchAll(new RegExp(pattern.source, "gi"))].some((match) => {
    const prefix = prompt.slice(Math.max(0, (match.index ?? 0) - 120), match.index ?? 0);
    const clause = prefix.split(/[.;\n]/).at(-1) ?? "";
    return !/\b(?:do not|don't|never|must not|should not|without)\b/i.test(clause);
  });
  if (hasPositiveIntent(/\b(stage|staging|preview|mockup)\b/i)) return "staged";
  if (hasPositiveIntent(/\b(draft|compose|write|prepare)\b/i)) return "drafted";
  return "none";
}

const verifiedBoundaries = new Set<ProviderResult["boundary"]>([
  "synthetic_fixture",
  "codex_read_only_sandbox",
  "codex_workspace_sandbox",
  "claude_plan_mode",
  "claude_accept_edits_mode",
  "grok_plan_no_tools",
  "ollama_chat_no_tools",
]);

export function hasVerifiedProviderBoundary(result: ProviderResult | undefined): result is ProviderResult {
  return result?.externalActionAttempted === false && verifiedBoundaries.has(result.boundary);
}

const blockedOutcomePattern = /\b(?:outcome|status)\s*:\s*(?:\*{0,2})?(?:blocked|failed|unable)|\b(?:could not|couldn't|unable to|not created|not written|write was rejected|filesystem is read-only|workspace is read-only|workspace's read-only|requested work was blocked|requested task was blocked)\b/i;

export function reportsBlockedOutcome(text: string): boolean {
  return blockedOutcomePattern.test(text);
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
    let heartbeat: SystemHeartbeatEvidence | undefined;
    if (isSystemHeartbeatRequest(request.prompt)) {
      emit(event(runId, "agent_activity", { content: "Running the trusted local system heartbeat." }));
      heartbeat = await captureSystemHeartbeat();
      checks.push(`system heartbeat captured: ${heartbeat.manifest.status} sha256:${heartbeat.outputHash}`);
    }
    const plan = routeTask(request.prompt, request.agentId, request.teamMode);
    const provider = getProvider(request.provider);
    plannedAgentIds = plan.agents.map((agent) => agent.id);
    if (plannedAgentIds.length > 3) throw new Error("The execution plan exceeded the three-specialist cap.");
    checks.push("three-specialist cap");
    emit(event(runId, "plan_created", { content: plan.rationale, detail: { routeId: plan.routeId, agents: plannedAgentIds, makerChecker: plan.makerChecker } }));

    const runAgent = async (agent: AgentDefinition, permissionMode: PermissionMode, priorOutputs: SpecialistOutput[] = []): Promise<SpecialistOutput> => {
      emit(event(runId, "agent_started", { agentId: agent.id, content: agent.purpose }));
      let text = "";
      const timeoutSeconds = Math.min(request.timeoutSeconds ?? agent.timeoutSeconds, agent.timeoutSeconds);
      const boundary = executionBoundary(signal, timeoutSeconds, agent.name);
      const context = {
        runId,
        agent,
        prompt: specialistPrompt(request, agent, plan.routeId, permissionMode, heartbeat, priorOutputs),
        model: request.model,
        workingDirectory: request.workingDirectory,
        permissionMode,
        signal: boundary.signal,
      };
      let providerResult: ProviderResult | undefined;
      try {
        const iterator = provider.execute(context);
        while (true) {
          const next = await iterator.next();
          if (next.done) {
            providerResult = next.value;
            if (providerResult?.text) text = providerResult.text;
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
      if (!hasVerifiedProviderBoundary(providerResult)) {
        throw new Error(`${agent.name} did not return verified provider-boundary evidence.`);
      }
      const outputHash = createHash("sha256").update(redactedText).digest("hex").slice(0, 12);
      emit(event(runId, "agent_completed", { agentId: agent.id, detail: { outputHash } }));
      return {
        agent,
        text: redactedText,
        outputHash,
        boundary: providerResult.boundary,
        workspaceChanges: providerResult.workspaceChanges ?? [],
      };
    };

    let outputs: SpecialistOutput[];
    if (plan.makerChecker && plan.agents.length > 1) {
      const makerOutput = await runAgent(plan.agents[0], request.permissionMode);
      if (reportsBlockedOutcome(makerOutput.text)) {
        throw new Error(`${makerOutput.agent.name} reported that the requested work was blocked or not completed.`);
      }
      const checkerOutputs = await Promise.all(plan.agents.slice(1).map((agent) => runAgent(agent, "observe", [makerOutput])));
      outputs = [makerOutput, ...checkerOutputs];
      checks.push("maker-checker sequence enforced");
    } else {
      outputs = await Promise.all(plan.agents.map((agent) => runAgent(agent, request.permissionMode)));
    }

    const capturedOutputHashes = outputs.map(({ agent, outputHash, boundary }) => {
      checks.push(`provider output captured: ${agent.id} sha256:${outputHash}`);
      checks.push(`provider boundary verified: ${agent.id} ${boundary}`);
      return outputHash;
    });
    const artifacts = outputs
      .flatMap(({ workspaceChanges }) => workspaceChanges)
      .map((change) => ({
        ...change,
        path: change.path.startsWith(request.workingDirectory)
          ? change.path.slice(request.workingDirectory.length).replace(/^[/\\]+/, "")
          : change.path,
      }))
      .filter((change, index, all) => all.findIndex((candidate) => candidate.path === change.path && candidate.kind === change.kind) === index);
    if (artifacts.length) checks.push(`workspace artifacts captured: ${artifacts.length}`);
    if (outputs.some(({ text }) => reportsBlockedOutcome(text))) {
      throw new Error("One or more specialists reported that the requested work was blocked or not completed.");
    }
    if (outputs.length > 1) {
      emit(event(runId, "synthesis_started", { agentId: "marketing-chief", content: "Reconciling specialist evidence." }));
      const timeoutSeconds = Math.min(request.timeoutSeconds ?? 900, 900);
      const boundary = executionBoundary(signal, timeoutSeconds, "Marketing Chief synthesis");
      const synthesisContext = {
        runId,
        agent: { ...plan.agents[0], id: "marketing-chief", name: "Marketing Chief", purpose: "Final synthesis" },
        prompt: synthesisPrompt(request, outputs, heartbeat),
        model: request.model,
        workingDirectory: request.workingDirectory,
        permissionMode: "observe" as const,
        signal: boundary.signal,
      };
      let synthesisText = "";
      let synthesisResult: ProviderResult | undefined;
      try {
        const synthesis = provider.execute(synthesisContext);
        while (true) {
          const next = await synthesis.next();
          if (next.done) {
            synthesisResult = next.value;
            if (synthesisResult?.text) synthesisText = synthesisResult.text;
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
      if (!hasVerifiedProviderBoundary(synthesisResult)) {
        throw new Error("Marketing Chief synthesis did not return verified provider-boundary evidence.");
      }
      if (reportsBlockedOutcome(redactedSynthesis)) {
        throw new Error("Marketing Chief reported that the requested work was blocked or not completed.");
      }
      const synthesisHash = createHash("sha256").update(redactedSynthesis).digest("hex").slice(0, 12);
      capturedOutputHashes.push(synthesisHash);
      checks.push(`provider output captured: marketing-chief sha256:${synthesisHash}`);
      checks.push(`provider boundary verified: marketing-chief ${synthesisResult.boundary}`);
    }

    checks.push("redaction boundary applied");
    const evidenceVerified = outputs.length > 0 && capturedOutputHashes.length >= outputs.length;
    const approvalRequired = requiresExternalApproval(request.prompt);
    const artifactState = deriveArtifactState(request.prompt, capturedOutputHashes, artifacts);
    if (approvalRequired) emit(event(runId, "approval_required", { content: "The requested outcome contains a consequential action. Rockbot completed only the local bounded portion; exact delivery remains approval-gated." }));
    const receipt: RunReceipt = {
      schemaVersion: 2,
      runId,
      outcome: approvalRequired ? "partial" : "complete",
      artifactState,
      artifacts: artifacts.length ? artifacts : undefined,
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
      nextSafestAction: approvalRequired
        ? "Review the exact local artifact or preview before authorizing any external action."
        : artifacts.length
          ? `Review the local artifact${artifacts.length === 1 ? "" : "s"}: ${artifacts.map(({ path }) => path).join(", ")}.`
          : "Review the captured, hashed provider evidence and choose the next bounded run.",
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
