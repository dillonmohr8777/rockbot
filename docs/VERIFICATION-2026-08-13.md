# Rockbot verification ledger

Checked 2026-08-13 against the production build bound only to
`http://127.0.0.1:3434`.

## Product and operating system

- Original local implementation; no proprietary Grok Bot renderer code or
  private content is shipped.
- 22 operating identities: Marketing Chief, 6 cadence bots, and 15 bounded
  specialists.
- 54 source-projected routines with 54 unique IDs: 26 daily, 9 weekly,
  2 twice-weekly, 5 monthly, and 12 event-triggered.
- Dynamic fan-out is capped at three specialists. Marketing Chief owns final
  synthesis; evaluator loops are capped at two in the portable workflow
  contract.
- Observe is the default authority. Workspace authority remains per-run and
  allowlisted. External actions and canonical queue writes default to denied.

## Final-build provider canaries

Every usable route was exercised through `/api/execute`, not directly against
the provider. A pass required expected normalized evidence, a schema-v2
receipt, `externalActionAttempted: false`, `deliveryState: not_attempted`, and
captured redacted output hashes.

| Provider | Result | Run receipt |
| --- | --- | --- |
| Rockbot Demo | Passed deterministic fixture | `rb-20260813192911-42d20f5f` |
| Codex | Passed exact marker | `rb-20260813192911-5b5f4696` |
| Grok 4.6 | Passed exact marker | `rb-20260813192934-3121cea7` |
| Ollama `phi4-mini:latest` | Passed exact marker | `rb-20260813192958-c91fe727` |
| Claude | Authenticated but blocked by current provider usage capacity | `rb-20260813192858-88945dab` |

Claude's blocker was normalized into a persisted `blocked` receipt with
`artifactState: none`, `deliveryState: not_attempted`,
`verificationState: unverified`, and a safe next action. It was not reported as
a completed or merely installed route.

## Automated gates

- TypeScript: pass.
- ESLint: pass.
- Vitest: 18/18 pass across 7 files.
- Production build: pass; all application and API routes compiled.
- Playwright production suite: 7 relevant passes; 7 intentional cross-project
  skips. Coverage includes desktop and mobile containment, model-dialog focus
  trap and return, mobile drawer focus and 44px targets, reversible sidebar
  collapse, keyboard controls, reduced motion, complete and partial receipts,
  and a persisted blocked receipt.
- Knowledge verification: 54/54 unique routines and exact cadence totals.
- System heartbeat: degraded but noncritical, with 10 passes, 1 warning, and
  0 failures. The only action is the current Claude capacity blocker; source
  hash parity, duplicate checks, authority, schedules, and every other provider
  receipt pass.
- Production dependency audit: 0 known vulnerabilities.
- Impeccable detector: clean (`[]`).
- Local launcher: hidden tracked start/stop, exact project and PID validation,
  loopback health readback.

## Receipt proof rules

- Artifact state is promoted only when a corresponding provider output was
  captured, redacted, and hashed. Prompt intent alone cannot prove an artifact.
- Local verification requires recorded output-hash checks. Legacy receipts
  without that evidence normalize to `unverified`.
- Consequential delivery intent produces a partial, approval-required receipt;
  a local-only draft can complete as a drafted artifact.
- Recoverable preflight, provider, and evidence failures produce a redacted
  blocked terminal receipt. Storage failures remain hard runtime failures.

## Manual design review

- Desktop and 390px mobile layouts were inspected live.
- Keyboard focus, modal inertness, focus traps, focus return, contrast, touch
  targets, responsive overflow, state color semantics, and receipt
  announcements were independently reviewed.
- `DESIGN.md` and `.impeccable/design.json` document the implemented system as
  **The Evidence Workbench**, with the command center classified as an Operate
  surface.
- Independent finish verdict: **SHIP, 8.8/10**, with every review category at
  least 8.

No message was sent, content published, deployment made, spend changed, or
canonical queue mutated during verification.
