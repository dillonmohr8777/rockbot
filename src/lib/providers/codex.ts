import { spawnSync } from "node:child_process";
import type { ProviderAdapter } from "@/lib/providers/types";
import { commandVersion, resolveCommand, runJsonLineCommand } from "@/lib/providers/command";

export const codexAdapter: ProviderAdapter = {
  id: "codex",
  async health() {
    const command = resolveCommand("codex");
    if (!command) {
      return { id: "codex", label: "Codex", state: "unavailable", installed: false, detail: "Codex CLI was not found.", models: [], capabilities: ["chat", "reasoning", "workspace"] };
    }
    const auth = spawnSync(command, ["login", "status"], { encoding: "utf8", windowsHide: true, timeout: 8_000 });
    const ready = auth.status === 0 && /logged in/i.test(`${auth.stdout} ${auth.stderr}`);
    return {
      id: "codex",
      label: "Codex",
      state: ready ? "ready" : "needs_auth",
      installed: true,
      version: commandVersion(command),
      detail: ready ? "Authenticated through the local Codex CLI." : "Installed; local login is required.",
      models: [{ id: "default", label: "Account default" }, { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" }, { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" }],
      capabilities: ["chat", "reasoning", "workspace"],
    };
  },
  async *execute(context) {
    const command = resolveCommand("codex");
    if (!command) throw new Error("Codex CLI is unavailable.");
    const args = [
      "exec",
      "--json",
      "--ephemeral",
      "--ignore-rules",
      "--disable",
      "apps",
      "--disable",
      "browser_use",
      "--disable",
      "in_app_browser",
      "--skip-git-repo-check",
      "--cd",
      context.workingDirectory,
      "--sandbox",
      context.permissionMode === "workspace" ? "workspace-write" : "read-only",
    ];
    if (context.model && context.model !== "default") args.push("--model", context.model);
    args.push("-");
    return yield* runJsonLineCommand(
      command,
      args,
      context,
      context.prompt,
      context.permissionMode === "workspace" ? "codex_workspace_sandbox" : "codex_read_only_sandbox",
    );
  },
};
