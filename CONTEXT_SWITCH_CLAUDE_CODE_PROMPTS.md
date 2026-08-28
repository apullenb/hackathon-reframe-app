# Context Switch — Claude Code Build Prompts

Eight sequential prompts for a **Vite + React + TypeScript** build of Context Switch, mapped to
the spec's Phase 1–5 plan. Paste one, let it finish, verify, then paste the next.

## Before you start

1. Create an empty repo/folder.
2. Copy into it: `Context_Switch_Project_Spec.md`,
   `Context_Switch_Hackathon_Build_Log_Template.md`, and `CLAUDE.md`.
3. `cd` there and run `claude`.
4. Run Prompt 0.

**Time budget.** Prompts 0–1: 45 min. Prompt 2: 75 min. Prompt 3: 50 min. Prompts 4–5: 75 min.
Prompt 6: 40 min. Prompt 7: 45 min. If you're 30+ minutes behind after Prompt 3, jump to the
recovery prompt at the bottom.

**One note on the stack.** The spec assumes a Next.js server route protects the API key. You
have no server, so Prompt 3 uses a Vite dev-server middleware plugin instead — the key lives in
the Node process during `npm run dev` and never reaches the browser bundle. For a static build,
live AI requires the user to paste their own key at runtime. This is a real tradeoff and the
prompts tell Claude Code to log it as decision D-001.

---

## Prompt 0 — Recon and plan

```
Read CLAUDE.md and Context_Switch_Project_Spec.md in full before doing anything else. Also
look at Context_Switch_Hackathon_Build_Log_Template.md.

Do not write any application code yet.

Inspect the current directory and tell me what's here. Then give me:

1. A one-paragraph statement of what we are building and what makes it different from a
   generic "make this more professional" rewriter. If you can't articulate the difference
   crisply, re-read spec sections 1, 2, and 32.
2. The file/folder structure you plan to create, based on the component tree in spec §23,
   adapted to Vite + React + TypeScript.
3. Your plan for the three AI modes described in CLAUDE.md (fixture / dev-proxy / byok),
   and specifically how you will guarantee the Anthropic key never lands in the client
   bundle.
4. A phase-by-phase time budget for a 4.5 hour build, and which items you'd cut first.
5. Any place where the spec is ambiguous or where you think it's wrong. Be direct.

Then stop and wait for me to approve before you scaffold anything.
```

**What to check before approving:** that it names role-pair context, evidence-vs-inference, and
the Honesty Guard as the product — not "an AI rewriting tool." That its key plan is the Vite
middleware, not a `VITE_` env var.

---

## Prompt 1 — Foundation: scaffold, contracts, fixtures, shell

```
Approved. Build Phase 1 (spec §26).

Scaffold and foundation:

1. Scaffold Vite + React 18 + TypeScript in this directory. Add Tailwind CSS, Zod, and
   lucide-react. Add npm scripts: dev, build, preview, typecheck, lint.
2. Copy Context_Switch_Hackathon_Build_Log_Template.md to HACKATHON_BUILD_LOG.md and fill in
   the Project Information and Environment/Baseline sections. Record Milestone 0. Add
   decision D-001: Vite + React with no server instead of the spec's recommended Next.js,
   with the tradeoff spelled out (static-hosted live AI requires a user-supplied key).
3. Create .env.example with ANTHROPIC_API_KEY, AI_MODEL, and AI_MODE placeholders. Add .env
   to .gitignore. No real key anywhere.

Design tokens — implement UI Direction Option A, "Context Switchboard" (spec §12). In
tailwind.config and a tokens file, define: warm off-white background, deep indigo primary,
electric violet secondary, chartreuse accent used sparingly, coral for conflict markers,
teal for success, near-black navy text. A humanist sans for UI, a monospace for role routes
and the unfiltered translation. Build a small set of primitives: Button, Card, Chip,
Textarea, Select, Badge. No tiny gray text.

Type contracts — create src/types/contracts.ts with every type from spec §17 exactly as
written: CommunicationContext, FollowUpQuestion, the three request types, the three response
types, Interpretation, SafetyResult. Then create src/schemas/ with a Zod schema for each
response type. The Zod schemas are the single validation gate — both live responses AND
fixtures must pass through them.

Context vocabulary — create src/data/vocabulary.ts with the full lists from spec §6: work
roles, personal roles, relationship types, channels, desired outcomes, tone choices, plus the
optional controls (urgency, relationship temperature, length, humor level, jargon).

Fixtures — create src/fixtures/ with typed fixtures for all six cases in spec §21:
- Engineer → PM Say It Better (use the exact content in spec §8, including the unfiltered
  translation "I followed the dopamine instead of the roadmap." and the sendable version)
- PM → Engineer Decode It ("Just checking in. Do we have an update on this yet?")
- Alex/Sam kitchen conflict (spec §9.2)
- one AI error response
- one deliberately schema-invalid response, for testing the validation path
- one safety-escalation response
Write a test or a script that asserts every valid fixture parses against its Zod schema.

App shell — AppShell, BrandHeader (logo "Context Switch", tagline "Translate intent into
impact."), ModeSelector with the three mode cards using the exact copy from spec §13.1,
and DemoControls containing a Prepared Scenario picker, a Reset Demo button, and a discreet
AI-mode indicator showing live / fixture / error. Session state in React state only; you may
use sessionStorage for UI preferences but never for pasted message content.

The three mode routes can be state-driven; no router needed.

When done: run typecheck and build, confirm the fixture schema assertions pass, update the
build log with Milestone 1 and evidence, and show me the app running. Do not start Say It
Better yet.
```

---

## Prompt 2 — Say It Better (the flagship flow)

```
Phase 2 (spec §26). Build the complete Say It Better flow against fixtures only — no network
calls yet. This is the flow the demo lives or dies on, so make it excellent before moving on.

Context Builder (spec §13.2):
- Two prominent role selectors — "I am" and "They are" — with an animated directional
  connection between them. The signature element from spec §12: a monospace route reading
  ENGINEER → PRODUCT MANAGER pinned at the top of the workspace.
- Relationship and channel selectors beneath the role pair.
- Outcome and tone as selectable chips.
- A pinned context summary above the message field.
- Role selection must work by keyboard and must not require fine pointer control.

Message Composer (spec §13.3): large textarea, example prompt link, the accurate privacy note
from spec §20 ("Avoid pasting information you would not want processed by the configured AI
provider. This demo does not intentionally save message history."), Continue disabled until
required context and a message exist.

Smart Follow-Up (spec §7, §13.4): a focused step, not a chat. One question per card, 2–4
tappable choices, optional short custom answer, a visible "Why are we asking?" explanation,
"1 of 3" progress, Skip allowed unless the answer is needed to avoid inventing a fact. Use
the three engineer-scenario questions from spec §7 with the prepared answers seeded when the
prepared scenario is loaded.

Loading state (spec §11.1, §25): staged status text — "Understanding the role pair" →
"Checking for missing facts" → "Preserving your intent" → "Shaping the message for the
recipient" — with the role-route arrow animating as if the message is moving through a
circuit. Skeleton cards, not a bare spinner. No typewriter animation.

Results (spec §13.5), revealed in this order:
1. Unfiltered Translation — playful monospace card
2. Ready to Send — the largest card, primary Copy action, subtle glow
3. Try Another Tone — two smaller alternative cards with meaningfully different tones
4. How It May Land — compact impact tags with positive/neutral/caution sentiment, conveyed
   by icon and text, never color alone
5. What Changed — transparent explanation
6. Still Missing — rendered only when non-empty

Copy button shows a visible, screen-reader-announced success state.

Wire the Prepared Scenario picker so "Engineer → PM status update" loads the full spec §8
scenario end to end: context preset, raw message, seeded follow-up answers, fixture result.

Verify: run the prepared scenario start to finish at 390px and 1440px width. Tab through the
whole flow. Confirm the unfiltered card is hidden when humor is set to off. Update the build
log with Milestone 2 and evidence, including anything that didn't work.
```

---

## Prompt 3 — Live AI without a server

```
Phase 3 (spec §26). Add live Anthropic integration. Re-read the "How the API key is handled
without a server" section of CLAUDE.md first — this is the part of the build most likely to
leak a secret.

Provider layer — three implementations of one interface:
- src/ai/types.ts: the ContextSwitchAiClient interface from spec §16.
- src/ai/FixtureAiClient.ts: returns the prepared fixtures, with a small artificial delay so
  the staged loading state is visible in the demo.
- src/ai/ProxyAiClient.ts: POSTs to /api/context-switch. Holds no key. This is the preferred
  live client and the only one used during `npm run dev`.
- src/ai/DirectAiClient.ts: the bring-your-own-key path for a static build with no dev server.
  Calls the Anthropic API directly from the browser with the user-pasted key, which requires
  the anthropic-dangerous-direct-browser-access header. Used ONLY when the proxy is
  unreachable and the user has explicitly supplied a key. Keep it in its own file so the
  "key touches the browser" code path is one obvious, auditable place.
- src/ai/router.ts: picks a client from AI_MODE (live | fixture | auto), proxy reachability,
  and whether the current request is a prepared scenario. Preference order is always
  proxy → direct (only if a user key exists) → fixture. In auto: try live, fall back per the
  rules below.

The route, without a server:
- Write vite-plugin-ai-proxy.ts, a Vite plugin that registers middleware for
  POST /api/context-switch on the dev server. It reads ANTHROPIC_API_KEY through Vite's
  loadEnv, calls the Anthropic Messages API from the Node process, and returns JSON. The key
  stays in Node. Do not use a VITE_-prefixed variable for it.
- Add the bring-your-own-key path for static builds: a settings drawer where the user pastes a
  key, kept in memory and sessionStorage only, cleared by Reset Demo, never logged, never in
  localStorage. When this path is active the UI must say plainly that the key and the message
  go from the browser straight to Anthropic. Probe for the dev proxy at startup; if it is
  reachable, prefer it and never prompt for a key.

Prompts — separate templates per mode in src/ai/prompts/, not one giant prompt. Encode the
shared system principles from spec §18 and each mode's objectives. The Say It Better prompt
must implement the Honesty Guard: when the requested rewrite would require inventing progress,
approval, a date, or a reason, return needsFollowUp: true with the missing fact as a question
rather than fabricating it. Request strict JSON matching the mode's schema.

Validation and failure handling (spec §16, §25):
- Parse every live response with its Zod schema before it reaches the UI.
- On validation failure, retry once with a schema-repair instruction. If it fails again,
  return a typed error. Never render raw model output.
- Reasonable timeout for a live demo. On timeout, preserve the user's inputs.
- For a prepared scenario, show: "The live translation took too long. Continue with the
  prepared demo response?" — offered, not silently substituted.
- For custom content, show: "The translation could not be completed. Your message has been
  preserved. Try again." Never replace custom content with unrelated fixture content.
- The AI-mode indicator in DemoControls must always show which client actually produced the
  result on screen.

Then verify and prove it:
1. Run the engineer/PM scenario live and paste the resulting sendable message into the build
   log's AI Product Integration Log — check it did not invent approval for the side project.
2. Run it with no key configured; confirm fixture fallback.
3. Force a timeout and confirm the prepared-scenario offer appears.
4. Feed it the invalid fixture and confirm the repair-then-error path.
5. Run `npm run build` and grep the dist/ output for the key and for "sk-ant" — confirm
   nothing. Report exactly what you grepped for and what you found.

Update the build log with Milestone 3, the AI integration table rows, and any prompt
iterations in the P-00n table.
```

**Verify yourself before moving on:** `npm run build && grep -ri "sk-ant" dist/`. Trust but
check.

---

## Prompt 4 — Decode It

```
Phase 4a (spec §5.2, §11.2, §13.6). Build the Decode It mode end to end, live AI plus fixture.

Inputs: user role, sender role, relationship, channel, the incoming message, and optional
preceding context. Reuse the context builder; the role route now reads in the other direction
(PRODUCT MANAGER → ENGINEER when decoding a PM's message).

Results in four visually distinct layers, in this order:
1. What it literally says — the literal meaning, plus a clearly separated "Known facts" list.
   knownFacts is its own P0 element and its own schema field; do not silently fold it into the
   literal reading.
2. What it may be trying to accomplish — likelyPurpose and interpretations, with the tone cues
   shown as quoted wording paired with a neutral observation about that wording
3. What you cannot know from this message
4. Best next question — the suggested clarification, plus "a useful response should include"
   as a short checklist

Below those, three response option cards, each with its own Copy action.

Every field on DecodeResponse must render somewhere. Before you finish, list each field in the
contract and tell me which component displays it.

Support labels are the point of this mode. Every Interpretation renders a ConfidenceBadge:
strongly_supported / plausible / speculative, distinguished by icon and text as well as color.
Speculative items that would inflame the situation are collapsed behind a disclosure rather
than shown by default. The "cannot know" layer must be as visually prominent as the others —
it is a feature, not a disclaimer.

Wire the prepared scenario: "Just checking in. Do we have an update on this yet?" from a
product manager. The output must show a literal reading, a plausible planning interpretation,
and must explicitly state that frustration cannot be determined from this message. If the live
model claims the PM is annoyed, fix the prompt and log the iteration — that's a content-test
failure per spec §27.

Verify at phone and desktop width, test the empty-optional-sections case, tab through, update
the build log.
```

---

## Prompt 5 — Conflict Lens

```
Phase 4b (spec §5.3, §11.3, §13.7). Build Conflict Lens end to end, live AI plus fixture.
This is the most visually ambitious mode — budget accordingly and don't let it eat Prompt 6.

Input: a pasted two-speaker conversation, speaker assignment (which speaker is the user),
and the relationship. Parse "Name: message" lines and show the parsed speakers for
confirmation before analyzing.

Desktop layout: two equal-width participant columns, a shared center or lower panel for the
core problem, a horizontal escalation timeline, resolution cards below.
Mobile: participant cards stacked, "what was meant / what was heard" as paired rows, vertical
escalation timeline.

Sections, all from the ConflictLensResponse contract:
- Neutral summary
- Each participant's stated position, and their possible concerns (labeled Interpretations)
- "What they may be trying to say" vs "What the other person may hear" as an explicit pair
- Shared facts / disputed or unclear / unanswered questions, visually separated
- Escalation points, each with the excerpt, a neutral observation about the wording, and its
  effect — describe the behavior, never the person's character
- Core unresolved problem, given real visual weight
- Shared goal when one exists
- 2–4 resolution options with tradeoffs
- Suggested next conversation structure
- One repair/reset message with a Copy action

Safety: if falseEquivalenceWarning is present, render it above the analysis, not buried. The
prompt must instruct the model that threats, intimidation, coercion, discriminatory
harassment, or safety concerns are not to be flattened into "both sides should communicate
better" — name the observable behavior, don't diagnose, point to appropriate support.

Wire the prepared Alex/Sam kitchen scenario from spec §9.2. The analysis must land on the
real issue — no shared definition of when the task is done, plus low trust in follow-through —
not "they should communicate better." It must not declare either person right.

Verify both prepared and live, check long-output handling, update the build log.
```

---

## Prompt 6 — Polish, motion, accessibility

```
Phase 5a (spec §14, §24). No new features. Make it feel like a product.

Motion — motion communicates transformation, not decoration:
- The role-route arrow animates only while a request is in flight.
- Results reveal in logical order with a short stagger.
- Subtle scale or glow on the primary sendable message when it lands.
- Immediate copy-success feedback.
- Every animation respects prefers-reduced-motion. Verify by actually enabling it.
- No long typewriter effects, no token streaming.

Accessibility pass, checking each item and reporting results as a table:
- Full keyboard access through all three flows
- Visible focus states everywhere
- Semantic labels on every control
- 44px minimum pointer targets
- No status or confidence conveyed by color alone
- Text contrast checked, no tiny gray text
- Screen-reader text on icon-only buttons
- Copy confirmation announced via aria-live
- Nothing auto-advances before a result can be read

Responsive pass at 390px, 768px, and 1440px for all three modes, including the long-output and
empty-optional-section cases.

Then clean up: remove every console error and warning, remove dead code and unused fixtures,
run typecheck, lint, and build. Report anything you couldn't fix and why.

Update the build log's Visual and Accessibility table with real results — not all-pass
placeholders.
```

---

## Prompt 7 — Demo hardening, README, retrospective

```
Phase 5b. Ship it. Work through this in order and report on each.

1. Run the full three-minute demo from spec §29 exactly as written, twice: once with live AI
   enabled, once in fixture-only mode. Note every stumble, delay, or awkward moment. Fix
   anything presentation-breaking. Record both runs in the build log.

2. Run the functional test list in spec §27: required inputs block premature submission, the
   role pair actually reaches the model request, follow-up answers actually change the
   request, copy copies what's displayed, Reset restores prepared state, every response
   validates, fixtures work with no key, live works with a key, a timed-out prepared request
   offers fallback, custom content is never swapped for unrelated fixture content. Report
   pass/fail per item, honestly.

3. Run the content tests from spec §27: the engineer output stays truthful, Decode does not
   claim the PM is angry, Conflict Lens identifies both stated positions, alternative tones
   preserve core meaning, the unfiltered translation is hidden when humor is off, high-stakes
   content produces appropriate limits, no output diagnoses anyone. Any failure here is a
   prompt fix, not a UI fix.

4. Verify no secret ships: build, grep dist/ for the key and for "sk-ant", confirm .env is
   gitignored, confirm .env.example holds only placeholders, confirm git history is clean.

5. Write README.md covering everything in spec §31: product summary, features, architecture
   (including the no-server key approach and its limitation), requirements, install, env
   setup, how to run live, how to run fixture-only, how to build, how to run the prepared
   demo, provider notes, privacy and safety limitations, known limitations, and a link to the
   build log.

6. Optionally write DEMO_SCRIPT.md with the presenter flow, the exact click path for each
   scenario, and how to switch to fixture mode mid-presentation if the network dies.

7. Complete the entire Final Retrospective in HACKATHON_BUILD_LOG.md — every question
   answered substantively. Include what was cut and why, which decisions mattered most, how
   AI is used in the product versus during development, and the safety and privacy choices.
   Then complete the Demo Readiness Checklist, checking only what is actually true.

8. Finally, check the build against every item in spec §28 P0 Acceptance Criteria and give me
   a pass/fail table. Where something fails, say so plainly and tell me how long a fix would
   take.
```

---

## Recovery prompts

Keep these for when the build goes sideways.

**Behind schedule:**

```
We have N minutes left before the demo. Stop feature work. Re-read the cut order in CLAUDE.md
and spec §26, tell me exactly what you're cutting and what you're keeping, then spend the
remaining time making the engineer/PM Say It Better flow and the fixture fallback flawless.
Log the scope change in the build log's Scope Changes table.
```

**Live AI producing invalid JSON:**

```
The model keeps returning responses that fail Zod validation. Don't loosen the schema. Show me
the current prompt for that mode, the shape of what came back, and the specific validation
error. Then fix the prompt — tighten the output contract, add an explicit example of the exact
JSON shape, use a prefill or tool-style structured output if it helps. Log the iteration in
the build log's Prompt Iterations table with what changed and whether it helped.
```

**Output is generic:**

```
The output reads like generic "make this more professional" text — the role pair, channel,
outcome, and relationship aren't visibly changing the result. That's the whole product.
Show me the exact prompt being sent for Say It Better. Then rework it so the role pair and
channel materially shape the message, and prove it: run the same raw message as
Engineer → Product Manager on Slack and as Engineer → Executive over email, and show me both
outputs side by side. If they're near-identical, the prompt still isn't working.
```

**Something regressed:**

```
Before you change anything: what exactly is broken, what was the last thing that worked, and
what's your hypothesis? Don't fix by rewriting the component. Make the smallest change that
addresses the cause, then re-run the prepared engineer/PM scenario end to end. Log it as an
F-00n row in the failure log.
```
