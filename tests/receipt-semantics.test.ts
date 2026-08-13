import { describe, expect, it } from "vitest";
import { deriveArtifactState, hasVerifiedProviderBoundary, reportsBlockedOutcome, requiresExternalApproval } from "@/lib/orchestrator/execute";

describe("receipt semantics", () => {
  it("treats a draft-only request as a completed local artifact boundary", () => {
    expect(deriveArtifactState("Draft a client reply, but do not send or publish it.", ["evidence-hash"])).toBe("drafted");
    expect(requiresExternalApproval("Draft a client reply, but do not send or publish it.")).toBe(false);
  });

  it("requires approval when delivery is part of the requested outcome", () => {
    expect(deriveArtifactState("Draft and send a client update.", ["evidence-hash"])).toBe("drafted");
    expect(requiresExternalApproval("Draft and send a client update.")).toBe(true);
  });

  it("keeps previews staged without inferring delivery", () => {
    expect(deriveArtifactState("Prepare a staging preview for review only.", ["evidence-hash"])).toBe("staged");
    expect(requiresExternalApproval("Prepare a staging preview for review only.")).toBe(false);
  });

  it("does not claim an artifact from intent without captured output evidence", () => {
    expect(deriveArtifactState("Draft and stage a preview.", [])).toBe("none");
  });

  it("records workspace artifacts from provider-observed file changes", () => {
    expect(deriveArtifactState("Build the page.", ["evidence-hash"], [{ path: "index.html", kind: "created" }])).toBe("created");
    expect(deriveArtifactState("Fix the page.", ["evidence-hash"], [{ path: "index.html", kind: "modified" }])).toBe("modified");
  });

  it("does not treat prohibited writing or staging as a produced artifact", () => {
    expect(deriveArtifactState("Do not edit, write, checkout, deploy, or change any state.", ["evidence-hash"])).toBe("none");
    expect(deriveArtifactState("Never prepare a preview or staging artifact.", ["evidence-hash"])).toBe("none");
  });

  it("uses enforced adapter boundary evidence instead of brittle model wording", () => {
    expect(hasVerifiedProviderBoundary({ text: "No exact footer required.", externalActionAttempted: false, boundary: "codex_read_only_sandbox" })).toBe(true);
    expect(hasVerifiedProviderBoundary(undefined)).toBe(false);
  });

  it("does not upgrade a model-reported blocker into a complete receipt", () => {
    expect(reportsBlockedOutcome("Outcome: Blocked by the workspace's read-only filesystem policy.")).toBe(true);
    expect(reportsBlockedOutcome("The requested index.html was not created because the write was rejected.")).toBe(true);
    expect(reportsBlockedOutcome("Outcome: Complete. Created and verified index.html.")).toBe(false);
  });
});
