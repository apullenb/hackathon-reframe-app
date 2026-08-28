/**
 * Deliberately schema-invalid payload, for testing the validation path.
 *
 * This CANNOT be typed as `SayItBetterResponse` — that is the whole point. Every result field
 * on the contract type is optional, so `{mode, needsFollowUp: false, followUpQuestions: []}`
 * type-checks perfectly and would render an empty result screen. The gap is closed at runtime
 * by the `superRefine` in `src/schemas/sayItBetter.ts`, and this fixture is what proves the
 * gate is still working. Typed `unknown` so the compiler cannot be used as the check.
 */

/** The shape a model plausibly returns when it forgets the payload: no `sendableMessage`. */
export const invalidSayItBetterResponse: unknown = {
  mode: 'say_it_better',
  needsFollowUp: false,
  followUpQuestions: [],
  // Realistically wrong: the model narrated its work and never produced the message.
  changesMade: [
    'Replaced dismissive wording with an accountable status',
    'Added the next action and timing supplied by the user',
  ],
  howItMayLand: [{ label: 'Honest about the lack of progress', sentiment: 'positive' }],
  honestyCheck: { passed: true, concerns: [] },
};

/** The issue path `validateResponse` must report for the payload above. */
export const INVALID_RESPONSE_EXPECTED_ISSUE_PATH = 'sendableMessage';

/** Mode to validate the payload under — it is not inferable from an `unknown`. */
export const INVALID_RESPONSE_MODE = 'say_it_better' as const;
