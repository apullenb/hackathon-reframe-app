/**
 * Decode It prompt (spec §18 "Decode prompt objectives", §9.1 worked example).
 */

import type { DecodeRequest } from '@/types/contracts';
import {
  SAFETY_BLOCK,
  SHARED_SYSTEM_PRINCIPLES,
  buildUserPrompt,
  jsonOutputContract,
  quoteUserText,
  renderShapingBlock,
} from './shared';

const EXAMPLE_SHAPE = `{
  "mode": "decode_it",
  "literalMeaning": "what the words say, with no reading between the lines",
  "likelyPurpose": [
    { "text": "why the message was probably sent", "support": "strongly_supported", "evidence": "the phrase that supports it" }
  ],
  "knownFacts": ["something observable in the message or the supplied context"],
  "interpretations": [
    { "text": "a possible meaning", "support": "plausible", "evidence": "what in the text points at it" }
  ],
  "unknowns": ["something this message cannot tell you"],
  "toneCues": [{ "cue": "the exact word or punctuation", "observation": "what that choice does, not what the sender feels" }],
  "usefulResponseShouldInclude": ["an element the reply needs"],
  "clarificationQuestion": "one question the user could ask to resolve the biggest unknown",
  "responseOptions": [
    { "id": "brief", "label": "Brief status", "message": "..." },
    { "id": "detailed", "label": "Detailed update", "message": "..." },
    { "id": "clarifying", "label": "Ask for context", "message": "..." }
  ],
  "safety": { "category": "none", "allowStandardOutput": true }
}`;

const CONSTRAINTS = [
  '"mode" is exactly "decode_it".',
  '"support" is one of "strongly_supported" | "plausible" | "speculative". Every item in likelyPurpose and interpretations must carry one.',
  'likelyPurpose, knownFacts, interpretations, unknowns, and usefulResponseShouldInclude each need at least one item.',
  'responseOptions must contain EXACTLY three options, and the three must differ in length and directness — each "message" is written for this channel and this recipient.',
  'toneCues may be [] if the message has no notable cues, but prefer naming the actual words.',
];

const SYSTEM_TAIL = `MODE: DECODE IT
Separate what an incoming message SAYS from what it MIGHT mean from what CANNOT be known.

Order of work — do not reorder:
1. literalMeaning first: restate only what the words say. No motive, no mood, no subtext.
2. knownFacts: only what is observable in the message or in the preceding context the user supplied.
3. toneCues: quote the actual word, punctuation, or grammatical choice ("just", "yet", a question with no greeting) and describe what that choice DOES to a reader. Never state what the sender feels.
4. interpretations and likelyPurpose: label every single one.
   - "strongly_supported" = the text itself makes this hard to read another way.
   - "plausible" = consistent with the text, but other readings fit equally well.
   - "speculative" = you are extending beyond the text; say so.
5. unknowns: what this message genuinely cannot tell you. This section is a feature, not an omission — never return it empty.
   REQUIRED: unless the message explicitly states the sender's feelings or motive, one of the
   unknowns MUST say that the sender's emotional state or intent cannot be determined from this
   message alone. Name it directly — "whether the sender is frustrated cannot be determined from
   this message" — not merely "why they are asking". A reader's biggest risk with a short message
   is inventing a mood for it, so that unknown is the most important one on the list. Other
   unknowns (missing referents, deadlines, external pressure) come after it, not instead of it.

ABSOLUTE RULE ON INTERNAL STATE
You have no access to the sender's feelings, mood, opinion of the user, or private motives. You may only describe what the text does.

Worked example. For "Just checking in. Do we have an update on this yet?" the literal meaning is a request for the current status. "Just" and "yet" are tone cues worth naming. You must NOT assert that the sender is annoyed, frustrated, impatient, passive-aggressive, or checking up on the user — that is not in the text. Whether the sender is frustrated, and whether someone is asking THEM for the update, belong in "unknowns". A plausible-labelled interpretation may say the sender may need the information for their own planning or for someone else; it may not say they are irritated.

The reply options and the clarification question must be written for the stated channel and recipient role — a Slack reply to a product manager is not an email to an executive.`;

export function buildDecodePrompt(request: DecodeRequest): { system: string; user: string } {
  const user = buildUserPrompt([
    renderShapingBlock(request.context),
    quoteUserText('THE MESSAGE THE USER RECEIVED', request.sourceText),
    request.precedingContext
      ? quoteUserText(
          'PRECEDING CONTEXT THE USER SUPPLIED (treat as fact; add nothing to it)',
          request.precedingContext,
        )
      : null,
    'Note: in this mode the user is the RECIPIENT. The three responseOptions are messages the user could send back.',
    jsonOutputContract(EXAMPLE_SHAPE, CONSTRAINTS),
  ]);

  return {
    system: `${SHARED_SYSTEM_PRINCIPLES}\n\n${SYSTEM_TAIL}\n\n${SAFETY_BLOCK}`,
    user,
  };
}
