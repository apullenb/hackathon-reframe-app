/**
 * Safety-escalation fixture — spec §20, "High-stakes professional content".
 *
 * A manager preparing to tell a direct report their role is being eliminated. The app may help
 * organize and soften the wording, so `allowStandardOutput` stays true and the response is
 * complete — but `safety.userMessage` states plainly that this is communication assistance,
 * not legal or HR advice, and the output asserts no policy, entitlement, or right that the
 * user did not supply. Content is fictional and mild by design.
 */

import type { SayItBetterResponse } from '@/types/contracts';

export const SAFETY_ESCALATION_SOURCE_TEXT =
  "I have to tell Jordan on Monday that their role is being eliminated at the end of the quarter and I have no idea how to open the conversation without making it worse.";

/** Spec §20: displayed with the result, not buried under the tone suggestions. */
export const SAFETY_ESCALATION_USER_MESSAGE =
  'This is communication assistance, not legal or HR advice. Anything about severance, notice periods, final dates, or your obligations should be confirmed with your HR partner or legal counsel before you say it, and this response deliberately states no policy or entitlement you did not supply.';

export const safetyEscalation: SayItBetterResponse = {
  mode: 'say_it_better',
  needsFollowUp: false,
  followUpQuestions: [],
  sendableMessage:
    "Jordan, I need to talk with you about something difficult, and I want to be direct rather than let you sit with a vague meeting invite. Your role is being eliminated at the end of the quarter. This is an organizational decision about the role, and it is not a reflection of your work or of how you have handled it. I have set aside our whole slot to talk it through, and I have asked HR to join for the second half so the questions I can't answer accurately get answered by someone who can. If it would help to have some of it in writing first, tell me and I'll send what I have before we meet.",
  alternatives: [
    {
      id: 'brief_and_plain',
      label: 'Brief and plain',
      tone: 'Concise and direct',
      message:
        "Jordan, I have hard news and I don't want to bury it: your role is being eliminated at the end of the quarter. It's a decision about the role, not about your work. I've kept our full slot free to talk, and HR will join to cover the questions I can't answer accurately myself.",
    },
    {
      id: 'more_supportive',
      label: 'More supportive',
      tone: 'Warm and collaborative',
      message:
        "Jordan, I want to tell you this myself and in person rather than have you hear it any other way. Your role is being eliminated at the end of the quarter. I know that lands hard, and I'm sorry. Nothing about this is a judgment of your work — the decision is about the role. I've held our whole slot open, HR will join for part of it, and I'd rather spend the time on your questions than on my explanation. Whatever you need from me next, including a reference or introductions, I'm in.",
    },
  ],
  howItMayLand: [
    { label: 'Delivers the news early rather than after a preamble', sentiment: 'positive' },
    { label: 'Separates the decision from a judgment of their work', sentiment: 'positive' },
    {
      label: 'Will still be received as bad news; clear wording does not soften the substance',
      sentiment: 'caution',
    },
    { label: 'Points to the right person for the questions you cannot answer', sentiment: 'neutral' },
  ],
  changesMade: [
    'Put the news in the second sentence rather than after a build-up',
    'Named the decision as being about the role, which is what you told us, without characterizing the reasons behind it',
    'Routed severance, timing, and paperwork questions to HR instead of answering them',
    'Stated no policy, notice period, or entitlement that you did not supply',
  ],
  missingInformation: [
    'The final working date, if it differs from the end of the quarter',
    'What you are authorized to say about severance or transition support — left out on purpose rather than guessed',
    'Whether HR has confirmed they can join the conversation',
  ],
  honestyCheck: {
    passed: true,
    concerns: [
      'The message says HR will join. Confirm that with HR before sending, or remove that line — it is the one commitment in here that depends on someone else.',
    ],
  },
  safety: {
    category: 'high_stakes_professional',
    userMessage: SAFETY_ESCALATION_USER_MESSAGE,
    allowStandardOutput: true,
  },
};
