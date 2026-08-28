import type { SafetyCategory } from '@/types/contracts';

/**
 * Inspect is a guided self-reflection flow: one question on screen, clickable answers, and a
 * next question that genuinely depends on the last one. All of the logic lives here as data so
 * the flow component stays a renderer.
 *
 * Three commitments shaped the content:
 *
 * 1. It separates **what happened** (what a camera would have caught) from **what you concluded**
 *    (your read of it) from **what you felt**. Most branches walk that order deliberately, and the
 *    interpretation question says out loud that it is asking for a conclusion, not a fact.
 * 2. Every inference is tentative — "it sounds like", "that often points to". Nothing here names a
 *    disorder, diagnoses anything, or claims to know what the other person thinks or intends.
 * 3. Fear, coercion and self-harm are a real branch, not a footnote. Answers that point that way
 *    leave the coaching graph entirely and land on a short, calm support outcome with no sentence
 *    to say and nothing clever in it.
 */

export type NodeId = string;

/** The result the flow hands back when a path finishes. */
export type InspectOutcome = {
  /** Short plain-English summary of what seems to be going on. */
  summary: string;
  /** What the user said they feel, in their own words where given. */
  feelings: string[];
  /** The need or want underneath it, phrased tentatively. */
  underlying: string;
  /** A sentence the user could actually say to the other person. Empty when not that kind of problem. */
  sentenceToSay?: string;
};

export type AnswerOption = {
  id: string;
  /** Shown on the button. Written as a whole thought so it needs no supporting line. */
  label: string;
  /** Feeling words this answer puts on the table. The user can reject any of them later. */
  feelings?: readonly string[];
  next: NodeId;
};

export type FreeTextOption = {
  label: string;
  prompt: string;
  placeholder: string;
  next: NodeId;
  /** When true, what the user types is recorded as a feeling in their own words. */
  capturesFeeling?: boolean;
};

export type QuestionNode = {
  kind: 'question';
  id: NodeId;
  /** `{them}` is replaced with whatever the user calls the other person. */
  question: string;
  helper?: string;
  /** `care` questions are the tender ones: no flourish, no wry asides. */
  tone?: 'default' | 'care';
  answers: readonly AnswerOption[];
  /** Typing is always optional but always available. */
  freeText: FreeTextOption;
};

export type OutcomeNode = {
  kind: 'outcome';
  id: NodeId;
  /** `support` outcomes never carry a sentence to say and never carry a joke. */
  variant: 'reflection' | 'support';
  headline: string;
  summary: string;
  underlying: string;
  sentenceToSay?: string;
  /** Support outcomes only: where an actual person can help. */
  supportNote?: string;
  /** Support outcomes only: drives the shared SafetyNotice. */
  safetyCategory?: SafetyCategory;
};

export type InspectNode = QuestionNode | OutcomeNode;

export const ROOT_NODE_ID: NodeId = 'start';

/** Every question offers the same escape hatch, so it is built rather than retyped. */
function own(next: NodeId, extra?: Partial<FreeTextOption>): FreeTextOption {
  return {
    label: 'Something else — let me put it my own way',
    prompt: 'In your own words',
    placeholder: 'However it comes out is fine. Nothing here is graded.',
    next,
    ...extra,
  };
}

const QUESTIONS: readonly QuestionNode[] = [
  // ── Opening ──────────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'start',
    question: 'Before anything else — what is loudest right now?',
    helper: 'Pick the closest one. You are not committing to it.',
    answers: [
      { id: 'angry', label: 'Angry, or something near it', feelings: ['angry'], next: 'angry_about' },
      {
        id: 'hurt',
        label: 'Hurt — like I do not matter much right now',
        feelings: ['hurt'],
        next: 'hurt_shape',
      },
      {
        id: 'worn',
        label: 'Worn out. There is too much of everything.',
        feelings: ['worn out'],
        next: 'overload_shape',
      },
      {
        id: 'guilt',
        label: 'Uneasy about something I did',
        feelings: ['uneasy'],
        next: 'guilt_shape',
      },
      { id: 'unsure', label: 'Honestly, I cannot tell', next: 'unsure_shape' },
    ],
    freeText: own('own_words_shape', {
      prompt: 'What is it like right now?',
      capturesFeeling: true,
    }),
  },

  // ── Typed opening ────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'own_words_shape',
    question: 'Thank you. Which of these is nearest to what that is about?',
    answers: [
      { id: 'unheard', label: 'Someone not hearing me', feelings: ['unheard'], next: 'dismissed_event' },
      { id: 'unfair', label: 'Something that is not fair', feelings: ['resentful'], next: 'unfair_said' },
      { id: 'load', label: 'Too much landing on me', feelings: ['stretched thin'], next: 'overload_where' },
      { id: 'mine', label: 'Something I did', feelings: ['regretful'], next: 'guilt_event' },
      { id: 'nope', label: 'I still cannot say', next: 'unsure_body' },
    ],
    freeText: own('unsure_body'),
  },

  // ── Anger ────────────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'angry_about',
    question: 'When the anger settles for a second, what is it pointed at?',
    answers: [
      { id: 'moment', label: 'Something {them} did or said', next: 'angry_event' },
      {
        id: 'pattern',
        label: 'Something unfair that keeps happening',
        feelings: ['worn down'],
        next: 'angry_pattern',
      },
      { id: 'self', label: 'Myself, mostly', feelings: ['angry at myself'], next: 'guilt_shape' },
      { id: 'unknown', label: 'I cannot tell yet', next: 'angry_event' },
    ],
    freeText: own('angry_event'),
  },
  {
    kind: 'question',
    id: 'angry_event',
    question: 'Picture the moment. What actually happened — only the part someone else would have seen or heard?',
    helper: 'Just the observable bit for now. What it meant comes next.',
    answers: [
      { id: 'said', label: 'They said something that landed hard', next: 'angry_meaning' },
      { id: 'undone', label: 'They did not do something they said they would', next: 'angry_meaning' },
      { id: 'left', label: 'They went quiet, or walked away', next: 'angry_meaning' },
      { id: 'stack', label: 'It built up over several small things', next: 'angry_meaning' },
    ],
    freeText: own('angry_meaning', { prompt: 'What happened' }),
  },
  {
    kind: 'question',
    id: 'angry_meaning',
    question: 'And what did you take that to mean?',
    helper:
      'Worth noticing: this part is a conclusion you drew, not something a camera caught. Both are real. They are not the same thing.',
    answers: [
      { id: 'matter', label: 'That I do not matter much to them', next: 'angry_want' },
      { id: 'respect', label: 'That they do not respect me', next: 'angry_want' },
      { id: 'always', label: 'That it will always be like this', next: 'angry_want' },
      { id: 'knew', label: 'That they knew it would hurt and did it anyway', next: 'angry_want' },
    ],
    freeText: own('angry_want', { prompt: 'What you took it to mean' }),
  },
  {
    kind: 'question',
    id: 'angry_want',
    question: 'If {them} could do one thing right now, what would actually help?',
    answers: [
      { id: 'listen', label: 'Hear me out without defending themselves', next: 'out_angry_heard' },
      { id: 'ack', label: 'Say they get why it landed badly', next: 'out_angry_repair' },
      { id: 'change', label: 'Do it differently next time', next: 'out_angry_change' },
      { id: 'none', label: 'Nothing yet — I needed to name it', next: 'out_angry_settle' },
    ],
    freeText: own('out_angry_heard', { prompt: 'What would help' }),
  },

  // ── Unfairness / recurring pattern ───────────────────────────────────────────
  {
    kind: 'question',
    id: 'angry_pattern',
    question: 'What is the unfair part, when you put it plainly?',
    answers: [
      { id: 'more', label: 'I put in more than they do', next: 'unfair_said' },
      { id: 'again', label: 'The same thing happens after I have asked for it not to', next: 'unfair_said' },
      { id: 'lesser', label: 'My side gets treated as the less important one', next: 'unfair_said' },
      { id: 'scared', label: 'I am scared to bring it up at all', feelings: ['afraid'], next: 'safety_check' },
    ],
    freeText: own('unfair_said'),
  },
  {
    kind: 'question',
    id: 'unfair_said',
    question: 'Have you said any of this out loud to {them}?',
    answers: [
      { id: 'no', label: 'No — I have not found the words', next: 'unfair_want' },
      { id: 'sideways', label: 'Sort of, sideways, never directly', next: 'unfair_want' },
      { id: 'nochange', label: 'Yes, and nothing changed', feelings: ['discouraged'], next: 'unfair_want' },
      { id: 'badly', label: 'Yes, and it went badly', feelings: ['discouraged'], next: 'unfair_want' },
    ],
    freeText: own('unfair_want'),
  },
  {
    kind: 'question',
    id: 'unfair_want',
    question: 'What would better look like, even a little?',
    answers: [
      { id: 'split', label: 'An even split, noticed without me having to ask', next: 'out_unfair_ask' },
      { id: 'talk', label: 'One honest conversation where I am not talked over', next: 'out_unfair_heard' },
      { id: 'sorry', label: 'An apology for the pattern, not just the last time', next: 'out_unfair_repair' },
      { id: 'dunno', label: 'I do not know yet', next: 'out_unfair_open' },
    ],
    freeText: own('out_unfair_ask'),
  },

  // ── Hurt ─────────────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'hurt_shape',
    question: 'What kind of hurt is it closest to?',
    answers: [
      { id: 'unheard', label: 'I said something and it went nowhere', feelings: ['unheard'], next: 'dismissed_event' },
      { id: 'criticised', label: 'I got picked apart', feelings: ['criticised'], next: 'criticised_event' },
      { id: 'left', label: 'I was left out, or forgotten', feelings: ['overlooked'], next: 'dismissed_event' },
      {
        id: 'scared',
        label: 'I am nervous about how they would react if I said any of this',
        feelings: ['on edge'],
        next: 'safety_check',
      },
    ],
    freeText: own('dismissed_event'),
  },
  {
    kind: 'question',
    id: 'dismissed_event',
    question: 'What did the moment actually look like — only the observable part?',
    helper: 'Not what it meant yet. Just what took place.',
    answers: [
      { id: 'subject', label: 'I said something and they changed the subject', next: 'dismissed_meaning' },
      { id: 'screen', label: 'They looked at a screen while I was talking', next: 'dismissed_meaning' },
      { id: 'sidestep', label: 'They answered, but not about what I had said', next: 'dismissed_meaning' },
      { id: 'many', label: 'It has happened enough times that no one moment stands out', next: 'dismissed_meaning' },
    ],
    freeText: own('dismissed_meaning', { prompt: 'What happened' }),
  },
  {
    kind: 'question',
    id: 'dismissed_meaning',
    question: 'What did you take it to mean?',
    helper:
      'This is your read of it rather than something you could point at. Naming it as a read is not the same as saying it is wrong.',
    answers: [
      { id: 'worthless', label: 'That what I said was not worth their attention', next: 'dismissed_need' },
      { id: 'skippable', label: 'That I am easy to skip past', next: 'dismissed_need' },
      { id: 'burden', label: 'That they would rather not deal with me', next: 'dismissed_need' },
      { id: 'unsure', label: 'I am not sure — it just stung', next: 'dismissed_need' },
    ],
    freeText: own('dismissed_need', { prompt: 'What you took it to mean' }),
  },
  {
    kind: 'question',
    id: 'dismissed_need',
    question: 'Underneath it, what were you hoping for?',
    answers: [
      { id: 'listen', label: 'To be listened to properly, once', next: 'out_dismissed_heard' },
      { id: 'matter', label: 'To matter to them as much as they matter to me', next: 'out_dismissed_matter' },
      { id: 'serious', label: 'To be taken seriously, not managed', next: 'out_dismissed_serious' },
      { id: 'unasked', label: 'To not have had to ask for it', next: 'out_dismissed_ask' },
    ],
    freeText: own('out_dismissed_heard', { prompt: 'What you were hoping for' }),
  },

  // ── Criticism ────────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'criticised_event',
    question: 'What did they actually say or do — as near to the words as you remember?',
    answers: [
      { id: 'wrong', label: 'They pointed out something I got wrong', next: 'criticised_meaning' },
      { id: 'compare', label: 'They compared me to someone else', next: 'criticised_meaning' },
      { id: 'always', label: 'They used always or never', next: 'criticised_meaning' },
      { id: 'tone', label: 'It was the tone more than the words', next: 'criticised_meaning' },
    ],
    freeText: own('criticised_meaning', { prompt: 'What was said' }),
  },
  {
    kind: 'question',
    id: 'criticised_meaning',
    question: 'Sitting with it — is any part of it something you would agree with?',
    helper: 'You can hold both. Something can be partly true and still land badly.',
    answers: [
      { id: 'partly', label: 'A bit of it is fair, but not the way it was said', next: 'criticised_need' },
      { id: 'no', label: 'No — it was not accurate', next: 'criticised_need' },
      { id: 'yes', label: 'It is fair, and that is why it stings', feelings: ['exposed'], next: 'criticised_need' },
      { id: 'later', label: 'I cannot tell while I am still smarting', next: 'criticised_need' },
    ],
    freeText: own('criticised_need'),
  },
  {
    kind: 'question',
    id: 'criticised_need',
    question: 'What would you want {them} to understand?',
    answers: [
      { id: 'trying', label: 'That I am already trying', next: 'out_criticised_effort' },
      { id: 'delivery', label: 'That how it is said matters as much as what is said', next: 'out_criticised_delivery' },
      { id: 'whole', label: 'That one mistake is not the whole of me', next: 'out_criticised_whole' },
      { id: 'self', label: 'Nothing yet — I want to sort out my own head first', next: 'out_criticised_self' },
    ],
    freeText: own('out_criticised_delivery'),
  },

  // ── Overload ─────────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'overload_shape',
    question: 'What is taking the most out of you?',
    answers: [
      { id: 'volume', label: 'The sheer amount of it — no gaps anywhere', next: 'overload_where' },
      { id: 'holding', label: 'Holding it all in my head so nothing gets dropped', next: 'overload_where' },
      { id: 'default', label: 'Being the one everyone comes to', next: 'overload_where' },
      {
        id: 'flat',
        label: 'I have stopped feeling much of anything',
        feelings: ['flat'],
        next: 'overload_flat',
      },
    ],
    freeText: own('overload_where'),
  },
  {
    kind: 'question',
    id: 'overload_where',
    question: 'Does {them} know how full it is?',
    answers: [
      { id: 'quiet', label: 'No — I have mostly kept it to myself', next: 'overload_why_quiet' },
      { id: 'some', label: 'They know some of it', next: 'overload_ask' },
      { id: 'said', label: 'I have said it, and it did not land', feelings: ['unheard'], next: 'overload_ask' },
      { id: 'source', label: 'They are part of why it is full', next: 'overload_ask' },
    ],
    freeText: own('overload_ask'),
  },
  {
    kind: 'question',
    id: 'overload_why_quiet',
    question: 'What has kept you from saying it?',
    answers: [
      { id: 'complain', label: 'It feels like complaining', next: 'overload_ask' },
      { id: 'faster', label: 'It is quicker to just do it myself', next: 'overload_ask' },
      { id: 'pointless', label: 'I do not think it would change anything', next: 'overload_ask' },
      { id: 'theirs', label: 'I do not want to add to their load', next: 'overload_ask' },
    ],
    freeText: own('overload_ask'),
  },
  {
    kind: 'question',
    id: 'overload_ask',
    question: 'If one thing came off your plate this week, what would you pick?',
    answers: [
      { id: 'task', label: 'One specific job, handed over properly', next: 'out_overload_one' },
      { id: 'evening', label: 'An evening where nothing is mine to sort out', next: 'out_overload_rest' },
      { id: 'seen', label: 'Someone noticing without me having to list it', next: 'out_overload_seen' },
      { id: 'dunno', label: 'I genuinely do not know — that is part of it', next: 'out_overload_unknown' },
    ],
    freeText: own('out_overload_one'),
  },
  {
    kind: 'question',
    id: 'overload_flat',
    tone: 'care',
    question: 'That flat feeling — how long has it been like this?',
    answers: [
      { id: 'days', label: 'A few days', next: 'overload_ask' },
      { id: 'weeks', label: 'Weeks, on and off', next: 'overload_ask' },
      { id: 'long', label: 'Long enough that I cannot remember otherwise', next: 'flat_check' },
    ],
    freeText: own('overload_ask'),
  },
  {
    kind: 'question',
    id: 'flat_check',
    tone: 'care',
    question: 'Thank you for saying that. One careful question, and you can skip it.',
    helper: 'Whatever you pick, nothing here gets shared with anyone.',
    answers: [
      { id: 'tired', label: 'I am tired and low, but I am not in danger', next: 'overload_ask' },
      { id: 'harm', label: 'I have been having thoughts of hurting myself', next: 'out_support_selfharm' },
      { id: 'skip', label: 'I would rather not answer that', next: 'overload_ask' },
    ],
    freeText: own('overload_ask', { label: 'I would rather write something instead' }),
  },

  // ── Guilt ────────────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'guilt_shape',
    question: 'What is the uneasy feeling about?',
    answers: [
      { id: 'said', label: 'Something I said that I would take back', next: 'guilt_event' },
      { id: 'undone', label: 'Something I did not do that I should have', next: 'guilt_event' },
      { id: 'size', label: 'How I reacted — the size of it', next: 'guilt_event' },
      { id: 'held', label: 'Something I have been keeping to myself', next: 'guilt_event' },
    ],
    freeText: own('guilt_event'),
  },
  {
    kind: 'question',
    id: 'guilt_event',
    question: 'Has {them} said anything about it?',
    answers: [
      { id: 'unnoticed', label: 'No, and I do not know whether they noticed', next: 'guilt_weight' },
      { id: 'open', label: 'Yes, and we have not sorted it out', next: 'guilt_weight' },
      { id: 'movedon', label: 'We moved on without talking about it', next: 'guilt_weight' },
      { id: 'fine', label: 'They said it is fine, but I do not feel fine', next: 'guilt_weight' },
    ],
    freeText: own('guilt_weight'),
  },
  {
    kind: 'question',
    id: 'guilt_weight',
    question: 'Which is closer: I did something I regret, or I am someone bad?',
    helper: 'They feel similar from the inside. They point in very different directions.',
    answers: [
      { id: 'did', label: 'I did something I regret', next: 'guilt_want' },
      { id: 'am', label: 'It tips into feeling like I am the problem', feelings: ['ashamed'], next: 'guilt_want' },
      { id: 'both', label: 'Both, depending on the hour', feelings: ['ashamed'], next: 'guilt_want' },
      { id: 'unsure', label: 'I am not sure', next: 'guilt_want' },
    ],
    freeText: own('guilt_want'),
  },
  {
    kind: 'question',
    id: 'guilt_want',
    question: 'What would help most?',
    answers: [
      { id: 'sorry', label: 'Saying sorry properly, with no excuses attached', next: 'out_guilt_apology' },
      { id: 'explain', label: 'Explaining what was going on for me', next: 'out_guilt_explain' },
      { id: 'change', label: 'Doing something different next time, and saying so', next: 'out_guilt_change' },
      { id: 'self', label: 'Being less brutal with myself about it', next: 'out_guilt_self' },
    ],
    freeText: own('out_guilt_apology'),
  },

  // ── Cannot name it ───────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'unsure_shape',
    question: 'That is a normal place to start. When did it begin feeling like this?',
    helper: 'Feelings rarely arrive labelled.',
    answers: [
      { id: 'event', label: 'After something specific happened', next: 'unsure_event' },
      { id: 'building', label: 'It has been building for a while', next: 'unsure_body' },
      { id: 'woke', label: 'I woke up with it', next: 'unsure_body' },
      { id: 'noidea', label: 'No idea', next: 'unsure_body' },
    ],
    freeText: own('unsure_body'),
  },
  {
    kind: 'question',
    id: 'unsure_event',
    question: 'What was the thing that happened — only the observable part?',
    answers: [
      { id: 'said', label: 'Something was said', next: 'unsure_pull' },
      { id: 'missing', label: 'Something did not happen that I expected', next: 'unsure_pull' },
      { id: 'other', label: 'Someone else was involved, not only {them}', next: 'unsure_pull' },
      { id: 'small', label: 'It seems too small to explain this much feeling', next: 'unsure_pull' },
    ],
    freeText: own('unsure_pull', { prompt: 'What happened' }),
  },
  {
    kind: 'question',
    id: 'unsure_body',
    question: 'Where do you notice it, if anywhere?',
    answers: [
      { id: 'tight', label: 'Tight chest, or my jaw', next: 'unsure_pull' },
      { id: 'heavy', label: 'Heavy and slow', next: 'unsure_pull' },
      { id: 'restless', label: 'Restless — I cannot settle', next: 'unsure_pull' },
      { id: 'nowhere', label: 'I do not notice it in my body', next: 'unsure_pull' },
    ],
    freeText: own('unsure_pull'),
  },
  {
    kind: 'question',
    id: 'unsure_pull',
    question: 'If you had to guess — and a guess is completely fine — which is nearest?',
    answers: [
      { id: 'anger', label: 'Something like anger', feelings: ['angry'], next: 'angry_want' },
      { id: 'hurt', label: 'Something like hurt', feelings: ['hurt'], next: 'dismissed_need' },
      { id: 'worry', label: 'Something like worry about what is coming', feelings: ['anxious'], next: 'unsure_worry' },
      { id: 'sad', label: 'Something like sadness', feelings: ['sad'], next: 'unsure_worry' },
    ],
    freeText: own('unsure_worry', { prompt: 'Your best guess', capturesFeeling: true }),
  },
  {
    kind: 'question',
    id: 'unsure_worry',
    question: 'What would make the next hour a little easier?',
    answers: [
      { id: 'name', label: 'Saying it out loud to someone', next: 'out_unsure_name' },
      { id: 'space', label: 'Not having to explain myself yet', next: 'out_unsure_space' },
      { id: 'why', label: 'Understanding why it is hitting this hard', next: 'out_unsure_why' },
      { id: 'do', label: 'Something small and ordinary to do', next: 'out_unsure_do' },
    ],
    freeText: own('out_unsure_name'),
  },

  // ── Safety fork ──────────────────────────────────────────────────────────────
  {
    kind: 'question',
    id: 'safety_check',
    tone: 'care',
    question: 'Thank you for saying that. One more question, and there is no wrong answer.',
    helper: 'Take the last option if you would rather not go into it.',
    answers: [
      {
        id: 'frightened',
        label: 'I am frightened of {them}, or of what they might do',
        feelings: ['frightened'],
        next: 'out_support_safety',
      },
      {
        id: 'controlled',
        label: 'They pressure or control me in ways that scare me',
        feelings: ['frightened'],
        next: 'out_support_safety',
      },
      {
        id: 'dread',
        label: 'Not that — talks just go badly and I dread them',
        feelings: ['apprehensive'],
        next: 'dread_shape',
      },
      { id: 'skip', label: 'I would rather not say', next: 'out_support_safety' },
    ],
    freeText: own('out_support_safety', { label: 'I would rather write something instead' }),
  },
  {
    kind: 'question',
    id: 'dread_shape',
    question: 'What usually happens when you try to talk about it?',
    answers: [
      { id: 'row', label: 'It turns into a row', next: 'dread_want' },
      { id: 'shutdown', label: 'They shut down and I am left holding it', next: 'dread_want' },
      { id: 'backoff', label: 'I back off before it even starts', next: 'dread_want' },
      { id: 'variable', label: 'It goes fine sometimes — I just cannot predict which', next: 'dread_want' },
    ],
    freeText: own('dread_want'),
  },
  {
    kind: 'question',
    id: 'dread_want',
    question: 'What would you want to be different about the next attempt?',
    answers: [
      { id: 'start', label: 'Starting without either of us already on the back foot', next: 'out_dread_start' },
      { id: 'pause', label: 'Being able to stop it before it escalates', next: 'out_dread_pause' },
      { id: 'clarity', label: 'Knowing what I actually want to ask for', next: 'out_dread_clarity' },
      { id: 'support', label: 'Not having to do it on my own', next: 'out_dread_support' },
    ],
    freeText: own('out_dread_clarity'),
  },
];

const OUTCOMES: readonly OutcomeNode[] = [
  // ── Anger ────────────────────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_angry_heard',
    variant: 'reflection',
    headline: 'Anger sitting on top of something quieter',
    summary:
      'Something specific happened, you drew a meaning from it, and the anger followed the meaning rather than the event. Anger that arrives that way is usually guarding something more tender.',
    underlying:
      'It sounds like this may be less about settling who was right and more about wanting to be heard all the way through before anyone responds.',
    sentenceToSay:
      'I am still angry about what happened, and I do not want it to turn into a fight. Can I tell you the whole thing before you answer?',
  },
  {
    kind: 'outcome',
    id: 'out_angry_repair',
    variant: 'reflection',
    headline: 'An acknowledgement that never arrived',
    summary:
      'You could name what happened and what you took it to mean. The anger seems to be sitting exactly where an acknowledgement was supposed to go.',
    underlying:
      'That often points to wanting the impact recognised, rather than a verdict on who was right.',
    sentenceToSay:
      'I am not saying you meant it that way. It still landed hard, and I would rather you knew that than have me go quiet about it.',
  },
  {
    kind: 'outcome',
    id: 'out_angry_change',
    variant: 'reflection',
    headline: 'Less about the last time than the next time',
    summary:
      'This reads less like one bad moment and more like wanting the next one to go differently. Those need different conversations.',
    underlying:
      'It sounds like what you want underneath is something you can rely on going forward, more than an apology for what already happened.',
    sentenceToSay:
      'I do not need to go back over what happened. I would rather we agree on what we do differently next time.',
  },
  {
    kind: 'outcome',
    id: 'out_angry_settle',
    variant: 'reflection',
    headline: 'Named, which is most of the work',
    summary:
      'You separated what happened from what you concluded from what you felt. That gap is where most of the heat lives, and you just looked straight at it.',
    underlying:
      'It sounds like what you needed right now was for it to be named rather than fixed. That is a legitimate stopping point.',
  },

  // ── Unfairness ───────────────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_unfair_ask',
    variant: 'reflection',
    headline: 'A split that stopped being even',
    summary:
      'This is not one incident. It is an arrangement that drifted, and you have been absorbing the difference quietly.',
    underlying:
      'That often points to wanting the load shared, and wanting it shared without you having to run the process of asking every time.',
    sentenceToSay:
      'I have been carrying more of this than feels fair, and I have been quiet about it for a while. Can we look at how it is actually split?',
  },
  {
    kind: 'outcome',
    id: 'out_unfair_heard',
    variant: 'reflection',
    headline: 'Something said sideways for a long time',
    summary:
      'You have been raising this in ways that were easy to miss, which means it has never really had a hearing.',
    underlying:
      'It sounds like the first thing you want is not agreement but an uninterrupted run at saying it.',
    sentenceToSay:
      'There is something I have been sitting on for a while. Can we find twenty minutes where I say all of it first and you just listen?',
  },
  {
    kind: 'outcome',
    id: 'out_unfair_repair',
    variant: 'reflection',
    headline: 'The pattern, not the last instance',
    summary:
      'Every apology so far has been for a single occasion, and the thing that hurts is the run of them.',
    underlying:
      'That often points to wanting the pattern acknowledged, because an apology for one instance quietly implies the rest were fine.',
    sentenceToSay:
      'I do not think this is about last time specifically. It is the pattern, and that is what I would like us to talk about.',
  },
  {
    kind: 'outcome',
    id: 'out_unfair_open',
    variant: 'reflection',
    headline: 'Clear on the problem, not yet on the ask',
    summary:
      'You can describe what is unfair precisely. What better would look like is still blank, and that is a normal place to be.',
    underlying:
      'It sounds like the useful next step is working out your own ask before opening the conversation, rather than going in and hoping it forms.',
  },

  // ── Dismissed ────────────────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_dismissed_heard',
    variant: 'reflection',
    headline: 'Something said that never landed',
    summary:
      'What you can point at is small — a subject changed, a look elsewhere. What you took from it was much bigger, and that is the part doing the damage.',
    underlying:
      'That often points to wanting proof of attention, not agreement. Being heard and being agreed with are different needs.',
    sentenceToSay:
      'When I brought that up and the conversation moved on, it felt like it had not landed. Can we come back to it?',
  },
  {
    kind: 'outcome',
    id: 'out_dismissed_matter',
    variant: 'reflection',
    headline: 'A quiet sum being kept',
    summary:
      'This is less about one moment than about a running total you have been keeping without meaning to.',
    underlying:
      'It sounds like the tender part is wanting to be as important to them as they are to you — which is worth saying out loud rather than measuring privately.',
    sentenceToSay:
      'I am not saying you meant it this way. Lately I have felt easy to skip past, and I would rather tell you than keep score about it.',
  },
  {
    kind: 'outcome',
    id: 'out_dismissed_serious',
    variant: 'reflection',
    headline: 'Smoothed over rather than taken on',
    summary:
      'The pattern you described is things getting tidied away rather than answered — and the effect is that you have stopped raising them.',
    underlying:
      'That often points to wanting to be treated as someone to reckon with rather than someone to settle down.',
    sentenceToSay:
      'When I raise something and it gets smoothed over, I stop bringing things up. I would honestly rather you disagreed with me than tidied it away.',
  },
  {
    kind: 'outcome',
    id: 'out_dismissed_ask',
    variant: 'reflection',
    headline: 'The cost of having to ask',
    summary:
      'There are two hurts stacked here: the thing itself, and the fact that getting it means asking for it, which makes it feel less freely given.',
    underlying:
      'It sounds like what you want is to be thought of unprompted. Saying that plainly is not the same as spoiling it — they cannot offer what they do not know is wanted.',
    sentenceToSay:
      'I know I could just ask. Part of what is hard is that asking makes it feel less like something you wanted to give.',
  },

  // ── Criticism ────────────────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_criticised_effort',
    variant: 'reflection',
    headline: 'Effort that went unseen',
    summary:
      'The comment may have been about one thing, but it arrived on top of a lot of effort that has not been mentioned.',
    underlying:
      'That often points to wanting the trying acknowledged before the shortfall is — not instead of it.',
    sentenceToSay:
      'I can hear that this matters to you. What is hard is that I am already trying, and it did not sound like that was in the room.',
  },
  {
    kind: 'outcome',
    id: 'out_criticised_delivery',
    variant: 'reflection',
    headline: 'The content and the delivery came as one thing',
    summary:
      'You separated what was said from how it was said. Once those come apart, one of them is usually much easier to take than the other.',
    underlying:
      'It sounds like you are not asking to be spared the point, only to be able to hear it.',
    sentenceToSay:
      'I can take the point. I cannot take it in when it arrives like that. Could you say it to me straight, without the edge?',
  },
  {
    kind: 'outcome',
    id: 'out_criticised_whole',
    variant: 'reflection',
    headline: 'One thing that got generalised into everything',
    summary:
      'A specific complaint got stated as a permanent one, and the size of your reaction matches the size it was given.',
    underlying:
      'That often points to wanting the fault kept to its actual size rather than treated as a description of who you are.',
    sentenceToSay:
      'I got that one wrong, and I will own it. When it is put as always, it stops being about the thing and starts being about me.',
  },
  {
    kind: 'outcome',
    id: 'out_criticised_self',
    variant: 'reflection',
    headline: 'Your own head first',
    summary:
      'You have separated the accurate part of the criticism from the way it landed, and you would rather finish that sorting before anyone else joins in.',
    underlying:
      'It sounds like what you need first is your own read on it, so that when you do talk you are not arguing from the sore spot.',
  },

  // ── Overload ─────────────────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_overload_one',
    variant: 'reflection',
    headline: 'At capacity, and hiding it well',
    summary:
      'The load is not only the doing — it is the holding, the remembering, and the being reliable about it.',
    underlying:
      'That often points to wanting something handed over completely, rather than delegated back with you still supervising it.',
    sentenceToSay:
      'I am at capacity and I think I have been hiding it well. Could you take one thing off me this week — owning it, not just doing it when I ask?',
  },
  {
    kind: 'outcome',
    id: 'out_overload_rest',
    variant: 'reflection',
    headline: 'No gaps anywhere',
    summary:
      'What you described is not one task too many. It is that there is no point in the week where nothing is yours.',
    underlying:
      'It sounds like the need underneath is a genuine off-duty stretch, which is easier to ask for as a specific evening than as a general concept.',
    sentenceToSay:
      'I need one evening where nothing is mine to sort out. Can we pick which one, so it actually happens?',
  },
  {
    kind: 'outcome',
    id: 'out_overload_seen',
    variant: 'reflection',
    headline: 'The invisible half of the work',
    summary:
      'The part that is wearing you down is the part nobody sees: keeping track of everything so that none of it falls over.',
    underlying:
      'That often points to wanting the invisible work named, which is a different request from wanting help with the tasks.',
    sentenceToSay:
      'It is not the jobs so much as being the one who has to remember them all. I would like that part to be seen.',
  },
  {
    kind: 'outcome',
    id: 'out_overload_unknown',
    variant: 'reflection',
    headline: 'Too full to know what to put down',
    summary:
      'Not being able to name which thing to drop is itself a signal about how full it is, rather than a failure to answer the question.',
    underlying:
      'It sounds like the first useful step may be getting the list out of your head and onto something visible, before deciding anything about it.',
  },

  // ── Guilt ────────────────────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_guilt_apology',
    variant: 'reflection',
    headline: 'A repair still waiting to be made',
    summary:
      'You know what you did, and it has stayed with you. What has not happened yet is saying it to the person it happened to.',
    underlying:
      'That often points to wanting to put it right rather than be let off — those two get confused, and only one of them settles.',
    sentenceToSay:
      'I have been carrying this since it happened. I am sorry — not sorry you felt that way. Sorry that I did it.',
  },
  {
    kind: 'outcome',
    id: 'out_guilt_explain',
    variant: 'reflection',
    headline: 'Context you have not been able to offer',
    summary:
      'There is something you want understood about where you were at, and you are wary that saying it will sound like an excuse.',
    underlying:
      'It sounds like the want underneath is to be known, not to be excused. Saying which one you mean tends to keep them apart.',
    sentenceToSay:
      'I want to tell you what was going on for me when that happened. Not as an excuse — I would just rather you knew.',
  },
  {
    kind: 'outcome',
    id: 'out_guilt_change',
    variant: 'reflection',
    headline: 'Past the apology, into the next time',
    summary:
      'You have already done the regret. What is left is the part that is visible from the outside: what happens differently.',
    underlying:
      'That often points to wanting to be trusted again, which tends to be rebuilt by specifics rather than by promises.',
    sentenceToSay:
      'I have thought about it, and here is what I will do differently. I would rather show you than promise you.',
  },
  {
    kind: 'outcome',
    id: 'out_guilt_self',
    variant: 'reflection',
    headline: 'Regret that slid into something heavier',
    summary:
      'This seems to have moved from I did something I regret to I am someone who does that. Those feel alike from the inside and behave completely differently.',
    underlying:
      'It sounds like what would help is holding the first one, which has something to act on in it, and easing off the second, which mostly just presses down.',
  },

  // ── Cannot name it ───────────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_unsure_name',
    variant: 'reflection',
    headline: 'Not sorted out, but sayable',
    summary:
      'You do not have this worked out, and you do not need to before saying it. Half-formed out loud is often clearer than finished in your head.',
    underlying:
      'It sounds like what you want is company with it rather than a solution to it — worth saying, because otherwise people reach for solutions.',
    sentenceToSay:
      'I have not got this worked out yet. Can I say it out loud to you anyway, without you trying to fix it?',
  },
  {
    kind: 'outcome',
    id: 'out_unsure_space',
    variant: 'reflection',
    headline: 'Not ready to be asked about it',
    summary:
      'The feeling is real and the account of it is not ready. Being asked to explain it right now would cost more than it gives.',
    underlying:
      'That often points to needing a bit of room first — which lands much better when it comes with a note than when it looks like withdrawal.',
    sentenceToSay:
      'I am not in a good place to talk this through yet. It is not about you, and I will come back to it.',
  },
  {
    kind: 'outcome',
    id: 'out_unsure_why',
    variant: 'reflection',
    headline: 'A reaction bigger than the moment',
    summary:
      'By your own account the trigger seems small for the size of the response. That mismatch is usually information, not an overreaction.',
    underlying:
      'That often points to the moment having touched something familiar. Worth being curious about what it reminded you of, rather than judging the size of the feeling.',
  },
  {
    kind: 'outcome',
    id: 'out_unsure_do',
    variant: 'reflection',
    headline: 'Something ordinary, first',
    summary:
      'You could not name it and you did not need to. What you did name is that thinking harder about it is not what would help right now.',
    underlying:
      'It sounds like the useful move is something small and physical first, and revisiting the question once the day has moved a bit.',
  },

  // ── Dreaded conversations ────────────────────────────────────────────────────
  {
    kind: 'outcome',
    id: 'out_dread_start',
    variant: 'reflection',
    headline: 'The opening is doing the damage',
    summary:
      'You said it is not that the subject is impossible, it is that by the time it is raised you are both already braced.',
    underlying:
      'That often points to wanting a different start rather than a different topic — how a conversation opens tends to decide most of it.',
    sentenceToSay:
      'Can we try this at a time when neither of us is already wound up? I will start, and I will try not to come in swinging.',
  },
  {
    kind: 'outcome',
    id: 'out_dread_pause',
    variant: 'reflection',
    headline: 'No brakes on the conversation',
    summary:
      'The problem you described is not that it starts, it is that once it starts there is no way to stop it before it goes somewhere neither of you meant.',
    underlying:
      'It sounds like what is missing is an agreed exit — easier to set up in advance than to invent halfway through.',
    sentenceToSay:
      'If this starts going sideways, can we agree that either of us can call a pause and we come back to it the same day?',
  },
  {
    kind: 'outcome',
    id: 'out_dread_clarity',
    variant: 'reflection',
    headline: 'Circling something you have not named',
    summary:
      'There is a specific ask underneath this, and the conversations have been going wide because it has not been said plainly yet.',
    underlying:
      'That often points to needing one clear request. A conversation with a single ask in it is much harder to derail than one without.',
    sentenceToSay:
      'There is one thing I want to ask you for, and I would rather say it plainly than circle around it.',
  },
  {
    kind: 'outcome',
    id: 'out_dread_support',
    variant: 'reflection',
    headline: 'Not one to carry alone',
    summary:
      'You have been trying to do a hard conversation single-handed, repeatedly, and it has been costing you.',
    underlying:
      'It sounds like the honest need here is support — a trusted friend to think it through with beforehand, or a couples counsellor if this keeps recurring. Wanting that is not a failure to cope.',
  },

  // ── Support outcomes: the flow stops coaching here ───────────────────────────
  {
    kind: 'outcome',
    id: 'out_support_safety',
    variant: 'support',
    safetyCategory: 'possible_abuse_or_coercion',
    headline: 'This matters more than the wording',
    summary:
      'Something you said here was about being frightened or pressured. That is not a wording problem, and a better sentence is not the right thing to hand you.',
    underlying:
      'Feeling safe with the person closest to you is not a lot to want, and it is not something to work out alone.',
    supportNote:
      'Please talk to someone who can actually help: a person you trust, or a domestic abuse helpline in your area — in the US that is 1-800-799-7233, in the UK 0808 2000 247. If you are in immediate danger, contact emergency services.',
  },
  {
    kind: 'outcome',
    id: 'out_support_selfharm',
    variant: 'support',
    safetyCategory: 'self_harm_or_immediate_danger',
    headline: 'Please talk to a person about this',
    summary:
      'You mentioned thoughts of hurting yourself. This is not something this app can help with, and offering you a script instead would be the wrong response.',
    underlying:
      'Feeling this way does not make you a burden, and it is not something you have to get through on your own.',
    supportNote:
      'In the US you can call or text 988 for the Suicide and Crisis Lifeline. In the UK and Ireland you can call Samaritans on 116 123. Elsewhere, findahelpline.com lists services by country. If you might act on this soon, please contact emergency services.',
  },
];

const NODES: ReadonlyMap<NodeId, InspectNode> = new Map<NodeId, InspectNode>(
  [...QUESTIONS, ...OUTCOMES].map((node) => [node.id, node]),
);

export function getNode(id: NodeId): InspectNode {
  const node = NODES.get(id);
  if (!node) throw new Error(`Inspect: unknown question id "${id}"`);
  return node;
}

export function isOutcome(node: InspectNode): node is OutcomeNode {
  return node.kind === 'outcome';
}

/** Replaces `{them}` with whatever the user calls the other person. */
export function fillIn(text: string, otherPerson: string): string {
  const name = otherPerson.trim() || 'them';
  return text.replace(/\{them\}/g, name);
}

/**
 * Shortest number of questions still to answer from `id`, counting `id` itself. Used so the
 * progress line can say "of about 5" honestly instead of inventing a fixed length — different
 * paths really are different lengths.
 *
 * Computed by relaxation rather than recursion so a future edit that introduces a loop in the
 * graph degrades to a number instead of a stack overflow.
 */
const remainingByNode = ((): ReadonlyMap<NodeId, number> => {
  const distance = new Map<NodeId, number>();
  for (const outcome of OUTCOMES) distance.set(outcome.id, 0);

  let changed = true;
  while (changed) {
    changed = false;
    for (const question of QUESTIONS) {
      const nexts = [...question.answers.map((a) => a.next), question.freeText.next];
      let best = Number.POSITIVE_INFINITY;
      for (const next of nexts) {
        const known = distance.get(next);
        if (known !== undefined && known + 1 < best) best = known + 1;
      }
      if (best !== Number.POSITIVE_INFINITY && best !== distance.get(question.id)) {
        distance.set(question.id, best);
        changed = true;
      }
    }
  }

  return distance;
})();

export function questionsRemaining(id: NodeId): number {
  return remainingByNode.get(id) ?? 1;
}

/**
 * A deliberately narrow read of free text for disclosures that must not be met with
 * communication coaching. The button paths are the primary route to the support outcomes; this
 * only catches the case where someone types it instead of clicking it.
 *
 * It is kept conservative on purpose: it looks for explicit statements, not for sad-sounding
 * words. Missing something here is recoverable — the flow stays gentle either way — whereas
 * showing a crisis card to someone who wrote "work is killing me" is not.
 */
const SELF_HARM_PATTERNS: readonly RegExp[] = [
  /\bkill(ing)? myself\b/i,
  /\bend(ing)? my life\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(hurt|harm)(ing)? myself\b/i,
  /\bself[-\s]?harm/i,
  /\bdo(n'?t| not) want to (be here|be alive|live)\b/i,
  /\bno reason to (live|go on)\b/i,
];

const FEAR_PATTERNS: readonly RegExp[] = [
  /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|ex)) (hit|hits|hurt|hurts|chokes?|strangles?|shoves?|shoved)\b/i,
  /\b(afraid|scared|frightened|terrified) of (him|her|them|my (partner|husband|wife|boyfriend|girlfriend|ex))\b/i,
  /\b(afraid|scared|frightened|terrified) for my (life|safety)\b/i,
  /\b(threatened|threatens) (me|to hurt)\b/i,
  /\bwon'?t let me (leave|go|see|have)\b/i,
  /\bnot safe (at home|with (him|her|them))\b/i,
];

/**
 * Returns the support node a piece of free text should be routed to, or null to continue the
 * ordinary flow.
 */
export function seriousRouteFor(text: string): NodeId | null {
  if (SELF_HARM_PATTERNS.some((pattern) => pattern.test(text))) return 'out_support_selfharm';
  if (FEAR_PATTERNS.some((pattern) => pattern.test(text))) return 'out_support_safety';
  return null;
}

/** Assembles the shape the flow hands back, with the other person's name filled in. */
export function buildOutcome(
  node: OutcomeNode,
  feelings: readonly string[],
  otherPerson: string,
): InspectOutcome {
  return {
    summary: fillIn(node.summary, otherPerson),
    feelings: [...feelings],
    underlying: fillIn(node.underlying, otherPerson),
    sentenceToSay: node.sentenceToSay ? fillIn(node.sentenceToSay, otherPerson) : undefined,
  };
}
