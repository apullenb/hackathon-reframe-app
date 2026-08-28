# CLAUDE.md — Context Switch

Drop this file at the repo root before the first Claude Code session. It persists across
sessions and compactions; the phase prompts assume you have already read it.

---

## What this project is

**Context Switch** — an AI communication translator. A user says who they are, who they're
talking to, and what they're trying to accomplish; the app does one of three jobs:

- **Say It Better** — turn an honest but badly phrased thought into a sendable message
- **Decode It** — separate what an incoming message *says* from what it *might mean* and what
  *can't be known*
- **Conflict Lens** — map a two-person conflict neutrally and propose a repair

`Context_Switch_Project_Spec.md` in this repo is the **source of truth**. When this file and
the spec disagree on anything other than the stack, the spec wins. Read the relevant spec
section before building each phase — don't work from memory of it.

**The product is the context.** Role pair, relationship, channel, outcome, tone, and the
evidence-vs-inference distinction are the differentiators. A pretty text box wrapping a
generic LLM call is a failed build even if it ships.

---

## Stack (deviation from spec §16 — deliberate)

The spec recommends Next.js so a server route can hold the API key. **This build has no
server.** Stack is:

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** for styling
- **Zod** for runtime schema validation of every model response
- **lucide-react** for icons
- No database, no auth, no persistence, no analytics, no message sending

### How the API key is handled without a server

Three modes, in this order of preference:

1. **`fixture`** — deterministic prepared responses, no network. This is the demo-safe default
   and must work with zero configuration.
2. **`dev-proxy`** — a Vite dev-server middleware plugin (`vite-plugin-ai-proxy.ts`) that
   exposes `POST /api/context-switch` during `npm run dev`. It reads `ANTHROPIC_API_KEY` via
   Vite's `loadEnv` and calls Anthropic from the **Node process**. The key never enters the
   client bundle. This is the live-AI path for a local demo.
3. **`byok`** — for a static build with no dev server, the user pastes their own key into a
   settings drawer at runtime, and the browser calls Anthropic directly with it. Held in
   memory + `sessionStorage` only, never `localStorage`, never committed, never logged,
   cleared by Reset Demo. This path lives in exactly one file (`DirectAiClient.ts`) so the
   one place a key touches the browser is obvious and auditable. Used only when the dev proxy
   is unreachable *and* the user has supplied a key.

**Hard rules:**

- Never put a key in a `VITE_*` variable. Those are inlined into the browser bundle.
- Never commit `.env`. Ship `.env.example` with placeholders only.
- Never `console.log` a key, a request body containing a key, or a user's message content.
- In `byok` mode the privacy copy must say plainly that the key and messages go from the
  browser to Anthropic. Do not claim messages "never leave your device."

Record this stack deviation as decision **D-001** in the build log with the tradeoff:
static-hosted live AI requires a user-supplied key.

---

## Non-negotiable product rules

### Honesty Guard

The rewritten message must preserve material truth. Never invent progress, approvals, dates,
reasons, promises, consensus, or facts. If the user's request would require inventing one, ask
a follow-up question instead of complying:

> I can help make this concise and professional, but I shouldn't imply the feature is nearly
> complete if it hasn't been started. What progress has actually been made, and when can you
> give a reliable estimate?

### Evidence vs inference

Every inferred claim in Decode It and Conflict Lens carries a support label:
`strongly_supported` | `plausible` | `speculative`. Never render an inference unlabeled. Never
claim access to a sender's internal state. Unknowns get their own visible section — they are a
feature, not an omission.

### No false equivalence

Conflict Lens must not reduce threats, intimidation, coercion, discriminatory harassment, or a
safety concern to "both sides should communicate better." Name the observable behavior, don't
diagnose the person, and point to appropriate human support.

### Never

- Diagnose narcissism, abuse, manipulation, or mental illness from ordinary messages
- Assert certainty about hidden intent
- Fabricate workplace progress or excuses
- Generate threats, harassment, or coercive messages
- Send anything automatically
- Persist message content anywhere

---

## Build log discipline

`HACKATHON_BUILD_LOG.md` is a graded deliverable, not paperwork. Copy
`Context_Switch_Hackathon_Build_Log_Template.md` to it before writing any code, then update it:

- at project start
- after **every** phase
- after any architectural or product decision (add a row to the Decision Log: `D-00n`)
- after any failed attempt that cost real time (add a row to the Failure Log: `F-00n`)
- after any scope change
- after live-AI testing and after fallback testing
- at final verification

Write it **during** the work, not reconstructed at the end. Log failures honestly — a build log
with no `F-` rows reads as fabricated.

Never write into the log: API keys, raw user messages, screenshots, or large command dumps.
Summarize commands as "ran X → passed/failed, N errors."

---

## Working style for this repo

- **P0 before P1.** The P0 list is spec §10.1. Do not start P1 until P0 is complete *and*
  polished. Screenshot upload is P1 and must never delay the text demo.
- **Cut order** if time runs short: screenshot upload → custom roles → tone slider →
  regenerate-one-section → extra animations → neighbor scenario.
- **Never cut:** Engineer/PM Say It Better flow, live AI, fixture fallback, Decode's
  known/inferred/unknown split, Conflict Lens core problem + repair message, build log,
  Reset Demo.
- Every fixture and every live response goes through the **same Zod schema**. Fixtures that
  bypass validation hide bugs.
- Run `npm run typecheck` and `npm run build` after each phase. Record the result.
- Prefer finishing one flow completely over starting three.
- Ask before adding a dependency that isn't in the stack list above.

## Definition of done for any phase

1. It works at phone width and desktop width.
2. Keyboard reachable, visible focus, 44px targets, no color-only status.
3. `prefers-reduced-motion` respected.
4. No console errors.
5. Typecheck and build pass.
6. Build log updated with evidence.
