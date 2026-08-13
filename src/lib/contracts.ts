import { z } from "zod";

export const ProviderIdSchema = z.enum(["demo", "codex", "claude", "grok", "ollama"]);
export const PermissionModeSchema = z.enum(["observe", "workspace"]);

export const RunRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(48_000),
  provider: ProviderIdSchema,
  model: z.string().trim().max(160).regex(/^[A-Za-z0-9._:/-]+$/).optional(),
  agentId: z.string().trim().min(1).max(96).default("marketing-chief"),
  routineId: z.string().trim().max(16).optional(),
  workingDirectory: z.string().trim().min(1).max(520),
  permissionMode: PermissionModeSchema.default("observe"),
  teamMode: z.boolean().default(true),
  timeoutSeconds: z.number().int().min(1).max(3_600).optional(),
});

export type ProviderId = z.infer<typeof ProviderIdSchema>;
export type PermissionMode = z.infer<typeof PermissionModeSchema>;
export type RunRequest = z.infer<typeof RunRequestSchema>;

export type ProviderState = "ready" | "needs_auth" | "offline" | "unavailable";

export interface ProviderModel {
  id: string;
  label: string;
  local?: boolean;
  size?: string;
}

export interface ProviderHealth {
  id: ProviderId;
  label: string;
  state: ProviderState;
  installed: boolean;
  version?: string;
  detail: string;
  models: ProviderModel[];
  capabilities: Array<"chat" | "reasoning" | "workspace" | "local">;
}

export type RunEventType =
  | "run_started"
  | "plan_created"
  | "agent_started"
  | "agent_activity"
  | "agent_delta"
  | "agent_completed"
  | "synthesis_started"
  | "synthesis_delta"
  | "approval_required"
  | "run_blocked"
  | "receipt"
  | "run_finished"
  | "run_failed";

export interface RunEvent {
  id: string;
  runId: string;
  type: RunEventType;
  timestamp: string;
  agentId?: string;
  content?: string;
  detail?: Record<string, unknown>;
}

export interface RunReceipt {
  schemaVersion: 2;
  runId: string;
  outcome: "complete" | "partial" | "blocked";
  artifactState: "none" | "drafted" | "staged" | "created" | "modified";
  artifacts?: Array<{
    path: string;
    kind: "created" | "modified" | "deleted";
  }>;
  deliveryState: "not_attempted" | "deployed" | "sent";
  verificationState: "unverified" | "local_verified" | "live_verified";
  provider: ProviderId;
  model: string;
  workingDirectory: string;
  permissionMode: PermissionMode;
  agents: string[];
  routineId?: string;
  privacy: "redacted";
  externalActionAttempted: false;
  canonicalQueueWrite: false;
  checks: string[];
  approvalState: "not_required" | "required";
  nextSafestAction: string;
  startedAt: string;
  completedAt: string;
}
