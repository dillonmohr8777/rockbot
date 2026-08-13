import { describe, expect, it } from "vitest";
import routinesDocument from "../src/generated/routines.json";

describe("sealed routine knowledge", () => {
  it("preserves the exact Protocol 54 inventory", () => {
    expect(routinesDocument.routines).toHaveLength(54);
    expect(new Set(routinesDocument.routines.map((routine) => routine.id)).size).toBe(54);
    expect(routinesDocument.cadence).toEqual({
      daily: 26,
      weekly: 9,
      "weekly-twice": 2,
      monthly: 5,
      event: 12,
    });
  });

  it("keeps every evidence and approval boundary explicit", () => {
    for (const routine of routinesDocument.routines) {
      expect(routine.steps.length).toBeGreaterThan(0);
      expect(routine.success_evidence.length).toBeGreaterThan(3);
      expect(routine.approval_boundary.length).toBeGreaterThan(3);
    }
  });

  it("keeps the weekly Prospect Radar routine on the canonical 25-site contract", () => {
    const routine = routinesDocument.routines.find((entry) => entry.id === "W05");
    expect(routine?.name).toContain("25-site");
    expect(routine?.trigger).toContain("at least 25");
    expect(routine?.output).toContain("25-site batch");
    expect(routine?.success_evidence).toContain("25 of 25");
  });
});
