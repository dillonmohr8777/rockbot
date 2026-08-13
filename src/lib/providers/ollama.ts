import { spawnSync } from "node:child_process";
import { commandVersion, resolveCommand } from "@/lib/providers/command";
import { redact } from "@/lib/orchestrator/safety";
import type { ProviderAdapter, ProviderChunk, ProviderResult } from "@/lib/providers/types";

function parseModels(output: string) {
  return output.split(/\r?\n/).slice(1).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\s{2,}/);
    return { id: parts[0], label: parts[0], local: parts[2] !== "-", size: parts[2] };
  });
}

export const ollamaAdapter: ProviderAdapter = {
  id: "ollama",
  async health() {
    const command = resolveCommand("ollama");
    if (!command) {
      return { id: "ollama", label: "Local models", state: "unavailable", installed: false, detail: "Ollama was not found.", models: [], capabilities: ["chat", "reasoning", "local"] };
    }
    const result = spawnSync(command, ["list"], { encoding: "utf8", windowsHide: true, timeout: 10_000 });
    const models = result.status === 0 ? parseModels(result.stdout) : [];
    return {
      id: "ollama",
      label: "Local models",
      state: result.status === 0 ? "ready" : "offline",
      installed: true,
      version: commandVersion(command),
      detail: result.status === 0 ? `${models.length} local or Ollama-cloud routes discovered.` : "Ollama is installed but its local service is offline.",
      models,
      capabilities: ["chat", "reasoning", "local"],
    };
  },
  async *execute(context): AsyncGenerator<ProviderChunk, ProviderResult> {
    const host = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");
    const model = context.model && context.model !== "default"
      ? context.model
      : process.env.ROCKBOT_OLLAMA_DEFAULT_MODEL || "nemotron-3-nano:4b";
    const response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: true, messages: [{ role: "user", content: context.prompt }] }),
      signal: context.signal,
    });
    if (!response.ok || !response.body) throw new Error(`Ollama returned HTTP ${response.status}.`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as { message?: { content?: string }; error?: string };
        if (event.error) throw new Error(redact(event.error));
        if (event.message?.content) {
          const chunk = redact(event.message.content);
          text += chunk;
          yield { type: "delta", content: chunk };
        }
      }
    }
    return { text: text.trim(), externalActionAttempted: false, boundary: "ollama_chat_no_tools" };
  },
};
