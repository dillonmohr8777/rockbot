import { describe, expect, it } from "vitest";
import { RunRequestSchema } from "@/lib/contracts";

const request = {
  prompt: "Run a bounded evidence check.",
  provider: "demo",
  agentId: "delivery-evidence-auditor",
  workingDirectory: "C:\\Users\\dillo\\Documents\\Codex\\projects\\rockbot",
};

describe("run request contract", () => {
  it("accepts a bounded server-side timeout", () => {
    expect(RunRequestSchema.parse({ ...request, timeoutSeconds: 5 }).timeoutSeconds).toBe(5);
  });

  it("rejects zero or unbounded timeout overrides", () => {
    expect(RunRequestSchema.safeParse({ ...request, timeoutSeconds: 0 }).success).toBe(false);
    expect(RunRequestSchema.safeParse({ ...request, timeoutSeconds: 3_601 }).success).toBe(false);
  });
});
