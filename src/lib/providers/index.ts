import type { ProviderAdapter } from "@/lib/providers/types";
import type { ProviderHealth, ProviderId } from "@/lib/contracts";
import { demoAdapter } from "@/lib/providers/demo";
import { codexAdapter } from "@/lib/providers/codex";
import { claudeAdapter } from "@/lib/providers/claude";
import { grokAdapter } from "@/lib/providers/grok";
import { ollamaAdapter } from "@/lib/providers/ollama";

const providers: Record<ProviderId, ProviderAdapter> = {
  demo: demoAdapter,
  codex: codexAdapter,
  claude: claudeAdapter,
  grok: grokAdapter,
  ollama: ollamaAdapter,
};

export function getProvider(id: ProviderId): ProviderAdapter {
  return providers[id];
}

export async function providerHealth(): Promise<ProviderHealth[]> {
  return Promise.all(Object.values(providers).map(async (provider) => {
    try {
      return await provider.health();
    } catch (error) {
      return {
        id: provider.id,
        label: provider.id,
        state: "offline" as const,
        installed: true,
        detail: error instanceof Error ? error.message : "Health check failed.",
        models: [],
        capabilities: ["chat" as const],
      };
    }
  }));
}
