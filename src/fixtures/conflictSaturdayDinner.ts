/**
 * Conflict Lens fallback — the Saturday-dinner exchange.
 *
 * This exists for one situation: the analysis is asked for on stage and no provider answers.
 * Rather than showing an error on the conversation the room has just watched being uploaded, the
 * app serves this prepared analysis of **that same conversation** and says on screen that it is
 * a saved one.
 *
 * The honesty rule (D-009) is not bent here, and the distinction matters: substituting unrelated
 * fixture content for a user's own text would be a fake. Serving a prepared analysis *of the
 * exact conversation that was submitted* is a cache, and it is labelled as one.
 *
 * `matchesSaturdayDinner` is deliberately strict for that reason — it requires several distinctive
 * lines, not a loose resemblance, so it can never fire on someone else's argument.
 *
 * The response carries no names (see `src/schemas/conflictLens.ts`), so `buildSaturdayDinner`
 * stamps `speakerId`s from whatever speakers were parsed at runtime. That matters because a
 * screenshot of this conversation has no names in it at all: the labels the app ends up with are
 * "You" and whichever role was picked, and they are only known once the user submits.
 *
 * Analysis rules, same as every other conflict fixture: no verdict, no diagnosis, inferences
 * carry their support level and their evidence, and escalation points describe the behaviour and
 * its effect rather than the person.
 */

import type { ConflictLensResponse, ConflictSpeaker } from '@/types/contracts';

/**
 * The transcript, in the app's `Name: message` form. `You` is the person holding the phone —
 * the blue, right-hand bubbles.
 */
export const SATURDAY_DINNER_CONVERSATION = [
  'Them: So Saturday is apparently at our house now?',
  "You: Mom needed somewhere. I said we'd make it work.",
  'Them: Of course you did.',
  'You: What is that supposed to mean?',
  'Them: I thought we were past making plans for both of us.',
  "You: It's one dinner. You always act like my family coming over is a crisis.",
  'Them: And you always act like things just magically happen.',
  "You: I said I'll handle it. What else do you want?",
  "Them: Nothing. I'll add it to the list.",
  "You: You don't have to do anything. I can handle dinner.",
  'Them: Like last Christmas?',
  'You: Seriously? I thought we were past that.',
  'Them: I wanted you to think of me before you answered.',
  "You: I was thinking of my mom. Apparently that's a problem.",
  "Them: That's not what I said.",
  "You: You didn't have to.",
].join('\n');

/**
 * Lines distinctive enough that they cannot plausibly appear in a different argument. Matching
 * requires most of them, so a conversation that merely mentions a mother and a Saturday will
 * never be answered with this.
 */
const SIGNATURE_LINES = [
  'saturday is apparently at our house',
  'mom needed somewhere',
  'of course you did',
  'past making plans for both of us',
  'my family coming over is a crisis',
  'things just magically happen',
  "i'll add it to the list",
  'like last christmas',
  'think of me before you answered',
  "you didn't have to",
];

/** How many signature lines must be present. Leaves room for OCR dropping a message or two. */
const MATCH_THRESHOLD = 6;

/** Curly quotes, doubled spaces, and case all vary between OCR runs and a hand-typed paste. */
function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ');
}

/** Is this submission the Saturday-dinner conversation? Strict on purpose — see the file note. */
export function matchesSaturdayDinner(conversation: string): boolean {
  const haystack = normalize(conversation);
  const hits = SIGNATURE_LINES.filter((line) => haystack.includes(line)).length;
  return hits >= MATCH_THRESHOLD;
}

/**
 * Bind the prepared analysis to the speakers the app actually parsed.
 *
 * Returns `null` rather than guessing when there are not exactly two speakers or when neither is
 * marked as the user — an analysis attached to the wrong person is worse than an error message.
 */
export function buildSaturdayDinner(speakers: ConflictSpeaker[]): ConflictLensResponse | null {
  if (speakers.length !== 2) return null;
  const self = speakers.find((speaker) => speaker.isUser);
  const other = speakers.find((speaker) => !speaker.isUser);
  if (!self || !other) return null;

  return {
    mode: 'conflict_lens',
    neutralSummary:
      'A dinner on Saturday has been agreed to on behalf of the household after a request from one person’s mother. The other person learns about it after the fact and raises how the decision was made. Within a few messages the exchange moves from Saturday to two separate long-running subjects: whether commitments that create shared work are made jointly, and whether "I’ll handle it" has held in the past. Neither person proposes cancelling the dinner at any point, and by the end both are describing what the other meant rather than what either said.',
    participants: [
      {
        speakerId: self.id,
        statedPosition: [
          'Their mother needed somewhere for Saturday, and they answered that it could be made to work.',
          'They describe it as one dinner.',
          'They have said twice that they will handle it, and that the other person does not have to do anything.',
          'They say they were thinking about their mother when they answered.',
        ],
        possibleConcerns: [
          {
            text: 'They may feel that their family is treated as an imposition rather than as ordinary company.',
            support: 'plausible',
            evidence:
              '"You always act like my family coming over is a crisis" is about the reaction to the family, not about Saturday.',
          },
          {
            text: 'They may have answered in the moment because declining their mother did not feel available to them.',
            support: 'plausible',
            evidence:
              '"Mom needed somewhere" gives the need as the reason for the answer, and no alternative is mentioned as having been considered.',
          },
          {
            text: 'They may hear the reference to Christmas as a record being kept about their reliability rather than as a point about one evening.',
            support: 'plausible',
            evidence: '"Seriously? I thought we were past that."',
          },
          {
            text: 'They may believe that taking on all of the work themselves is the way to end the disagreement.',
            support: 'speculative',
            evidence:
              'Inferred from "You don\'t have to do anything. I can handle dinner", which offers to absorb the work rather than to divide it. Not stated.',
          },
        ],
        whatTheyMayBeTryingToSay:
          'My mother asked for help and I did not feel able to say no. I am not asking you to take this on — I will do the work. What I need is for my family not to be treated as a problem.',
        whatTheOtherPersonMayHear:
          'The decision has already been made, your reaction is the thing that is wrong here, and if you push back on it you are pushing back on my family.',
      },
      {
        speakerId: other.id,
        statedPosition: [
          'They learned that Saturday is at their house rather than being asked about it.',
          'They say they thought plans were no longer made on behalf of both of them.',
          'They expect the dinner to add to work they are already carrying.',
          'They raise a previous occasion as a reason for doubting that dinner will be handled alone.',
          'They say what they wanted was to be considered before the answer was given.',
        ],
        possibleConcerns: [
          {
            text: 'Their objection may be to being committed by someone else’s answer rather than to the dinner itself.',
            support: 'strongly_supported',
            evidence:
              '"I wanted you to think of me before you answered" names the moment of answering, and at no point do they say the dinner should not happen.',
          },
          {
            text: 'They may expect to absorb work that has not been named or divided, whatever was offered.',
            support: 'plausible',
            evidence:
              '"Nothing. I\'ll add it to the list" describes the dinner joining existing work rather than being taken off their hands.',
          },
          {
            text: 'They may have low confidence that "I can handle dinner" will hold, based on a specific previous occasion rather than on a general view.',
            support: 'plausible',
            evidence:
              '"Like last Christmas?" cites one instance, not a pattern in general terms.',
          },
          {
            text: 'They may have had something of their own planned for Saturday.',
            support: 'speculative',
            evidence: 'Nothing in the conversation mentions their Saturday. This cannot be determined from the messages.',
          },
        ],
        whatTheyMayBeTryingToSay:
          'I am not against your mother coming over. I want to be asked first, because when the answer is yes the work lands on both of us whatever gets said about who is handling it.',
        whatTheOtherPersonMayHear:
          'Your family is an inconvenience, I am keeping a record of the times you have let me down, and nothing you promise is going to be believed.',
      },
    ],
    sharedFacts: [
      'The mother of one of them needed somewhere for Saturday.',
      'One of them answered on behalf of the household, before the other knew about it.',
      'Neither person says at any point that the dinner should not happen.',
      'One of them has stated twice that they will handle it.',
      'A previous occasion — last Christmas — is referred to by one of them as relevant.',
      'No specific tasks for Saturday have been named or divided by either of them.',
    ],
    disputedOrUnclear: [
      'What actually happened last Christmas. One raises it as evidence, the other treats it as settled, and neither describes it.',
      'Whether the objection is to the dinner, to being committed without being asked, or to the work — the conversation never separates them.',
      'What "make it work" and "handle it" cover in practice, and whether either includes help that has been assumed rather than requested.',
      'Whether "Of course you did" referred to this decision or to a pattern, which is the question that the next several messages are spent on.',
      'Whether being asked first would have changed the answer.',
    ],
    unansweredQuestions: [
      'What would you have wanted to happen when the call came?',
      'If you had been asked first, would the answer have been yes?',
      'What does Saturday actually involve, task by task, and who is doing each part?',
      'What happened last Christmas, in each of your accounts of it?',
      'Was there anything already planned for Saturday that this now sits on top of?',
    ],
    escalationPoints: [
      {
        excerpt: 'Of course you did.',
        observation:
          'Answers with an evaluation rather than a position, leaving the pattern it refers to unstated.',
        effect:
          'The next four messages are spent establishing what it meant, so the conversation opens on an argument about interpretation instead of about Saturday.',
      },
      {
        excerpt: 'You always act like my family coming over is a crisis.',
        observation:
          'Generalises from this dinner to a standing behaviour, and moves the subject to how the other person feels about the family.',
        effect:
          'Converts a disagreement about one decision into one about in-laws, which is a much larger subject and cannot be settled by anything either of them does about Saturday.',
      },
      {
        excerpt: 'And you always act like things just magically happen.',
        observation:
          'Mirrors the previous message\'s structure and its "always", answering a characterisation with another one.',
        effect:
          'Both accounts are now about the other person rather than about the dinner, and nothing on the table can be agreed or refused any more.',
      },
      {
        excerpt: 'Like last Christmas?',
        observation:
          'Introduces a specific past occasion as evidence against a present offer.',
        effect:
          'Changes the claim from "I will handle this dinner" to "your word holds", which cannot be resolved inside this conversation because only one of the two events is present in it.',
      },
      {
        excerpt: 'You didn’t have to.',
        observation:
          'Ends by attributing a meaning to something the other person did not say, immediately after they said it was not what they meant.',
        effect:
          'Closes the exchange with each person holding a version of what the other meant, neither of which either of them has agreed to, and with Saturday still unplanned.',
      },
    ],
    coreProblem:
      'There is no agreed way of making a commitment that creates work for both people. One of them treats "I will handle it" as settling the question, and the other has learned that a yes given for both of them lands on both of them regardless of who said they would handle it — but has no way to say so that does not sound like an accusation about character. The dinner is not the disagreement. The disagreement is whether a yes given on behalf of the household counts as a joint decision, and neither of them can raise it without the other hearing a verdict about who they are.',
    sharedGoal:
      'Both want Saturday to happen without it costing them anything further: one wants to be able to say yes to their mother without it becoming a fight, and the other wants not to be committed to work by someone else’s answer.',
    resolutionOptions: [
      {
        title: 'Settle Saturday first, separately from how it was decided',
        description:
          'Saturday is already agreed — neither of you has asked to cancel it. Plan that evening on its own: what happens, who does which part, what time. Leave how the decision got made for its own conversation, and say out loud that you are doing that deliberately.',
        tradeoff:
          'The larger question stays open tonight, and this only works if the second conversation actually happens rather than being quietly dropped once the dinner goes fine.',
      },
      {
        title: 'Agree what a request from either family gets answered with',
        description:
          'Decide on the sentence that buys the check-in: "Let me talk to them and call you back." It is not a refusal, it costs one phone call, and it makes the difference between a decision made for two people and one made by one.',
        tradeoff:
          'It can feel like needing permission for ordinary family things, and it is harder to hold when the person asking is upset or the answer feels obvious.',
      },
      {
        title: 'Make the work visible once, so "I’ll handle it" has a definition',
        description:
          'Write down what Saturday actually takes — food, shopping, the house, the clearing up afterwards — and put a name against each part. "I will handle it" then means something specific that can be agreed to now, instead of a promise that gets assessed afterwards.',
        tradeoff:
          'It feels formal for a family dinner, and it does not by itself address the Christmas disagreement, which is about trust rather than about tasks.',
      },
      {
        title: 'Ask the question neither of you has asked',
        description:
          'Ask directly whether, if the call had come to both of you, the answer would still have been yes. If it would, the objection is about the process and not the dinner, and the two of you are arguing about far less than it currently sounds like.',
        tradeoff:
          'The answer might be no, which is harder to hear — but it is a real answer, and it is currently being guessed at by both of you instead.',
      },
    ],
    suggestedConversationStructure: [
      'Start from what you agree on: Saturday is happening, and neither of you has said it should not.',
      'Say the one thing you each actually want, in a sentence — to be asked before the answer is given, or for your family not to be treated as a problem.',
      'Deal with Saturday concretely: what it involves, and who does which part.',
      'Agree what happens the next time either family asks for something, so the next one is not decided in the moment.',
      'Name Christmas as a separate conversation and pick a calmer time for it, rather than settling it now or pretending it was not raised.',
    ],
    repairMessage:
      'I have been going over this and I think I answered the wrong thing. You said you wanted me to think of you before I answered, and I went straight to defending my mom — which was not what you asked me. You are right that I said yes for both of us. I did it because she needed somewhere and I did not want to let her down, but that is my reason, not your problem, and it should not have been decided without you. I still want Saturday to happen. Can we sit down and go through what it actually takes, so that "I will handle it" means something specific rather than something you have to take on trust? And I would rather talk about Christmas properly than have it come up like this — not tonight, but I am not trying to avoid it either.',
    safety: {
      category: 'none',
      allowStandardOutput: true,
    },
  };
}
