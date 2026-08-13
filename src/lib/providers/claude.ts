import { spawnSync } from "node:child_process";
import type { ProviderAdapter } from "@/lib/providers/types";
import { commandVersion, resolveCommand, runJsonLineCommand } from "@/lib/providers/command";

export const claudeAdapter: ProviderAdapter = {
  id: "claude",
  async health() {
    const command = resolveCommand("claude");
    if (!command) {
      return { id: "claude", label: "Claude", state: "unavailable", installed: false, detail: "Claude Code was not found.", models: [], capabilities: ["chat", "reasoning", "workspace"] };
    }
    const auth = spawnSync(command, ["auth", "status"], { encoding: "utf8", windowsHide: true, timeout: 8_000 });
    let loggedIn = false;
    try {
      loggedIn = Boolean(JSON.parse(auth.stdout || "{}").loggedIn);
    } catch {
      loggedIn = auth.status === 0 && /logged.?in/i.test(`${auth.stdout} ${auth.stderr}`);
    }
    return {
      id: "claude",
      label: "Claude",
      state: loggedIn ? "ready" : "needs_auth",
      installed: true,
      version: commandVersion(command),
      detail: loggedIn ? "Authenticated through the local Claude Code session." : "Installed; local login is required.",
      models: [{ id: "default", label: "Account default" }, { id: "opus", label: "Opus alias" }, { id: "sonnet", label: "Sonnet alias" }],
      capabilities: ["chat", "reasoning", "workspace"],
    };
  },
  async *execute(context) {
    const command = resolveCommand("claude");
    if (!command) throw new Error("Claude Code is unavailable.");
    const args = ["-p", "--verbose", "--output-format", "stream-json", "--no-session-persistence", "--permission-mode", context.permissionMode === "workspace" ? "acceptEdits" : "plan"];
    if (context.model && context.model !== "default") args.push("--model", context.model);
    return yield* runJsonLineCommand(
      command,
      args,
      context,
      context.prompt,
      context.permissionMode === "workspace" ? "claude_accept_edits_mode" : "claude_plan_mode",
    );
  },
};
