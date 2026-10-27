import { describe, expect, it } from "vitest";
import type { ProviderHealth } from "@/lib/contracts";
import { runtimeStatusJson } from "@/lib/runtime-status";

const provider = (id: ProviderHealth["id"], state: ProviderHealth["state"], installed = true): ProviderHealth => ({
  id, label: id, state, installed, version: "9.9.9", detail: "/Users/someone/.secret/path", models: [], capabilities: ["chat"],
});
const snapshot = {
  status: "ready",
  providers: [provider("demo", "ready"), provider("codex", "ready"), provider("claude", "needs_auth"), provider("grok", "unavailable", false)],
  knowledge: { routines: 54, cadence: {}, sourceHash: "abc", workflow: "w" },
  policy: { maxConcurrentSpecialists: 3, maxEvaluatorLoops: 2, externalActionsDefault: "denied", allowedRoots: ["/Users/someone/code"] },
};

describe("runtimeStatusJson", () => {
  it("returns a JSON string of real providers only, without paths, versions or details", () => {
    const raw = runtimeStatusJson({ snapshot, failed: false, at: "2026-10-27T21:00:00.000Z" });
    expect(typeof raw).toBe("string");
    const out = JSON.parse(raw);
    expect(out.providers.map((p: { id: string }) => p.id)).toEqual(["codex", "claude", "grok"]);
    expect(out.by_state).toEqual({ ready: 1, needs_auth: 1, unavailable: 1 });
    expect(out.observed_at).toBe("2026-10-27T21:00:00.000Z");
    expect(out.policy).toEqual({ max_concurrent_specialists: 3, max_evaluator_loops: 2, external_actions_default: "denied" });
    expect(raw).not.toMatch(/Users|secret|9\.9\.9|allowedRoots|sourceHash/);
  });

  it("says loading or failed with an actionable message before a snapshot exists", () => {
    expect(JSON.parse(runtimeStatusJson({ snapshot: null, failed: false, at: null })).runtime_check).toBe("loading");
    const failed = JSON.parse(runtimeStatusJson({ snapshot: null, failed: true, at: null }));
    expect(failed.runtime_check).toBe("failed");
    expect(failed.error).toMatch(/reload Rockbot/);
  });
});
