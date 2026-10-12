import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertAllowedWorkingDirectory,
  assertPromptHasNoLikelySecret,
  redact,
} from "../src/lib/orchestrator/safety";

describe("local safety gates", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the configured project roots", () => {
    const root = path.resolve("test-allowlist");
    const project = path.join(root, "project");
    vi.stubEnv("ROCKBOT_ALLOWED_ROOTS", root);
    expect(assertAllowedWorkingDirectory(project)).toBe(project);
    expect(() => assertAllowedWorkingDirectory(`${root}-other`)).toThrow(/outside Rockbot/);
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
