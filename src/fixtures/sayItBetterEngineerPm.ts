/**
 * Flagship Say It Better fixture — spec §8, after the three follow-up answers from spec §7
 * have been supplied.
 *
 * `unfilteredTranslation` and `sendableMessage` are the spec's strings verbatim; the content
 * tests in `scripts/validate-fixtures.ts` assert on them, so do not "improve" the wording.
 * The Honesty Guard invariant that matters here: nothing in the sendable message or in any
 * alternative may imply the side project was approved or that the feature is nearly complete.
 */

import type { SayItBetterResponse } from '@/types/contracts';

/** Spec §8, "Funny internal translation" — asserted character-for-character. */
export const ENGINEER_PM_UNFILTERED_TRANSLATION =
  'I followed the dopamine instead of the roadmap.';

/** Spec §8, "Example sendable result" — asserted character-for-character. */
export const ENGINEER_PM_SENDABLE_MESSAGE =
  "Progress is behind where I expected it to be. I shifted some time to explore a related project, which reduced the progress I made on this feature. I'm refocusing on it now and will send a realistic scope and ETA by 3:00 PM today.";

/** The raw thought the user typed (spec §8, "Input"). */
export const ENGINEER_PM_SOURCE_TEXT =
  "I haven't really worked on it much because I got distracted working on a more interesting project.";

export const sayItBetterEngineerPm: SayItBetterResponse = {
  mode: 'say_it_better',
  needsFollowUp: false,
  followUpQuestions: [],
  unfilteredTranslation: ENGINEER_PM_UNFILTERED_TRANSLATION,
  sendableMessage: ENGINEER_PM_SENDABLE_MESSAGE,
  alternatives: [
    {
      id: 'direct_and_brief',
      label: 'Direct and brief',
      tone: 'Concise and direct',
      // Same material facts, fewer words: behind, why, refocusing, ETA time.
      message:
        "This is behind where I expected. I spent time on a related project instead, so implementation has not meaningfully started. I'm back on it now and will send scope and an ETA by 3:00 PM today.",
    },
    {
      id: 'warm_and_collaborative',
      label: 'Warm and collaborative',
      tone: 'Warm and collaborative',
      // Same material facts, more relational framing; still no approval claim, still no progress claim.
      message:
        "Thanks for your patience on this one. I want to be straight with you: I put time into a related project and this feature has not really moved past setup as a result. I'm giving it my full attention now, and I'll come back to you with a realistic scope and ETA by 3:00 PM today. If the timing puts anything at risk on your side, tell me and I'll adjust what I pick up first.",
    },
  ],
  howItMayLand: [
    { label: 'Honest about the lack of progress', sentiment: 'positive' },
    { label: 'Takes responsibility without unnecessary self-criticism', sentiment: 'positive' },
    { label: 'Explains the context without presenting it as an excuse', sentiment: 'neutral' },
    { label: 'Gives the product manager a concrete next checkpoint', sentiment: 'positive' },
  ],
  changesMade: [
    'Replaced dismissive wording with an accountable status',
    'Preserved the fact that focus shifted',
    'Added the next action and timing supplied by the user',
    'Did not claim that the alternate work was approved',
  ],
  missingInformation: [
    'The scope estimate itself — the message promises one by 3:00 PM rather than guessing at it now.',
  ],
  honestyCheck: {
    passed: true,
    concerns: [],
  },
  safety: {
    category: 'none',
    allowStandardOutput: true,
  },
};
