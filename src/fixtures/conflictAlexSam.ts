/**
 * Conflict Lens fixture — the Alex/Sam kitchen exchange from spec §9.2.
 *
 * The analysis has to land on the real issue: there is no shared definition of when the task
 * counts as complete, and there is low trust in follow-through. "They should communicate
 * better" is a content-test failure (spec §27, Prompt 5), and so is declaring either person
 * correct.
 *
 * Escalation points describe the BEHAVIOR and its EFFECT — never the person's character.
 *
 * The speaker ids are the join key: `participants[].speakerId` must match an id in
 * `CONFLICT_ALEX_SAM_SPEAKERS`, because the response carries no names (see
 * `src/schemas/conflictLens.ts`). Alex is the user.
 */

import type { ConflictLensResponse, ConflictSpeaker } from '@/types/contracts';

export const CONFLICT_ALEX_SAM_SPEAKERS: ConflictSpeaker[] = [
  { id: 'alex', label: 'Alex', role: 'Spouse/partner', isUser: true },
  { id: 'sam', label: 'Sam', role: 'Spouse/partner', isUser: false },
];

/**
 * Pasted conversation in the `Name: message` form the Conflict Lens parser reads. The labels
 * must match `CONFLICT_ALEX_SAM_SPEAKERS[].label` so the parsed speakers line up with the
 * response's `speakerId`s.
 */
export const CONFLICT_ALEX_SAM_CONVERSATION = [
  'Alex: I asked you twice if you could take care of the kitchen.',
  "Sam: I said I would do it. You don't have to keep reminding me.",
  "Alex: But when you say that, it usually doesn't happen until I do it.",
  'Sam: Fine. Just do it yourself then.',
].join('\n');

export const conflictAlexSam: ConflictLensResponse = {
  mode: 'conflict_lens',
  neutralSummary:
    'Alex raises a kitchen task that has been asked about twice. Sam states the task was already agreed to and asks not to be reminded again. Alex describes a pattern in which the task tends not to get done until Alex does it. Sam responds by withdrawing from the task. In four lines the exchange moves from a single chore to the reliability of agreements between them.',
  participants: [
    {
      speakerId: 'alex',
      statedPosition: [
        'Alex asked about the kitchen twice.',
        'In Alex\'s experience, agreement to do the task has often not been followed by the task being done.',
        'Alex has often ended up doing it after waiting.',
      ],
      possibleConcerns: [
        {
          text: 'Alex may be carrying the responsibility for tracking whether household tasks actually get finished, which is its own ongoing work.',
          support: 'plausible',
          evidence:
            '"it usually doesn\'t happen until I do it" describes a repeated outcome, not just this one instance.',
        },
        {
          text: 'Alex may want reliability more than speed — a task that gets done when agreed, rather than done immediately.',
          support: 'plausible',
          evidence:
            'Alex names the gap between agreement and completion rather than complaining about the delay itself.',
        },
        {
          text: 'Alex may be worried that raising this again is the only way to get a result, and that doing so damages the relationship.',
          support: 'speculative',
          evidence: 'Not stated in the conversation; inferred from the reluctance implied by "twice".',
        },
      ],
      whatTheyMayBeTryingToSay:
        'I need to be able to stop thinking about this once you have said yes. Right now I cannot, because often it does not get done until I do it.',
      whatTheOtherPersonMayHear:
        'I do not believe you will do it, and I am going to keep checking until you prove me wrong.',
    },
    {
      speakerId: 'sam',
      statedPosition: [
        'Sam agreed to do the kitchen.',
        'Sam does not want to be reminded again after having agreed.',
        'By the end of the exchange Sam withdraws from doing the task.',
      ],
      possibleConcerns: [
        {
          text: 'Sam may feel monitored, or treated as though the agreement alone is not credible.',
          support: 'plausible',
          evidence: '"You don\'t have to keep reminding me" objects to the reminders, not to the task.',
        },
        {
          text: 'Sam may be working from a different timeframe — intending to do it later in the day rather than now.',
          support: 'plausible',
          evidence:
            'Sam confirms the commitment ("I said I would do it") but never names a time, and no time was requested.',
        },
        {
          text: 'Sam may hear the reference to past instances as a judgment about reliability in general rather than about this task.',
          support: 'plausible',
          evidence: 'Sam disengages immediately after Alex generalizes to "usually".',
        },
      ],
      whatTheyMayBeTryingToSay:
        'I did agree, and I intend to do it. Being asked repeatedly makes me feel like my word does not count for anything.',
      whatTheOtherPersonMayHear:
        'Stop bringing this up, and if you keep bringing it up I will stop being involved at all.',
    },
  ],
  sharedFacts: [
    'The kitchen task has been raised more than once.',
    'Sam agreed at some point to do the kitchen.',
    'No specific time for completing the task was ever named by either person.',
    'The task was still undone at the time of this exchange.',
  ],
  disputedOrUnclear: [
    'Whether the task has typically been completed in the past — Alex describes a pattern, and Sam neither confirms nor disputes it.',
    'What "take care of the kitchen" includes, and what state counts as finished.',
    'Whether Sam had a timeframe in mind that Alex was not aware of.',
    'Whether Sam\'s final line is a withdrawal from the task, an expression of feeling dismissed, or both.',
  ],
  unansweredQuestions: [
    'By when did Sam intend to do it?',
    'What would make Alex comfortable letting the task go until then?',
    'What specifically needs to happen for the kitchen to count as done?',
    'What should either person do if the agreed time passes and the task is not finished?',
  ],
  escalationPoints: [
    {
      excerpt: 'I asked you twice if you could take care of the kitchen.',
      observation:
        'Opens by counting the number of times the request was made rather than by naming the task or a time.',
      effect:
        'Frames the conversation around the asking rather than the doing, which invites a defense of the agreement instead of a plan for finishing it.',
    },
    {
      excerpt: "You don't have to keep reminding me.",
      observation:
        'Responds to the reminder rather than to the underlying request, and asks for the reminders to stop without offering a time in their place.',
      effect:
        'Removes the mechanism Alex has been relying on without replacing it, which leaves Alex with less certainty rather than more.',
    },
    {
      excerpt: "But when you say that, it usually doesn't happen until I do it.",
      observation:
        'Generalizes from this task to a repeated pattern, using "usually" to bring in previous instances that are not part of this exchange.',
      effect:
        'Shifts the subject from one kitchen to a track record, which is much harder to respond to and raises the stakes of the disagreement.',
    },
    {
      excerpt: 'Just do it yourself then.',
      observation:
        'Ends the negotiation by handing the task back rather than proposing terms for keeping it.',
      effect:
        'Confirms the exact outcome Alex described, so both people leave with their existing expectation reinforced and nothing resolved.',
    },
  ],
  coreProblem:
    'There is no shared definition of when the kitchen task is complete — no agreed time and no agreed standard — and there is low trust in follow-through, on both sides of the same loop. Without a completion point, Alex has no moment at which it is reasonable to stop checking, and Sam has no way to demonstrate follow-through other than being checked on. Neither person is wrong about what they have experienced; the loop is what keeps producing the argument.',
  sharedGoal:
    'Both want the kitchen handled without it costing them another argument: Alex wants to stop tracking it, and Sam wants to be trusted to do what was agreed.',
  resolutionOptions: [
    {
      title: 'Agree on a completion time, then no reminders before it',
      description:
        'Name a specific time the task will be finished by ("before dinner", "by 9pm"). Alex does not raise it again before that time. If the time passes, that is the moment to talk about it — not before.',
      tradeoff:
        'Alex has to tolerate the uncertainty until the agreed time, and Sam has to commit to a time on the spot rather than leaving it open.',
    },
    {
      title: 'Define what "done" means once, in writing',
      description:
        'Spend five minutes agreeing what "take care of the kitchen" actually covers — dishes, counters, floor, trash — so that neither person is judging the result against a private standard.',
      tradeoff:
        'It feels overly formal for a household task, and it does not by itself address the timing question.',
    },
    {
      title: 'Separate the task from the pattern and handle them apart',
      description:
        'Settle the kitchen tonight with a time, and schedule the larger conversation about follow-through for a calm moment. The pattern conversation cannot be won inside a chore conversation.',
      tradeoff:
        'The bigger issue stays open for now, and it only works if the second conversation actually happens.',
    },
    {
      title: 'Change who owns the task rather than how it is tracked',
      description:
        'If reminders are the friction, reassign the kitchen to whoever will not need them, and trade something else in exchange, so the reminder loop has nothing to attach to.',
      tradeoff:
        'It resolves this specific chore but leaves the trust question unaddressed, so the same loop can reappear on the next shared task.',
    },
  ],
  suggestedConversationStructure: [
    'Start with the shared goal, not the history: both of you want this handled without another argument.',
    'Each person says what they actually need in one sentence — a completion point, or room to do it without being checked on.',
    'Agree on a specific time and a specific definition of finished for this one task.',
    'Agree what happens if that time passes, so neither of you has to improvise in the moment.',
    'Leave the track-record conversation for a separate, calmer time, and say out loud that you are doing that on purpose.',
  ],
  repairMessage:
    "I don't think either of us is being unreasonable here, and I don't want to keep having this same argument. When I ask again it isn't because I think you won't do it — it's because I don't know when it'll be done, so I never get to stop thinking about it. I can hear that being asked twice feels like I'm not taking your word for it, and I don't want it to feel that way. Can we pick a time it'll be done by? I'll leave it alone until then, and if the time doesn't work we can talk about it then instead of now.",
  safety: {
    category: 'none',
    allowStandardOutput: true,
  },
};
