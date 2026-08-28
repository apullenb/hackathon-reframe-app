/**
 * Fixture barrel and the Prepared Scenario registry (spec §21).
 *
 * Every fixture here is typed as its response type and every one of them still goes through
 * `validateResponse()` — in `scripts/validate-fixtures.ts` at build time and in the AI client
 * at run time. A fixture that skipped the schema would hide exactly the bug the schema exists
 * to catch (CLAUDE.md).
 */

import type {
  CommunicationContext,
  ContextSwitchMode,
  ContextSwitchResponse,
  ConflictSpeaker,
} from '@/types/contracts';

import { ENGINEER_PM_SOURCE_TEXT, sayItBetterEngineerPm } from './sayItBetterEngineerPm';
import { ENGINEER_PM_FOLLOW_UP_IDS, sayItBetterFollowUp } from './sayItBetterFollowUp';
import { DECODE_PM_SOURCE_TEXT, decodePmToEngineer } from './decodePmToEngineer';
import {
  CONFLICT_ALEX_SAM_CONVERSATION,
  CONFLICT_ALEX_SAM_SPEAKERS,
  conflictAlexSam,
} from './conflictAlexSam';
import { safetyEscalation } from './safetyEscalation';

export {
  sayItBetterEngineerPm,
  ENGINEER_PM_SOURCE_TEXT,
  ENGINEER_PM_SENDABLE_MESSAGE,
  ENGINEER_PM_UNFILTERED_TRANSLATION,
} from './sayItBetterEngineerPm';
export {
  sayItBetterFollowUp,
  ENGINEER_PM_FOLLOW_UP_IDS,
  type EngineerPmFollowUpId,
} from './sayItBetterFollowUp';
export { decodePmToEngineer, DECODE_PM_SOURCE_TEXT } from './decodePmToEngineer';
export {
  conflictAlexSam,
  CONFLICT_ALEX_SAM_SPEAKERS,
  CONFLICT_ALEX_SAM_CONVERSATION,
} from './conflictAlexSam';
export {
  SATURDAY_DINNER_CONVERSATION,
  buildSaturdayDinner,
  matchesSaturdayDinner,
} from './conflictSaturdayDinner';
export {
  safetyEscalation,
  SAFETY_ESCALATION_SOURCE_TEXT,
  SAFETY_ESCALATION_USER_MESSAGE,
} from './safetyEscalation';
export { timeoutErrorCustomContent, timeoutErrorPreparedScenario } from './errorResponse';
export {
  invalidSayItBetterResponse,
  INVALID_RESPONSE_EXPECTED_ISSUE_PATH,
  INVALID_RESPONSE_MODE,
} from './invalidResponse';

/* ── Valid fixture registry ──────────────────────────────────────────────── */

/**
 * Every schema-VALID fixture, keyed. The error and invalid fixtures are excluded on purpose:
 * they are not `ContextSwitchResponse`s and must not be offered as demo output.
 */
export const FIXTURES = {
  sayItBetterEngineerPm,
  sayItBetterFollowUp,
  decodePmToEngineer,
  conflictAlexSam,
  safetyEscalation,
} as const satisfies Record<string, ContextSwitchResponse>;

export type FixtureKey = keyof typeof FIXTURES;

/* ── Prepared scenarios ──────────────────────────────────────────────────── */

/**
 * One entry per Prepared Scenario picker item. `context` is stated in the same human labels
 * the model request carries (see `src/data/vocabulary.ts`), so selecting a scenario fills the
 * context builder with values a user could have chosen by hand.
 */
export type PreparedScenario = {
  id: string;
  label: string;
  mode: ContextSwitchMode;
  description: string;
  context: CommunicationContext;
  /** Say It Better / Decode It input. */
  sourceText?: string;
  /** Conflict Lens input, in `Name: message` form. */
  conversation?: string;
  /** Conflict Lens speaker assignment; `isUser` marks the person the user is. */
  speakers?: ConflictSpeaker[];
  /**
   * Answers already supplied for this scenario, keyed by `FollowUpQuestion.id`. Spec §7: do
   * not ask a follow-up when the prepared scenario's answers are already seeded.
   */
  seededFollowUpAnswers?: Record<string, string>;
  fixtureKey: FixtureKey;
};

export const PREPARED_SCENARIOS: PreparedScenario[] = [
  {
    id: 'engineer_pm_status',
    label: 'Engineer to product manager: honest status update',
    mode: 'say_it_better',
    description:
      'The flagship demo. A blunt admission that the work slipped becomes an accountable Slack update — without inventing progress, approval, or a date the engineer did not give.',
    context: {
      selfRole: 'Engineer',
      otherRole: 'Product manager',
      relationship: 'Cross-functional teammate',
      channel: 'Slack or Teams',
      desiredOutcome: 'Give a status update',
      desiredTone: 'Accountable',
      urgency: 'normal',
      relationshipTemperature: 'calm',
      lengthPreference: 'short',
      // Unfiltered so the internal translation shows — it is the demo's laugh line (spec §8).
      humorLevel: 'unfiltered',
      reduceJargon: true,
    },
    sourceText: ENGINEER_PM_SOURCE_TEXT,
    seededFollowUpAnswers: {
      [ENGINEER_PM_FOLLOW_UP_IDS.otherProjectStatus]:
        'Exploratory and related, but not formally prioritized',
      [ENGINEER_PM_FOLLOW_UP_IDS.actualProgress]:
        'Initial setup only; implementation has not meaningfully started',
      [ENGINEER_PM_FOLLOW_UP_IDS.reliableEta]: 'By 3:00 PM today',
    },
    fixtureKey: 'sayItBetterEngineerPm',
  },
  {
    id: 'decode_pm_checkin',
    label: 'Decode a product manager check-in',
    mode: 'decode_it',
    // The role route reverses here: the PM is the SENDER, so the user is the engineer.
    description:
      'A four-word nudge, taken apart. What it literally asks, what it plausibly serves, and the thing the demo exists to prove: whether the sender is upset cannot be known from this message.',
    context: {
      selfRole: 'Engineer',
      otherRole: 'Product manager',
      relationship: 'Cross-functional teammate',
      channel: 'Slack or Teams',
      desiredOutcome: 'Give a status update',
      desiredTone: 'Concise and direct',
      urgency: 'normal',
      relationshipTemperature: 'calm',
      lengthPreference: 'short',
      humorLevel: 'off',
      reduceJargon: true,
    },
    sourceText: DECODE_PM_SOURCE_TEXT,
    fixtureKey: 'decodePmToEngineer',
  },
  {
    id: 'alex_sam_kitchen',
    label: 'Alex and Sam: the kitchen argument',
    mode: 'conflict_lens',
    description:
      'Four lines about a kitchen that are not about the kitchen. Maps both stated positions, quotes the escalation without judging either person, and names the actual unresolved problem.',
    context: {
      selfRole: 'Spouse/partner',
      otherRole: 'Spouse/partner',
      relationship: 'Close personal relationship',
      channel: 'Text message',
      desiredOutcome: 'De-escalate',
      desiredTone: 'Warm and collaborative',
      urgency: 'normal',
      relationshipTemperature: 'tense',
      lengthPreference: 'medium',
      humorLevel: 'off',
      reduceJargon: true,
    },
    conversation: CONFLICT_ALEX_SAM_CONVERSATION,
    speakers: CONFLICT_ALEX_SAM_SPEAKERS,
    fixtureKey: 'conflictAlexSam',
  },
];
