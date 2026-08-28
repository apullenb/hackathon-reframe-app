# Context Switch

Help saying the hard thing, understanding what someone meant, and working out what an
argument is actually about.

Three things, in the order people need them:

| | What it does |
|---|---|
| **Communicate** | The translator. Say what you actually mean and get a version the other person can hear — or paste/screenshot something you received and see what it says versus what you might be adding to it. |
| **Repair** | Conflict help. Upload a screenshot of the conversation or just describe the argument in your own words, and get each person's perspective and what the disagreement is actually about. |
| **Inspect** | Guided questions with clickable answers, each one following from your last, to work out what you are feeling and either sit with it or say it. |

### What makes it more than a rewriter

- **Context changes the output.** Your role, their role, the relationship and the channel go into
  the request. The same sentence becomes a different message for a manager than for a partner.
- **It will not invent facts.** If an honest rewrite would need a commitment, an approval or a date
  you never gave, it asks instead of writing one in.
- **Evidence is separated from guessing.** Every inference is labelled, and what cannot be known
  from a message gets its own section rather than being quietly dropped.
- **It does not pick a winner.** Conflict help describes behaviour, never character, and refuses to
  flatten a genuine imbalance into "you both need to communicate better".

Not therapy, diagnosis, legal advice, or crisis support, and it says so on screen.

## What makes it different from a "make this more professional" rewriter

A generic rewriter takes text and returns smoother text. Four things here are deliberately
not that:

- **The role pair and the full communication context shape the output.** Self role, other
  role, relationship, channel, desired outcome, tone, urgency, relationship temperature,
  length, and humor level all travel inside the model request (`src/hooks/buildRequest.ts`),
  not just onto the screen. `Engineer → Product manager` on Slack asking for de-escalation is
  a different request from the same words sent to a spouse by text.
- **The Honesty Guard.** If the rewrite would require inventing progress, an approval, a
  date, a reason, or a promise, the app asks for the missing fact instead of supplying one.
  The flagship result explicitly records `Did not claim that the alternate work was approved`
  under "What changed" — the guard is visible in the output, not just in the prompt.
- **Evidence versus inference.** Every inferred claim in Decode It and Conflict Lens carries
  a support label: `strongly_supported`, `plausible`, or `speculative`. Nothing inferred is
  rendered unlabeled, and speculative readings sit behind a disclosure.
- **Unknowns are a visible section, not an omission.** Decode It renders "What you cannot
  know from this message" at full weight. The app does not claim access to anyone's internal
  state.

It does not tell you what someone is secretly thinking. It separates what was said, what may
have been meant, what was inferred, and what still needs to be asked.

## Features

Three modes, selected from the landing screen:

| Mode | Input | Produces |
| --- | --- | --- |
| **Say It Better** | The blunt, honest version in your head | An unfiltered internal translation (only when humor is on), a sendable message, alternative tones, how it may land, what changed, and what is still missing. Asks follow-up questions instead of inventing facts. |
| **Decode It** | A message you received | Four layers: what it literally says plus known facts; what it may be trying to accomplish (labeled interpretations, likely purpose, tone cues); what you cannot know from it; the best next question — then three ready reply options. |
| **Conflict Lens** | A pasted two-speaker conversation in `Name: message` form | A neutral summary, each participant's stated position and what may sit underneath it, "Meant, and heard", what is settled versus not, where the temperature rose, the actual unresolved problem, possible next moves, and a repair message. |

Nothing is ever sent for you. Copy buttons copy exactly what is on screen.

## Architecture

Vite + React 18 + TypeScript + Tailwind CSS 3.4 + Zod + lucide-react.

**No server, no database, no auth, no persistence, no analytics, no message sending.** All
state lives in a React reducer (`src/state/sessionState.ts`). Only two things touch browser
storage, both `sessionStorage` and each in one file: a user-supplied API key
(`src/ai/DirectAiClient.ts`) and the selected theme id (`src/styles/applyTheme.ts`). No message
content is ever stored.

### Provider layer

One interface, three clients, one router — and behind the proxy client, a relay that can reach
three different providers.

```text
ContextSwitchAiClient (src/ai/types.ts)
├── ProxyAiClient    → POST /api/context-switch  (the relay: Vite dev-server middleware,
│                       provider chain + failover, every key in the Node process)
├── DirectAiClient   → api.anthropic.com          (bring-your-own-key, browser, Anthropic only)
└── FixtureAiClient  → deterministic prepared responses, no network

createAiRouter() (src/ai/router.ts) — preference order is always:
    proxy → direct (only if the user supplied a key) → fixture

The relay's own chain (vite-plugin-ai-proxy.ts), ordered by AI_PROVIDER then
AI_FALLBACK_PROVIDERS:
    anthropic   → {base}/v1/messages       x-api-key, anthropic-version: 2023-06-01
    openai      → {base}/chat/completions  Bearer, JSON mode requested
    compatible  → {base}/chat/completions  Bearer, any OpenAI-compatible gateway
```

Both live clients share one output pipeline (`runStructuredExchange` in
`src/ai/ProxyAiClient.ts`): extract the outermost balanced JSON object from the model's text,
validate it, retry once with a schema-repair instruction on failure, then fail with a typed
error. JSON extraction, the validation gate, and the retry rule exist in exactly one place.

### The provider chain and failover

`vite-plugin-ai-proxy.ts` is no longer a pass-through to one vendor. In `configResolved` it
builds an ordered chain from `AI_PROVIDER` (the primary, default `anthropic`) followed by
`AI_FALLBACK_PROVIDERS` (default `openai,compatible`), lowercases and de-duplicates the names,
drops anything that is not one of `anthropic` / `openai` / `compatible`, and then **drops any
provider with no API key, plus any provider with no base URL**. A provider without a key is
simply absent from the chain — that is not an error, and nothing warns about it beyond the
startup line:

```text
[ai-proxy] dev route ready: providers=anthropic(claude-sonnet-5) → compatible(mock-model-1) mode=auto
```

With nothing configured it logs `providers=none configured`, and a POST answers
`503 no_key_configured` so the client falls back cleanly instead of hanging.

**Our own malformed input never reaches a provider.** A body over 256 KB is refused with `413
request_too_large`; a body that is not JSON, or is missing a non-empty `system` or `user`
string, is refused with `400 invalid_request_body`. That validation is what makes failing over
correct: once the relay does call a provider, any error that comes back is about *that
provider*, not about our payload.

Every provider-side failure below is marked retryable, so the loop moves to the next provider
in the chain:

| Failure | Reported code |
| --- | --- |
| 401 / 403 | `provider_auth_failed` |
| 404 — model not available to that account | `provider_model_not_found` |
| 429 | `provider_rate_limited` |
| 5xx | `provider_unavailable` |
| Any other non-OK status, including the 400 Anthropic returns for an exhausted credit balance | `provider_rejected_request` |
| 200 with no text in it | `provider_empty_response` |
| No response within 30,000 ms | `provider_timeout` |
| Connection failed | `provider_unreachable` |

On success the relay answers `200` with `{ text, provider, model, failedOver }`: `provider` is
the id that actually produced the text, and `failedOver` lists, in order, the providers that
failed before it. Both fields travel through `SendResult` and `runStructuredExchange`
(`src/ai/ProxyAiClient.ts`) into `AiResult` (`src/ai/types.ts`) and out to the status pill, so
the UI can say which provider served the result and that it failed over to get there.

If every provider in the chain fails, the relay answers `429` when the *first* failure was a
rate limit and `502` otherwise, with `{ error, providerStatus, providerMessage, attempts }`.
`attempts` carries provider ids, statuses, codes, and the provider's own message truncated to
240 characters — never a key, never request content.

One timing detail worth knowing: each provider attempt gets its own 30,000 ms budget, but the
browser client's total budget is 25,000 ms and covers the whole chain *and* the schema-repair
retry. A chain of slow providers will be cut off by the client before the relay finishes
walking it.

### The self-healing retry

Model APIs move, and two known divergences would otherwise take a whole provider out of the
chain for a reason that is trivially recoverable. Rather than hardcode a guess about whichever
model you configured, `callProvider` reacts to what the provider says:

- A `400` whose message names **`max_tokens`** is retried once with `max_completion_tokens`
  instead (newer OpenAI models renamed the field).
- A `400` whose message names **`response_format`** is retried once with JSON mode removed
  (some OpenAI-compatible gateways reject it).

Each adjustment fires at most once per request, only for the OpenAI-shaped providers (Anthropic
is exempt), and only when the provider actually sent a message to read. If the retry also
fails, the provider is treated as failed and the chain moves on. The point is that the relay
keeps working across model generations without the operator having to know which parameter
spelling their model wants. Note that JSON mode is only requested for the `openai` provider in
the first place, so the `response_format` retry can only ever trigger there.

Neither retry has been observed firing in this repository: the mock provider accepts
`max_tokens`, and no OpenAI key has been configured. Both paths are implemented and type-checked,
not exercised.

### The single validation gate

`validateResponse(mode, candidate)` in `src/schemas/index.ts` is the only way a response
reaches the UI. **Fixtures go through the same gate as live responses** — at build time via
`npm run validate:fixtures` and again at run time in `FixtureAiClient`. A fixture that
bypassed validation would hide exactly the bug the gate exists to catch.

The schemas are deliberately stricter than the TypeScript contracts in
`src/types/contracts.ts`, because the contracts make almost every result field optional:

- Say It Better: when `needsFollowUp` is `false`, `sendableMessage` is required; when `true`,
  at least one question is required (build log **D-004**). Otherwise an empty result screen
  would validate cleanly.
- Conflict Lens: exactly two `participants`, joined to the request's speakers on `speakerId`
  (**D-005**). This is why multi-speaker conflicts are rejected rather than half-rendered.
- Decode It: `unknowns`, `knownFacts`, `likelyPurpose`, `interpretations`, and
  `usefulResponseShouldInclude` must be non-empty and `responseOptions` must be exactly 3
  (**D-007**). A decode that claims nothing is unknowable has failed the product rule.

Raw model output is never rendered or logged. Only Zod issue strings (`path: message`) travel
back from a validation failure.

### The no-server key approach, and its limitation

The spec recommends Next.js so a server route can hold the API key. This build has no server
(build log **D-001**), so keys are handled in two ways:

1. **`npm run dev`:** `vite-plugin-ai-proxy.ts` is a Vite dev-server middleware plugin with
   `apply: 'serve'`. It reads **up to three keys** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
   `COMPATIBLE_API_KEY` — via `loadEnv(mode, cwd, '')` (the empty prefix is what makes
   non-`VITE_` variables visible) and calls the providers **from the Node process**. Each key
   lives only in that module's closure, is used at exactly one place — the `x-api-key` or
   `Authorization` header of its own provider's request — and is never logged, never put in a
   URL, and never returned in a response body. `/health` reports only provider ids, model
   names, and booleans. No key enters the client bundle, and nothing in that file is bundled
   into a production build.
2. **A statically hosted build has no Node process.** There is nothing to proxy through, so
   live AI in that environment requires the user to paste their own Anthropic key into the
   Settings drawer, and the browser then calls Anthropic directly with it
   (`src/ai/DirectAiClient.ts`, the only file in the bundle that touches a key). That is a
   real cost, not a detail: it satisfies the letter of "no secret ships in our JavaScript"
   but not its spirit. The dev proxy is preferred whenever it is reachable, and the UI never
   asks for a key when it is.

**The browser bring-your-own-key path is Anthropic-only by design** (build log **D-015**).
Failover is a server-route capability, because supporting a second provider in the browser
would mean asking the user to paste a second key into it — the opposite direction from the rest
of this build. So the chain, the self-healing retry, and the "which provider served this" report
exist only on the `npm run dev` path.

Fixture mode needs neither, and works with zero configuration.

## Requirements

- **Node.js 18 or newer.** There is no `.nvmrc` and no `engines` field in `package.json`;
  Vite 5 is the constraint. Developed and run on **Node 23.3.0 / npm 10.9.0**.
- **npm** (a `package-lock.json` is committed).
- **At least one provider key for live mode** — Anthropic, OpenAI, or any OpenAI-compatible
  endpoint. Fixture mode needs no key, and `npm run mock:provider` lets you exercise the live
  path with no paid key at all.

## Installation

```bash
npm install
```

## Environment variables

Copy the template:

```bash
cp .env.example .env
```

`.env` is gitignored. The real variable names, exactly as `.env.example` declares them. Every
row marked *relay* is read only by `vite-plugin-ai-proxy.ts`, inside the Node process.

**Which provider serves a request, and what happens when it fails:**

| Variable | Read by | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | relay | Primary provider: `anthropic` \| `openai` \| `compatible`. Lowercased; defaults to `anthropic`; an unrecognised value is dropped from the chain. |
| `AI_FALLBACK_PROVIDERS` | relay | Comma-separated chain tried in order after the primary. Present but empty means no failover. **Absent entirely means `openai,compatible`** — the default only applies when the variable is not defined at all. Unknown names and duplicates are dropped. |
| `AI_MODE` | relay | Reported on the health route. **Does not change client behavior** — see the note below. |
| `VITE_AI_MODE` | `src/ai/router.ts` (browser) | `live` \| `fixture` \| `auto`. Defaults to `auto`. Non-secret UI preference; safe to inline. |

**Anthropic:**

| Variable | Read by | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | relay | Server-side secret. Empty in the template. |
| `ANTHROPIC_MODEL` | relay | Model for this provider. Template value `claude-sonnet-5`; the built-in fallback is the same id. |
| `ANTHROPIC_BASE_URL` | relay | Optional; commented out in the template. Defaults to `https://api.anthropic.com`. |
| `AI_MODEL` | relay | **Deprecated alias for `ANTHROPIC_MODEL`, still honoured** for the original single-provider setup. Consulted only when `ANTHROPIC_MODEL` is unset, and it affects the Anthropic provider only — precedence is `ANTHROPIC_MODEL` → `AI_MODEL` → `claude-sonnet-5`. |

**OpenAI:**

| Variable | Read by | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | relay | Server-side secret. Empty in the template. |
| `OPENAI_MODEL` | relay | Template value `gpt-4o`, which is also the built-in fallback. Set it to a model your account can actually use. |
| `OPENAI_BASE_URL` | relay | Optional; commented out in the template. Defaults to `https://api.openai.com/v1`. |

**Any OpenAI-compatible endpoint:**

| Variable | Read by | Purpose |
| --- | --- | --- |
| `COMPATIBLE_API_KEY` | relay | Server-side secret (or any non-empty placeholder, for endpoints that do not check it). No default. |
| `COMPATIBLE_BASE_URL` | relay | Endpoint root; the relay appends `/chat/completions`. No default. |
| `COMPATIBLE_MODEL` | relay | Model id the endpoint expects. No default. |

**Never put any of these keys in a `VITE_*` variable.** Every `VITE_`-prefixed value is inlined
into the browser bundle, so a key in one would be published with the app. Keys are read only
with the empty env prefix inside the Node process, or typed in by the user at runtime.

> **Known discrepancy:** `.env.example` documents `AI_MODE`, but the client router reads
> `VITE_AI_MODE` (`resolveAiMode()`). Setting `AI_MODE=fixture` alone will **not** force the
> app into fixture mode. Set `VITE_AI_MODE=fixture` for that. Setting both is harmless.

### Using an OpenAI-compatible endpoint

The `compatible` provider is for Groq, Together, OpenRouter, Ollama, or anything else that
speaks the OpenAI chat-completions shape. Fill in all three variables in `.env` — the gateway's
key, its root URL, and the model id it expects — then restart the dev server so the plugin
rebuilds the chain.

The relay POSTs to `${COMPATIBLE_BASE_URL}/chat/completions` with an
`Authorization: Bearer …` header, a `system` + `user` message pair, and `max_tokens`. It does
**not** request JSON mode for this provider, so gateways that reject `response_format` are fine
out of the box.

> **Set all three, and be precise about why.** The chain filter only removes a provider when its
> key *or* its base URL is missing, so an empty `COMPATIBLE_MODEL` does **not** quietly remove
> the provider — it joins the chain and its requests go out with an empty model string, which
> the endpoint will reject. The relay then fails over to the next provider, so the symptom is a
> confusing extra failure in `attempts` rather than a clean skip. `.env.example` states the
> "all three or nothing" rule for exactly this reason.

## Run in live mode

```bash
npm run dev
```

With at least one provider key set in `.env`, the dev server logs the resolved chain at
startup — provider ids and model names only, never a key:

```text
[ai-proxy] dev route ready: providers=anthropic(claude-sonnet-5) → openai(gpt-4o) mode=auto
```

To verify the live path end to end:

```bash
curl -s http://localhost:5173/api/context-switch/health
```

A healthy response is
`{"ok":true,"keyConfigured":true,"providers":[{"id":"anthropic","model":"…"}],"model":"…","mode":"…"}`.
`keyConfigured` is a boolean meaning *at least one provider made it into the chain*, and
`providers` lists the chain in order. Nothing in that payload is or contains a key.

Then load a prepared scenario in the app and translate it. The indicator badge names the
provider that actually served the result — `Live · Claude`, `Live · OpenAI`, or `Live · Custom`
— and never `Offline`, which means a built-in example answered instead. If the relay failed
over, the pill's tooltip and screen-reader text add `Failed over from Claude.`

**Real-model generation has not yet been verified in this repository** — the pipeline has only
been proven against a local mock. See Known limitations.

For a static build with no dev server, open **Settings** in the header and paste your own
Anthropic key. The drawer only offers this when the dev route is unreachable, and that path has
no failover.

## Run in fixture-only mode

Zero configuration, no key, no network. `npm run dev` with no `.env` at all already behaves
this way for the three prepared scenarios. To pin it explicitly so no live attempt is made:

```bash
VITE_AI_MODE=fixture npm run dev
```

The indicator reads `Ready` before a request and `Offline` after one.
Fixture responses are deterministic and include a 1,300 ms artificial delay so the staged
loading copy is visible.

## Build

```bash
npm run build
```

That runs `tsc -b --noEmit` and then `vite build`. To serve the output:

```bash
npm run preview
```

Other useful scripts:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run validate:fixtures
```

```bash
npm run check:functional
```

## Verify the live pipeline without a paid key

`npm run mock:provider` starts `scripts/mock-provider.mjs`: a local OpenAI-compatible endpoint
on port **5399** that returns hand-written, **schema-valid** Context Switch responses for all
three modes (it chooses which one by looking for that mode's own field names in the prompt). It
also exposes `GET /__seen`, which records what the relay actually sent — the auth *scheme*, the
model id, and which mode it served. Never the key value.

Point the compatible provider at it in `.env`: `COMPATIBLE_BASE_URL=http://127.0.0.1:5399`,
`COMPATIBLE_MODEL` to any id you like, and `COMPATIBLE_API_KEY` to any non-empty placeholder —
the mock does not check the value, but an empty key would keep the provider out of the chain.
Set `AI_PROVIDER=compatible` to talk to the mock alone, or leave `AI_PROVIDER=anthropic` with
`compatible` in `AI_FALLBACK_PROVIDERS` to watch a real failover.

Then run these three, the first two in their own terminals (both stay in the foreground):

```bash
npm run mock:provider
```

```bash
npm run dev
```

```bash
npm run check:live
```

**This proves the plumbing, not model quality.** Prompt building, transport, provider failover,
JSON extraction, the Zod gate, and rendering are all exercised for real. The *content* the
checks assert against is hand-written text in the mock file, so nothing here says anything about
what a real model would produce. That distinction is the whole reason the mock is kept separate
from the fixtures.

## `npm run check:live`

`scripts/live-check.ts` POSTs to `http://localhost:5173/api/context-switch` — the same relay
route the app uses, so the script itself never sees a key — and puts every response through
`validateResponse`, the same Zod gate as the UI. It needs the dev server running and a
configured provider chain; it has no fixture path. **25 checks** across four scenarios, and the
process exits non-zero if any of them fail:

1. **Say It Better**, the engineer-to-PM status update: schema validity, a sendable message
   exists, it does not claim the side project was approved, it does not claim the feature is
   nearly done, it preserves the 3:00 PM commitment the user actually gave, at least two
   alternative tones, "what changed" is explained, `honestyCheck` passed.
2. **Decode It**, the PM check-in: schema validity, no assertion that the sender is
   annoyed/frustrated/angry outside `unknowns`, the unknowns do say tone cannot be determined,
   every interpretation carries a support label, exactly three response options, non-empty
   `knownFacts`.
3. **Conflict Lens**, Alex and Sam: schema validity, exactly two participants, both stated
   positions present, the core problem is not "communicate better", it names
   completion/follow-through/trust, it declares neither person right, there is a repair message,
   escalation points describe wording rather than character.
4. **A role-pair side-by-side proof.** The same raw text is sent twice — Engineer → Product
   manager on Slack, and Engineer → Executive over email — printed side by side with a word
   overlap percentage, asserting the two messages are not near-identical (<85% overlap) while
   both still preserve the 3:00 PM commitment and neither invents approval. This is the check
   that would catch a model ignoring the communication context.

## Execute the prepared demo

Three scenarios, from the **Examples** dropdown in the header. Their real labels:

1. `Engineer to product manager: honest status update`
2. `Decode a product manager check-in`
3. `Alex and Sam: the kitchen argument`

Selecting one fills the context builder, the message, and any seeded follow-up answers.

**Say It Better (flagship).** From the landing screen, click
**Try it: an engineer telling a PM the truth** (or pick scenario 1 from the dropdown). The
context arrives as `Engineer → Product manager`, Slack or Teams, accountable, humor
`unfiltered`. Click **Translate**. The result shows **Unfiltered translation** ("Internal
only") above **Ready to send**, then alternative tones, **How it may land**, **What changed**,
and **Still missing**.

**Decode It.** Pick scenario 2. Click **Analyze**. Four numbered layers appear: *What it
literally says* → *What it may be trying to accomplish* → *What you cannot know from this
message* → *Best next question*, then **Three ways to reply**.

**Conflict Lens.** Pick scenario 3. The conversation and both speakers arrive prefilled and
confirmed; **Analyze** is enabled immediately. The result runs neutral summary → each
participant → **Meant, and heard** → **What is settled, and what is not** → **Where the
temperature rose** → **The unresolved problem** → **Possible next moves** → **A message to
reset the conversation**.

**Start over** in the header returns the app to its starting state and clears any
user-supplied key.

## Themes

Eight themes, switchable at runtime from **Settings → Appearance**: Editorial (the default),
Signal, Field Notes, Loud, Swiss, Blueprint, Dusk, Sunrise. Switching stamps `data-theme` on
`<html>` and swaps that theme's Google Fonts `<link>` (`src/styles/applyTheme.ts`); the choice
is remembered in `sessionStorage`. No component changes, no rebuild.

**Every visual value lives in `src/styles/themes.css`** — colour, type, radius, border width,
shadow, gradient. That file is the only place style is defined (build log **D-014**).

**Colours are stored as bare `R G B` triplets, never hex.** `tailwind.config.ts` wraps each
token as `rgb(var(--token) / <alpha-value>)`, which is what keeps the roughly 165 opacity
modifiers already in the codebase (`border-primary/25`, `bg-surface/70`, …) working. A hex value
in that file breaks every one of them silently.

To add a theme: copy a whole block, change the `[data-theme='…']` selector, fill in **every**
token (a missing one falls back to the previous theme's value and produces a confusing
half-styled page), then register it in `THEMES` in `src/styles/applyTheme.ts` with its font
families and an honest `contrastAudited` value. Google Fonts family strings must give a value for
every declared variation axis, or the whole stylesheet request fails.

**Contrast status is per theme, and the UI states it.** The `contrastAudited` flag in the
registry is the source of truth, and Settings shows a **Draft** badge on every theme without it:

| Contrast-audited | Draft — not audited |
| --- | --- |
| Editorial, Swiss, Blueprint, Sunrise | Signal, Field Notes, Loud, Dusk |

Two things to know before trusting the picker:

- The static paragraph under the theme list still reads "Only Editorial has had a contrast
  audit". That sentence is stale; the per-theme badges, which read the flag, are correct.
- Dusk's status was measured, not guessed. Three failures remain and none of them can be fixed
  from the theme files — see Known limitations.

## AI provider and configuration notes

- **Providers:** Anthropic Messages API (`2023-06-01`) at `/v1/messages`, OpenAI at
  `/chat/completions`, and any OpenAI-compatible gateway at `/chat/completions`. Two request
  shapes, one relay, chosen per provider (build log **D-015**).
- **Failover is sequential, not parallel.** The chain is walked in order and the first provider
  that returns usable text wins; parallel calls were rejected because they multiply cost and
  make "which provider answered" nondeterministic.
- **Models:** `claude-sonnet-5` for Anthropic (`ANTHROPIC_MODEL`, then the deprecated `AI_MODEL`,
  then that constant) and `gpt-4o` for OpenAI (`OPENAI_MODEL`, then that constant). The
  compatible provider has no default and must be given `COMPATIBLE_MODEL`. The
  bring-your-own-key path always uses the Anthropic constant — no server-side model variable
  reaches the browser.
- **Max tokens:** 4,096 per request (the proxy clamps any client-supplied value to 8,192).
- **Client request timeout:** 25,000 ms (`DEFAULT_TIMEOUT_MS`). This budget covers the first
  attempt *and* the schema-repair retry together — both share one `AbortController`.
- **Relay provider timeout:** 30,000 ms **per attempt**, so with more than one provider in the
  chain the client's 25 s total budget expires first in practice. The relay also caps request
  bodies at 256 KB.
- **Self-healing parameter retry:** at most one `max_completion_tokens` retry and one
  no-JSON-mode retry per request, OpenAI-shaped providers only. See "The self-healing retry".
- **Proxy health probe:** 1,200 ms, run once at startup.
- **Retry on schema failure:** exactly one. If the model's output does not contain a parseable
  JSON object, or fails the Zod gate, the same prompt is re-sent with the Zod issue paths
  appended as a repair instruction. A second failure returns a typed `schema_invalid` error
  and nothing is rendered. The user's inputs are preserved.
- **The fallback is offered, never substituted.** On a live failure the error card shows
  **Try again**, and shows **Show saved example** only when the configured mode is `auto`
  *and* the request is one of the three prepared scenarios. In `live` mode a fixture is never
  offered. Custom text is never answered with unrelated fixture content — if fixtures are the
  only available client and the text is your own, the app refuses and explains why rather
  than handing back the engineer's status update (build log **D-009**).
- **The mode indicator reports what actually produced the result on screen**, and now names the
  provider: `Live · Claude`, `Live · OpenAI`, `Live · Custom`, or `Offline` for a built-in
  example. Before any request it reads `Ready`; after a failure, `Error`. When the relay reports
  `failedOver`, the pill's tooltip and screen-reader text add `Failed over from …`.
  One detail: because `DirectAiClient` reports `provider: 'anthropic'`, the bring-your-own-key
  path also renders as `Live · Claude` rather than `Live · your key` — the tooltip is what says
  the key came from the browser. `Live · your key` only appears if a direct result arrives with
  no provider named.

## Privacy and safety limitations

- **With live AI enabled, your messages go to whichever provider serves the request** —
  Anthropic, OpenAI, or the compatible endpoint you configured. Failover means a message
  rejected by one provider is then sent to the next one in the chain. The in-app copy is accurate and
  deliberately restrained: *"Avoid pasting information you would not want processed by the
  configured AI provider. Message history is not stored."* Nothing in
  this app claims that messages never leave your device, because in live mode they do not.
- **The bring-your-own-key path sends your key and your message text from the browser
  straight to Anthropic.** Nothing is proxied through a server of ours. The key is held in
  memory and in that tab's `sessionStorage` only — never `localStorage`, never a cookie,
  never a URL, never logged, never committed — and **Start over** erases it. Anthropic's own
  retention terms apply to anything sent.
- **No message persistence.** Pasted content lives in React state for the session and is
  written to no store, no log, and no analytics. There is no message history feature.
- **Nothing is sent for you.** There is no send integration of any kind; the primary action is
  a copy button.
- **This is not a therapist, HR representative, attorney, or crisis service**, and it is
  stated in the app footer. It does not diagnose narcissism, abuse, manipulation, or mental
  illness, and it does not claim certainty about anyone's hidden intent. High-stakes content
  is labeled as communication assistance, not legal, HR, medical, or crisis advice.
- **No false equivalence.** Conflict Lens does not reduce threats, coercion, intimidation, or
  discriminatory harassment to "both sides should communicate better."
- **Up to three server-side keys, each used in exactly one place.** They are read via
  `loadEnv(mode, cwd, '')`, live only in the relay's closure inside the Node process, and are
  never logged, never returned, and never put in a URL. `/health` reports provider ids, model
  names, and booleans only.
- Keys and raw message content are kept out of every log line. Relay logs carry the provider id,
  an HTTP status, and an error code; when a provider sends its own explanation of a
  configuration problem (bad key, exhausted balance, unavailable model) that message is logged
  and passed back, truncated to 240 characters, because it names what the operator has to fix.
  Error details otherwise carry only status codes, provider error enums, and Zod issue paths.

## Known limitations

- **Real-model generation is still unverified.** No provider in this environment currently has
  usable credit: the configured Anthropic key authenticates but the account's balance is empty,
  and no OpenAI key is set. So no answer on screen has ever come from a real model, and nothing
  here should be read as a claim about output quality.
- **What *is* verified is the pipeline, against a mock: 24 of 25 checks.** Prompt building,
  transport, provider failover, JSON extraction, the Zod gate, and rendering all passed with
  `scripts/mock-provider.mjs` standing in as the `compatible` provider. Failover itself was
  exercised by a genuine failure: Anthropic was tried first and rejected at billing, the
  compatible provider served the request, and the response reported
  `provider: "compatible"`, `failedOver: ["anthropic"]`.
- **The one failing check is the role-pair proof, at 100% word overlap.** That is the mock
  returning a constant string regardless of context, not a product defect — and it is worth
  keeping visible, because it shows the check is sensitive enough to catch a real model that
  ignored the role pair. The genuine proof needs a live model.
- **The bring-your-own-key path has no failover** and is Anthropic-only by design (**D-015**).
- **Copy's success path needs one manual click to confirm.** The failure path was observed
  end to end; the Clipboard API requires genuine user activation, which synthesised clicks did
  not reliably grant, so a presenter should click **Copy** once by hand before presenting.
- **Dark themes cannot currently pass a contrast audit.** A few components hardcode
  `text-white` on gradient slabs — the selected mode tab in `ModeSelector` and two lines in the
  Decode clarification panel, which also puts `text-surface` on the same slab. No single
  gradient colour can sit 4.5:1 from both white and a dark card colour, so Dusk's three
  remaining failures need a component change, not a theme edit. Four of the eight themes carry
  the **Draft** badge: Dusk for the measured failures above, and Signal, Field Notes and Loud
  because they have not been audited at all.
- **`AI_MODE` does not control the client.** Use `VITE_AI_MODE`. See the note under
  Environment variables.
- **Changing `VITE_AI_MODE` requires restarting the dev server** — it is inlined at build
  time. There is no in-app mode toggle.
- **Screenshot upload is not built.** It is P1 in the spec and nothing in `src/` implements
  it; every mode is text-input only.
- **Multi-speaker conflicts are unsupported.** The Conflict Lens schema requires exactly two
  participants and rejects anything else rather than partially rendering it (**D-005**).
- **In fixture-only mode you cannot translate your own text.** Built-in examples only exist
  for prepared questions, so a custom message with no live client available is refused with
  an explanation instead of being answered with an unrelated fixture (**D-009**). Add a key,
  or load a prepared scenario.
- **The three-way jargon control maps onto a boolean.** The UI offers allow / reduce / remove,
  but the contract carries only `reduceJargon: boolean`, so "reduce" and "remove" currently
  reach the model identically (**D-008**). The distinction the UI implies is not yet real.
- **The bring-your-own-key path cannot change model.** The model variables are server-side only.
- **An empty `COMPATIBLE_MODEL` is not treated as "provider absent".** The chain filter checks
  only the key and the base URL, so a compatible provider with no model joins the chain and
  fails at request time. See the note under "Using an OpenAI-compatible endpoint".
- **The runtime schemas and the compile-time types deliberately disagree** in three places
  (D-004, D-005, D-007). This is intentional and documented in the schema files, but it means
  a shape that type-checks can still fail validation.
- **No test runner.** Coverage is `npm run typecheck`, `npm run lint`, the fixture-schema
  assertion script (build log **D-003**), `npm run check:functional`, and `npm run check:live` —
  the last of which needs a running dev server and a configured provider.
- **The Settings copy under the theme picker is stale.** It still says only Editorial has been
  audited; four themes have. The per-theme **Draft** badges read the registry flag and are
  correct.

## Design decisions

The decisions that most shaped this build:

- **No server.** Live AI reaches the provider through a Vite dev-server middleware plugin that
  holds the key in the Node process. A statically hosted build has no Node process, so live AI
  there requires a user-supplied key — a real tradeoff, described under *Architecture* above.
- **Schemas stricter than the types.** Every result field is optional in the original contract,
  so an empty result would validate and render a blank screen. The Zod gate closes that, and
  requires Decode's "what you cannot know" list to be non-empty: a read claiming nothing is
  unknowable has failed the product rule.
- **Refusing to fake a translation.** When prepared responses are the only thing available and
  the text is the user's own, the app refuses with an explanation rather than handing back an
  unrelated prepared answer.
- **Style as a swappable layer.** Colour, radius, shadow and gradient live in CSS custom
  properties, so changing theme is a runtime token swap rather than a rebuild. Colours are
  stored as `R G B` triplets because the utility layer wraps them in `rgb(var(--token) / alpha)`;
  a hex value there silently breaks every opacity modifier. `src/styles/applyTheme.ts` is the
  current record of which themes are contrast-audited.
- **A multi-provider relay with failover.** An ordered provider chain moves on when one fails.
  It paid for itself when the primary account ran out of credit mid-build and the app kept
  working without a code change.
- **The three-way jargon control maps onto a boolean**, so "remove" and "reduce" currently
  behave identically at the prompt level. Recorded here rather than hidden.
- **Live AI output remains unverified** end to end against the prompts; the transport is proven.
