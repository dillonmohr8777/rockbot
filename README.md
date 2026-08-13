# Rockbot

Rockbot is Dillon's local, model-agnostic operating-team console. It preserves
the useful interaction topology of Grok Bot, adds the sealed Protocol 54
operating system, and keeps model choice separate from agent identity.

## What is built

- A responsive two-pane command center with 1 Marketing Chief, 6 cadence bots,
  and 15 bounded specialists.
- A searchable library of all 54 recorded routines and 12 clearly labeled
  schedule templates.
- Live provider discovery and streaming adapters for Codex, Claude Code, Grok
  Build through ACP, every discovered Ollama model, and a deterministic offline
  demo fixture.
- Deterministic task routing with a three-specialist cap, maker-checker paths,
  Marketing Chief fan-in, redacted receipts, and explicit approval boundaries.
- Observe mode by default. Workspace mode is opt-in and restricted to the exact
  local allowlist. External delivery and canonical queue writes remain denied.

The app binds only to `127.0.0.1:3434`.

## Start and stop

From PowerShell:

```powershell
cd C:\Users\dillo\Documents\Codex\projects\rockbot
.\scripts\Start-Rockbot.ps1
```

Open <http://127.0.0.1:3434>. To rebuild before launch, use
`-Rebuild`. To stop the tracked hidden server:

```powershell
.\scripts\Stop-Rockbot.ps1
```

Development remains available through `npm run dev`.

## Model routing

The model switch lives at the bottom of the left sidebar. Readiness is checked
from the real local runtime every time the app opens.

| Runtime | Transport | Default authority |
| --- | --- | --- |
| Codex | `codex exec` JSONL over stdin | read-only sandbox |
| Claude | Claude Code stream JSON over stdin | plan mode |
| Grok | Grok Build ACP over stdio | plan mode, no memory |
| Local models | Ollama streaming chat API | local inference |
| Rockbot Demo | deterministic in-process fixture | synthetic only |

No prompt secret is placed in a command argument. Likely credentials are
blocked before provider transmission, and normalized output is redacted before
it reaches receipts.

## Knowledge synchronization

The Rockbot operating-system pack is the source of the generated routine data.
Refresh and verify it with:

```powershell
npm run sync:knowledge
npm run verify:knowledge
npm run heartbeat
```

Generated files under `src/generated` are not hand-edited.

The heartbeat is the enforcement pass taught to Claude: it checks source
parity, duplicate or shadow definitions, authority drift, stale provider
receipts, and product/design truth, then writes one prioritized local manifest
to `runtime/heartbeat-latest.json`. The paired
`config/workflows/bounded-revenue-loop.json` preserves the schedule, evidence,
maker, checker, bounded-repair, and canonical-handoff proof loop.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run verify:providers
npx impeccable detect --json src/app/page.tsx src/components/rockbot-app.tsx src/app/globals.css
```

The end-to-end suite runs against a production build and covers desktop and
mobile containment, the model picker, deterministic streaming, receipts,
keyboard focus, inspector authority controls, console errors, and reduced
motion. Provider canaries call each selected runtime through Rockbot and exit
nonzero when a route is blocked or fails. Set `ROCKBOT_PROVIDER` to a
comma-separated subset such as `codex,grok,ollama` for a focused check.

The current evidence ledger is in
[`docs/VERIFICATION-2026-08-13.md`](docs/VERIFICATION-2026-08-13.md).

## Architecture

- `src/components/rockbot-app.tsx`: interactive command-center shell.
- `src/lib/orchestrator`: route planning, safety boundaries, receipts, fan-out,
  and fan-in.
- `src/lib/providers`: normalized adapters for each model runtime.
- `config/workflows/operating-team.json`: portable operating-team contract.
- `src/generated/routines.json`: sealed Protocol 54 knowledge projection.
- `PRODUCT.md`, `DESIGN.md`, and `.impeccable/surfaces`: product and visual
  authority.

Rockbot is a local execution console, not a parallel canonical queue. Codex
acting as Marketing Chief remains the final synthesis and verification
authority; Dillon remains the ultimate human authority.
