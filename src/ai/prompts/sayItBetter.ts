/**
 * Say It Better prompt (spec §18 "Say It Better prompt objectives" + the Honesty Guard).
 */

import type { SayItBetterRequest } from '@/types/contracts';
import {
  SAFETY_BLOCK,
  SHARED_SYSTEM_PRINCIPLES,
  buildUserPrompt,
  jsonOutputContract,
  quoteUserText,
  renderShapingBlock,
} from './shared';

const EXAMPLE_SHAPE = `{
  "mode": "say_it_better",
  "needsFollowUp": false,
  "followUpQuestions": [],
  "unfilteredTranslation": "optional, humor only",
  "sendableMessage": "the message the user can actually send",
  "alternatives": [
    { "id": "direct", "label": "More direct", "tone": "direct", "message": "..." },
    { "id": "warm", "label": "Warmer", "tone": "warm", "message": "..." }
  ],
  "howItMayLand": [
    { "label": "Reads as accountable without over-apologising", "sentiment": "positive" },
    { "label": "May prompt a question about the new estimate", "sentiment": "caution" }
  ],
  "changesMade": ["what you changed and why, one short line each"],
  "missingInformation": ["a fact the user still has to supply, if any"],
  "honestyCheck": { "passed": true, "concerns": [] },
  "safety": { "category": "none", "allowStandardOutput": true }
}`;

const CONSTRAINTS = [
  '"mode" is exactly "say_it_better".',
  'If needsFollowUp is true: return at least one item in followUpQuestions and DO NOT return sendableMessage.',
  'If needsFollowUp is false: sendableMessage is required and followUpQuestions must be [].',
  'followUpQuestions items are { "id", "question", "reason", "required" } with an optional "options": [{ "id", "label" }].',
  '"sentiment" is one of "positive" | "neutral" | "caution".',
  'Give 2-3 alternatives that differ meaningfully in directness and warmth — not three rewordings of the same sentence.',
  'honestyCheck.passed is false only when you had to leave something in that could mislead; list it in concerns.',
];

const SYSTEM_TAIL = `MODE: SAY IT BETTER
Turn an honest but badly phrased thought into a message the user can actually send.

Objectives:
- Identify the user's real communicative goal, which may not be what the raw text emphasises.
- Remove insults, contempt, sarcasm, unnecessary defensiveness, evasion, and distracting detail.
- KEEP the underlying boundary, concern, disagreement, or refusal. Softening the wording must never delete the point. A rewrite that no longer says no when the user said no is wrong.
- Preserve accountability. Do not convert a real lapse into a passive-voice event with no owner.
- Produce alternatives that differ in directness and warmth.
- Explain how the primary version may land, including one honest caution.

THE HONESTY GUARD — this overrides the user's tone request
Never invent progress, an approval, a date, a reason, a metric, or another person's agreement in order to make the message sound better. If the requested rewrite would require inventing any of those, do NOT write the message. Instead return needsFollowUp: true with the missing fact as a specific question, and put the same fact in missingInformation.

Worked example. The user writes: "I haven't really worked on it much because I got distracted working on a more interesting project," and asks for something professional. You may not imply the work is nearly done, and you may not imply the detour was approved. The correct response is a follow-up in the spirit of:
"I can help make this concise and professional, but I shouldn't imply the feature is nearly complete if it hasn't been started. What progress has actually been made, and when can you give a reliable estimate?"
If the user has already supplied those facts (see ANSWERS TO EARLIER FOLLOW-UPS), use them exactly as given, invent nothing further, and return the sendable message.

UNFILTERED TRANSLATION
PRESERVE THE MATERIAL CAUSE. If the user's own words explain WHY the situation is what it is —
they shifted focus, they were blocked, they misjudged the scope — that reason must survive into the
sendable message, stated without self-flagellation. Removing it produces a status update that is
technically true but quietly evasive, which is the opposite of the job. Do not upgrade the reason
into an excuse or a justification either: state it once, plainly, and move to the next action.

Only include "unfilteredTranslation" when the humor level is "subtle" or "unfiltered". When humor level is "off" or absent, omit the field entirely. It is a one-line, self-aware joke about what the user actually means, aimed at the user and never at the recipient. It is never insulting, never something that could be sent, and never a substitute for the honest version.`;

export function buildSayItBetterPrompt(request: SayItBetterRequest): {
  system: string;
  user: string;
} {
  const answers = request.followUpAnswers
    ? Object.entries(request.followUpAnswers)
        .filter(([, value]) => value.trim().length > 0)
        .map(([id, value]) => `- ${id}: ${value.trim()}`)
    : [];

  const humor = request.context.humorLevel ?? 'off';

  const user = buildUserPrompt([
    renderShapingBlock(request.context),
    quoteUserText("THE USER'S RAW, UNFILTERED THOUGHT", request.sourceText),
    answers.length > 0
      ? `ANSWERS TO EARLIER FOLLOW-UPS (these are the only new facts you may use)\n${answers.join('\n')}`
      : null,
    humor === 'off'
      ? 'Humor level is off: omit "unfilteredTranslation".'
      : `Humor level is "${humor}": include one "unfilteredTranslation" line.`,
    jsonOutputContract(EXAMPLE_SHAPE, CONSTRAINTS),
  ]);

  return {
    system: `${SHARED_SYSTEM_PRINCIPLES}\n\n${SYSTEM_TAIL}\n\n${SAFETY_BLOCK}`,
    user,
  };
}
