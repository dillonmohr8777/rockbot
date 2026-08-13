# Rockbot batch evaluation: `phl-2026-w34`

Date: 2026-08-13 ET  
Client: `momentum-360`  
Program: AI Tech News / AI Site Builder Outreach Engine  
Immutable source: `dillonmohr8777/dillon-os` commit `4eb6b61f22bea7af5618eb581118e5c3362d200d`  
Authority: observe and propose only

## Outcome

Rockbot successfully handled bounded single-agent audit and art-direction lanes against the exact 25-site batch. A three-specialist, all-sites review plus Marketing Chief synthesis exceeded the 15-minute interactive ceiling and correctly ended blocked and unverified. The evaluation exposed and fixed three Rockbot contract defects: stale W05 20-site language, negated “do not write” prompts being mislabeled as drafted artifacts, and missing server-enforced timeouts/output attestations.

No site, prospect record, deployment, outreach state, `mail_ready` value, or canonical queue was changed.

## Run matrix

| Lane | Provider | Runtime | Receipt / result |
|---|---|---:|---|
| Three-specialist all-site deep audit plus synthesis | Codex `gpt-5.6-sol` | 15m | `rb-20260813194516-026e909e` — blocked, unverified |
| Immutable metadata and evidence audit | Codex default | 3m 48s | `rb-20260813200504-86b60fee` — complete, local output captured |
| Art-direction remediation system | Grok default | 1m 44s | `rb-20260813200920-17ce41f2` — complete, local output captured |
| Current capacity canary | Claude default | 4.5s | `rb-20260813202946-1f3d0b87` — blocked, monthly spend limit exhausted |
| Explicit timeout canary | Ollama `nemotron-3-nano:4b` | 5.0s | `rb-20260813202042-8f49930a` — blocked, unverified, persisted |
| Small W05 operator-board comparison | Ollama `llama3.2:3b` | 1m 3s | `rb-20260813202102-7ed0bdf8` — text returned but failed qualitative review |
| Final deterministic canary | Rockbot Demo | 0.3s | `rb-20260813202329-2ed52a35` — complete, locally verified |

## Verified batch facts

- The immutable batch contains exactly PHL001 through PHL025 with no missing, extra, or duplicate IDs.
- `batch.json`, `manifest.csv`, `prospects.csv`, `batch-summary.json`, and `batch-report.md` reconcile on identity and status fields.
- Structural QA records 25 of 25 `PASS`.
- `qa_ready` is 14 `ready` and 11 `hold`.
- Every `mail_ready` value is `hold`.
- Recomputed averages are 10 sections, 448.64 words (reported as 449), and 13 images.
- The committed site HTML averages 45,232.8 bytes, approximately 44.17 KiB.
- The 325 WebP blobs are byte-unique. This does not establish perceptual uniqueness.
- `visual_qa=ran` records execution only. It does not establish a pass verdict or provide a visual receipt.
- The 11 held rows have no explicit evidence-backed hold reason. Missing phone/address data correlates with all 11 holds, but the committed artifacts do not declare it as the rule.

Held slugs:

1. `barnes-financial-group`
2. `bg-electric`
3. `bpm-fitness`
4. `dreammaker-bath-kitchen`
5. `easy-auto-tag-insurance`
6. `fillman-and-sons-floors`
7. `live-urgent-care`
8. `malvern-vision-care`
9. `plastic-surgery-solutions`
10. `sciacca-service-center`
11. `wynnewood-eyecare`

## Art-direction decision

The likely portfolio risk is one Align HCM-derived teal/liquid-glass/3D world applied across unrelated businesses with a uniform 10-section and 13-image grammar. This is an inference until browser receipts exist.

Keep a shared factory baseline for semantic structure, accessibility, claim safety, contact certainty, mobile behavior, and noindex/hold governance. Test business-native challenger worlds rather than palette swaps:

- Clinical Light
- Optical Precision
- Fiduciary Paper
- Shop Floor
- Crafted Interior
- Athletic Heat
- Counter Service
- Outdoor Ground

First browser sample, desktop plus 390px mobile:

1. Live Urgent Care
2. Barnes Financial Group
3. BPM Fitness
4. DreamMaker Bath & Kitchen
5. Easy Auto Tag & Insurance
6. BG Electric
7. Malvern Vision Care
8. Wynnewood Eyecare
9. Always Dental Care as a `qa_ready` health control
10. Jarman HVAC as a `qa_ready` home-services control

The sample must score brand fidelity, distinctiveness, hierarchy, imagery relevance, accessibility, responsiveness, claim safety, contact certainty, and cross-batch similarity. A visual pass requires desktop/mobile screenshot receipts and an explicit verdict; `ran` is insufficient.

## Rockbot hardening completed

- W05 and its recorded schedule now use the canonical 25-site contract.
- Negated instructions such as “do not write” no longer create a false drafted-artifact receipt.
- API callers can set a bounded server-side timeout, capped by the selected agent’s own budget.
- Timeouts persist a blocked, unverified receipt.
- Provider and synthesis runs must return adapter-enforced boundary evidence. The model's wording is display content, not the security control.

## Model-routing recommendation

- Codex: repository-backed audits, deterministic checks, implementation, and final verification.
- Grok: tool-free art direction and challenger-world synthesis after evidence is supplied.
- Claude: authenticated but currently blocked by the organization monthly spend limit. Picker “ready” currently means authenticated availability, not confirmed spend capacity.
- Ollama: background or narrow low-risk tasks only. The tested 3B/4B models were slower or less disciplined than the hosted providers for this job.
- Demo: instant harness and governance canaries only.

## Next safest action

Run the 10-site browser sample against the immutable batch, record explicit visual verdicts and per-site hold reasons, then decide whether to repair the shared factory or only the held concepts. Keep all external delivery and `mail_ready` changes gated.

external action attempted = none
