import { describe, expect, it } from "vitest";
import { parsePersistedRun } from "@/lib/orchestrator/persisted-run";

describe("saved run recovery", () => {
  it.each([
    "", "broken JSON", "null", "[]", "7", '"text"',
    JSON.stringify({ runId: 123 }),
    JSON.stringify({ runId: "../invalid" }),
  ])("rejects malformed saved data: %s", (raw) => {
    expect(parsePersistedRun(raw)).toBeNull();
  });

  it("recovers a valid run ID even when its optional fields are malformed", () => {
    const recovered = parsePersistedRun(JSON.stringify({
      runId: "rb-test",
      localId: [],
      prompt: { text: "invalid" },
      provider: "unknown",
      model: 7,
      agentId: {},
      startedAt: "not-a-date",
    }));
    expect(recovered).toMatchObject({
      runId: "rb-test",
      localId: "recovered-rb-test",
      prompt: "Recover the interrupted Rockbot run",
      provider: "codex",
      model: "default",
      agentId: "marketing-chief",
    });
    expect(Number.isFinite(Date.parse(recovered!.startedAt))).toBe(true);
  });

  it("preserves a valid interrupted run", () => {
    const saved = {
      runId: "rb-20261003010101-abcd1234",
      localId: "local-test",
      prompt: "Run the synthetic recovery canary.",
      provider: "demo",
      model: "protocol-54-fixture",
      agentId: "marketing-chief",
      startedAt: "2026-10-03T01:01:01.000Z",
    };
    expect(parsePersistedRun(JSON.stringify(saved))).toEqual(saved);
  });

  it.each([{ runId: "rb-legacy" }, { runId: "rb-legacy", prompt: null, startedAt: "" }])("keeps existing defaults for a legacy run: %j", (saved) => {
    const recovered = parsePersistedRun(JSON.stringify(saved));
    expect(recovered).toMatchObject({
      runId: "rb-legacy",
      localId: "recovered-rb-legacy",
      prompt: "Recover the interrupted Rockbot run",
      provider: "codex",
      model: "default",
      agentId: "marketing-chief",
    });
    expect(Number.isFinite(Date.parse(recovered!.startedAt))).toBe(true);
  });
});
