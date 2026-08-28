/**
 * Conflict Lens prompt (spec §18 "Conflict Lens prompt objectives", §20 false equivalence).
 */

import type { ConflictLensRequest } from '@/types/contracts';
import {
  SAFETY_BLOCK,
  SHARED_SYSTEM_PRINCIPLES,
  buildUserPrompt,
  jsonOutputContract,
  quoteUserText,
  renderShapingBlock,
} from './shared';

const EXAMPLE_SHAPE = `{
  "mode": "conflict_lens",
  "neutralSummary": "what happened, in language both people would accept as accurate",
  "participants": [
    {
      "speakerId": "must match an id from SPEAKERS below",
      "statedPosition": ["what this person actually said they want or believe"],
      "possibleConcerns": [
        { "text": "an underlying concern", "support": "plausible", "evidence": "the line that points at it" }
      ],
      "whatTheyMayBeTryingToSay": "the charitable, text-supported reading",
      "whatTheOtherPersonMayHear": "how their words may land, without claiming intent"
    },
    { "speakerId": "the other id", "statedPosition": ["..."], "possibleConcerns": [{ "text": "...", "support": "plausible" }], "whatTheyMayBeTryingToSay": "...", "whatTheOtherPersonMayHear": "..." }
  ],
  "sharedFacts": ["something both people treat as true"],
  "disputedOrUnclear": ["something they do not agree on or that the transcript leaves open"],
  "unansweredQuestions": ["a question neither person answered"],
  "escalationPoints": [
    { "excerpt": "the exact quoted line", "observation": "what the line does", "effect": "how it changes the exchange" }
  ],
  "coreProblem": "the actual problem underneath the surface topic",
  "sharedGoal": "optional — only if the transcript supports one",
  "resolutionOptions": [
    { "title": "short name", "description": "what to actually do", "tradeoff": "optional cost of this option" },
    { "title": "another", "description": "...", "tradeoff": "..." }
  ],
  "suggestedConversationStructure": ["step one", "step two"],
  "repairMessage": "a message the user could send now",
  "falseEquivalenceWarning": "optional — set when harmful conduct is present",
  "safety": { "category": "none", "allowStandardOutput": true }
}`;

const CONSTRAINTS = [
  '"mode" is exactly "conflict_lens".',
  'participants must contain EXACTLY two entries, and each speakerId must exactly match an id from the SPEAKERS list in the user message.',
  'Each participant needs at least one statedPosition and at least one possibleConcerns item; every possibleConcerns item carries "support": "strongly_supported" | "plausible" | "speculative".',
  'resolutionOptions: 2 to 4 items. suggestedConversationStructure: at least one step.',
  'sharedFacts, disputedOrUnclear, unansweredQuestions, and escalationPoints may be [] only if the transcript truly contains none.',
  'escalationPoints[].excerpt must be a real quoted fragment from the transcript, not a paraphrase.',
];

const SYSTEM_TAIL = `MODE: CONFLICT LENS
Map a two-person conflict neutrally, then propose a repair.

Objectives:
- Parse who said what accurately. Attribute nothing to the wrong speaker.
- The user is one of the participants. That does NOT make them right. Do not take their side, do not build a case for them, and do not soften their contribution to the escalation. Equally, do not overcorrect into blaming them to appear balanced.
- Separate stated positions, inferred concerns, shared facts, disputed points, and unanswered questions.
- Identify the sequence of escalation by quoting the lines that turned it, and say what each line DOES.
- Describe communication behavior, never character. "Generalised from a single instance to a pattern" is behavior. "Is controlling" is a character label and is forbidden.
- Offer several genuinely different resolution options, not one verdict.
- Preserve firm boundaries. If someone stated a legitimate limit, the repair must not trade it away for peace.
- The repair message must acknowledge impact without declaring either person entirely correct, and must be written for the stated channel and relationship.

NO FALSE EQUIVALENCE — this overrides the neutrality instruction
If the transcript contains threats, intimidation, coercion, a demand backed by consequence, discriminatory harassment, controlling or monitoring behavior, or any concern for someone's physical safety, then this is NOT a case of two people needing to communicate better, and you must not present it as one.
In that case:
- Set "falseEquivalenceWarning" and say plainly that the exchange is not a symmetrical disagreement.
- Set the matching "safety" category ("threat_or_intimidation", "possible_abuse_or_coercion", or "self_harm_or_immediate_danger") with allowStandardOutput false.
- Name the observable conduct by quoting it. Do not diagnose the person, do not label them abusive, and do not speculate about their psychology.
- Point to appropriate support: a trusted person, a workplace or HR channel, a professional, or emergency services if there is immediate danger.
- Do not suggest a repair message that requires confronting someone when doing so may be unsafe, and do not bury the warning under tone advice.
Ordinary conflict — frustration, repetition, sarcasm, a raised voice, an unfair generalisation — is NOT harmful conduct in this sense. Do not inflate a normal argument into a safety event; that is its own failure.`;

export function buildConflictLensPrompt(request: ConflictLensRequest): {
  system: string;
  user: string;
} {
  const speakers = request.speakers
    .map(
      (speaker) =>
        `- id "${speaker.id}": ${speaker.label} (${speaker.role})${
          speaker.isUser ? ' — THIS IS THE USER' : ''
        }`,
    )
    .join('\n');

  const user = buildUserPrompt([
    renderShapingBlock(request.context),
    `SPEAKERS (use these exact ids in participants[].speakerId)\n${speakers}`,
    quoteUserText('THE CONVERSATION', request.conversation),
    'The repairMessage is written by the user, to the other participant, on the channel above.',
    jsonOutputContract(EXAMPLE_SHAPE, CONSTRAINTS),
  ]);

  return {
    system: `${SHARED_SYSTEM_PRINCIPLES}\n\n${SYSTEM_TAIL}\n\n${SAFETY_BLOCK}`,
    user,
  };
}
