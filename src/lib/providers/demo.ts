import type { ProviderAdapter, ProviderChunk, ProviderContext, ProviderResult } from "@/lib/providers/types";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const demoAdapter: ProviderAdapter = {
  id: "demo",
  async health() {
    return {
      id: "demo",
      label: "Rockbot Demo",
      state: "ready",
      installed: true,
      detail: "Deterministic synthetic fixture. No model or live provider is called.",
      models: [{ id: "protocol-54-fixture", label: "Protocol 54 fixture", local: true }],
      capabilities: ["chat", "reasoning", "local"],
    };
  },
  async *execute(context: ProviderContext): AsyncGenerator<ProviderChunk, ProviderResult> {
    const lines = [
      `I accepted the task as ${context.agent.name} under ${context.permissionMode} authority.`,
      "I resolved the request to a synthetic internal route and kept all provider and queue mutations disabled.",
      "Evidence check: the 54-routine manifest is present, IDs are unique, and the cadence contract reconciles to 26 daily, 9 weekly, 2 twice-weekly, 5 monthly, and 12 event-triggered routines.",
      `Deliverable: a bounded ${context.agent.department.toLowerCase()} handoff with explicit checks, uncertainty, and one next action.`,
      "Status: complete for the local synthetic canary. No external state was inspected or changed.",
      "external action attempted = none",
    ];
    let text = "";
    for (const line of lines) {
      await wait(45);
      text += `${line}\n\n`;
      yield { type: "delta", content: `${line}\n\n` };
    }
    return { text: text.trim() };
  },
};
