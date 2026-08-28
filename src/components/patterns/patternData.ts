/**
 * Seeded structured data for Health Check (brief §8.11).
 *
 * This is a local fixture, not a model call and not a stored user history. Everything the Health
 * Check screen renders is derived from the rows below, so the dashboard is honest about what it
 * is: counts over fourteen anonymized demo situations from this session's scenario library.
 *
 * PRODUCT SAFETY (brief §8.11, non-negotiable): this file must never gain a relationship health
 * score, a mental-health score, a red/yellow/green rating of a person, an attachment-style claim,
 * or a personality claim. Counts of observable choices are the only thing modelled here, and the
 * copy stays observational — "'Defend' was the selected action urge in four situations", never
 * "you are defensive".
 */

/** One anonymized demo situation, shown when a pattern row is expanded. */
export type DemoSituation = {
  id: string;
  /** Neutral, de-identified label. No names, no employers. */
  title: string;
  /** Role pair and channel, in the app's own vocabulary. */
  context: string;
  /** What was observed in that situation — behaviour, not character. */
  note: string;
};

export type PatternRow = {
  id: string;
  label: string;
  count: number;
  /** Observational copy. Describes what appeared, never what it means about the person. */
  observation: string;
  situationIds: readonly string[];
};

export type PatternSection = {
  id: string;
  /** Mono eyebrow — metadata, per the typography rule. */
  eyebrow: string;
  title: string;
  caption: string;
  rows: readonly PatternRow[];
};

export type TrendPoint = { label: string; value: number };

/** Total situations the counts below are drawn from. Shown on screen so the denominator is visible. */
export const SITUATION_SAMPLE_SIZE = 14;

export const DEMO_SITUATIONS: Readonly<Record<string, DemoSituation>> = {
  'sit-sprint-status': {
    id: 'sit-sprint-status',
    title: 'Sprint status thread',
    context: 'Engineer to product manager · team chat',
    note: 'Draft opened with the constraint before the answer. Rewritten to lead with the date.',
  },
  'sit-scope-change': {
    id: 'sit-scope-change',
    title: 'Late scope change',
    context: 'Engineer to product manager · team chat',
    note: 'Action urge recorded as Defend. Sent message was a question instead.',
  },
  'sit-code-review': {
    id: 'sit-code-review',
    title: 'Review comment that landed hard',
    context: 'Engineer to engineer · pull request',
    note: 'Technically correct, no acknowledgment. Patch added one line of acknowledgment.',
  },
  'sit-standup-silence': {
    id: 'sit-standup-silence',
    title: 'No reply for two days',
    context: 'Engineer to manager · direct message',
    note: 'Assumption "they are annoyed" stayed unconfirmed and was not sent.',
  },
  'sit-dishwasher': {
    id: 'sit-dishwasher',
    title: 'The chore that was not the point',
    context: 'Partner to partner · in person',
    note: 'Topic changed at turn 4. The original topic was not returned to.',
  },
  'sit-im-fine': {
    id: 'sit-im-fine',
    title: '"I am fine" with inconsistent behaviour',
    context: 'Partner to partner · text message',
    note: 'Literal content and observed behaviour did not match. Clarifying question sent.',
  },
  'sit-weekend-plans': {
    id: 'sit-weekend-plans',
    title: 'Plans changed without notice',
    context: 'Friend to friend · text message',
    note: 'Action urge recorded as Withdraw. A short direct message was sent instead.',
  },
  'sit-family-call': {
    id: 'sit-family-call',
    title: 'The call that repeats every month',
    context: 'Adult child to parent · phone',
    note: 'Same unresolved topic as three earlier situations. No repair attempted.',
  },
  'sit-deadline-slip': {
    id: 'sit-deadline-slip',
    title: 'The estimate that slipped again',
    context: 'Engineer to product manager · email',
    note: 'Draft added a commitment the facts did not support. Unit Tests failed it.',
  },
  'sit-meeting-interrupt': {
    id: 'sit-meeting-interrupt',
    title: 'Interrupted twice in a meeting',
    context: 'Engineer to cross-functional group · meeting',
    note: 'Action urge recorded as Prove. Follow-up sent after a Breakpoint.',
  },
  'sit-oncall-page': {
    id: 'sit-oncall-page',
    title: 'Paged at 2am about someone else’s change',
    context: 'Engineer to engineer · incident channel',
    note: 'Blame wording detected before sending. Replaced with the timeline.',
  },
  'sit-roommate-bills': {
    id: 'sit-roommate-bills',
    title: 'The bill nobody wants to bring up',
    context: 'Roommate to roommate · text message',
    note: 'Avoided for eleven days. Opened with a specific ask.',
  },
  'sit-perf-review': {
    id: 'sit-perf-review',
    title: 'Feedback that felt like a verdict',
    context: 'Engineer to manager · one to one',
    note: 'Absolute language detected in the draft. Narrowed to one example.',
  },
  'sit-group-thread': {
    id: 'sit-group-thread',
    title: 'A group thread that forked',
    context: 'Friend to group · group chat',
    note: 'Argument branched at message 4. Original topic never resumed.',
  },
};

export function situationsFor(row: PatternRow): DemoSituation[] {
  return row.situationIds
    .map((id) => DEMO_SITUATIONS[id])
    .filter((situation): situation is DemoSituation => situation !== undefined);
}

export const PATTERN_SECTIONS: readonly PatternSection[] = [
  {
    id: 'roles',
    eyebrow: 'roles.active',
    title: 'Most common active roles',
    caption: 'Which version of you was running when a situation was opened.',
    rows: [
      {
        id: 'role-engineer-pm',
        label: 'Engineer to product manager',
        count: 5,
        observation:
          'Five of fourteen situations were opened with this role pair. Four of the five were about timelines.',
        situationIds: ['sit-sprint-status', 'sit-scope-change', 'sit-deadline-slip', 'sit-meeting-interrupt', 'sit-standup-silence'],
      },
      {
        id: 'role-partner',
        label: 'Partner to partner',
        count: 3,
        observation: 'Three situations used this role pair. Both recorded topics were unresolved at the end.',
        situationIds: ['sit-dishwasher', 'sit-im-fine', 'sit-weekend-plans'],
      },
      {
        id: 'role-peer',
        label: 'Engineer to engineer',
        count: 3,
        observation: 'Three situations happened in a review or incident channel rather than a private message.',
        situationIds: ['sit-code-review', 'sit-oncall-page', 'sit-group-thread'],
      },
      {
        id: 'role-reports-up',
        label: 'Engineer to manager',
        count: 2,
        observation: 'Two situations. Both drafts were revised before sending.',
        situationIds: ['sit-perf-review', 'sit-standup-silence'],
      },
      {
        id: 'role-family',
        label: 'Family and household',
        count: 2,
        observation: 'Two situations, both recurring topics rather than new events.',
        situationIds: ['sit-family-call', 'sit-roommate-bills'],
      },
    ],
  },
  {
    id: 'urges',
    eyebrow: 'urge.selected',
    title: 'Common action urges',
    caption: 'The urge you selected in the State Inspector, before deciding what to do.',
    rows: [
      {
        id: 'urge-defend',
        label: 'Defend',
        count: 4,
        observation:
          '“Defend” appeared as the selected action urge in four recent workplace situations. In three of them the message actually sent was a question.',
        situationIds: ['sit-scope-change', 'sit-code-review', 'sit-deadline-slip', 'sit-perf-review'],
      },
      {
        id: 'urge-fix',
        label: 'Fix',
        count: 3,
        observation: 'Selected in three situations. Two of those messages were later shortened.',
        situationIds: ['sit-sprint-status', 'sit-oncall-page', 'sit-roommate-bills'],
      },
      {
        id: 'urge-withdraw',
        label: 'Withdraw',
        count: 3,
        observation: 'Selected in three situations, all outside work.',
        situationIds: ['sit-weekend-plans', 'sit-family-call', 'sit-im-fine'],
      },
      {
        id: 'urge-prove',
        label: 'Prove',
        count: 2,
        observation: 'Selected twice, both after being interrupted or corrected in front of others.',
        situationIds: ['sit-meeting-interrupt', 'sit-group-thread'],
      },
      {
        id: 'urge-pause',
        label: 'Pause',
        count: 2,
        observation: 'Selected twice. Both situations used Breakpoint before a message was sent.',
        situationIds: ['sit-standup-silence', 'sit-dishwasher'],
      },
    ],
  },
  {
    id: 'logic',
    eyebrow: 'patterns.detected',
    title: 'Frequently detected logic patterns',
    caption: 'Named in the Thought Debugger, always as a question you answered.',
    rows: [
      {
        id: 'logic-mindreading',
        label: 'Mind reading',
        count: 6,
        observation:
          'Six situations contained a statement about what another person was thinking. Five were left unconfirmed rather than sent.',
        situationIds: ['sit-standup-silence', 'sit-im-fine', 'sit-code-review', 'sit-perf-review', 'sit-family-call', 'sit-weekend-plans'],
      },
      {
        id: 'logic-absolutes',
        label: 'Always / never framing',
        count: 4,
        observation: 'Absolute wording appeared in four drafts. All four were narrowed to a single example before sending.',
        situationIds: ['sit-dishwasher', 'sit-perf-review', 'sit-roommate-bills', 'sit-family-call'],
      },
      {
        id: 'logic-catastrophe',
        label: 'Worst-case forecast',
        count: 3,
        observation: 'Three situations recorded a predicted outcome with no supporting fact.',
        situationIds: ['sit-deadline-slip', 'sit-perf-review', 'sit-standup-silence'],
      },
      {
        id: 'logic-personalizing',
        label: 'Taking a system problem personally',
        count: 2,
        observation: 'Two situations attributed a process failure to one person.',
        situationIds: ['sit-oncall-page', 'sit-scope-change'],
      },
    ],
  },
  {
    id: 'topics',
    eyebrow: 'topics.unresolved',
    title: 'Recurring unresolved topics',
    caption: 'Subjects that came back after a conversation ended without a decision.',
    rows: [
      {
        id: 'topic-estimates',
        label: 'Estimates and deadlines',
        count: 5,
        observation: 'Appeared in five situations across three months. Two ended with an agreed next check-in.',
        situationIds: ['sit-sprint-status', 'sit-scope-change', 'sit-deadline-slip', 'sit-perf-review', 'sit-standup-silence'],
      },
      {
        id: 'topic-fairness',
        label: 'Division of household work',
        count: 3,
        observation: 'Three situations, none of which ended with a specific agreement.',
        situationIds: ['sit-dishwasher', 'sit-roommate-bills', 'sit-family-call'],
      },
      {
        id: 'topic-availability',
        label: 'Plans and availability',
        count: 3,
        observation: '“I am fine” appeared in three of these and was followed by different behaviour each time.',
        situationIds: ['sit-im-fine', 'sit-weekend-plans', 'sit-group-thread'],
      },
      {
        id: 'topic-credit',
        label: 'Being interrupted or overruled',
        count: 2,
        observation: 'Two situations. Both were raised later, in writing, rather than in the moment.',
        situationIds: ['sit-meeting-interrupt', 'sit-code-review'],
      },
    ],
  },
  {
    id: 'repairs',
    eyebrow: 'repair.strategy',
    title: 'Most-used repair strategies',
    caption: 'What you chose in Patch after a message did not land the way you meant.',
    rows: [
      {
        id: 'repair-short-clarification',
        label: 'Short clarification',
        count: 5,
        observation: 'Chosen in five of eight repairs. Median length: 24 words.',
        situationIds: ['sit-code-review', 'sit-scope-change', 'sit-group-thread', 'sit-oncall-page', 'sit-weekend-plans'],
      },
      {
        id: 'repair-acknowledge',
        label: 'Acknowledge the impact first',
        count: 4,
        observation: 'Four repairs opened with what the other person was dealing with before explaining anything.',
        situationIds: ['sit-dishwasher', 'sit-im-fine', 'sit-perf-review', 'sit-family-call'],
      },
      {
        id: 'repair-apology',
        label: 'Apologize without overexplaining',
        count: 3,
        observation: 'Three repairs. Each was under three sentences.',
        situationIds: ['sit-oncall-page', 'sit-roommate-bills', 'sit-meeting-interrupt'],
      },
      {
        id: 'repair-reopen',
        label: 'Reopen the original topic',
        count: 2,
        observation: 'Used twice, both after a conversation branched away from what it started about.',
        situationIds: ['sit-group-thread', 'sit-dishwasher'],
      },
    ],
  },
  {
    id: 'tools',
    eyebrow: 'tools.practiced',
    title: 'Tools practiced',
    caption: 'Which tools you actually opened, not which ones were recommended.',
    rows: [
      {
        id: 'tool-message-compiler',
        label: 'Message Compiler',
        count: 12,
        observation: 'Opened in twelve of fourteen situations.',
        situationIds: ['sit-sprint-status', 'sit-deadline-slip', 'sit-perf-review', 'sit-roommate-bills'],
      },
      {
        id: 'tool-state-inspector',
        label: 'State Inspector',
        count: 9,
        observation: 'Opened before drafting in nine situations.',
        situationIds: ['sit-scope-change', 'sit-meeting-interrupt', 'sit-weekend-plans'],
      },
      {
        id: 'tool-unit-tests',
        label: 'Unit Tests',
        count: 8,
        observation: 'Run on eight drafts. Six of those drafts were edited afterwards.',
        situationIds: ['sit-deadline-slip', 'sit-perf-review', 'sit-sprint-status'],
      },
      {
        id: 'tool-thought-debugger',
        label: 'Thought Debugger',
        count: 7,
        observation: 'Used in seven situations, most often when an assumption was about someone’s motive.',
        situationIds: ['sit-standup-silence', 'sit-im-fine', 'sit-code-review'],
      },
      {
        id: 'tool-patch',
        label: 'Patch',
        count: 5,
        observation: 'Used after sending in five situations.',
        situationIds: ['sit-oncall-page', 'sit-group-thread', 'sit-code-review'],
      },
      {
        id: 'tool-breakpoint',
        label: 'Breakpoint',
        count: 4,
        observation: 'Four pauses taken before replying.',
        situationIds: ['sit-dishwasher', 'sit-standup-silence', 'sit-family-call'],
      },
    ],
  },
];

/**
 * Messages improved before sending — drafts that were edited after a tool run, by week.
 * Counted, not scored: the number is "how many drafts changed", nothing about their quality.
 */
export const MESSAGES_IMPROVED: {
  total: number;
  sent: number;
  series: readonly TrendPoint[];
  observation: string;
} = {
  total: 23,
  sent: 31,
  series: [
    { label: 'W1', value: 1 },
    { label: 'W2', value: 2 },
    { label: 'W3', value: 2 },
    { label: 'W4', value: 4 },
    { label: 'W5', value: 3 },
    { label: 'W6', value: 5 },
    { label: 'W7', value: 3 },
    { label: 'W8', value: 3 },
  ],
  observation:
    '23 of 31 drafts were edited after a tool run before they were sent. The most common edit was removing a sentence.',
};
