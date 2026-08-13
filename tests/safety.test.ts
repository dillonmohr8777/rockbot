import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertAllowedWorkingDirectory,
  assertPromptHasNoLikelySecret,
  redact,
} from "../src/lib/orchestrator/safety";

describe("local safety gates", () => {
  it("accepts only the configured project roots", () => {
    expect(assertAllowedWorkingDirectory("C:\\Users\\dillo\\Documents\\Codex\\projects\\rockbot"))
      .toBe(path.resolve("C:\\Users\\dillo\\Documents\\Codex\\projects\\rockbot"));
    expect(() => assertAllowedWorkingDirectory("C:\\Windows\\System32")).toThrow(/outside Rockbot/);
  });

  it("stops likely credentials before provider transmission", () => {
    expect(() => assertPromptHasNoLikelySecret("Use api_key=abcdefghijklmnop1234"))
      .toThrow(/appears to contain/);
    expect(() => assertPromptHasNoLikelySecret("Use the approved vault locator"))
      .not.toThrow();
  });

  it("redacts secrets and personal email from persisted output", () => {
    expect(redact("Bearer abcdefghijklmnopqrstuvwxyz person@example.com"))
      .toBe("[REDACTED] [redacted-email]");
  });
});
