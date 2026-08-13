# Rockbot project rules

Rockbot is Dillon's local, model-agnostic operating-team console. It is not a
canonical client queue and it does not inherit external-delivery authority.

## Start here

1. Read `PRODUCT.md`.
2. Read `DESIGN.md` when present and `.impeccable/surfaces/command-center.md`.
3. Run `npm run sync:knowledge` before changing routine or agent data.
4. Run `npm run verify:knowledge` after any knowledge-sync change.

## Source authority

- The generated shared vault is read-only context.
- Canonical client state and approvals remain in `client-operations`.
- The Rockbot knowledge pack under
  `C:\Users\dillo\repos\dillon-os\11_Agents\Rockbot Operating System` is the
  source for the 54 sanitized routine definitions and operating-team records.
- Generated files under `src/generated/` are refreshed by the supported sync
  script. Do not hand-edit them.

## Runtime safety

- Never pass secrets in command arguments, output, receipts, fixtures, or logs.
- Real provider runs default to `observe` and never use bypass flags.
- `workspace` mode is an explicit per-run choice and may write only inside the
  validated working directory.
- External sends, posts, publication, deployment, spend, account changes,
  destructive actions, and canonical queue writes remain denied.
- Model availability and authentication are checked live. Installed does not
  mean ready.
- Maximum concurrent specialists is three. Maximum evaluator loops is two.

## Commands

```powershell
npm run dev
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run sync:knowledge
npm run verify:knowledge
```

## Completion floor

Run typecheck, unit tests, production build, knowledge verification, desktop
and mobile browser inspection, keyboard/focus and reduced-motion checks, console
checks, and the manual Impeccable detector on changed UI targets.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
