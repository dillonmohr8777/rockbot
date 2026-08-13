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

export interface ProviderResult {
  text: string;
}

export interface ProviderAdapter {
  id: ProviderId;
  health(): Promise<ProviderHealth>;
  execute(context: ProviderContext): AsyncGenerator<ProviderChunk, ProviderResult>;
}
