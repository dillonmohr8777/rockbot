import { describe, expect, it } from "vitest";
import { routeTask } from "../src/lib/orchestrator/router";

describe("Marketing Chief router", () => {
  it("builds the web maker-checker lane and caps it at three agents", () => {
    const plan = routeTask("Build and verify a responsive dashboard UI", "marketing-chief", true);
    expect(plan.routeId).toBe("web-build");
    expect(plan.agents.map((agent) => agent.id)).toEqual([
      "web-product-builder",
      "design-art-direction-critic",
      "independent-qa-release-critic",
    ]);
    expect(plan.agents.length).toBeLessThanOrEqual(3);
    expect(plan.makerChecker).toBe(true);
  });

  it("honors direct specialist selection without inventing a team", () => {
    const plan = routeTask("Review this source", "research-scout", true);
    expect(plan.routeId).toBe("direct-specialist");
    expect(plan.agents.map((agent) => agent.id)).toEqual(["research-scout"]);
    expect(plan.makerChecker).toBe(false);
  });
});
