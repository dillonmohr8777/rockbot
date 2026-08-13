import { describe, expect, it } from "vitest";
import { isSystemHeartbeatRequest } from "@/lib/orchestrator/heartbeat";

describe("system heartbeat routing", () => {
  it("recognizes the command-center heartbeat request", () => {
    expect(isSystemHeartbeatRequest("Run the system heartbeat and tell me what is stale")).toBe(true);
  });

  it("does not intercept unrelated health language", () => {
    expect(isSystemHeartbeatRequest("Review the website conversion funnel")).toBe(false);
  });
});
