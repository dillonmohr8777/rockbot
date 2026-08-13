import { describe, expect, it } from "vitest";
import { getAgent } from "../src/data/agents";
import { demoAdapter } from "../src/lib/providers/demo";

describe("deterministic demo provider", () => {
  it("proves the full stream without contacting a model", async () => {
    const stream = demoAdapter.execute({
      runId: "test-run",
      agent: getAgent("marketing-chief"),
      prompt: "Run the canary",
      workingDirectory: "C:\\Users\\dillo\\Documents\\Codex\\projects\\rockbot",
      permissionMode: "observe",
    });
    let body = "";
    while (true) {
      const next = await stream.next();
      if (next.done) {
        expect(next.value.text).toContain("54-routine manifest");
        break;
      }
      body += next.value.content;
    }
    expect(body).toContain("external action attempted = none");
  });
});
