import { describe, expect, it } from "vitest";
import { deriveArtifactState, hasRequiredProviderAttestation, requiresExternalApproval } from "@/lib/orchestrator/execute";

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

  it("does not treat prohibited writing or staging as a produced artifact", () => {
    expect(deriveArtifactState("Do not edit, write, checkout, deploy, or change any state.", ["evidence-hash"])).toBe("none");
    expect(deriveArtifactState("Never prepare a preview or staging artifact.", ["evidence-hash"])).toBe("none");
  });

  it("requires the exact external-action attestation as its own output line", () => {
    expect(hasRequiredProviderAttestation("Outcome: complete.\nexternal action attempted = none")).toBe(true);
    expect(hasRequiredProviderAttestation("Stop if external action attempted = deploy")).toBe(false);
    expect(hasRequiredProviderAttestation("No external actions were attempted.")).toBe(false);
  });
});
