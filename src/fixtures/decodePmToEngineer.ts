/**
 * Decode It fixture — spec §9.1. Incoming message from a product manager to an engineer:
 * "Just checking in. Do we have an update on this yet?"
 *
 * Content rule this fixture exists to protect (spec §27, Prompt 4): the analysis must NOT
 * claim the sender is annoyed. The words annoyed / angry / frustrated / irritated / impatient
 * appear nowhere in this object except inside `unknowns`, where the point is that the emotion
 * cannot be determined. `scripts/validate-fixtures.ts` enforces that.
 *
 * `toneCues` pairs a QUOTED fragment of the actual wording with a neutral observation about
 * that wording — never a claim about the sender's internal state.
 */

import type { DecodeResponse } from '@/types/contracts';

export const DECODE_PM_SOURCE_TEXT = 'Just checking in. Do we have an update on this yet?';

export const decodePmToEngineer: DecodeResponse = {
  mode: 'decode_it',
  literalMeaning:
    'A request for the current status of a specific piece of work. The sender is asking whether an update exists and, if it does, to be given it.',
  likelyPurpose: [
    {
      text: 'Collecting the current status so it can be reported or used in planning.',
      support: 'plausible',
      evidence:
        'Product managers commonly gather status ahead of planning or reporting, and the message asks for an update without naming a decision of its own.',
    },
    {
      text: 'Answering a question someone else asked them about this work.',
      support: 'plausible',
      evidence:
        '"Do we have an update" is phrased on behalf of a group rather than as a personal request.',
    },
    {
      text: 'Simply resuming a thread that has been quiet for a while.',
      support: 'strongly_supported',
      evidence: '"Just checking in" is a standard opener for re-raising a dormant thread.',
    },
  ],
  knownFacts: [
    'The sender is asking for a status update on work already known to both people.',
    'The message names no deadline, no date, and no specific deliverable.',
    'The message contains no stated consequence, no escalation, and no request beyond an update.',
    'The message does not say who else, if anyone, is waiting on the answer.',
    'The subject is referred to only as "this", so the exact scope is carried by earlier context rather than by this message.',
  ],
  interpretations: [
    {
      text: 'The sender expected an update to exist by now.',
      support: 'plausible',
      evidence: 'The word "yet" presupposes that an update was anticipated at some earlier point.',
    },
    {
      text: 'The sender has a downstream dependency — a planning cycle, a stakeholder, or a commitment that needs this status.',
      support: 'speculative',
      evidence: 'Nothing in the message states a dependency; this is inferred from the role only.',
    },
    {
      text: 'The sender is not asking for completion, only for information.',
      support: 'strongly_supported',
      evidence: 'The only request in the message is for an update.',
    },
  ],
  unknowns: [
    'Whether the sender is frustrated, annoyed, or impatient cannot be determined from this message. Short check-in wording like this is used by senders in many different moods, and nothing here distinguishes between them.',
    'Whether anyone else is waiting on this status, and who.',
    'What the sender considers a satisfactory answer — a date, a percentage, or just a signal of movement.',
    'Whether the timing of this message relates to a meeting, a planning cycle, or nothing in particular.',
    'How long the thread has actually been quiet from the sender\'s point of view.',
  ],
  toneCues: [
    {
      cue: '"yet"',
      observation:
        'Signals an expectation that an update would already exist; it does not by itself indicate irritation.',
    },
    {
      cue: '"Just checking in"',
      observation:
        'A softening opener that lowers the pressure of the request. It is used both as genuine politeness and as routine business phrasing, so it does not reliably indicate either.',
    },
    {
      cue: '"Do we have"',
      observation:
        'Plural phrasing that frames the status as shared rather than owed by one person. It may reflect a team habit of speech or an actual audience beyond the sender.',
    },
    {
      cue: 'Two short sentences, no detail',
      observation:
        'Brevity is common in chat channels and is a weak signal about tone on its own.',
    },
  ],
  usefulResponseShouldInclude: [
    'The actual current state of the work, stated plainly',
    'Any blocker or reason progress differs from what was expected',
    'The next concrete milestone',
    'A specific time for the next update',
  ],
  clarificationQuestion:
    'Is there a date or decision on your side that this needs to line up with, so I can aim the update at what you actually need?',
  responseOptions: [
    {
      id: 'status_now',
      label: 'Give the status now',
      message:
        "Here's where it stands: [current state]. The main open item is [blocker or open question]. Next milestone is [milestone], and I'll send another update by [time].",
    },
    {
      id: 'status_plus_timing_check',
      label: 'Give the status and check their timing',
      message:
        "Quick update: [current state], with [blocker or open question] still open. Next milestone is [milestone]. Is there a date on your side this needs to line up with? That'll help me aim the detail at what you need.",
    },
    {
      id: 'buy_short_window',
      label: 'Ask for a short window before answering',
      message:
        "Thanks for the nudge. I want to give you something accurate rather than a guess, so let me pull the real state together and come back to you by [time] today with status, the open items, and a next checkpoint.",
    },
  ],
  safety: {
    category: 'none',
    allowStandardOutput: true,
  },
};
