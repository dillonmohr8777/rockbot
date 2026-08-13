import type { AgentDefinition } from "@/data/agents";
import type { PermissionMode, ProviderHealth, ProviderId } from "@/lib/contracts";

export interface ProviderContext {
  runId: string;
  agent: AgentDefinition;
  prompt: string;
  model?: string;
  workingDirectory: string;
  permissionMode: PermissionMode;
  signal?: AbortSignal;
}

export interface ProviderChunk {
  type: "delta" | "activity";
  content: string;
}

export type ProviderBoundary =
  | "synthetic_fixture"
  | "codex_read_only_sandbox"
  | "codex_workspace_sandbox"
  | "claude_plan_mode"
  | "claude_accept_edits_mode"
  | "grok_plan_no_tools"
  | "ollama_chat_no_tools";

export interface ProviderResult {
  text: string;
  externalActionAttempted: false;
  boundary: ProviderBoundary;
}

export interface ProviderAdapter {
  id: ProviderId;
  health(): Promise<ProviderHealth>;
  execute(context: ProviderContext): AsyncGenerator<ProviderChunk, ProviderResult>;
}
