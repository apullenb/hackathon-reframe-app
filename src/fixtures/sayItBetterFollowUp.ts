/**
 * Say It Better, follow-up state — the same engineer/PM request from spec §8 BEFORE any
 * follow-up answer exists.
 *
 * This is the Honesty Guard in its visible form: a status update with no actual progress and
 * no reliable date cannot be written without inventing one of them, so the app asks instead of
 * complying (the Honesty Guard). Note there is deliberately no
 * `sendableMessage` here — the schema's `superRefine` treats the two states as mutually
 * exclusive.
 *
 * The question ids are the contract with the UI and with `seededFollowUpAnswers` in
 * `PREPARED_SCENARIOS`; they are exported so nothing has to retype a string literal.
 */

import type { SayItBetterResponse } from '@/types/contracts';

export const ENGINEER_PM_FOLLOW_UP_IDS = {
  otherProjectStatus: 'other_project_status',
  actualProgress: 'actual_progress',
  reliableEta: 'reliable_eta',
} as const;

export type EngineerPmFollowUpId =
  (typeof ENGINEER_PM_FOLLOW_UP_IDS)[keyof typeof ENGINEER_PM_FOLLOW_UP_IDS];

export const sayItBetterFollowUp: SayItBetterResponse = {
  mode: 'say_it_better',
  needsFollowUp: true,
  followUpQuestions: [
    {
      id: ENGINEER_PM_FOLLOW_UP_IDS.otherProjectStatus,
      question: 'Was the other project assigned or approved?',
      reason:
        'Saying the other work was approved when it was not would invent a fact, and saying nothing about it leaves the shift in focus unexplained. Your answer decides which is honest.',
      // Required: guessing here fabricates an approval the user never claimed.
      required: true,
      options: [
        {
          id: 'exploratory_not_prioritized',
          label: 'Exploratory and related, but not formally prioritized',
        },
        { id: 'assigned_by_manager', label: 'Assigned to me by my manager' },
        { id: 'approved_by_team', label: 'Approved by the team as a priority' },
        { id: 'unrelated_personal_interest', label: 'Unrelated and driven by my own interest' },
      ],
    },
    {
      id: ENGINEER_PM_FOLLOW_UP_IDS.actualProgress,
      question: 'Roughly how much progress has been made on the requested feature?',
      reason:
        'A status update has to state where the work actually stands. Without your answer we would have to imply a level of progress, which is exactly the fabrication we refuse to make.',
      // Required: any softening of "no progress" is invented progress.
      required: true,
      options: [
        {
          id: 'setup_only',
          label: 'Initial setup only; implementation has not meaningfully started',
        },
        { id: 'none_at_all', label: 'Nothing yet; I have not opened it' },
        { id: 'partial_implementation', label: 'Partway through implementation' },
        { id: 'mostly_done_needs_testing', label: 'Mostly built, still needs testing' },
      ],
    },
    {
      id: ENGINEER_PM_FOLLOW_UP_IDS.reliableEta,
      question: 'When can you provide a reliable ETA?',
      reason:
        'The message needs a next checkpoint the product manager can rely on. If you do not supply the time, we would be inventing a date on your behalf.',
      // Required: a date is the single most damaging thing to guess at.
      required: true,
      options: [
        { id: 'by_3pm_today', label: 'By 3:00 PM today' },
        { id: 'end_of_day', label: 'By end of day' },
        { id: 'tomorrow_morning', label: 'Tomorrow morning' },
        { id: 'after_scoping_call', label: 'After we scope it together' },
      ],
    },
  ],
  missingInformation: [
    'Whether the related project was assigned, approved, or self-directed',
    'The actual state of the requested feature',
    'A date the user can genuinely commit to for a scope and ETA',
  ],
  honestyCheck: {
    passed: false,
    concerns: [
      'The original wording implies effort was spent elsewhere but states no progress on the requested feature; writing a status update from it alone would require inventing progress.',
      'No commitment date was supplied, so any ETA in the message would be fabricated.',
    ],
  },
  safety: {
    category: 'none',
    allowStandardOutput: true,
  },
};
