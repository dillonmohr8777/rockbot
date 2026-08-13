---
name: "Rockbot"
description: "A quiet, evidence-led operating console for bounded model work."
colors:
  ink: "#1c1d1b"
  ink-secondary: "#555853"
  ink-muted: "#62665f"
  canvas: "#ffffff"
  sidebar: "#f3f3f1"
  surface: "#f7f7f5"
  surface-strong: "#ecece8"
  line: "#deded9"
  line-strong: "#c8c9c2"
  work-cobalt: "#265cf0"
  work-cobalt-dark: "#1744c7"
  work-cobalt-soft: "#edf2ff"
  evidence-green: "#137c52"
  evidence-green-soft: "#eaf7f0"
  boundary-amber: "#a95d0b"
  boundary-amber-soft: "#fff4df"
  stopped-red: "#b43932"
  stopped-red-soft: "#fff0ee"
  selection-field: "#ccdbff"
  selection-ink: "#10275f"
  action-hover-ink: "#111311"
  complete-ink: "#116644"
  observe-ink: "#176b4b"
  output-ink: "#292b28"
  provider-ollama: "#315d52"
  group-label: "#6c706a"
  search-placeholder: "#72766f"
  composer-placeholder: "#747871"
  selection-marker: "#767973"
  partial-ink: "#784709"
  workspace-ink: "#86500e"
  inline-error-ink: "#8d2f29"
  run-error-ink: "#8e2b26"
  disabled-ink: "#92958f"
  focus-soft: "#a8b8e9"
  shortcut-ink: "#bfc1bb"
  provider-claude: "#c45c36"
  model-trigger: "#e5e5e1"
  new-run-shadow-pigment: "rgba(20, 22, 20, 0.12)"
  toggle-shadow-pigment: "rgba(0,0,0,.16)"
typography:
  display:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "22px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "15px"
    fontWeight: 680
    lineHeight: 1.45
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.45
    letterSpacing: "0.025em"
  mono:
    fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace'
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.45
  micro:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "9px"
    fontWeight: 400
    lineHeight: 1.45
  compact:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  control:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  subheading:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.25
  error-title:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "25px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  display-mobile:
    fontFamily: '"Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    fontSize: "clamp(30px, 9vw, 40px)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.035em"
rounded:
  hairline: "2px"
  code: "4px"
  compact: "7px"
  sm: "8px"
  control: "9px"
  row: "10px"
  strong: "11px"
  md: "12px"
  overlay: "14px"
  message: "15px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  xxl: "34px"
components:
  new-run-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: "42px"
  authority-observe:
    backgroundColor: "{colors.evidence-green-soft}"
    textColor: "{colors.evidence-green}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "34px"
  agent-row-selected:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "5px 8px"
    height: "45px"
  search-field:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "36px"
  composer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 11px 9px"
    width: "820px"
  send-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    size: "34px"
  run-state-working:
    backgroundColor: "{colors.work-cobalt-soft}"
    textColor: "{colors.work-cobalt-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 7px"
  receipt-complete:
    textColor: "{colors.evidence-green}"
    typography: "{typography.label}"
---

# Design System: Rockbot

## Overview

**Creative North Star: "The Evidence Workbench"**

Rockbot is a quiet operating surface where work is routed, inspected, and proven. Its generous white canvas keeps the current task dominant while a dense neutral rail keeps the operating team, evidence seal, and model readiness within reach. The visual hierarchy behaves like a well-kept workbench: tools have stable positions, state has exact language, and decoration never competes with evidence.

The system translates the installed Grok Bot topology through Protocol 54 semantics without borrowing its identity. Original geometric bot marks provide individual color and character; cobalt, green, amber, and red are reserved for actual work, verified evidence, approval boundaries, and stopped states. The result is calm, direct, warm, and operational rather than promotional.

**Key Characteristics:**

- Quiet light field with a fixed, dense operating-team rail.
- One dominant conversation canvas and a bottom-anchored composer.
- Compact system type for high-frequency scanning, with mono reserved for routine IDs and paths.
- Original geometric bot marks as the primary identity signal.
- Semantic color appears only when the underlying state is real.
- Responsive structure changes at established breakpoints without horizontal page overflow.

**The Evidence Before State Rule.** Evidence, receipt, and authority treatments must remain visually adjacent to the action or claim they qualify.

## Colors

The palette is restrained and nearly neutral; saturated color is a state language, not atmosphere.

### Primary

- **Work Cobalt:** Marks active work, selected routines, focus, and interactive emphasis.
- **Deep Work Cobalt:** Carries readable text on the soft work field and high-confidence hover states.
- **Soft Work Cobalt:** Provides the quiet selected or in-progress surface behind cobalt text.

### Secondary

- **Evidence Green:** Means ready, verified, complete, or safely denied external action.
- **Boundary Amber:** Means approval required, partial, or authentication needed.
- **Stopped Red:** Means blocked, failed, unavailable, or explicitly stopped.
- **Provider Identity:** Claude clay and Ollama teal appear only inside provider marks; black remains the Codex and Grok provider mark.

### Neutral

- **Workbench Ink:** Primary text and the strongest action surface.
- **Secondary Ink:** Explanatory copy and readable supporting content.
- **Muted Ink:** Metadata, timestamps, inactive labels, and secondary controls.
- **Canvas White:** The main conversation and composer field.
- **Rail Gray:** The fixed sidebar field that separates tools from the active task.
- **Quiet Surface / Strong Surface:** Hover, selected, grouping, and inset-control layers.
- **Hairline / Strong Hairline:** Dividers and restrained control boundaries.
- **Operational Inks:** Dedicated observe, workspace, complete, partial, inline-error, run-error, disabled, selection, output, placeholder, shortcut, and group-label values preserve readable state distinctions.
- **Selection and Focus Fields:** The browser selection pair and soft focus border are deliberate cobalt-family support values.
- **Shadow Pigments:** The New Run and toggle shadows retain their exact translucent neutral pigments as implementation tokens, not surface colors.

**The Semantic Rarity Rule.** Cobalt, green, amber, and red are prohibited as decoration. Each must correspond to active work, verified evidence, an approval boundary, or a stopped state.

**The Colored Identity Rule.** Agent hues belong to the geometric bot glyphs. They may identify a worker, but they never replace the shared semantic state colors.

## Typography

**Display Font:** Segoe UI Variable (with Segoe UI and platform sans fallbacks)  
**Body Font:** Segoe UI Variable (with Segoe UI and platform sans fallbacks)  
**Label/Mono Font:** Cascadia Code (with SFMono-Regular and Consolas fallbacks)

**Character:** One compact, familiar system sans carries the console so the interface disappears into the task. Weight, density, and measure establish hierarchy; mono appears only where machine-readable identity matters.

### Hierarchy

- **Display** (650, 32–48px, 1.05): The welcome question only; balanced and tightly tracked without becoming promotional.
- **Headline** (650, 22px, 1.25): Rendered run-output headings and compact error titles.
- **Title** (680, 15px, 1.45): Product identity, inspector titles, and prominent control labels.
- **Body** (400, 14px, 1.45): Standard controls and task copy; narrative output expands to 1.68 line-height and remains within 74ch.
- **Label** (650, 11px, 0.025em when grouped): Dense metadata, grouped navigation, and compact state language.
- **Mono** (700, 10px, 1.45): Routine IDs, file paths, and inline machine artifacts only.
- **Micro** (400–700, 9px, 1.45): Receipts, cadence, provider readiness, and the smallest exact state metadata.
- **Compact** (400–680, 12px, 1.45–1.6): Evidence copy, compact rows, and smaller mobile actions.
- **Control** (400–680, 13px, 1.45): Agent labels, header identity, mobile body copy, and mobile output.
- **Subheading** (650, 17px, 1.25): Second-level headings in rendered output.
- **Error Title** (650, 25px, 1.25): The bounded full-screen error heading.
- **Mobile Display** (650, 30–40px, 1.05): The welcome question at and below the mobile shell breakpoint.

**The One Console Voice Rule.** Display fonts are forbidden in labels, buttons, data, and receipts. The system sans remains the operating voice everywhere.

## Layout

Desktop uses a full-viewport two-pane shell: a fixed 352px operating-team rail and a minmax conversation pane. The rail can collapse to 72px. The main pane is three rows—61px header, scroll-contained thread, and bottom composer zone—with a 920px thread container and an 820px composer. The welcome proof sequence is centered within a 670px measure.

At 980px, the rail tightens to 310px and the conversation reduces inline padding. At 760px, the shell becomes a single pane; the rail and inspector become dismissible off-canvas surfaces, the composer uses the available width with 9px gutters, and touch controls grow to at least 44px. The desktop and 390px live views have no horizontal page overflow.

Spacing is compact and functional: 4–12px inside controls, 18–24px between related regions, and 34–44px between major thread groups. Text measure remains narrow enough to scan while lists and execution lanes are allowed to scroll within their own bounds.

**The Fixed Tooling Rule.** The model selector stays at the bottom of the rail and the composer stays at the bottom of the work surface; neither floats into the evidence stream.

## Elevation & Depth

The workbench is flat by default. White, rail gray, quiet surfaces, and hairlines establish most hierarchy. Shadow appears only where an element physically overlays or anchors above the canvas: the model menu, composer, off-canvas rail, inspector, error surface, selected segmented control, and active bot glyph.

### Shadow Vocabulary

- **Menu Overlay** (`0 18px 42px rgba(26, 28, 24, 0.14), 0 3px 10px rgba(26, 28, 24, 0.08)`): Model picker and elevated selection surfaces.
- **Composer Anchor** (`0 10px 30px rgba(30, 32, 29, 0.08), 0 2px 8px rgba(30, 32, 29, 0.05)`): Separates the persistent composer from the scrolling conversation.
- **Off-Canvas Panel** (`±16px 0 42px rgba(26, 28, 24, 0.12–0.14)`): Indicates the sidebar or inspector has moved above the main task plane.
- **Compact Selection** (`0 2px 6px rgba(30, 32, 29, 0.08)`): Selected segment within an inset control only.

**The Flat Until Overlaid Rule.** In-flow cards, lists, execution lanes, receipts, and status fields use tonal layers or hairlines, never ambient shadow.

## Shapes

Rockbot's incumbent radius vocabulary is exact and role-based: 2px for the thinking rail, 4px for inline code and the user-message tail, 7px for the smallest inset controls, 8–12px across fields and rows, 14px for overlays and the mobile composer, 15px for the user message, and 16px for the main composer and error surface. Pills are limited to state badges, removable routine chips, and toggles.

Bot identity comes from compact geometric glyphs with rotated triangular, diamond, circular, and cutout forms. These marks may cast a small color-matched active shadow, but the surrounding UI stays orthogonal and quiet.

**The Controlled Curve Rule.** Large containers never exceed the 16px system maximum. Full pills are reserved for compact status and switch semantics.

## Components

### Buttons

- **Shape:** Compact controls use 8–12px corners; icon actions are 34px square on desktop and 44px on mobile.
- **Primary:** The New Run and enabled Send actions use Workbench Ink on Canvas White; New Run is 42px high and Send is 34px square.
- **Hover / Focus:** Primary hover darkens or moves to Work Cobalt. Every keyboard focus uses a 2px cobalt outline with 2px offset.
- **Secondary / Ghost:** Header, composer, row, and icon actions remain transparent until a quiet neutral hover surface appears.
- **Disabled / Stop:** Disabled Send uses muted gray; Stop uses Stopped Red on its soft field.

### Chips

- **Style:** Run states and selected routines use compact pills with semantic foreground and soft semantic background.
- **State:** Working is cobalt, complete is green, partial is amber, and blocked or failed is red. Labels are uppercase only when they are actual state tags.

### Cards / Containers

- **Corner Style:** 8–16px, selected by physical role rather than arbitrary variation.
- **Background:** White for the task plane, rail gray for fixed tools, and quiet neutral surfaces for grouping.
- **Shadow Strategy:** Flat in flow; only overlays and the bottom composer receive elevation.
- **Border:** 1px hairlines separate lists, tabs, and evidence regions without producing card grids.
- **Internal Padding:** Usually 8–18px; major inspector and error surfaces may reach 28px.

### Inputs / Fields

- **Style:** Search fields are quiet gray, borderless, and 36px high on desktop. The composer is white with a strong hairline and 16px corners. Paths use the mono role.
- **Focus:** Search receives an inset strong hairline; composer focus shifts to a pale cobalt border and cobalt-tinted anchor shadow; keyboard focus remains visibly outlined.
- **Error / Disabled:** Errors use the stopped-red soft field. Disabled actions remain legible but lose emphasis.

### Navigation

The desktop rail is a dense, scroll-contained list grouped by Command, Cadence Bots, and Specialists. Selected rows use a stronger neutral field plus a 1px terminal marker; hover uses the quieter rail surface. The footer permanently holds the evidence seal and model picker. Mobile navigation is an off-canvas dialog with a scrim, 44px controls, and Escape dismissal.

### Execution Lane

The execution lane is a single horizontal tonal strip, not a grid of cards. Specialists remain muted until working; cobalt identifies current work and green identifies completed evidence. Arrows show bounded fan-out and fan-in without turning topology into decoration.

### Evidence Receipt

The receipt is a hairline-separated status region at the end of every completed run. Outcome, evidence count, decision state, redaction, and external-action status remain explicit and use the same semantic vocabulary as the run.

### Inspector

Runtime, routines, and schedules live in a 440px right-side overlay with a three-tab underline navigation. Search, segmented authority, provider health, contract lists, and recorded schedule rows share the same compact neutral vocabulary. Recorded templates must never look like live scheduler state.

## Do's and Don'ts

### Do:

- **Do** keep one Marketing Chief surface, a flat specialist bench, and a dominant conversation canvas.
- **Do** keep the model selector anchored at the bottom of the rail and readiness visible before a run begins.
- **Do** reserve Work Cobalt for active work, Evidence Green for verified evidence, Boundary Amber for approval boundaries, and Stopped Red for stopped or unavailable states.
- **Do** preserve exact outcome language: complete, partial, blocked, drafted, staged, deployed, sent, and verified are visually and verbally distinct.
- **Do** keep evidence, authority, receipt, and external-action state adjacent to the claim they qualify.
- **Do** use original geometric bot marks and recorded agent colors as identity.
- **Do** preserve visible keyboard focus, reduced-motion behavior, 44px mobile controls, and zero horizontal page overflow.

### Don't:

- **Don't** use semantic color as decoration or apply heavy color to inactive states.
- **Don't** copy proprietary Grok Bot artwork, source, or private content; its shell topology and density are reference evidence only.
- **Don't** turn the console into a marketing dashboard, identical card grid, glass surface, decorative gradient, or dark neon AI-tool cliché.
- **Don't** use display typography in labels, buttons, data, routine IDs, receipts, or provider controls.
- **Don't** invent completion, readiness, evidence, scheduler state, or provider authentication.
- **Don't** hide approval boundaries inside generic warnings or merge partial, blocked, drafted, sent, and verified into one success treatment.
- **Don't** add ambient shadows to in-flow cards, lists, lanes, or receipts; tonal layering and hairlines carry structure.
- **Don't** exceed the 16px container radius or use pills for ordinary cards and fields.
- **Don't** add decorative motion. Motion only reveals or confirms a state change and must collapse under reduced motion.
