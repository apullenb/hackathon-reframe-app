# Context Switch Hackathon Build Log

> Maintained continuously during the build, not reconstructed afterward. Contains no keys, no raw user message content, and no large command dumps.

## Project Information

| Field | Value |
|---|---|
| Project | Context Switch |
| Hackathon date | 2026-08-27 |
| Build start time | 11:35 CDT (doc review) / 11:41 CDT (first code) |
| Target stop time | ~16:10 CDT (4.5 h window) |
| Team members | Andrea Pullen (solo), Claude Code as build agent |
| Primary coding agent/tool | Claude Code (Opus 5) orchestrating parallel subagents |
| Repository/branch | `/Users/pullen/context-switch`, branch `main` (fresh repo) |
| Initial framework | None — empty directory. Scaffolded Vite 5 + React 18 + TypeScript by hand. |
| AI provider/model | Anthropic Messages API, model from `AI_MODEL` (default `claude-sonnet-5`) |
| Intended demo environment | Local `npm run dev` on macOS 15 / Node v23.3.0, Chrome |

## Current Status

**Phase:** 8 — UI rebuild into the Human Observability Console (branch `ui-observability-console`)  
**Demo status:** **Ready live and offline.** Rehearsed twice offline; live path verified 25/25 against a real model through the failover chain.  
**Live AI status:** **Verified end to end against a real model — 25/25 checks.** Multi-provider relay with automatic failover; Anthropic rejects at billing and OpenAI serves, labelled honestly as `LIVE · OPENAI`. Anthropic key valid (`keyConfigured=true`, provider returns 400 not 401). Transport, auth, and request shape all verified end to end. **Model output still unverified: the Anthropic account has no credit balance**, so no generation has occurred. Re-run `npm run check:live` once credits are added. See F-010.  
**Fixture fallback status:** Verified — 43/43 fixture assertions green, gate negative-tested  
**Current blocker:** None. Anthropic's balance is still empty, but the failover chain covers it and the demo runs live on OpenAI.  

## Scope Snapshot

### P0 commitments

- [x] Application shell and Context Switch branding
- [x] Role-to-role context builder
- [x] Say It Better flow
- [x] Smart follow-up questions
- [~] Live AI text integration — implemented, transport verified, **model output unverified pending a key**
- [x] Strict schema validation
- [x] Deterministic fixture fallback
- [x] Decode It flow
- [x] Conflict Lens flow
- [x] Prepared engineer/PM scenario
- [x] Prepared incoming PM scenario
- [x] Prepared spouse/partner conflict scenario
- [x] Loading and error states
- [x] Reset Demo control
- [ ] Responsive polish
- [ ] README
- [ ] Final demo verification

### P1 candidates

- [ ] Screenshot upload
- [ ] Tone slider
- [ ] Remove corporate nonsense toggle
- [ ] Editable output
- [ ] Additional animations
- [ ] Custom roles

### Scope changes

| Time | Change | Added/Cut/Changed | Reason | Impact |
|---|---|---|---|---|
| 23:05 | **Cut the product from twelve features to three** — Communicate (translator), Repair (conflict resolution), Inspect (guided self-reflection). Removed the five-workspace console shell, the tool registry, the CurrentSituation store, and every developer-metaphor feature name. | Cut | Owner review of the console build: *"this ui is terrible, i don't understand what the app is or how to use it… the engineering references are funny but they make the app too complicated."* | The console satisfied the UI brief's architecture (§3 workspaces, §6 four-region shell, §4 twelve features) and still failed the brief's **own first acceptance criterion** (§22: a new viewer understands the premise in under 20 seconds). Deleted ~9 feature surfaces and the shell; kept the translator, the conflict view, the screenshot pipeline, the AI layer, schemas, fixtures and safety. See F-016. |
| 14:50 | Visual style pinned pending a later decision; style extracted into a swappable theme layer with four candidate themes and a Settings picker. | Changed | Owner: *"let's put a pin in this, we will discuss ui design after the overall product is finished. Just make it to where the ui style can be easily changed."* | No functional change; all four gates stayed green. Deferring the choice now costs a token edit later instead of a component sweep. See D-014. |
| 13:20 | **Full visual redesign** of every surface, plus removal of all self-referential "demo" language from the product UI. | Changed | Owner review of the working build: *"this needs to look like a real, complete, finished product with an attractive and fun UI. It should not look like a demo."* The P0 functionality was complete and correct, but the presentation was plain and the interface kept describing itself as a demo. | Rebuilt the design foundation (tokens, type scale, depth, gradients, motion) and restyled all surfaces in parallel. Renamed every user-facing control away from demo vocabulary. **No functional behavior, contract, or safety rule changed** — all three gates stayed green throughout. Cost: the Phase 5 accessibility audit had to be stopped and rescheduled, since contrast and tap-target measurements taken against the old design would have been invalid. |

---

## Environment and Baseline

### Repository inspection

- **Existing files/framework:** none. The session opened in `/Users/pullen/sgapp-client` (an unrelated work repo on branch `DEV-5867-design-updates-for-wiab-dashboard`, clean worktree). Scaffolding a hackathon project into a work repo would have been wrong, so a fresh directory was created at `/Users/pullen/context-switch` and the three source documents were copied in. **No file in `sgapp-client` was modified.**
- **Existing scripts:** none. Added `dev`, `build`, `preview`, `typecheck`, `lint`, `validate:fixtures`.
- **Existing constraints:** `CLAUDE.md` mandates Vite + React 18 + TS + Tailwind + Zod + lucide-react with **no server**, which deviates from spec §16's Next.js recommendation. See D-001.
- **Dirty-worktree notes:** n/a — new repo, first commit is this build.

### Baseline verification

| Check | Command or method | Result | Notes |
|---|---|---|---|
| Toolchain | `node -v` / `npm -v` | Pass | Node v23.3.0, npm 10.9.0 |
| Install | `npm install --no-audit --no-fund` | Pass | 256 packages, 16s. Deprecation warnings from eslint 8's transitive deps only; no install errors. |
| Development server | `npm run dev` | Deferred | Verified at Milestone 1 once the shell exists. |
| Existing tests | n/a | n/a | Empty repo. Fixture-schema assertions added as `npm run validate:fixtures`. |
| Existing build | `npx tsc --noEmit` after contracts + schemas | Pass | 0 errors. |
| Secret in env | `test -n "$ANTHROPIC_API_KEY"` | Not set | Live AI untestable until a key is supplied; recorded honestly rather than claimed. |

---

## Milestone Log

Add an entry after every meaningful build phase. Copy the template for each entry.

### Milestone 0 — Project Start

**Time:** 11:35–11:45 CDT  
**Goal:** Inspect the repository, confirm the implementation plan, establish the baseline, and create this log.  

**Actions taken:**

- Read `CLAUDE.md`, `CONTEXT_SWITCH_CLAUDE_CODE_PROMPTS.md`, and all 1657 lines of `Context_Switch_Project_Spec.md` before writing any code.
- Inspected the session's working directory and found an unrelated work repository. Escalated the location question rather than scaffolding into it.
- Created `/Users/pullen/context-switch`, copied the three source documents in, `git init`.
- Delivered the Prompt 0 recon: product statement, planned file structure, three-mode key plan, phase budget, and seven specific points where the spec is ambiguous or wrong.
- Confirmed toolchain and installed dependencies.

**What worked:**

- Reading the spec in full first surfaced four real contract defects (D-004, D-005, and the two noted in Known Issues) *before* any component was written against them. Cheaper to fix in the schema than in five consumers.
- Asking about the build location took one round-trip and avoided polluting a work repo mid-feature-branch.

**What did not work:**

- No `ANTHROPIC_API_KEY` in the environment, so Phase 3's live path cannot be verified yet. Decision was to build the full live path and log live tests as *untested* until a key is supplied, rather than claim a pass. See Known Issues.

**Verification/evidence:**

- `node -v` → v23.3.0, `npm -v` → 10.9.0.
- `npm install` → 256 packages, 16s, no errors.
- `npx tsc --noEmit` after contracts + schemas → 0 errors.

**Files materially changed:**

- `package.json`, `tsconfig.json`, `vite.config.ts`, `postcss.config.js`, `tailwind.config.ts`, `index.html`, `.gitignore`, `.env.example`, `.eslintrc.cjs`
- `src/styles/tokens.ts`, `src/index.css`, `src/lib/cn.ts`, `src/main.tsx`
- `src/types/contracts.ts`, `src/schemas/{shared,sayItBetter,decode,conflictLens,index}.ts`
- `vite-plugin-ai-proxy.ts` (503 placeholder, replaced in Phase 3)

**Decisions created:**

- D-001, D-002, D-003, D-004, D-005, D-006, D-007

**Next step:**

- Phase 1 remainder in parallel: vocabulary + fixtures + validation script; UI primitives + shared components; AI provider layer. Then the app shell.

### Milestone 1 — Foundation: contracts, tokens, validation gate

**Time:** 11:41 CDT — in progress  
**Phase/goal:** Scaffold, design tokens, type contracts, the Zod validation gate, vocabulary, fixtures, primitives, app shell.

**Actions taken:**

- Hand-scaffolded Vite 5 + React 18 + TypeScript rather than running `npm create vite` — faster and deterministic, no interactive prompts, and the config ends up exactly as the spec needs it.
- Implemented UI Direction Option A ("Context Switchboard", spec §12) as a token file consumed by `tailwind.config.ts`, so no component hardcodes a hex value. Deliberately included **no** low-contrast gray text token — spec §12 prohibits tiny gray text, so the palette makes it awkward to write.
- Transcribed every type from spec §17 into `src/types/contracts.ts` verbatim, then added four transport types the spec implies but does not define (`AiSource`, `AiMode`, `ContextSwitchErrorKind`, `ContextSwitchError`).
- Built `src/schemas/` as the **single** validation gate: `validateResponse(mode, candidate)`. Both live responses and fixtures pass through it. Issue strings are `path: message` only and never include model output, so they are always safe to display or log.
- Global accessibility and motion decisions made once, in `src/index.css`: a `:focus-visible` ring for every control and a single `prefers-reduced-motion` block that neutralizes all animation. Components therefore cannot forget either one.

**What worked:**

- Owning contracts, schemas, and tokens centrally *before* fanning out subagents removed the main risk of parallel work — three agents writing three incompatible versions of the same shape.
- Freezing an exact primitive API signature list in the subagent brief let the shell and the primitives be written simultaneously instead of serially.

**What did not work:**

- *(recorded as work proceeds — see Failure Log)*

**Verification/evidence:**

- `npx tsc --noEmit` after tokens + contracts + schemas → 0 errors.
- `z.discriminatedUnion` initially rejected the Say It Better schema because `superRefine` returns a `ZodEffects`, not a `ZodObject`. Resolved with `.innerType()` in the union while keeping the strict schema as the per-mode gate. See F-001.

**Files materially changed:**

- *(see Milestone 0; plus `src/data/`, `src/fixtures/`, `src/components/`, `src/ai/` as agents land)*

**Decisions created:**

- D-002, D-004, D-005, D-006, D-007

**Next step:**

- Land the three parallel workstreams, then build the app shell and the Say It Better flow.

### Milestone 3 — Live AI without a server

**Time:** 11:46–12:20 CDT (built in parallel with Phase 1/2 UI work, since the AI layer shares no files with the UI)  
**Phase/goal:** Provider layer behind one interface, the dev-server route, per-mode prompts, schema validation with retry, timeout and fallback rules, and proof that no key ships.

**Actions taken:**

- Three clients behind one `ContextSwitchAiClient` interface — `FixtureAiClient`, `ProxyAiClient`, `DirectAiClient` — plus a router that picks between them. 1,924 lines total.
- Replaced the placeholder `vite-plugin-ai-proxy.ts` with a real dev-server middleware: `POST /api/context-switch` relays to the Anthropic Messages API from the Node process, and `GET /api/context-switch/health` reports `keyConfigured` as a **boolean**.
- Separate prompt template per mode (spec §18), not one giant prompt. Rendered size ~8.6–10.2K chars per request.
- Validation: every response parsed by the shared Zod gate; on failure, **one** retry carrying the specific validation issue strings (which contain no model output), then a typed `schema_invalid` error. Raw model output is never rendered.

**What worked:**

- **The leak audit caught its own weakness.** Grepping `dist/` for the key passed — but passed *trivially*, because `App.tsx` did not yet compile, so the AI layer was not in the bundle at all. A second production bundle was built with a temporary entry importing `src/ai/**` and a decoy a decoy key value in `.env`, then re-grepped. This is the difference between evidence and a green checkmark.
- Positive controls on that audit bundle proved the code was genuinely present and behaving: `context-switch:user-key` present, `anthropic-dangerous-direct-browser-access` present, `loadEnv` **absent** (server plugin not bundled), `import.meta` **absent** (statically replaced), and `resolveAiMode` compiled to `function It(){const t="live";return ot(t)?t:"auto"}` — the non-secret `VITE_AI_MODE` inlined while the key sitting in the same `.env` was not.
- Dev route exercised end to end against real HTTP: health with no key → `{"ok":true,"keyConfigured":false}`; POST with no key → 503 `no_key_configured`; 300KB body → 413; malformed body → 400; GET on the POST route → 405; and a real Anthropic round-trip with an invalid key → `{"error":"provider_auth_failed","providerStatus":401}` while the Node console logged only `[ai-proxy] provider error status=401 type=authentication_error` — no key, no body, no message content.
- A 35-check smoke suite passed, including JSON extraction with braces inside strings and escaped quotes, abort handling, retry-once, and double-failure → `schema_invalid` with no model output in `detail`.

**What did not work / had to be resolved:**

- Four spec ambiguities needed real decisions rather than guesses; two became D-010 and D-011. The other two: `auto` mode with no live client at all is not a *failure* (fixtures are the configured path), so it serves prepared scenarios only and refuses custom content — which is what makes D-009 enforceable end to end. And `scenarioId` is read structurally via a narrow cast rather than by widening a contract type the agent did not own.
- Fixture mode reproduces the Honesty Guard beat rather than skipping it: the follow-up fixture is served on a first pass with no answers, the sendable fixture once answers exist.

**Verification/evidence:**

- `npx tsc --noEmit 2>&1 | grep "error TS" | grep -E "src/ai/|vite-plugin-ai-proxy"` → **no matches**.
- `npm run build` → exit 0, `✓ built in 370ms` at completion of this layer.
- `npm run lint` (whole project) → exit 0. No `any`, no `console.log`.
- `grep -ri "sk-ant" dist-audit/` → no matches. `grep -rl "ANTHROPIC_API_KEY" dist-audit/` → no matches. `grep -ri "the decoy value" dist-audit/` → no matches. Zero `localStorage` references in the bundle.
- All temporary audit artifacts (`.env`, `.audit/`, `dist-audit/`) deleted; `git status` clean of them.

**The only two places a key is ever touched (independently re-read and confirmed by the orchestrator, not accepted on report):**

- `vite-plugin-ai-proxy.ts` — server key, Node only, `apply: 'serve'`. Assigned from `loadEnv(config.mode, process.cwd(), '')` at line 166; tested as a boolean at 171/187/210; sent outbound exactly once as the `x-api-key` header at line 233.
- `src/ai/DirectAiClient.ts` — user-pasted key, browser. Store at lines 34–87 (module variable + `sessionStorage` under `context-switch:user-key`); read at line 141; sent outbound exactly once at line 154. `getUserKey` is deliberately **not** re-exported from `src/ai/index.ts`, so the read site stays inside the one file.

**Files materially changed:**

- `vite-plugin-ai-proxy.ts`, `src/ai/{types,FixtureAiClient,ProxyAiClient,DirectAiClient,router,index}.ts`, `src/ai/prompts/{shared,sayItBetter,decode,conflictLens,index}.ts`

**Decisions created:**

- D-010, D-011

**Next step:**

- **Live AI still unverified end to end** — no real `ANTHROPIC_API_KEY` is configured. The 401 round-trip proves the transport works; it does not prove the prompts produce schema-valid, honest output. That test is pending a key.

### Milestone 4 — Three result views land; full gate green

**Time:** 12:30–12:40 CDT  
**Phase/goal:** Say It Better results + Smart Follow-Up, Decode It's four layers, Conflict Lens's map — built in parallel, then integrated and gated.

**Actions taken:**

- Three subagents built the three result views concurrently against the already-frozen contracts and primitives. No shared files, so no coordination cost.
- Integrated all three behind one `ResultView` switch in `App.tsx`, discriminated on `response.mode` with an exhaustiveness check.
- Ran the full verification gate on the integrated app.

**What worked:**

- The Decode agent verified by **actually rendering** rather than only compiling: it server-rendered the components against the real fixture and asserted structure — 6 of 6 interpretations carry a `ConfidenceBadge` (no inference renders unlabeled), the single speculative item sits behind a wired `aria-expanded`/`aria-controls` disclosure, and 14 elements stagger at clean 60ms increments. It also rendered six edge cases (empty `toneCues`, missing `evidence`, all-speculative, undefined roles, high-stakes safety).
- Every field on `DecodeResponse` was traced to a displaying component before the agent reported — the coverage table is in the agent's report, and no field was left homeless.
- Parallel primitives reuse held up: nothing was rebuilt. All three views consumed the same `Card`, `Badge`, `Button`, `CopyButton`, `ConfidenceBadge`, and `SafetyNotice`.

**What did not work:**

- One integration error survived to the merge point: `FactsPanel.tsx` widened a `tone` literal to `string`. Caught by the typechecker at integration, fixed by the owning agent within one poll cycle. Cost: ~1 minute.
- One agent left a scratch preview harness (`__preview.tsx`, `__preview.html`) inside `src/components/sayItBetter/`, outside its file allowlist. Removed during cleanup — see Milestone 5.

**Verification/evidence:**

- `npx tsc --noEmit` → **0 errors**.
- `npx eslint . --ext .ts,.tsx` → **exit 0** (no `any`, no `console.log`).
- `npm run validate:fixtures` → **43/43 checks green**.
- `npm run build` → **exit 0**, 1669 modules, 822ms. `dist/assets/index.js` 380.90 kB (110.95 kB gzip), CSS 27.39 kB (5.91 kB gzip).
- Secret verification on the **real** bundle (which now genuinely contains the AI layer — positive controls: `context-switch:user-key`, `anthropic-dangerous-direct-browser-access`, and `api/context-switch` all present): decoy-value grep **PASS**, `sk-ant-api03` **no matches**, `sk-ant-[A-Za-z0-9_-]{20,}` **no matches**, `loadEnv` **absent** from the bundle. See F-002 for why the naive word-grep was replaced.
- `.env` confirmed gitignored (`git check-ignore -v .env` → `.gitignore:4`). No `.env` present. `.env.example` holds a placeholder only.

**Files materially changed:**

- `src/components/sayItBetter/*` (9 files), `src/components/decode/*` (9), `src/components/conflict/*` (11), `src/App.tsx`, `src/hooks/*`, `src/components/AiSettingsDrawer.tsx`

**Decisions created:**

- none new

**Next step:**

- Run the app and walk all three prepared scenarios end to end at 390px and 1440px. Then Phase 5: motion, accessibility audit, dead-code removal.

### Milestone 6 — Demo rehearsals, accessibility measurement, close-out

**Time:** 15:40–16:30 CDT  
**Phase/goal:** Run the spec §29 demo twice (live-configured and offline), measure the visual/accessibility table for real, and close out the log.

**Actions taken:**

- Built `npm run check:live` — a permanent script that runs all three scenarios plus the role-pair side-by-side proof through the real provider and validates every response against the same Zod gate the UI uses.
- Ran **Rehearsal 1 (live-configured)**: key present, `AI_MODE=auto`. Every live call reached Anthropic and was rejected at billing. This turned out to be the most valuable rehearsal available, because it exercised the whole failure path with a real failure rather than a simulated one.
- Ran **Rehearsal 2 (offline)**: `AI_MODE=fixture`. Clean run, all three scenarios, zero network requests.
- Measured contrast across 443 text nodes on five screens, tap targets and overflow at 375/768/1440, and audited reduced-motion coverage structurally.
- Fixed one real contrast failure and one sub-12px label; scrubbed a key-shaped decoy string out of this log.

**Rehearsal 1 — live-configured (`AI_MODE=auto`, valid key, no account credits):**

| Beat | Result |
|---|---|
| Landing | Headline, premise, three modes, indicator reads `READY` |
| Example loads | Route reads `ENGINEER → PRODUCT MANAGER`, badge `ROUTE SET`, context receipt `6 / 6 set` |
| Follow-up step | Appears with all three answers **pre-selected**; honesty line, "Why are we asking?", `Required` badge, Skip correctly disabled |
| Translate | Live POST completes in **130–304ms** (five calls measured via Resource Timing), rejected at billing |
| Failure state | Indicator flips to **ERROR**. Copy: "The AI provider could not complete this request. Your message has been preserved. Try again." Provider's own reason shown ("credit balance is too low"). Inputs preserved. |
| Fallback offered | **"Show saved example"** present for all three built-in scenarios — offered, never silently substituted |
| Fallback accepted | Renders in **101ms**; indicator flips honestly to **OFFLINE**; laugh line, sendable message, and the "Did not claim that the alternate work was approved" line all present |
| Decode / Conflict | Same pattern: live rejected → fallback offered → full result renders |

**Rehearsal 2 — offline (`AI_MODE=fixture`):**

| Beat | Result |
|---|---|
| Network | **Zero** POSTs and **zero** health probes for the entire run — fixture mode skips probing entirely |
| Say It Better | Laugh line, sendable message, alternatives, impact tags, what-changed ledger, honesty artifact — all present. Indicator `OFFLINE`. |
| Decode It | 1.3s. Literal reading, `Strongly supported` + `Plausible` visible, `Speculative` correctly collapsed behind "Show weaker possibilities", unknowns present, no claim of annoyance outside `unknowns`, 3 reply options |
| Conflict Lens | 1.3s. Both sides, "Meant, and heard", "Where the temperature rose", core problem naming definition-of-done **and** trust, repair message, shared goal. No verdict, no "should communicate better". |
| Start over | Returns to landing, clears result, resets the example picker, indicator back to `READY` |

**What worked:**

- **The failure path is genuinely good, and I only know that because the failure was real.** A presenter hitting this today sees an honest error, the actual reason, their inputs intact, and one click to continue. The indicator never claims live when it is showing an example.
- Section headings across Conflict Lens obey the no-verdict rule in their own wording: "What happened, without a verdict", "Where the temperature rose", "Each side, on its own terms". None asks who escalated.
- The offline path is genuinely offline — provable by zero network entries, not by inspection.

**What did not work:**

- My rehearsal harness produced several junk numbers before I switched to Resource Timing and post-settle measurement (F-011). One "12.3s to error" was my own tool-call latency; the app takes ~200ms.
- Copy's success path remains unverified under automation (see the Visual table). Recorded as Partial.
- A full keyboard traversal since the redesign is still not done. Recorded as Partial, not assumed.

**Verification/evidence:**

- `npx tsc --noEmit` → **0 errors**. `npx eslint . --ext .ts,.tsx` → **0 findings**.
- `npm run validate:fixtures` → **43/43**. `npm run check:functional` → **53/53**.
- `npm run build` → exit 0, 905ms. JS 431.27 kB (121.43 kB gzip), CSS 67.90 kB (12.80 kB gzip).
- Contrast: **0 failures across 443 text nodes** on five screens.
- Live transport: five POSTs, 130–304ms each, single attempt apiece (no retry storms).

**Files materially changed:**

- `scripts/live-check.ts` (new), `package.json` (`check:live`), `vite-plugin-ai-proxy.ts`, `src/ai/ProxyAiClient.ts`, `src/components/conflict/EscalationTimeline.tsx`, `src/App.tsx`, `src/components/AiModeIndicator.tsx`, `src/components/AiSettingsDrawer.tsx`, `src/ai/DirectAiClient.ts`, `.eslintrc.cjs`

**Decisions created:**

- none new

**Next step:**

- Add account credits, then `npm run check:live` proves the live path in one command. Then a full keyboard traversal and a manual Copy click.

### Milestone 7 — Provider failover, and the first end-to-end live pipeline proof

**Time:** 16:40–17:05 CDT  
**Phase/goal:** Make the live path survive one provider failing, and prove the whole live pipeline works.

**Actions taken:**

- Rewrote `vite-plugin-ai-proxy.ts` around a provider chain: `anthropic`, `openai`, and any OpenAI-compatible endpoint (Groq, Together, OpenRouter, Ollama). A provider with no key — or a compatible endpoint with no base URL — is simply absent from the chain rather than an error.
- Threaded provenance through the client: `SendPrompt` now returns `{ text, provider, failedOver }`, `AiResult` carries them, and the status pill reads **"Live · Claude"** / **"Live · OpenAI"** / **"Live · Custom"** instead of a bare "Live".
- Added `scripts/mock-provider.mjs` (`npm run mock:provider`): a local OpenAI-compatible endpoint returning schema-valid responses, so the live pipeline can be exercised without a paid key.

**What worked:**

- **Failover verified end to end with a real failure and a real second provider.** Anthropic was tried first and rejected at billing; the compatible provider served the request. The response reported `provider: "compatible"`, `failedOver: ["anthropic"]`, and the server logged `served by compatible after 1 provider failure(s)`.
- The relay's outbound request shape was verified by recording what the mock actually received: `POST /chat/completions`, `Bearer` scheme, `system` + `user` roles, `max_tokens`. The mock records only the auth *scheme*, never the value.
- **The full live pipeline passed for the first time: 24 of 25 checks** across all three modes — prompt building, transport, failover, JSON extraction, the Zod gate, and every spec §27 content assertion.

**What did not work / what this does NOT prove:**

- The one failing check is the role-pair proof: 100% word overlap between the Slack-to-PM and email-to-executive versions. **That is the mock, not the product** — it returns a constant string regardless of context. It is worth keeping as a finding rather than hiding, because it demonstrates the test is *sensitive*: it would catch a real model that ignored the context. The genuine role-pair proof still needs a real model.
- **This milestone proves the plumbing, not model quality.** Content assertions passed against hand-written mock content. Real generation remains unverified until an account has credits.

**Verification/evidence:**

- Chain at boot: `providers=anthropic(claude-sonnet-5) → compatible(mock-model-1)`.
- `/health` reports per-provider ids and models — booleans and model names only, never a key.
- `npm run check:live` → 24 passed, 1 failed (the mock-constant role-pair check).
- Gate: `tsc` **0**, `eslint` **0**, fixtures **43/43**, functional **53/53**, build 968ms.
- Multi-provider secret audit on `dist/`: `sk-ant-api03-…`, `sk-proj-…`, `OPENAI_API_KEY`, `COMPATIBLE_API_KEY` → **no matches**, and the **actual** Anthropic key value from `.env` → **not present**.

**Files materially changed:**

- `vite-plugin-ai-proxy.ts` (rewritten), `src/ai/types.ts`, `src/ai/ProxyAiClient.ts`, `src/ai/DirectAiClient.ts`, `src/App.tsx`, `src/components/DemoControls.tsx`, `src/components/AiModeIndicator.tsx`, `.env.example`, `scripts/mock-provider.mjs` (new), `package.json`

**Decisions created:**

- D-015

**Next step:**

- Add credits to either provider and run `npm run check:live` for a real-model verdict. Fix the hardcoded `text-white` on gradient slabs so dark themes can pass a contrast audit.

### Milestone 8 — UI rebuild: Human Observability Console (in progress)

**Time:** 17:45 CDT — in progress  
**Phase/goal:** Rebuild the interface per `Context_Switch_UI_Experience_Build_Brief.md` into a twelve-feature human observability console, on branch `ui-observability-console`.

**Actions taken:**

- Read the UI brief in full, then the companion `Context_Switch_Adult_Communication_Project_Spec.md` (§13.1 P0, §17 contracts, §8 CBT layer) once it was supplied.
- **Flagged that the companion spec was missing** rather than inventing its content; it arrived shortly after and changed the contract picture materially (see D-016).
- Built the shared foundation centrally, since parallel agents cannot be allowed to diverge on it: `CurrentSituation` types and reducer, the twelve-feature registry, the practice contracts, and the `console` theme.
- Enforced brief §9's state rules **in the reducer rather than by convention**: a suggestion can only become confirmed through an explicit user action, every suggestion records the tool that produced it, role changes never discard content, and entering serious mode forces humor off globally.
- Launched two agents on disjoint slices (application shell; Inspect workspace).

**What worked:**

- The existing work maps onto the brief more cleanly than expected: `say_it_better`→Message Compiler, `decode_it`→Signal Decoder, `conflict_lens`→Conflict Trace, and the already-built screenshot OCR with editable transcript satisfies §10.9 outright. The AI relay, provider failover, Zod gate, fixtures and safety routing all carry over untouched, which is what made a rebuild affordable at all.
- The brief's semantic colour roles mapped one-to-one onto the app's existing tone names, so the new dark palette needed **zero** component changes (D-017).

**What did not work:**

- The companion spec's §17 contracts conflict with the shipped ones. Resolved by extension rather than replacement (D-016) — a wholesale rename would have cost 96 passing checks for no behavioural gain.

**Verification/evidence:**

- `npx tsc --noEmit` → 0 errors after each foundation file.
- `npx eslint src/features src/situation src/types/practice.ts` → 0 findings.

**Files materially changed:**

- `src/situation/{types,reducer}.ts`, `src/features/registry.ts`, `src/types/practice.ts`, `src/styles/themes.css`, `src/styles/applyTheme.ts`

**Decisions created:**

- D-016, D-017, D-018

**Wave results:**

- Shell, Inspect workspace, and the four new surfaces (Unit Tests, Patch, Health Check, Postmortem) were built by three agents on disjoint file sets. Homepage, Context Switch overlay, command palette, prepared scenarios and the integration were done centrally.
- **Wave 2 was cut from three agents to one** once it was clear that Message Compiler, Signal Decoder and Conflict Trace could reuse their existing verified result views rather than being rebuilt. That saved two full agent runs.
- **All twelve named features now have a real screen.** No dead buttons, no "coming soon".

**Verification/evidence:**

- `npx tsc --noEmit` → **0**. `npx eslint . --ext .ts,.tsx` → **0**.
- **Regression gates held through a full re-architecture**: `validate:fixtures` 43/43, `check:functional` 53/53 — the AI layer, schemas, fixtures and safety logic were genuinely preserved, not just claimed to be.
- `npm run build` → exit 0, 995ms.
- Contrast on the new `console` theme: **0 failures across 259 text nodes** over the homepage and the Stack Trace screen, after fixing F-015.
- Husband scenario verified end to end via the `1` shortcut: runtime bar switches to Husband → Wife, the cross-feature trace shows Context Switch complete / Stack Trace active / Message Compiler recommended, frames carry Confirmed vs Inferred badges, and the drawer lists claims as "Suggested, not confirmed · from Stack Trace".

**Next step:**

- Presentation Mode density, Under the Hood panel, and the remaining two scenario walkthroughs.

### Milestone 9 — Three features, demo ready

**Time:** 23:05–23:55 CDT  
**Phase/goal:** Rebuild around Communicate, Repair and Inspect after the twelve-feature console was rejected as unusable; then polish for the demo.

**Actions taken:**

- Cut the product to three plainly-named features and deleted the console shell, tool registry, situation store and nine surfaces (see F-016 for why).
- Rebuilt Communicate on the context controls the owner already recognised, with a writing/receiving toggle and screenshot input on the receiving side.
- Built Repair (screenshot **or** plain description) and Inspect (a 68-node branching question flow) with two agents.
- Removed every pre-selected role. Nothing assumes who the user is.
- Fixed three layout defects the owner spotted from a screenshot.

**What worked:**

- Reusing the verified analysis views meant the rebuild cost two agents, not five. The AI relay, provider failover, Zod gate, fixtures and safety logic were untouched throughout — **43/43 fixture and 53/53 functional checks passed continuously across two full re-architectures.**
- The Inspect → translator handoff is the strongest moment in the product: five branching questions produce a sentence, and one button carries it into the translator already written.

**What did not work:**

- My automated UI audit reported **zero issues** on screens that were visibly broken. The chips wrapped legally, the label spill sat inside a `min-w-0` box, and Repair's content was genuinely in the DOM — just below the fold. A single screenshot from the owner found all three in one look. Recorded as F-017.

**Verification/evidence:**

- Layout fixes verified across **all nine themes** at 820px: route labels ~106px inside their boxes, quick-pick chips 4 per row, 0 elements past their parent, no horizontal scroll.
- Contrast: **0 failures** on all three screens. Tap targets: **0 under 44px** after raising the header and Back controls. No text under 12px. Console: **no errors**.
- Inspect walked end to end: 5 branching questions → outcome → sentence carried into Communicate.
- `tsc` 0, `eslint` 0, fixtures 43/43, functional 53/53, production build clean.

**Files materially changed:**

- `src/App.tsx`, `src/components/communicate2/`, `src/components/repair2/`, `src/components/inspect2/`, `src/components/context/{ContextBuilder,RoleRoute}.tsx`, `README.md`

**Next step:**

- Optional: trim the nine themes to two or three. Nine is clutter in a Settings panel for a demo.

### Milestone Entry Template

**Time:**  
**Phase/goal:**  

**Actions taken:**

- 

**What worked:**

- 

**What did not work:**

- 

**Verification/evidence:**

- 

**Files materially changed:**

- 

**Decisions created:**

- 

**Next step:**

- 

---

## Decision Log

Record meaningful product, scope, architecture, AI, design, and safety decisions.

| ID | Time/phase | Decision | Alternatives considered | Reason | Tradeoff/consequence | Revisit later? |
|---|---|---|---|---|---|---|
| D-001 | 11:41 / Phase 1 | Vite + React 18 + TS with **no server**, instead of spec §16's recommended Next.js. Live AI reaches Anthropic through a Vite dev-server middleware plugin that reads `ANTHROPIC_API_KEY` in the Node process. | (a) Next.js with an API route, as the spec recommends. (b) A separate tiny Express relay. (c) Browser-only with a user-pasted key. | `CLAUDE.md` mandates the no-server stack, and a dev-server middleware genuinely keeps the key out of the client bundle for the local demo. | **Real cost, stated plainly:** a *statically hosted* build has no Node process, so live AI there requires the user to paste their own key, which puts a key in the browser (memory + `sessionStorage`, one auditable file, `anthropic-dangerous-direct-browser-access`). That satisfies the letter of spec §0.8 — no secret ships in our JavaScript — but not its spirit. The dev proxy is preferred whenever reachable and the UI never prompts for a key if it is. | **Yes.** For anything past a hackathon demo, move to a real server route. |
| D-002 | 11:42 / Phase 1 | Pin Tailwind CSS v3.4 rather than v4. | Tailwind v4 with the CSS-first `@theme` config and `@tailwindcss/vite`. | The spec and build prompts both assume a `tailwind.config` file, and three subagents were about to write Tailwind classes in parallel — v3's config and idioms are the ones they'll produce correctly without coordination. Reducing variance mattered more than being current. | Not on the latest major; the v4 migration is a future chore. No effect on the demo. | Yes, post-hackathon. |
| D-003 | 11:42 / Phase 1 | Add `tsx` as a dev dependency to run the fixture-validation script, instead of adding a test runner. | (a) Vitest. (b) No script, manual checking. (c) Validate inside the app at boot. | `CLAUDE.md` requires asking before adding dependencies outside the stack list; `tsx` is dev-only tooling that never enters the bundle, and Vitest is a much larger addition for one assertion file. | The fixture check is a script, not a test suite — no watch mode, no per-case reporting beyond what I write by hand. Acceptable for a 4.5-hour build. | Yes — Vitest if the project continues. |
| D-004 | 11:44 / Phase 1 | Make the Say It Better **Zod schema stricter than the spec §17 type**: when `needsFollowUp` is `false`, `sendableMessage` is required; when `true`, at least one question is required. | Accept the spec's shape as written and guard in the UI instead. | Every result field is optional in §17, so `{mode, needsFollowUp: false, followUpQuestions: []}` type-checks, validates, and renders an empty result screen — the validation gate would be letting through exactly the failure it exists to catch. Guarding in the UI would mean repeating the check in every consumer. | The runtime schema and the compile-time type deliberately disagree. Documented in the schema file so the next reader isn't confused. | No — this is the correct behavior. |
| D-005 | 11:44 / Phase 1 | Require exactly 2 `participants` in the Conflict Lens schema and join them to speaker names on `speakerId`. | Allow N participants now. | `ConflictLensResponse.participants` carries only a `speakerId` — no name, no role — so the UI must join against the request's `speakers[]`. Enforcing the count and the join at the gate turns a silently-blank two-column layout into a caught validation error. Multi-speaker is P1. | Multi-speaker conflicts are rejected rather than partially rendered. Correct for this build. | Yes, when multi-speaker support is built. |
| D-006 | 11:45 / Phase 1 | Parallelize the build across managed subagents with **disjoint file ownership** and a frozen primitive API contract, rather than building strictly serially. | Serial build in one context. | A 4.5-hour budget across five phases doesn't fit serially. Contracts, schemas, and design tokens were written centrally *first*, so agents could not diverge on shared shapes; each agent got an explicit file allowlist. | Contract-drift risk if an agent silently changes a signature — mitigated by instructing agents to flag mismatches rather than change them, and by a typecheck gate at every merge point. | n/a — build-process decision. |
| D-016 | 17:55 / UI rebuild | **Extend the existing data contracts with the Adult Communication spec's §17 information rather than replacing them.** Added `Confidence` (incl. `cannot_determine`), `EvidenceItem`, `SafetyState`, `ExerciseRecommendation`, `MeaningPreservation`, `CommunicationTest`, `IntentImpactPair` in `src/types/practice.ts`. | (a) Replace the contracts wholesale to match §17's identifiers exactly. (b) Run two parallel contract sets. (c) Adapter layer translating at every boundary. | §17 renames fields the app already carries under other names (`primaryMessage`/`sendableMessage`, `speakers`/`participants`) but says the implementation "may use TypeScript and Zod **or an equivalent validator**" — so the binding part is the *information*, not the identifiers. A wholesale rename would invalidate 8 fixtures, 6 schemas, 4 prompts, 3 result views and **96 passing checks** for no behavioural gain, at significant cost to a constrained usage budget. | Two naming conventions coexist for the same concepts, documented at the top of `practice.ts`. Anyone diffing the app against §17 will see identifier drift and must read that comment to know it is deliberate. | **Yes** — worth unifying if the product continues past the hackathon. |
| D-017 | 17:58 / UI rebuild | Add the brief's dark palette as a ninth theme (`console`) and make it the **default**, rather than replacing the theming system. | (a) Replace all themes with the single dark palette the brief specifies. (b) Hardcode the dark palette and drop theming. | The brief §5.2 mandates a specific dark palette, but the app already has a working nine-theme runtime system where every colour, radius, shadow and typeface is swappable. Expressing the brief's palette *as a theme* satisfies it exactly while keeping that infrastructure. The brief's semantic roles also map cleanly onto the existing ones — `fact`→teal, `assumption`→amber, `unknown`→slate, `failure`→coral, `warm`→accent — so no component needed changing. | The eight light themes remain reachable in Settings and are no longer the primary design. `console` has **not** been contrast-audited yet — flagged `contrastAudited: false` and audited before completion. | No. |
| D-018 | 18:00 / UI rebuild | Skip React Router and Framer Motion despite both being suggested (brief §18, §20). | Add both, as suggested. | §18 calls routes "suggested" and itself prefers overlays for Context Switch and Breakpoint; state-driven navigation with a URL hash keeps browser-back working without a routing dependency that could complicate the demo. The existing CSS motion system already does staged reveals, spring easing and reduced-motion. §20 says not to add a large dependency for one decorative effect. | No deep-linking to a tool by URL path. If sharing a specific tool's URL becomes a requirement, this needs revisiting. | Yes, if deep links are wanted. |
| D-015 | 16:50 / Phase 5 | **Multi-provider relay with automatic failover.** `AI_PROVIDER` names a primary and `AI_FALLBACK_PROVIDERS` an ordered chain across `anthropic`, `openai`, and any OpenAI-compatible endpoint. The relay moves to the next provider on a provider-side failure and reports which one actually served the result. | (a) Stay single-provider and rely on the fixture fallback. (b) Let the user switch provider manually in Settings. (c) Call several providers in parallel and take the first answer. | Requested after Anthropic became unusable mid-build (empty credit balance) — a single provider is a single point of failure for the live demo. Spec §16 already anticipated this with `AI_PROVIDER=anthropic\|openai\|compatible`. Sequential-with-failover beats parallel: parallel would multiply cost and make "which provider answered" nondeterministic. | The relay is no longer a thin pass-through — it owns a provider chain, two request shapes, and a self-healing retry for OpenAI's `max_tokens` → `max_completion_tokens` change and for gateways that reject `response_format`. **The browser bring-your-own-key path stays Anthropic-only on purpose**: adding a second provider there would mean asking the user to paste a second key into the browser, which is the opposite of the direction this build has taken. Failover is a server-route capability only. | No. |
| D-019 | 2026-08-28 00:20 / Phase 7 | **Collapse Repair to three screens: put it in → check it → read it.** One box takes a screenshot *or* typed text with an optional "anything else worth knowing" beneath it and a single **Analyze**; the transcript then appears as clickable messages, each editable in place; one **Help me understand this** runs the analysis. Text written in the user's own words skips the check screen entirely. | (a) Keep the previous four-decision flow (upload → transcribe → "use this conversation" → "help me understand"). (b) Analyse immediately with no check screen at all. | The owner counted the steps and they were right: three of the four decisions asked the user to approve the app's own progress rather than to contribute anything. Option (b) goes too far the other way — screenshot transcription genuinely does mislabel speakers, and an analysis run on a wrong transcript is worse than one extra screen. So the check screen survives, but only where there is something real to check. | Someone who pastes a formatted transcript still sees the check screen, since pasted text has the same speaker-labelling risk as a screenshot. Positional labels from a nameless screenshot (`Left`/`Right`) are remapped to `You` and the other person's role on the standard convention that the device owner is on the right — a guess, which is why the check screen now also carries a **"Which one is you?"** toggle. Getting that wrong inverts the entire analysis, so it is worth the one control. | No. |
| D-014 | 14:50 / Phase 5 | **Pin the visual-style decision and make style a swappable layer.** All colour, type, radius, border width, shadow, and gradient values moved out of `tailwind.config.ts` into CSS custom properties in `src/styles/themes.css`; Tailwind now maps names onto variables. Eight themes ship (Editorial, Signal, Field Notes, Loud, Swiss, Blueprint, Dusk, Sunrise) with a runtime picker in Settings; four are contrast-audited and the rest are labelled Draft. | (a) Keep hardcoding the built style and re-skin later by editing components. (b) Maintain four separate Tailwind configs. (c) Present static mockups only and decide later on paper. | The owner wanted the style decision deferred until the product is finished, without that deferral becoming expensive. Centralising the values means the later choice costs a token edit rather than a component sweep — and it can be judged in the real app on real content instead of from a mockup. | **Colours must be stored as `R G B` triplets, not hex**, because Tailwind wraps them as `rgb(var(--token) / <alpha-value>)` to keep ~165 existing opacity modifiers working; a hex value there breaks all of them silently. Theme switching is now a runtime change, so nothing but variable *names* is baked in at build time. Cost: one extra indirection when reading the CSS. Editorial, Swiss, Blueprint and Sunrise are contrast-audited (0 failures each, three screens); Signal, Field Notes, Loud and Dusk are labelled **Draft** in the UI rather than presented as finished. | No — this is the right structure regardless of which style wins. |
| D-012 | 13:20 / Phase 5 | Rebuild the visual foundation around an **editorial display serif (Fraunces) paired with Inter and JetBrains Mono**, on a warm textured ground with layered depth, gradient feature surfaces, and chartreuse reserved as a sparing delight accent. | (a) Incrementally tune the existing flat SaaS look. (b) Adopt a darker, more technical "Human Protocol" direction (spec §12 Option C). | The build already satisfied spec §12's Option A palette but read as generic because everything was one typeface at one weight on flat white cards. A display serif against a crisp UI sans is what makes an interface read as *designed* rather than defaulted, and it costs nothing at runtime beyond one webfont. Option C was rejected as gimmick-prone per the spec's own warning. | One additional Google font (~2 files, `display=swap`, real fallback stack). Fraunces' variation axes are set in one CSS class, so the personality is tunable from a single place. | No. |
| D-013 | 13:25 / Phase 5 | Remove all self-referential "demo" vocabulary from the product UI while keeping every internal identifier (`PREPARED_SCENARIOS`, `reset_demo`, `fixture`) unchanged. | Rename the code too, for consistency. | The owner requires the product not to present itself as a demo. But the internal names are accurate engineering vocabulary, they appear in the spec, and renaming them across the AI layer, fixtures, schemas, and two test scripts would have risked real breakage for zero user-visible gain. The boundary is drawn exactly at what a user can read. | Code vocabulary and UI vocabulary deliberately differ — `PREPARED_SCENARIOS` renders as "Examples". Documented here so the mismatch reads as intentional. **The privacy copy was reworded carefully, not loosened:** "Message history is not stored" is still literally true, and nothing claims messages stay on the device. | No. |
| D-010 | 12:20 / Phase 3 | Default the provider model to `claude-sonnet-5` rather than the most capable available model. | Opus 5 for maximum quality on nuanced communication analysis. | A live three-minute demo is latency-sensitive, and every extra second of a translation call is dead air in front of judges. Sonnet 5 is strong enough for this task at materially lower latency. The proxy also omits `thinking` / effort params so the relay keeps working on whatever `AI_MODEL` is set. | Some loss of nuance on the hardest conflict analyses. Overridable with one line in `.env` (`AI_MODEL=`), no code change. | Yes — for non-demo use, prefer the more capable model. |
| D-011 | 12:20 / Phase 3 | Cascade to the next client only on `no_client_available` / `network`. A timeout, provider error, or double schema failure is reported as itself. | Re-run every failure down the whole proxy → direct → fixture chain. | "Preference order" could mean re-trying every failure on the next client, but that doubles demo latency on exactly the failure the demo is most likely to hit — a slow provider — and buries the real cause. | A user whose proxy times out is not automatically retried against their own key. Correct: the offered fallback is explicit and visible. | No. |
| D-009 | 12:05 / Phase 2 | When fixtures are the only available client **and** the request is the user's own text, refuse the request with an honest explanation instead of returning a prepared fixture. | (a) Return the engineer/PM fixture regardless — what the fixture client would do by default. (b) Silently show a generic placeholder. | Spec §16 and §25 forbid replacing custom content with unrelated fixture content. Handing back the engineer's status update as though it were a translation of the user's paragraph is exactly that, and in front of judges it reads as a fake. | A user with no key cannot translate their own text at all — they can only run the three prepared scenarios. That is the honest consequence of having no server, and the error copy says so and points at AI settings. | No — but it disappears once a real server route exists. |
| D-008 | 11:57 / Phase 1 | Offer the spec §6 three-way corporate-jargon control (allow / reduce / remove) in the UI, but map it onto the contract's boolean `reduceJargon` (allow→false, reduce→true, remove→true). | (a) Drop to two options and lose a spec-listed control. (b) Add a `jargonLevel` field to `CommunicationContext`. | Spec §6 lists three levels but spec §17's contract has only a boolean. Changing the contract mid-build would ripple through schemas, prompts, and fixtures for a control that is not P0-critical. | **"Remove" and "reduce" currently behave identically at the prompt level** — the UI offers a distinction the model does not receive. Flagged rather than hidden. | **Yes** — needs a real contract field, not a client-side mapping, if the three-way distinction is meant to be real. |
| D-007 | 11:44 / Phase 1 | Require `unknowns`, `knownFacts`, `likelyPurpose`, `interpretations`, and `usefulResponseShouldInclude` to be **non-empty** in the Decode schema, and `responseOptions` to be exactly 3. | Allow empty arrays and render nothing. | The known / inferred / **unknown** split *is* Decode It (spec §10.1 lists `knownFacts` and unknowns as separate P0 elements). A decode that claims nothing is unknowable has failed the product rule, so the gate should reject it rather than render a missing section. | A terse but legitimate model response could be rejected and retried. Acceptable — the retry carries a repair instruction. | No. |

---

## Experiment and Failure Log

Record failures that consumed meaningful time or changed the approach. Failed experiments are useful hackathon evidence; do not hide them.

| ID | Time | Attempt/hypothesis | Result/symptom | Likely cause | Fix/workaround | Lesson |
|---|---|---|---|---|---|---|
| F-002 | 12:35 | Prove no secret ships by grepping `dist/` for `sk-ant`, `ANTHROPIC_API_KEY`, and `localStorage`, per the build prompt. | **All three "found" a match** — which briefly looked like three leaks. | None were secrets. They were user-facing copy: the key input's `placeholder="sk-ant-…"`, the drawer sentence "no ANTHROPIC_API_KEY is set in .env", and the reassurance "never `localStorage`". A word-based grep cannot tell explanatory copy from a leaked value. | Replaced the word-grep with a **value-based** test: write a decoy a decoy key of the real `sk-ant-…` shape to `.env`, run a real production build, then grep `dist/` for the decoy *value*. Result: no matches — PASS. Also confirmed the one `x-api-key` hit is `"x-api-key":s`, a variable in the BYOK request path, not a literal. Decoy `.env` deleted afterward. | **A green grep is not evidence unless you know what a true positive would look like.** The prompt's suggested check would have produced three false alarms and, worse, would have passed trivially earlier in the build when the AI layer wasn't in the bundle at all. Both failure modes were caught by asking "what would a real leak look like here?" rather than trusting the check. |
| F-003 | 12:45 | Ship `.env.example` documenting `AI_MODE=live\|fixture\|auto` and assume it controls the app. | Setting `AI_MODE=fixture` had **no effect on the client whatsoever.** | `resolveAiMode()` reads only `import.meta.env.VITE_AI_MODE`. `AI_MODE` was read exclusively by the Vite plugin (server side) and reported on the health route, which the router ignores. Two variables that looked like one. | Added a `define` in `vite.config.ts` that forwards `VITE_AI_MODE \|\| AI_MODE \|\| 'auto'` into the client. One variable now drives both sides. Only the **non-secret** mode is forwarded — the key is still read solely inside the plugin. | Found by the agent writing the README, not by the agent writing the code, and not by the typechecker. **Documenting a system is a test of it.** A presenter would have hit this live, believing they had switched to fixture mode. |
| F-004 | 12:45 | Seed the prepared scenario's follow-up answers and let the flow skip the step, since spec §7 says not to ask when answers are seeded. | The flagship demo jumped straight from Translate to the result, **silently deleting spec §29's "answer quick follow-ups" beat** — the moment that shows the Honesty Guard gathering facts rather than guessing. Worse, my own code comment in `App.tsx` asserted "the presenter still sees it," which was false. | `load_scenario` set `followUpResolved: Boolean(action.followUpAnswers)`, so seeded answers made `handleContinue` bypass the step entirely. I conflated "don't ask" with "don't show". | `load_scenario` now sets `followUpResolved: false` while keeping the seeded answers, so the questions render with every choice **pre-selected** and Finish immediately enabled. Nothing is asked; nothing is invented; the beat survives. | Two failures in one: a behavior bug, and a comment that documented intent instead of behavior. A comment that disagrees with its code is worse than no comment — it stops the next reader from looking. |
| F-005 | 12:50 | Use a native `<select>` for the Prepared scenario picker in the sticky header. | Mouse-wheel scrolling the page while the cursor sat over the picker **silently swapped the loaded scenario and reset the demo.** | A focused native `<select>` changes value on wheel. In a sticky header it sits under the cursor during ordinary page scrolling. | `onWheel` suppresses the event and blurs **only when the select actually has focus**, so normal page scrolling still works. | Found by an agent driving the real app with a mouse, not by reading code. This was invisible to typecheck, lint, and every unit-level check — and it is precisely the kind of thing that goes wrong live, on stage, mid-sentence. |
| F-006 | 12:55 | Audit accessibility using `read_page`'s accessibility tree, which reported six unnamed buttons and radios named `exploratory_not_prioritized`. | I nearly filed two accessibility defects that **did not exist**, and had already begun drafting them. | `read_page` surfaces a control's `value` attribute and does not read `sr-only` text, so correctly-labelled controls appear unnamed. The radios carry `aria-label={option.label}`; the step buttons carry `sr-only` descriptions. | Re-verified against the live DOM with `javascript_tool`: **0 unnamed buttons**, all four radios correctly named. Then wrote the caveat into the Phase 5 audit brief so the auditing agent would not repeat it. | **Verify a tool's finding before acting on it, especially a negative one.** Two false defects would have cost real time and produced "fixes" to working code. The same discipline that caught F-002's false positives caught this. |
| F-007 | 13:40 | Load the new type system by adding Fraunces to the existing Google Fonts `<link>`, declaring five variation axes: `family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,500;0,9..144,600;…`. | The page *looked* like it had a serif headline, so it passed a visual glance. It had not. **No webfont was loading at all — including Inter and JetBrains Mono, which had been working before this edit.** The entire type system was silently rendering in system fallbacks (Times, Helvetica). | For a variable font, **every declared axis needs a value in every tuple.** I declared 5 axes but supplied only 3 values each. Google responds to a malformed `css2` request with an **HTML error page**, not CSS — so the whole stylesheet died, taking the two families that were previously fine down with it. `<link>` failures are silent, and a serif fallback looks enough like a serif to pass inspection. | Rewrote the request with complete tuples and ranges: `Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400..900,0..100,0..1;1,…`. Verified by `curl` that the URL returns **200 with 19 real `@font-face` rules** across all three families, then verified in the browser by canvas-measuring the same string in Fraunces vs Georgia vs Times and confirming all three differ. | **A screenshot is not proof a font loaded.** I nearly signed off on the redesign's central decision — the type pairing — while it was entirely inert. Detected only by measuring rendered glyph widths rather than reading `getComputedStyle`, which happily reports the font-family you asked for whether or not it exists. The same "verify the value, not the label" discipline that produced F-002 and F-006. |
| F-008 | 14:20 | Let components and their callers both set Tailwind background classes, joined by `cn()`, assuming the caller's class wins because it comes last in the string. | **Three independent silent colour losses**, found by three different agents: the "Still missing" card, the `plausible` and `speculative` confidence badges, and Decode's "what you cannot know" card all rendered **plain white** while their source clearly asked for a tint. Nothing errored. The `strongly_supported` badge worked, which made it look like a one-off rather than a pattern. | `cn()` was a plain string joiner, so conflicts fall through to **CSS source order — and Tailwind emits colour utilities alphabetically.** `bg-amber-soft` loses to `bg-surface` because "amber" sorts before "surface"; `bg-teal-soft` wins because "teal" sorts after. The winner depended on the colour's *name*. | Fixed the cause rather than the three instances: `cn()` now de-duplicates background-**colour** utilities so the last one wins. Scope kept deliberately narrow — same variant prefix only (so `hover:bg-x` never collapses with `bg-y`), background-*image* tokens excluded (gradients and washes legitimately coexist with a colour), arbitrary values untouched. Also removed the two `className="bg-surface"` overrides that were defeating the badge tints. Verified in the live DOM: all three badge levels now render their tint with distinct border styles, and **zero** elements remain wrongly white. | **A bug that depends on a colour's alphabetical position will look like three unrelated one-offs.** Two agents patched their own instance with `!important` and moved on; only collecting the reports revealed one cause. Also: this is the cost of a hand-rolled `cn()` — documented rather than papered over, since the alternative was a dependency. |
| F-009 | 14:10 | Add a `.edge-sheen` utility setting `box-shadow: inset 0 1px 0 …` for a hairline highlight on raised cards. | Every element combining `edge-sheen` with a `shadow-*` utility rendered **completely flat** — the elevation was gone. Two of my own files (`BrandHeader`, `ModeSelector`) shipped that way, and an agent's first pass had it on every card. | `.edge-sheen` is emitted *after* `.shadow-*` at equal specificity, so it replaced the whole `box-shadow` property rather than adding to it. | Rewrote it to compose with Tailwind instead of fighting it: `box-shadow: inset 0 1px 0 …, var(--tw-shadow, 0 0 #0000)`. Tailwind v3 initializes `--tw-shadow` on every element and each `shadow-*` utility assigns it, so the elevation survives **whichever order the classes land in**. Verified: every `edge-sheen` element now computes both the inset highlight and its full elevation. | A custom utility that sets a whole shorthand property will silently eat the framework's utilities for that property. Compose with the framework's own custom property instead — one line, and every existing call site is fixed at once. |
| F-010 | 15:45 | With a real `ANTHROPIC_API_KEY` finally in `.env`, run the live verification: all three scenarios plus a side-by-side proof that the role pair changes the output. | Every live call failed with `HTTP 502 provider_rejected_request / providerStatus 400`. The client-facing error was opaque — no way to tell a bad model id from an account problem. | **Not a code defect.** The provider's own message, once surfaced, read: *"Your credit balance is too low to access the Anthropic API."* The proxy deliberately never forwarded provider error text (to avoid leaking request content), which also hid the one line that explained the failure. | Added a permanent server-side log of the provider's message, and forwarded it to the client **only for configuration-class statuses** (400/401/403/404/429) — those describe the account or request shape, never user text. It now surfaces in `error.detail`, which `ErrorFallback` already renders. | **A billing rejection is diagnostically valuable: it proves auth succeeded.** The 400 (not a 401) confirms the key is valid, the request shape is accepted, and transport works end to end — generation is the only blocked step. Also: a privacy rule applied too broadly can hide the information an operator needs. The fix was to scope it by error class, not to abandon it. |
| F-011 | 16:20 | Audit contrast and tap targets by driving the running app and measuring computed styles. | A stream of **false failures**: 7 "contrast failures" that were white text on gradient grounds; 2 more on the mode tabs; a tap target reported at 43px; a "blank page"; and an apparently displaced sticky header. Each looked like a real defect. | Four distinct measurement traps. (1) `background-color` is transparent when a gradient carries the ground, so a naive walker falls through to the page colour and computes ~1.0. (2) Gradient-*filled* text (`bg-clip-text`) has `color: transparent` — the gradient IS the ink. (3) Elements measured mid-`reveal-up` are still at `scale(0.98)`, so a 44px target reads as 43px and a mid-`transition-all` colour reads as a contrast failure. (4) The browser pane returned torn/stale frames while several agents drove it concurrently. | Taught the checker to parse gradient colour stops and to treat gradient-filled text as ink against the page ground; measured only after animations settle; and verified every suspicious frame against the DOM before believing it. Of ~14 apparent failures, **exactly one was real** (F-011's sibling finding: escalation numerals at 2.32:1). | **A measurement harness needs its own verification.** Nearly every "bug" this audit surfaced was the harness, not the app — and the one real defect would have been lost in the noise if I had trusted the first numbers. Same lesson as F-002, F-006, and F-007: confirm what a true positive looks like before acting on a negative. |
| F-012 | 17:10 | Add provider names to the status pill so "Live" says *which* provider served the result. | **I broke the one distinction the indicator exists to make.** The bring-your-own-key path — user's key, sent from the browser — started rendering as `Live · Claude`, identical to the server route. | My override fired for any non-fixture source with a known provider. `DirectAiClient` reports `provider: 'anthropic'`, so BYOK inherited the provider label and lost `Live · your key`. A privacy-relevant difference became invisible in pursuit of a cosmetic improvement. | Scoped the override to `activeSource === 'proxy'` only. BYOK keeps `Live · your key`, with a comment saying why so it does not get "tidied up" later. | **Found by the agent writing the README, not by me writing the code** — the same way F-003 and F-005 were found. Documenting a system keeps catching what building it misses. Also a reminder that an honesty guarantee can be broken by a change that looks purely presentational. |
| F-013 | 17:10 | Let a provider join the failover chain as long as it has a key and a base URL. | An OpenAI-compatible endpoint configured without `COMPATIBLE_MODEL` joined the chain and sent `model: ''`, so the endpoint rejected it — surfacing as a confusing extra entry in `attempts` instead of the provider simply being skipped. | "Configured" was defined as key + base URL; the model is equally required for a request to be valid. | Added the model to the completeness filter, so a partly-configured provider is cleanly absent from the chain. | A half-configured dependency is worse than an absent one: it converts a clear "not available" into a misleading failure. |
| F-014 | 22:35 | Wire the presentation scenario shortcuts (`1`/`2`/`3`) with a guard that skips the handler while the user is typing: `const target = event.target as HTMLElement \| null; target?.matches(...)`. | **Every keyboard shortcut silently died** whenever focus was on the document rather than an element. | `event.target` is not always an `Element` — with focus on the document it is `window`, which has no `.matches()`. Optional chaining guards `null`, not a missing method, so the call threw and killed the whole handler. Real key presses usually target `body` (which does have `.matches`), so it worked by luck in manual use and failed under a dispatched event. | Guarded on the type instead: `target instanceof Element && target.matches(...)`. | An optional chain reads like a safety check but only covers null/undefined. When the value's *type* is the uncertainty, `instanceof` is the actual guard. Found only because a scripted key press targeted `body` differently than a manual one would. |
| F-015 | 22:40 | Ship the dark `console` theme using the brief's palette directly. | Two elements measured **4.09:1** against a 4.5 floor: the product mark and a primary button label. | Components put `text-surface` on `bg-grad-primary` — correct in the eight light themes where `surface` is white, wrong in a dark theme where `surface` is near-black. The gradient's darkest stop was too dark to carry dark text. This is the exact mirror of the `text-white`-on-gradient problem an earlier theme agent flagged: a hardcoded assumption about which end of the palette text sits on. | Lightened only the gradient's first stop (`#2f7fd6` → `#4a9bf5`) so every stop clears 5.3:1 against `--cs-surface`. Re-measured: **0 failures across 259 text nodes** on two screens; `contrastAudited` then set to true. | A theme system does not by itself make components theme-safe. Any component that names a *specific* colour for foreground-on-accent carries an assumption about the palette's polarity, and that assumption only breaks when a theme inverts. |
| F-016 | 23:05 | Build the UI exactly as the brief specified: five workspaces, a four-region shell, twelve features named after developer concepts (Stack Trace, Unit Tests, Patch, Breakpoint, Message Compiler). | The owner could not tell what the app was or how to use it. A complete redo was ordered. | Three compounding causes. **(1)** The app opened on an abstract question with nothing demonstrated — six panels, all empty, each announcing its own emptiness ("Nothing confirmed yet", "Nothing has run yet"). Empty scaffolding reads as complexity with no payoff. **(2)** The twelve names are developer metaphors; without already holding the metaphor, "Stack Trace" says nothing about talking to your wife. **(3)** The one thing that sells the product — bad message in, honest message out — sat four clicks behind a rail of twelve tools. | Rebuilt around three plainly-named things, translator first, with the context controls the owner already recognised. Deleted the shell, registry, situation store and nine surfaces. | **A spec can be followed correctly and still produce the wrong product.** The brief's §22 said a new viewer must understand the premise in under 20 seconds, and its §3 architecture made that impossible; I implemented the architecture and never tested it against the acceptance criterion. The signal was there and I walked past it: when the shell agent reported back "six regions, all empty on first paint", that was the finding, and I treated it as a status update. |
| F-017 | 23:45 | Verify the simplified UI with an automated audit — clipping, overflow, elements past their parent — across three tabs at 390/820/1440. | **Reported zero issues on screens that were visibly broken.** The owner's screenshot showed "RECIPIENT" overflowing its border, role chips stacked one per line as skinny boxes, and Repair apparently empty after choosing roles. | All three were *layout squeeze*, not technical overflow, and my checks only looked for the latter. The chips wrapped **legally** into a too-narrow column. The label spill sat inside a `min-w-0` container so it never exceeded a scroll box. Repair's content was genuinely in the DOM — just pushed below the fold by a tall role picker. | Widened the role-card breakpoint so cards get real room, cut route-label tracking from 0.16em to 0.08em, and collapsed the Repair role picker to one line once chosen. Verified across all nine themes. | **"No measurable overflow" is not "looks right".** A layout can be squeezed to uselessness while every box still technically contains its contents. I trusted a green checker over looking at the screen, and the owner found in one glance what three widths of instrumentation missed. Look first, measure second. |
| F-018 | 2026-08-28 00:35 | Guard async completions in the rewritten `RepairView` with the same pattern used elsewhere: `useEffect(() => () => { alive.current = false; }, [])`. | **Repair never finished.** The stage list ran to "Working out what it is actually about" and stayed there indefinitely, and the parallel first read never appeared either — while the network panel showed **both** POSTs returning 200 with valid, complete JSON. Nothing errored, nothing logged. | A cleanup-only guard is wrong under StrictMode. React 18 dev mounts, unmounts, then remounts every component; the first unmount sets `alive.current = false` and **nothing ever sets it back**. Every `if (!alive.current) return` after that discards a perfectly good result. The symptom is indistinguishable from a slow provider, which is exactly what it was mistaken for. | Set the flag on mount as well as clearing it on unmount. Verified live end to end afterwards: first read on screen at ~4s, full analysis at 9.7s. | **This was almost certainly the "last step takes forever" the owner reported** — not latency at all, but a result thrown away after it arrived. Two lessons: a "still loading" state and a "result discarded" state look identical from the outside, so check whether the response actually landed before optimising the wait; and read the mount/unmount lifecycle when writing a liveness guard, because StrictMode makes the one-sided version fail *always*, not intermittently. |
| F-001 | 11:44 | Build the all-modes response union with `z.discriminatedUnion('mode', [...])` using the three per-mode schemas directly. | Type error: the Say It Better schema is not assignable — `discriminatedUnion` requires object schemas. | `.superRefine()` wraps a `ZodObject` in a `ZodEffects`, which no longer exposes the discriminator key. | Call `.innerType()` for the union member while keeping the full refined schema as the per-mode gate that `validateResponse()` actually uses. Cost: ~3 minutes. | A refined schema and a union member are different objects. The gate must use the refined one — using the union for validation would have silently dropped the D-004 strictness that closes the empty-result hole. |

---

## AI Product Integration Log

Do not record keys, private screenshots, or raw sensitive user messages.

| Time | Mode tested | Model/config label | Scenario | Schema valid? | Quality result | Safety result | Latency/fallback notes |
|---|---|---|---|---|---|---|---|
| 17:40 | Say It Better | `gpt-4o` via dev proxy, **after failover from Anthropic** | Engineer → PM | **Pass** | Pass — honest, keeps the user's 3:00 PM commitment, does not invent approval, and (after P-002) preserves the user's stated reason | `safety.category: none`, honestyCheck passed | 4.6s. Anthropic rejected at billing, OpenAI served. Indicator read `LIVE · OPENAI`. |
| 17:40 | Decode It | `gpt-4o` via failover | Incoming PM check-in | **Pass** | Pass after P-001 — explicitly states the sender's feelings cannot be determined; never claims annoyance | `none` | 4.7s |
| 17:40 | Conflict Lens | `gpt-4o` via failover | Alex/Sam | **Pass** | Pass — core problem names follow-through and reliability, not "communicate better"; declares no winner | `none` | 4.9s |
| 17:40 | Say It Better ×2 | `gpt-4o` via failover | **Role-pair proof**: Engineer→PM on Slack vs Engineer→Executive on email | **Pass** | **Pass — 68% word overlap.** Slack: 165 chars, plain. Executive: 210 chars, formal, notes the work was "not a priority". Both keep the 3:00 PM commitment; neither invents approval. | `none` | Spec §32's central claim, proven live for the first time. |
| 15:45 | Say It Better | `claude-sonnet-5` via dev proxy | Engineer → PM | Not reached | Not reached | Not reached | *(earlier run)* Provider rejected at billing: 400, "credit balance is too low". Auth succeeded. 307ms. |
| 15:45 | Decode It | `claude-sonnet-5` via dev proxy | Incoming PM check-in | **Not reached** | Not reached | Not reached | Same billing rejection. 189ms. |
| 15:45 | Conflict Lens | `claude-sonnet-5` via dev proxy | Alex/Sam | **Not reached** | Not reached | Not reached | Same billing rejection. 185ms. |
| 15:45 | Say It Better ×2 | `claude-sonnet-5` via dev proxy | Role-pair proof: Engineer→PM on Slack vs Engineer→Executive on email | **Not reached** | Not reached | Not reached | Same. The comparison is written and automated in `npm run check:live`; it runs the moment credits exist. |
| — | All three | Fixture client | All three built-in examples | **Pass** | Pass — content assertions green | Pass | 43/43 fixture checks, 53/53 functional checks. Zero network. |

**What the live run did prove**, even without generation: the key is valid (a 400 rather than a 401), the dev-proxy route works, the request shape is accepted, the prompt builders produce a well-formed request for all three modes, and the typed-error path surfaces a genuinely actionable message rather than a generic failure.

### Prompt iterations

| Version | Change | Why | Observed improvement/regression | Kept? |
|---|---|---|---|---|
| P-001 | Decode: made the "sender's emotional state cannot be determined" unknown a **hard requirement**, not just a worked example. | The first real-model run produced three unknowns — the referent, the reason for asking, external deadlines — and omitted the one spec §9.1 actually requires. The rule existed only as an illustration, so the model treated it as optional. | **Fixed the failing check.** The model now returns "Whether the sender is frustrated cannot be determined from this message" alongside its other unknowns. | **Kept.** |
| P-002 | Say It Better: added a PRESERVE THE MATERIAL CAUSE rule — if the user's own words explain *why*, that reason must survive into the sendable message. | The first live run returned "Initial setup is done, but not much else yet." It was truthful but quietly evasive: it dropped the user's own explanation that they had shifted focus, which is the honest part of the update. | Output now reads "I got sidetracked by another exploratory project that wasn't prioritized" — the cause survives, and the Honesty Guard still holds (no invented approval). | **Kept.** |

---

## AI-Assisted Development Log

Summarize how AI tools assisted with implementation. Do not paste entire conversations or large generated outputs.

| Time/phase | Tool/agent | Task | Useful result | Human verification performed | Limitations/corrections |
|---|---|---|---|---|---|
| 11:35–11:45 / Phase 0 | Claude Code (orchestrator) | Read all three source documents in full; produce the Prompt 0 recon and plan | Named the product differentiators correctly and found 7 spec ambiguities/defects before any code was written | Location and live-AI decisions escalated to the human and answered before scaffolding | Would have scaffolded into an unrelated work repo if the working directory had been taken at face value |
| 11:41–11:52 / Phase 1 | Claude Code (orchestrator) | Own the shared surface: contracts, Zod gate, design tokens, session reducer, app shell, context builder | Central ownership of shared shapes meant three parallel agents could not diverge on them | `npx tsc --noEmit` after each file group; 0 errors | F-001 found by the typechecker, not by review |
| 11:46–11:50 / Phase 1 | Subagent "UI primitives" | 13 primitive + shared components against a frozen API contract | All 13 delivered; agent independently compiled the Tailwind sheet and grepped it to prove every emitted utility class actually generates | `tsc` 0 errors, `eslint` exit 0, reported 4 contract deviations rather than silently changing signatures | Deviations were all correct calls (e.g. `SafetyNotice` must return `null` for category `none`, so its return type had to widen) |
| 11:46–11:57 / Phase 1 | Subagent "vocabulary + fixtures" | spec §6 vocabulary, 6 fixtures, fixture-schema assertion script | 43 assertions green; pinned enum ids to the contract's literal unions with `satisfies`, and added coverage types so *dropping* an option is also a compile error | `tsc` 0, `eslint` 0, `npm run validate:fixtures` 43/43. Agent negative-tested the gate: injected "The sender is annoyed" into the decode fixture and added a `sendableMessage` to the invalid fixture → 3 FAILs and exit 1, then reverted | Raised 7 interpretation questions rather than guessing silently; #1 became D-008 |
| 11:52 / Phases 2 & 4 | Subagents ×3 | Say It Better results + Smart Follow-Up; Decode It four layers; Conflict Lens map + speaker parsing | *(in progress)* | *(pending)* | Parallelized because the three result views share no files — only the already-frozen contracts and primitives |

---

## Test and Verification Log

### Functional

Two automated gates back this table: `npm run validate:fixtures` (43 schema + content checks) and `npm run check:functional` (53 state-machine, request-builder, and validation checks). UI-level rows were verified by driving the running app in a browser.

| Test | Live AI | Fixture mode | Result | Notes |
|---|---:|---:|---|---|
| Engineer/PM Say It Better | Untested | Pass | **Pass (fixture)** | Walked end to end in the browser: scenario load → context prefilled with `ENGINEER → PRODUCT MANAGER` route → Translate → follow-up step → result. Live untested: no key. |
| Smart follow-up | Untested | Pass | **Pass** | Step renders with all three answers pre-selected, `Question 1 of 3` progress, "Why are we asking?" always visible, `Required` badge shown, Skip disabled with a plain-text reason. Regression-guarded by 3 functional checks after F-004. |
| Copy primary output | N/A | Pass | **Pass** | `CopyButton` swaps icon + label to `Copied` and announces via `aria-live="polite"`; reverts after ~2s. Copied value never logged. Verified in browser by the Phase 5 audit. |
| Decode known/inferred/unknown | Untested | Pass | **Pass** | All three layers render distinctly. 6 of 6 interpretations carry a `ConfidenceBadge` (verified by server-rendering and counting `Support level:` prefixes). `unknowns` is schema-required non-empty. |
| Conflict participant mapping | Untested | Pass | **Pass** | Exactly 2 participants enforced at the gate; `speakerId` → name join verified, and the fallback to raw ids confirmed live by rendering with `speakers={[]}`. |
| Conflict core problem and resolution | Untested | Pass | **Pass** | `coreProblem` is the dominant card; a fixture assertion requires it to mention both definition-of-done **and** trust, so "they should communicate better" cannot pass. |
| Reset Demo | N/A | N/A | **Pass** | 5 functional checks: clears result, scenario, and message content, returns to mode selection, and deep-equals `INITIAL_STATE`. Also calls `clearUserKey()`. |
| AI timeout behavior | Partial | Pass | **Pass (logic)** | Timeout mapping and abort verified in the AI layer's smoke suite; inputs provably survive an error (functional check). Prepared-scenario timeout offers the fixture, custom content does not. **Not yet reproduced against a real slow provider** — needs a key. |
| Invalid schema behavior | Untested | Pass | **Pass** | The invalid fixture is rejected and the rejection names the `sendableMessage` path. Retry-once-then-typed-error verified in the AI layer smoke suite. Raw model output never rendered. |
| Safety response | Untested | Pass | **Pass** | `safetyEscalation` fixture validates; `SafetyNotice` renders for `high_stakes_professional` and self-hides for `none`. |
| **Custom content never swapped for a fixture** | N/A | Pass | **Pass** | Enforced twice: router sets `fixtureAvailable: false` for non-scenario requests, and `App.tsx` refuses outright in fixture-only mode (D-009). |
| **Role pair reaches the model request** | N/A | Pass | **Pass** | 10 functional checks assert `selfRole`, `otherRole`, `channel`, `desiredOutcome`, `desiredTone`, and `humorLevel` all arrive in the request payload. |
| **Follow-up answers change the request** | N/A | Pass | **Pass** | Asserted by building the request with and without answers and confirming the payloads differ. |
| **Required inputs block submission** | N/A | Pass | **Pass** | 8 functional checks including whitespace-only input and a conflict paste with unconfirmed speakers. |

### Visual and accessibility

Measured in the running app, not estimated. Contrast was computed from rendered colours with a
checker that resolves gradient grounds and gradient-filled text; tap targets and overflow were
measured with `getBoundingClientRect()`. **All figures are for the default Editorial theme.** Of the seven
alternatives, Swiss, Blueprint and Sunrise have since passed their own audits; the rest are
labelled Draft in the UI.

| Check | Result | Notes |
|---|---|---|
| Phone viewport (375–390px) | **Pass** | Landing, all three results: `scrollWidth === clientWidth`, zero elements past the viewport, zero sub-44px tap targets. |
| Tablet viewport (768px) | **Pass** | All four screens: no horizontal scroll. Two "overflowing" elements on the landing screen are the full-bleed hero wash and a mode-card hover halo — both `pointer-events-none` and clipped by `overflow-x-clip`, by design. |
| Desktop viewport (1440px) | **Pass** | No horizontal scroll. Conflict Lens verified as two equal 544px columns with a horizontal 4-node escalation timeline; stacks with a vertical timeline on mobile. |
| Keyboard navigation | **Partial** | Every control is a native `<button>`, `<a>`, `<select>`, `<input>`, or `<textarea>` with an accessible name (verified against the live DOM — 0 unnamed controls). Follow-up options are a real radio group, so arrow-key navigation works. **A full end-to-end tab traversal of all three flows was not performed since the redesign** — recorded as untested rather than assumed. |
| Visible focus | **Pass (structural)** | One global `:focus-visible` ring in `index.css`; no component sets `outline-none` without a replacement (grep-verified). Not re-photographed per control after the redesign. |
| Text contrast | **Pass — 0 failures across 443 text nodes** | Landing 31 nodes, follow-up step 32, Say It Better result 58, Decode result 136, Conflict result 186. One real failure found and fixed: escalation-timeline numerals were white on the coral gradient's light stop at **2.32:1** against a 4.5:1 floor → changed to the contrast-guaranteed `coral-soft` / `coral-ink` pairing. See F-011 for the false positives this measurement produced along the way. |
| Reduced motion | **Pass (structural)** | One global `@media (prefers-reduced-motion: reduce)` block neutralises all animation; 14 of 14 `animate-*` usages are additionally behind `motion-safe:`. The two inline styles set `animationDelay` only, not `animation`, so the global block still governs them. **Not verified by toggling the OS setting** — the browser harness exposes no way to emulate it. |
| Long output handling | **Pass** | Verified with a 180-character unbroken string injected into the Conflict fixture: no overflow at 390px or 1440px. Prose uses `whitespace-pre-wrap` + `break-words`, flex/grid children `min-w-0`. |
| No colour-only status | **Pass** | `ConfidenceBadge` carries three independent cues — colour, a distinct icon, and border *style* (solid / dashed / dotted). Sentiment tags carry an icon plus the sentiment word in text. Verified in the live DOM: all 6 interpretations and all 6 participant concerns render a badge. |
| Copy confirmation announced | **Partial** | Implementation verified by reading the code: `writeText` → `copied` state, `catch` → `failed`, `aria-live="polite"` announcement, 2s revert, payload never logged. The **failure** path was observed working end to end (announced "Copy failed — select and copy manually"). The **success** path could not be confirmed under automation: the Clipboard API requires genuine user activation, which synthesised clicks in this harness did not reliably grant. **A presenter should click Copy once manually before presenting.** |
| Nothing auto-advances | **Pass** | The follow-up step advances only on an explicit button press; results never auto-scroll or auto-navigate. |

### Commands

Record concise summaries, not large raw output.

| Time | Command | Result summary |
|---|---|---|
| 11:41 | Install (`npm install --no-audit --no-fund`) | Pass — 256 packages, 16s. Deprecation warnings from eslint 8's transitive deps only. |
| 11:44 | `npx tsc --noEmit` (contracts + schemas) | Pass — 0 errors. |
| 11:48 | `npx tsc --noEmit` (+ state, shell, context builder) | Pass — 0 errors. |
| 11:50 | `npx eslint src/components` (primitives) | Pass — exit 0, no `any`, no unused vars. |
| 11:57 | `npm run validate:fixtures` | Pass — 5 fixtures validated, 43 checks, 0 failures. Gate negative-tested and confirmed to fail on injected defects. |
| 11:57 | `npx tsc --noEmit` (+ vocabulary, fixtures) | Pass — 0 errors. |
| 12:40 | `npx tsc --noEmit` (integrated app, all 3 result views) | Pass — **0 errors**. |
| 12:40 | `npx eslint . --ext .ts,.tsx` | Pass — **exit 0**. No `any`, no `console.log`. |
| 12:40 | `npm run build` | Pass — exit 0, 1669 modules, 822ms. JS 380.90 kB (110.95 kB gzip), CSS 27.39 kB (5.91 kB gzip). |
| 12:42 | Secret audit: decoy-value build + grep `dist/` | Pass — decoy key value **not present**. `sk-ant-api03` and `sk-ant-[A-Za-z0-9_-]{20,}` no matches. `loadEnv` absent from bundle. See F-002. |
| 13:05 | `npm run check:functional` | Pass — **53/53 checks**, 0 failures, first run. |
| 13:05 | `npm run validate:fixtures` | Pass — **43/43 checks**, 0 failures. |
| 15:45 | `npm run check:live` (new) | **Failed at the provider** — 4/4 scenarios rejected: 400, "credit balance is too low". Auth and request shape confirmed good. |
| 16:10 | Contrast sweep, 5 screens | Pass — **0 failures across 443 text nodes** after fixing one real 2.32:1 pairing. |
| 16:15 | Tap-target + overflow sweep at 375 / 768 / 1440 | Pass — no horizontal scroll anywhere, **0 sub-44px targets** after animations settle. |
| 16:30 | `npx tsc --noEmit` / `eslint .` / `validate:fixtures` / `check:functional` / `build` | Pass — 0 / 0 / 43-43 / 53-53 / built in 905ms. |

---

## Known Issues and Risks

| Priority | Issue/risk | Demo impact | Workaround | Owner/status |
|---|---|---|---|---|
| High | No `ANTHROPIC_API_KEY` in the environment, so the live path is written but **not yet verified end to end**. | Live-AI portion of the demo unproven until a key is added. Fixture path is unaffected and is the demo-safe default. | Build the full live path now; run and record the live tests the moment a key lands in `.env`. Fixture mode needs zero configuration. | Open — awaiting key from Andrea. |
| Medium | `DecodeResponse` has no `needsFollowUp` field (spec §17 gap), so Decode structurally cannot ask a clarifying question the way Say It Better can. | None for the demo — Decode surfaces its question as `clarificationQuestion` in the result instead. | Accepted for P0; noted as a contract gap rather than worked around. | Accepted. |
| Low | Spec §5.1 lists a Regenerate button among required results but §10.1's P0 list omits it. | None. | Building regenerate-whole-result (cheap). Regenerate-one-section stays P1 per the cut order. | Accepted. |
| Low | `humorLevel` has no specified default, and `'off'` hides the unfiltered translation — the demo's biggest laugh. | Would silently remove the hook if defaulted wrong. | The prepared engineer scenario explicitly seeds `humorLevel: 'unfiltered'`. A content test asserts the card is hidden when humor is `'off'`. | Resolved. |

---

## P0 Acceptance Criteria (spec §28)

Checked against the running application. "Untested" means exactly that — it is not a soft pass.

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | The app loads without errors | **Pass** | Console on load carries only Vite HMR debug lines and the React DevTools notice. No errors, no warnings. |
| 2 | The premise is understandable from the first screen | **Pass** | Landing headline states the problem in eight words, the sub-paragraph states the promise and the limit ("does not claim to read minds"), and a "Why it works" section names the three differentiators. |
| 3 | The user can choose all three modes | **Pass** | Three mode cards on the landing screen plus a persistent tab row in the workspace. |
| 4 | The engineer/PM scenario completes from input through copyable result | **Pass (offline path)** | Walked end to end in the browser: example load → context prefilled → Translate → follow-up step → six-layer result with a working Copy. Live path untested — no key. |
| 5 | The funny translation is a secondary feature, not the only value | **Pass** | The unfiltered card is deliberately lighter in weight than the sendable card, is labelled as the internal version, and is explicitly marked as not-for-sending. It is also suppressed entirely when humour is off. |
| 6 | The sendable version is honest and includes only supplied commitments | **Pass** | Enforced by test, not by inspection: `validate-fixtures` fails the build if the sendable message contains "approved", "approval", or "nearly complete". The rendered "What changed" list states outright that it did not claim the alternate work was approved. |
| 7 | Live text AI works when correctly configured | **Untested** | Transport proven against real HTTP (401 round-trip, plus 503/413/400/405 paths) and a 35-check smoke suite. **Model output quality is unverified — no `ANTHROPIC_API_KEY` available.** This is the one open item. |
| 8 | Prepared fixtures work when live AI is unavailable | **Pass** | All three examples run with zero configuration and no network. 43/43 fixture assertions green. |
| 9 | Decode visibly separates literal meaning, interpretation, and unknowns | **Pass** | Four numbered layers with distinct hues and rails. `knownFacts` renders in its own card, never folded into the literal reading. Every one of the 6 interpretations carries a `ConfidenceBadge` (counted in the live DOM). The unknowns layer is full weight — `shadow-lift`, full-size body text, not greyed. |
| 10 | Conflict Lens shows both perspectives, escalation, core problem, resolutions, repair message | **Pass** | Verified in the live DOM: two equal 544px participant columns, a horizontal 4-node escalation timeline, `CoreProblemCard` as the heaviest element in the app (`bg-grad-ink` + `shadow-float`), 2–4 resolution options with tradeoffs, and a copyable repair message. |
| 11 | Role pair, channel, outcome, and tone visibly affect the experience | **Pass structurally; live effect untested** | 10 functional checks assert all four reach the model request payload, and the prompts encode per-channel and per-role rules (Slack → 1–3 sentences, no greeting; executive → decision and ask first). **Proving the output actually differs requires a key** — the side-by-side test is written up as the first task for the next session. |
| 12 | All presentation-critical screens work on mobile and desktop | **Pass** | `document.documentElement.scrollWidth === clientWidth` at 390px and 1440px on the landing, Decode, and Conflict screens. Conflict verified stacked with a vertical timeline on mobile and mirrored panels with a hinge on desktop. |
| 13 | Loading and failure states are intentional | **Pass** | Four named stages per mode with tick-off states and skeleton cards that mirror the real cards — never a bare spinner. Errors render a designed coral panel with the user's inputs preserved; a fixture is offered only for a built-in example, never substituted silently. |
| 14 | No API key appears in client code or committed files | **Pass** | Decoy-value build test: a real-shaped key in `.env` provably does not reach `dist/`. `sk-ant-api03` and `sk-ant-[A-Za-z0-9_-]{20,}` return no matches; `loadEnv` is absent from the bundle. `.env` gitignored, `.env.example` placeholders only. See F-002 for why the naive word-grep was replaced. |
| 15 | No raw private message content in the build log | **Pass** | This log contains no pasted user content. The one quoted message is the spec's own fictional example. |
| 16 | README contains complete setup and demo instructions | **Pass** | All 14 spec §31 items covered, including the no-server key approach and its limitation. Labels re-synced after the UI rename. |
| 17 | Build log contains milestones, failures, decisions, evidence, retrospective | **Pass** | 5 milestones, 13 decisions, 7 failure rows, command evidence, and a completed retrospective. |

**Score: 15 Pass, 2 gated on a missing API key.** Both gaps are the same root cause and neither is a code defect.

## Demo Readiness Checklist

- [x] Application starts from a clean install
- [x] No secret is committed
- [x] Engineer/PM prepared scenario is reset and ready
- [~] Live AI scenario has been tested — **transport, auth and request shape proven; generation blocked by an empty account credit balance.** Run `npm run check:live` once credits exist.
- [x] Fixture-only scenario has been tested
- [x] AI failure fallback has been tested
- [x] Decode It demo is ready
- [x] Conflict Lens demo is ready
- [~] Copy actions work — implementation verified and the failure path observed; the success path needs one manual click, because the Clipboard API requires real user activation.
- [x] Mobile and presentation-screen layouts work
- [x] No presentation-breaking console errors
- [x] Three-minute demo has been rehearsed
- [x] Presenter knows how to switch to fixture mode — set `AI_MODE=fixture` in `.env` and restart. **Recommended while credits are unavailable:** it gives a clean run with no error-then-fallback detour.
- [x] README is current
- [x] Final retrospective below is complete

---

## Final Retrospective

Complete this section before declaring the project finished.

### What was built?

Context Switch, complete through P0: a Vite + React 18 + TypeScript single-page app with three working modes.

- **Say It Better** — role-pair context builder, message composer, a structured Smart Follow-Up step, and a six-layer result view (unfiltered translation → ready to send → alternative tones → how it may land → what changed → still missing).
- **Decode It** — four visually distinct layers separating literal meaning and known facts from labelled inference, from what cannot be known, from the best next question, plus three copyable reply options.
- **Conflict Lens** — conversation parsing with speaker confirmation, two-column participant perspectives, an explicit meant-vs-heard pairing, separated shared/disputed/unanswered facts, a numbered escalation timeline, the core problem given real visual weight, resolution options with tradeoffs, and a copyable repair message.

Supporting all three: one `ContextSwitchAiClient` interface with three implementations (dev-server proxy, bring-your-own-key direct, deterministic fixture) behind a router; a single Zod validation gate every response and every fixture passes through; per-mode prompt templates; staged loading states; typed error and fallback handling; a Prepared Scenario picker; a Reset Demo control; and an AI-source indicator that reports which client actually produced the result on screen.

### What worked especially well?

**Owning the shared surface before parallelizing.** Contracts, Zod schemas, design tokens, and the session reducer were written centrally first. Only then did seven subagents work concurrently on disjoint file sets. Because the shapes were already frozen, the integration cost across ~5,000 lines of parallel work was *one* type error (F-004's `RegionTone` widening), fixed inside a minute. Freezing an exact primitive API signature list in each brief let consumers and components be written simultaneously rather than serially.

**Making the schema stricter than the spec.** Spec §17 declares every Say It Better result field optional, so a response with no `sendableMessage` would type-check, validate, and render an empty screen. Closing that at the gate (D-004) rather than in five consumers meant the failure became impossible instead of merely unlikely.

**Adversarial verification, repeatedly.** The strongest results came from checks designed to fail. The fixture gate was negative-tested by injecting "The sender is annoyed" into the decode fixture and confirming it broke. The secret audit was re-run against a bundle deliberately built to *contain* the AI layer with a decoy key, because the obvious grep had passed trivially. Both are recorded in F-002.

**Documenting the system tested it.** Two real bugs (F-003, F-005) were found by the agents writing the README and driving the demo, not by the agents writing the code — and neither was reachable by typecheck, lint, or any unit-level check.

### What did not work?

- `z.discriminatedUnion` rejected the refined Say It Better schema, because `superRefine` returns a `ZodEffects` rather than a `ZodObject` (F-001).
- `AI_MODE` in `.env.example` controlled nothing on the client; only `VITE_AI_MODE` did. A presenter switching to fixture mode mid-demo would have seen no effect (F-003).
- The flagship scenario silently skipped the follow-up step, deleting a scripted demo beat — and a code comment of mine asserted the opposite of the actual behavior (F-004).
- Mouse-wheel scrolling over the sticky scenario picker swapped the loaded demo (F-005).
- `read_page`'s accessibility tree reported six unnamed buttons and snake_case radio names that were all false; I nearly filed two defects against working code (F-006).
- The landing screen's "What makes this different" panel initially repeated the three mode descriptions verbatim from the cards directly above it — wasting the one panel that could explain *why* the product works.
- **Live AI model output remains unverified.** The transport is proven; the prompts' output quality is not. No key was available.

### What was cut or deferred, and why?

Cut per the CLAUDE.md cut order, none of it P0:

- **Screenshot upload with vision/OCR** (P1) — the largest item, explicitly forbidden from delaying the text demo.
- **Custom role descriptions** — the `Other` role option exists; a free-text label does not.
- **Tone slider** and **regenerate-one-section** — whole-result regenerate was built instead, since spec §5.1 requires a Regenerate control while §10.1's P0 list omits it.
- **Neighbor boundary scenario** (spec §9.3) — the three P0 scenarios were prioritized.
- **Multi-speaker conflicts** — the schema rejects them rather than half-rendering them (D-005).
- **Editable output, download-as-text, example gallery** — all P1.

Deferred honestly rather than cut: live-AI content verification, which is blocked on a key rather than on time.

### Which decisions most affected the final result?

1. **D-006 — parallel subagents with disjoint ownership and a pre-frozen shared surface.** This is why a 4.5-hour budget covered five phases. It only worked because the shared shapes were settled first.
2. **D-004/D-005/D-007 — a validation gate stricter than the contract.** Turned three whole classes of blank-screen failure into caught errors.
3. **D-001 — no server.** Bought a fast local demo and cost the ability to do live AI on static hosting without putting a key in the browser. The most consequential tradeoff in the build.
4. **D-009 — refuse rather than substitute.** Fixture-only mode will not answer custom text with prepared content. It narrows what a keyless user can do, and it is the difference between a demo and a fake.
5. **D-010 — Sonnet over the most capable model.** Latency is a feature in a three-minute demo.

### How is AI used in the product?

As the transformation engine, behind a strict contract. The client sends a rendered per-mode prompt to the Anthropic Messages API and receives JSON that must satisfy that mode's Zod schema before any of it reaches a component. On a validation failure the layer retries once with a repair instruction carrying the specific validation issues, then returns a typed error. Raw model output is never rendered.

The product's opinions live in the prompts, not in post-processing: how a channel changes length and formality (Slack gets 1–3 sentences, no greeting, no sign-off), what a recipient's role needs to hear first (an executive gets the decision and the ask in sentence one), the Honesty Guard's instruction to return a question instead of a fabricated fact, the requirement that every inference carry a support label, and the prohibition on flattening observable harmful conduct into "both sides should communicate better." One instruction states the standard directly: *a message that would work equally well for any role pair is a failed result.*

### How was AI used during development?

Claude Code acted as orchestrator and wrote the shared surface directly — contracts, schemas, tokens, session reducer, shell, context builder, app wiring, and this log. Seven subagents were then managed against explicit file allowlists and frozen API contracts: UI primitives, vocabulary and fixtures, the AI layer, three result views, documentation, and the Phase 5 audit.

What made it work was requiring evidence rather than assertions. Agents were told to report contract mismatches instead of silently changing signatures, and several did. Several went beyond their brief in useful ways: one compiled the real Tailwind sheet to prove every class it emitted actually generates; one server-rendered its components to assert all six interpretations carried a confidence badge; one noticed its own secret-leak grep would pass trivially and rebuilt the bundle to make the test meaningful.

Where it needed correcting: one agent left a scratch harness inside the source tree, and agent reports were not taken at face value — the key-handling code and the accessibility claims were re-read and re-measured independently, which is how F-006 was caught.

### What safety and privacy choices were made?

- **Honesty Guard, enforced in the prompt and asserted in the fixture gate.** A test fails the build if the engineer fixture's sendable message contains "approved", "approval", or "nearly complete" — the model must not invent approval for the side project.
- **No unlabelled inference.** Every `Interpretation` renders a confidence badge with a distinct icon and text label, never color alone. Speculative items sit behind a disclosure.
- **Unknowns are a feature.** The Decode schema *requires* a non-empty `unknowns` array; a decode claiming nothing is unknowable is rejected at the gate. A fixture test asserts the decode output never claims the PM is annoyed outside `unknowns`.
- **No false equivalence.** The Conflict Lens prompt is instructed that threats, intimidation, coercion, discriminatory harassment, and safety concerns are not to be flattened; a `falseEquivalenceWarning` renders above the analysis, never buried.
- **No diagnosis, no claimed certainty about hidden intent, no automatic sending, no message persistence, no analytics.**
- **Accurate privacy copy only.** The composer carries spec §20's wording verbatim. Nowhere does the app claim messages stay on the device, because with live AI they do not. The BYOK drawer states plainly that the key and the message go from the browser straight to Anthropic.
- **Keys.** Server key read only inside `vite-plugin-ai-proxy.ts` via `loadEnv`, never `VITE_`-prefixed, logged only as a boolean. User key confined to `DirectAiClient.ts`, memory plus `sessionStorage`, never `localStorage`, cleared by Reset Demo, and `getUserKey` is not re-exported so the read site stays in one file. Proven not to reach `dist/` by a decoy-value build.
- **High-stakes content** produces a notice stating the output is communication assistance, not legal, HR, medical, or crisis advice.

### What are the known limitations?

1. **Live-AI output quality is unverified** — transport proven, prompts unproven, pending a key.
2. Static hosting cannot do live AI without the user pasting a key into the browser (D-001).
3. In fixture-only mode, custom text cannot be translated at all — only the three prepared scenarios run (D-009).
4. The three-way jargon control maps onto a boolean, so "remove" and "reduce" behave identically at the prompt level (D-008).
5. Multi-speaker conflicts are rejected, not supported (D-005).
6. A one-speaker conflict paste is gated by the Continue button rather than explained by the parser.
7. The 25-second client timeout covers the original request *and* its schema-repair retry; the retry gets no fresh budget.
8. BYOK cannot change the model — `AI_MODEL` reaches the proxy path only.
9. Screenshot upload, editable output, and tone slider are not built.
10. No tests beyond the fixture gate and the AI layer's smoke checks; no component test suite.

### What would be built next with one additional day?

1. **Verify and tune live output** — run all three scenarios against a real key, iterate the prompts against the spec §27 content tests, and prove the role pair changes the result by running one message as Engineer→PM on Slack and Engineer→Executive over email side by side.
2. **A real server route**, retiring the BYOK path and D-001's tradeoff entirely.
3. **Screenshot upload** — the highest-value P1, with extracted-text correction and speaker confirmation before analysis.
4. **A component test suite** (Vitest + Testing Library), starting with the invariants currently guarded only by the fixture script: humor-off hides the unfiltered card, no inference renders unlabelled, unknowns always render.
5. Fix the contract gaps properly: a real `jargonLevel` field (D-008), `needsFollowUp` on `DecodeResponse`, and `speakerId` on `escalationPoints`.


### Final demo status

**Status:** **Ready with the built-in examples.** Live AI is implemented, authenticated, and
verified as far as the provider — generation is blocked only by an empty account credit balance.  
**Verified at:** 2026-08-27, 16:30 CDT — rehearsed twice end to end (live-configured and offline).  
**Verified by:** Claude Code, driving the running application and measuring the DOM. Every figure
in this log was measured, not estimated; where something could not be verified it says so.

### Exact presenter flow

**Before you start:** set `AI_MODE=fixture` in `.env` and restart (`npm run dev`) — while the
account has no credits this avoids an error-then-fallback detour on every scenario. Load the app,
press **Start over**, and click **Copy message** once by hand to confirm clipboard permission.

1. **Hook (0:00–0:20).** Land on the opening screen. Read the headline off it: *"You know what you
   meant. They heard something else."* Say the promise and the limit together — it does not claim
   to read minds; it separates what was said from what was inferred.
2. **Engineer → PM (0:20–1:15).** Click **Try it: an engineer telling a PM the truth**. Point at
   the monospace route: `ENGINEER → PRODUCT MANAGER`, and at the `6 / 6 set` context receipt —
   that context goes into the request, it is not decoration. Press **Translate**.
3. **The follow-up beat.** Three questions appear with answers already filled in. Read the line at
   the top aloud: *"Anything you don't tell me stays out of the message — it never gets filled in
   for you."* Click **Next question** twice, then **Finish and rewrite**.
4. **The laugh, then the turn.** The unfiltered card lands first: *"I followed the dopamine instead
   of the roadmap."* **Pause for the laugh.** Then move to **Ready to send** and read the honest
   version. Now the point: scroll to **What changed** and read the last line —
   *"Did not claim that the alternate work was approved."* That is the product, not the joke.
5. **Decode It (1:15–1:55).** Choose **Decode a product manager check-in**, press **Analyze**.
   Note the route has reversed: `PRODUCT MANAGER → ENGINEER`. Walk the four numbered layers and
   land on layer 3 — whether the sender is annoyed **cannot be determined from this message**.
   Mention that the weaker reading is deliberately collapsed behind a disclosure.
6. **Conflict Lens (1:55–2:40).** Choose **Alex and Sam: the kitchen argument**, press **Analyze**.
   Show **Meant, and heard** as a pair, then **Where the temperature rose** — note it quotes the
   wording and describes its effect, and never says who escalated. Land on the core problem:
   there is no shared definition of when the task is done. Finish on the repair message.
7. **Close (2:40–3:00).** *"Most tools make your words sound better. This one checks they mean the
   right thing to the person receiving them."*

**If something goes wrong:** every scenario has a built-in example. If a request fails you get
**Try again** and **Show saved example** — take the saved example and keep talking; the status
pill will read **OFFLINE**, which is honest and worth saying out loud rather than hiding. 

