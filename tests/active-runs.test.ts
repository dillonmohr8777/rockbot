import { describe, expect, it } from "vitest";
import { cancelActiveRun, registerActiveRun, unregisterActiveRun } from "@/lib/orchestrator/active-runs";

describe("active run cancellation", () => {
  it("cancels only an explicitly registered server run", () => {
    const controller = new AbortController();
    registerActiveRun("rb-test-cancel", controller);

    expect(cancelActiveRun("rb-test-cancel")).toBe(true);
    expect(controller.signal.aborted).toBe(true);

    unregisterActiveRun("rb-test-cancel");
    expect(cancelActiveRun("rb-test-cancel")).toBe(false);
  });
});
