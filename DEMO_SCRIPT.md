# Context Switch — three-minute demo script

Presenter's operational script. Timings follow spec §29; the hook and close lines are
verbatim and worth delivering as written. Everything in **bold** is a real on-screen label or
button.

---

## Pre-flight checklist

Run through this before you present, not while you present.

- [ ] `npm install` has completed.
- [ ] Decide your mode and start the server. Live: `.env` has `ANTHROPIC_API_KEY`, then
      `npm run dev`. Fixture-only: `VITE_AI_MODE=fixture npm run dev`.
- [ ] If live: the dev-server startup line reads
      `[ai-proxy] dev route ready: keyConfigured=true …`, and
      `curl -s http://localhost:5173/api/context-switch/health` returns
      `"keyConfigured":true`.
- [ ] **The live path has not been verified end to end in this repo** (no key has been
      available). If you are presenting live AI, run all three scenarios once at full length
      before the demo and check the badge, the timings, and the schema gate. If anything is
      shaky, present in fixture mode — it is deterministic and needs no key.
- [ ] Open the app and confirm the header shows the **Examples** dropdown, the
      AI-mode indicator, **Settings**, and **Start over**.
- [ ] Load each of the three prepared scenarios once, then press **Start over**. This warms
      the proxy health probe and proves the fixtures pass validation.
- [ ] Zoom the browser to ~125% and check that **Ready to send** is readable from the back of
      the room.
- [ ] Leave the app on the landing screen. Press **Start over** immediately before you start.
- [ ] Do not paste anything real into the app on stage. In live mode it goes to Anthropic.

---

## 0:00–0:20 — Hook

Landing screen, nothing clicked yet.

> Have you ever known exactly what you meant, sent a message, and discovered that the other
> person heard something completely different? Context Switch translates between roles,
> relationships, and expectations—not just languages.

If you want one visual beat here, point at the three mode cards: **Say It Better**,
**Decode It**, **Conflict Lens**.

---

## 0:20–1:15 — Engineer to product manager

**Click path**

1. On the landing screen, click **Try it: an engineer telling a PM the truth**.
   (Equivalent: choose **Engineer to product manager: honest status update** from the
   **Examples** dropdown.)
2. The **Example** banner appears with that label. The context builder is now
   filled: `Engineer` → `Product manager`, Cross-functional teammate, Slack or Teams, Give a
   status update, Accountable, humor `unfiltered`.
3. Read the message out loud from **What you actually want to say**:
   *"I haven't really worked on it much because I got distracted working on a more
   interesting project."*
4. Point at the line **3 follow-up answers supplied**. Say what it means: the app already
   asked what progress actually exists, whether the side project was prioritized, and when a
   reliable ETA is possible — and those three answers are the only facts it is allowed to use.
5. Click **Translate**.

**The beat that matters**

6. **Unfiltered translation** lands first, badged **Internal only**, in monospace:
   *"I followed the dopamine instead of the roadmap."*
   **Pause. Let them laugh.** Do not talk over it.
7. Then, without a segue, put your cursor on the big card below it — **Ready to send**, badged
   **Only facts you supplied**:
   *"Progress is behind where I expected it to be. I shifted some time to explore a related
   project, which reduced the progress I made on this feature. I'm refocusing on it now and
   will send a realistic scope and ETA by 3:00 PM today."*
   The line to land: the funny version names the feeling; this one is honest, not deceptive.
   It admits the slip. It does not soften it into a lie.
8. **Scroll to "What changed" and point at the fourth item: "Did not claim that the alternate
   work was approved."** This is the Honesty Guard landing, and it is the single most
   important second of the demo. The engineer never said the side project was approved, so
   the app did not say it either — and it tells you that it didn't. Nothing invented progress,
   nothing invented an approval, and the 3:00 PM checkpoint is there only because the user
   supplied it.
9. If you have a spare beat, note **Still missing**: the scope estimate itself. The message
   promises one rather than guessing at it now.

**Optional, only if you have time and nerve:** to show the follow-up questions being *asked*
rather than pre-answered, edit one character of the message before clicking **Translate**.
Any edit re-arms the follow-up step, and you get the Honesty Guard card —
*“Before I rewrite this, I need 3 facts so I don’t invent a commitment.”* — with the
questions one per screen. Finish with **Finish and rewrite**. Skip this if you are tight on
time; the seeded-answers line makes the same point in five seconds.

---

## 1:15–1:55 — Decode the incoming message

The role route reverses here: the product manager is now the sender.

**Click path**

1. Choose **Decode a product manager check-in** from the **Examples** dropdown.
   (This also switches the mode tab to **Decode It** and fills **The message you received**
   with *"Just checking in. Do we have an update on this yet?"* — four words.)
2. Click **Analyze**.
3. The header reads `Product manager → Engineer`.

**What to show, in order**

4. **Layer 1 — What it literally says.** Read the literal meaning. Emphasize that this layer
   is the wording only, separated from anything read into it.
5. **Layer 2 — What it may be trying to accomplish.** Point at the confidence labels on the
   interpretations. Say the words: `strongly_supported`, `plausible`, `speculative`. The
   planning interpretation is a *plausible* reading, not a verdict.
6. **Layer 3 — What you cannot know from this message.** This is the beat. Whether the sender
   is frustrated is not knowable from four words, and the app says so in a full-weight
   section instead of guessing. Most tools would guess.
7. **Layer 4 — Best next question**, then **Three ways to reply** — what a useful response
   actually needs to contain.

---

## 1:55–2:40 — Conflict Lens

**Click path**

1. Choose **Alex and Sam: the kitchen argument** from the **Examples** dropdown.
2. The four-line conversation arrives in **Paste the conversation**, and both speakers are
   already identified — Alex (you) and Sam.
3. Click **Analyze**.

**What to show, in order**

4. The neutral summary: four lines about a kitchen that are not about the kitchen.
5. **Meant, and heard** — what each person may be trying to say next to what the other may
   have heard. Note the framing: what the wording may be doing, never a diagnosis of either
   person.
6. **Where the temperature rose** — each escalation point describes the behavior and its
   effect on the exchange, not anyone's character.
7. **The unresolved problem** — the payoff. It is not "you two should communicate better."
   It is responsibility plus an undefined definition of when the task counts as done.
8. **A message to reset the conversation** — a repair message either person could actually
   send. Then say out loud: nothing is sent for you. This is a copy button.

---

## 2:40–3:00 — Close

> Most communication tools make your words sound better. Context Switch helps make sure they
> mean the right thing to the person receiving them. It doesn't tell you what someone is
> secretly thinking. It separates what was said, what was inferred, and what still needs to
> be asked.

---

## If the network dies mid-presentation

Know exactly which of these two you are doing before you touch anything.

### The in-app fallback — no restart, use this first

A prepared scenario that fails or times out shows the error card **“That didn’t go through”**
with your message preserved, and two buttons: **Try again** and **Show saved example**. Click
**Show saved example** and the prepared fixture renders immediately. The AI-mode indicator
flips to **Offline**, which is honest and which you can say out loud — the badge
always reports what actually produced what is on screen.

Two conditions, both real:

- **Show saved example** appears only when the configured mode is `auto` (the default) **and**
  the request is one of the three prepared scenarios. This is why you present from the
  dropdown, not by typing.
- In `live` mode the button never appears — `live` is specified to fail visibly rather than
  substitute. If you started with `VITE_AI_MODE=live`, you have no in-app fallback.

The client gives up after 25 seconds per request. That is a long silence on stage; if it
starts to drag, say "this is the live path timing out, and the fallback is deliberate" rather
than clicking blindly.

### Switching the app to fixture mode — requires a restart

There is **no in-app mode toggle**. The client reads its mode from `VITE_AI_MODE`, which Vite
inlines at build time (`resolveAiMode()` in `src/ai/router.ts`; it defaults to `auto` when
unset). Note it is `VITE_AI_MODE`, not the `AI_MODE` in `.env.example` — `AI_MODE` is read
only by the dev proxy and will not change client behavior.

So: stop the dev server, then

```bash
VITE_AI_MODE=fixture npm run dev
```

and reload the tab. The indicator will read **Ready · fixture** before a request and
**Offline** after one, no network call is made, and every prepared scenario runs
normally with a 1,300 ms staged loading animation.

Budget roughly 15 seconds of dead air for this. If you are mid-demo and the in-app fallback
is available, use **Show saved example** instead and keep talking.

### What will not work in fixture mode

You cannot translate custom text you typed yourself. Offlines only exist for
prepared questions, so the app refuses with an explanation rather than handing back the
engineer's status update as if it were a translation of your paragraph. If a judge asks you
to type their own message, you need the live path — or say plainly that the demo-safe mode is
deterministic by design and offer to run it live afterwards.
