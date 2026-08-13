import { describe, expect, it } from "vitest";
import { extractEventText, extractProviderFailure } from "../src/lib/providers/command";

describe("provider JSONL normalization", () => {
  it("extracts a Codex agent message nested under item", () => {
    expect(extractEventText({
      type: "item.completed",
      item: { id: "safe-fixture", type: "agent_message", text: "ROCKBOT_CANARY_OK" },
    })).toEqual(["ROCKBOT_CANARY_OK"]);
  });

  it("prefers message content over protocol metadata", () => {
    expect(extractEventText({
      type: "assistant",
      message: { content: [{ type: "text", text: "bounded result" }] },
      session_id: "ignored",
    })).toEqual(["bounded result"]);
  });

  it("does not promote arbitrary protocol identifiers to visible output", () => {
    expect(extractEventText({ type: "thread.started", thread_id: "private-runtime-id" })).toEqual([]);
  });
});

describe("provider failure normalization", () => {
  it("turns a rejected rate-limit event into a safe, actionable message", () => {
    expect(extractProviderFailure({
      type: "rate_limit_event",
      rate_limit_info: { status: "rejected", resetsAt: 123456 },
    })).toBe("The provider is authenticated, but its current usage or spend limit is exhausted.");
  });
});
