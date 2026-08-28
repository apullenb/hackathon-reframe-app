import { Camera, Heart, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Fact or Guess — a practice deck for the one distinction the whole product rests on, and then
 * the part that actually changes anything: what else would fit the same evidence.
 *
 * The Inspect flow already separates **what happened** (what a camera would have caught) from
 * **what you concluded** (your read of it) from **what you felt**. Everywhere else in the app the
 * model does that sorting and labels its own confidence. Here the user does it, on someone else's
 * sentences, where being wrong costs nothing — and then gets the second half of a thought record:
 * other explanations the same evidence allows, and one balanced read to leave with.
 *
 * The same three commitments apply as in `questionGraph.ts`:
 *
 * 1. The three categories are the Inspect model, not a new one. Fact = camera. Guess = your read.
 *    Feeling = yours, and never evidence about the other person.
 * 2. Nothing here diagnoses anyone. Where a card carries a label ("passive-aggressive",
 *    "disrespectful"), the explanation declines to endorse it and points at the observable moment
 *    underneath instead. `pattern` names a habit of *thinking*, never a person and never a
 *    condition: "this is mind-reading", not "you are a catastrophiser".
 * 3. A feeling is never marked wrong and never called a distortion. Feeling cards validate first;
 *    their reframe surfaces the need underneath rather than suggesting a different feeling.
 *
 * On the alternatives: at least one on every card is unflattering. A deck where every other
 * explanation is generous would be talking the user out of their own read, and they would rightly
 * stop believing it. The point is plurality, not optimism.
 *
 * All of it is data so the component stays a renderer. No `Math.random()` at module scope — the
 * shuffle is seeded so a demo run is reproducible.
 */

export type CardCategory = 'fact' | 'guess' | 'feeling';
export type CardDifficulty = 'straightforward' | 'tricky';
export type CardSetting = 'work' | 'family';

/** Habits of thinking, from ordinary CBT vocabulary. Named about the thought, never the person. */
export type ThinkingPattern =
  | 'mind-reading'
  | 'catastrophising'
  | 'all-or-nothing'
  | 'personalising'
  | 'fortune-telling'
  | 'emotional-reasoning'
  | 'labelling';

export type FactOrGuessCard = {
  id: string;
  /** One short first-person statement, the kind people actually say to themselves. */
  statement: string;
  category: CardCategory;
  difficulty: CardDifficulty;
  setting: CardSetting;
  /** Why it lands where it lands. One or two sentences, never smug. */
  explanation: string;
  /**
   * The statement rewritten down to what could actually be checked. Present on the cards where
   * the rewrite is the teaching moment; absent where the statement is already checkable or is a
   * feeling that needs no correcting.
   */
  checkableVersion?: string;
  /**
   * Two or three other explanations the same evidence allows — including at least one that is
   * not flattering. On fact cards these are the competing stories a clean fact does *not* settle.
   */
  alternatives: readonly string[];
  /**
   * One sentence that fits all of the evidence, keeps the user's concern without inflating it,
   * and does not depend on the other person's goodwill to be true.
   */
  balancedThought: string;
  /** The one question or check that would turn the guess into a fact. Only where one exists. */
  howToFindOut?: string;
  /** Only where a habit clearly applies. Guess cards carry these; feelings never do. */
  pattern?: ThinkingPattern;
};

export type CategoryMeta = {
  category: CardCategory;
  label: string;
  /** One line, in the app's voice, usable as a legend under the answer buttons. */
  definition: string;
  /** The lucide icon name, kept next to the component so both stay in step. */
  iconName: 'Camera' | 'HelpCircle' | 'Heart';
  icon: LucideIcon;
};

export const CATEGORY_META: Record<CardCategory, CategoryMeta> = {
  fact: {
    category: 'fact',
    label: 'Fact',
    definition: 'A camera or a recorder would have caught it. Someone else could check it.',
    iconName: 'Camera',
    icon: Camera,
  },
  guess: {
    category: 'guess',
    label: 'Guess',
    definition: 'Your read of it — a motive, a conclusion, a prediction. It may well be right.',
    iconName: 'HelpCircle',
    icon: HelpCircle,
  },
  feeling: {
    category: 'feeling',
    label: 'Feeling',
    definition: 'Your own response. Real and yours, and not evidence about anyone else.',
    iconName: 'Heart',
    icon: Heart,
  },
};

export const CATEGORY_ORDER: readonly CardCategory[] = ['fact', 'guess', 'feeling'];

export type PatternMeta = {
  label: string;
  /** Plain English, one line. The tag teaches or it is jargon. */
  gloss: string;
  /** The habit to take away, said as something to do rather than something to stop being. */
  habit: string;
};

export const PATTERN_META: Record<ThinkingPattern, PatternMeta> = {
  'mind-reading': {
    label: 'Mind-reading',
    gloss: 'Deciding what someone thought or meant, when what you have is what they did.',
    habit:
      'When you catch yourself certain about someone’s motive, ask what else would fit what you actually saw.',
  },
  catastrophising: {
    label: 'Catastrophising',
    gloss: 'The worst version arrives fully formed and gets treated as the likely one.',
    habit:
      'When the worst version shows up first, ask what the ordinary, boring version would look like.',
  },
  'all-or-nothing': {
    label: 'All or nothing',
    gloss: 'Never, always, everyone, nobody — a claim about all of time built from a few moments.',
    habit: 'When a sentence has “never” or “always” in it, count the times you can actually name.',
  },
  personalising: {
    label: 'Personalising',
    gloss: 'Reading something as aimed at you when it may not have been about you at all.',
    habit: 'When something lands as aimed at you, check whether it would have happened anyway.',
  },
  'fortune-telling': {
    label: 'Fortune-telling',
    gloss: 'A prediction about what will happen, held as a result that is already in.',
    habit: 'When you already know how it will go, treat that as a forecast and go and find out.',
  },
  'emotional-reasoning': {
    label: 'Emotional reasoning',
    gloss: 'How strongly you feel it becomes the evidence that it is true.',
    habit:
      'When the feeling is strong, keep it — and ask separately what the evidence on its own supports.',
  },
  labelling: {
    label: 'Labelling',
    gloss: 'A set of moments turns into a permanent trait — theirs, or your own.',
    habit: 'When a label turns up, swap it back for the one moment it came from.',
  },
};

/** Used when a run had no pattern to name. Still the habit the whole deck is teaching. */
const GENERAL_HABIT =
  'When you catch yourself certain about what someone meant, ask what else would fit the same evidence.';

/**
 * 24 cards, half work and half home, deliberately mundane. The hard half is the point: a quoted
 * sentence and the same sentence with a motive attached, an absolute ("never"), a prediction, a
 * silence described plainly versus the same silence called being ignored, and the pair that does
 * the most work of all — "he was being disrespectful" against "I felt disrespected".
 */
export const FACT_OR_GUESS_DECK: readonly FactOrGuessCard[] = [
  // ── Work ─────────────────────────────────────────────────────────────────────
  {
    id: 'w-standup-quote',
    statement: 'She said “I’ll handle it” in the 9am standup.',
    category: 'fact',
    difficulty: 'tricky',
    setting: 'work',
    explanation:
      'A recording of that meeting would have those words in it. Quoting someone accurately is a fact, even when what they meant by it is anyone’s guess.',
    alternatives: [
      'She has it under control and simply has not reported back.',
      'She meant it on Tuesday and the week got away from her.',
      'She said it to close the topic and has not started.',
    ],
    balancedThought:
      'I have her words. What I do not have is where the work stands — and I can ask for that without arguing about what she meant.',
    howToFindOut: 'Ask for the state of it: “Where has this landed since standup?”',
  },
  {
    id: 'w-standup-motive',
    statement: 'She said she’d handle it just to end the conversation.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'work',
    explanation:
      'Same words as the card before, plus a reason. The words are on the recording; the reason is in her head, and that part you are supplying.',
    checkableVersion: 'She said she’d handle it, and the conversation ended there.',
    alternatives: [
      'She thought it was a ten-minute job and did not want to spend standup on it.',
      'She meant it, and something more urgent landed that afternoon.',
      'She did want the topic dropped — and still intends to do the work.',
    ],
    balancedThought:
      'She said she would handle it and I still do not know where it stands. That gap is worth one direct question, whatever her reason was.',
    howToFindOut: 'Ask for a state and a date: “Where is it, and when will you know more?”',
    pattern: 'mind-reading',
  },
  {
    id: 'w-manager-commitment',
    statement: 'My manager thinks I’m not committed.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'work',
    explanation:
      'This is a claim about what is happening inside someone else. It might be a good read, but nothing here is checkable — what he thinks is not available to you, only what he said and did.',
    checkableVersion:
      'In our 1:1 my manager asked twice why I left at four, and did not mention it again.',
    alternatives: [
      'He is asking the whole team about hours and you got your turn.',
      'He noticed the early finishes and has drawn no conclusion at all.',
      'He does have a concern about your commitment, and has not said it out loud yet.',
    ],
    balancedThought:
      'I do not know what my manager concludes about me. I know he asked about my hours twice, and I would rather hear his actual read than keep supplying one.',
    howToFindOut:
      'Ask at the next 1:1: “Is there anything about how I’m showing up that you’d want different?”',
    pattern: 'mind-reading',
  },
  {
    id: 'w-interruptions-counted',
    statement: 'I was interrupted three times in yesterday’s retro. I counted.',
    category: 'fact',
    difficulty: 'straightforward',
    setting: 'work',
    explanation:
      'A count of a thing that happened in a room. Anyone else in that room could confirm or correct the number, which is exactly what makes it a fact.',
    alternatives: [
      'The retro was fast and loose and everyone got cut off.',
      'Two people in that room talk over whoever is speaking.',
      'Something in how you pause reads to the room as an opening.',
    ],
    balancedThought:
      'Three interruptions happened. Why is still open, and the count is enough to raise on its own.',
    howToFindOut: 'Ask someone else who was there: “Did that feel as choppy to you?”',
  },
  {
    id: 'w-no-reply-overnight',
    statement: 'I sent the doc at 8pm and there was no reply by the time I logged on.',
    category: 'fact',
    difficulty: 'tricky',
    setting: 'work',
    explanation:
      'A silence is observable. The timestamp is there, the empty thread is there. Nothing has been added about why — which is what keeps this on the fact side.',
    alternatives: [
      'He has not opened it.',
      'He read it, wants to answer properly, and has not had a clear half hour.',
      'He is putting off answering because he does not like what is in it.',
    ],
    balancedThought:
      'One night with no reply is what I have. Early enough that it does not mean anything yet, late enough that a nudge is fair.',
    howToFindOut: 'Nudge once with the deadline attached: “Do you need anything from me before Thursday?”',
  },
  {
    id: 'w-ignored-me',
    statement: 'He ignored my message.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'work',
    explanation:
      '“Ignored” turns a silence into a decision. The silence is checkable; the choosing-not-to-answer is the part you have filled in.',
    checkableVersion: 'I sent it at 8pm. There was no reply by the next morning.',
    alternatives: [
      'His phone died, or the notification never surfaced.',
      'He read it in a queue and meant to write a proper reply later.',
      'He is avoiding the topic in it, rather than avoiding you.',
    ],
    balancedThought:
      'I do not know yet why he has not replied. What I do know is that I have been waiting since last night and it is bothering me — that part is worth raising.',
    howToFindOut: 'Ask plainly: “Did my message land? I’d rather chase it than guess.”',
    pattern: 'mind-reading',
  },
  {
    id: 'w-credit-analysis',
    statement: 'He presented my analysis on the client call and did not say it came from me.',
    category: 'fact',
    difficulty: 'tricky',
    setting: 'work',
    explanation:
      'Two observable things: what was on the slides, and a name that was not said. It reads like an accusation, but everything in it could be checked against the recording.',
    alternatives: [
      'He assumed the room already knew whose work it was.',
      'He was watching the clock and cut the credits along with everything else.',
      'He was content for the room to think it was his.',
    ],
    balancedThought:
      'My work was in the room and my name was not. Whatever he intended, I can ask for the attribution next time without accusing him of taking it.',
    howToFindOut:
      'Ask before the next one: “Can you name me on the analysis slides when you present them?”',
  },
  {
    id: 'w-under-the-bus',
    statement: 'He was throwing me under the bus on that call.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'work',
    explanation:
      'This is the conclusion you drew from the same call — and it may be the right one. It is still a read of his intent rather than something the recording settles.',
    checkableVersion:
      'He presented my analysis without naming me, and said the delay came from my side.',
    alternatives: [
      'He was answering the question he was asked and gave the timeline, not a verdict.',
      'He was covering himself, and the effect on you was collateral.',
      'He put the delay on you on purpose.',
    ],
    balancedThought:
      'What I saw was my analysis unnamed and the delay pinned on my side. That is worth taking up with him, and I do not need to know his intent to do it.',
    howToFindOut: 'Ask him his read: “How did you see the timeline on that project?”',
    pattern: 'personalising',
  },
  {
    id: 'w-raise-prediction',
    statement: 'If I ask for a raise now, they’ll say no and it’ll be held against me.',
    category: 'guess',
    difficulty: 'straightforward',
    setting: 'work',
    explanation:
      'A prediction about something that has not happened yet. Worth taking seriously as a worry, and worth not treating as a result already in.',
    checkableVersion: 'I have not asked yet. What I know is what happened the last time I did.',
    alternatives: [
      'They say no and give you a concrete bar to hit.',
      'They say yes, later and smaller than you wanted.',
      'They say no and it does sit in the back of someone’s mind.',
    ],
    balancedThought:
      'I do not know how the ask lands. I know it has not been asked, and that not asking is also a decision with a cost.',
    howToFindOut: 'Ask about the process before you ask for the number: “How are raises decided here?”',
    pattern: 'fortune-telling',
  },
  {
    id: 'w-dread-monday',
    statement: 'I dread the Monday morning check-in.',
    category: 'feeling',
    difficulty: 'straightforward',
    setting: 'work',
    explanation:
      'Yours, and worth knowing before you walk into the room. It says something true about the meeting for you — not about what your colleagues intend by it.',
    alternatives: [
      'The meeting is badly run and half of it is unnecessary.',
      'One specific person in that room is the part you dread.',
      'It is the reporting, not the people — the numbers are never ready by Monday.',
    ],
    balancedThought:
      'The dread is real, and it is information about what I need: probably a clearer idea of what that room expects of me, not a better attitude.',
    howToFindOut: 'Next Monday, note the minute the knot tightens. It usually names itself.',
  },
  {
    id: 'w-felt-overlooked',
    statement: 'I felt overlooked when the project went to someone else.',
    category: 'feeling',
    difficulty: 'straightforward',
    setting: 'work',
    explanation:
      'This is your own response, stated as yours, and it is real. It tells you what the moment cost you — it does not tell you what anyone intended by it.',
    alternatives: [
      'It went on availability, and you were mid-way through something else.',
      'Someone asked for it and you did not know it was going.',
      'You were passed over, and nobody explained why.',
    ],
    balancedThought:
      'Feeling overlooked tells me I want to be considered for this kind of work on purpose rather than by luck. That is something I can ask for out loud.',
    howToFindOut: 'Ask how the assignment was made, and to be in the running next time.',
  },
  {
    id: 'w-felt-anxious-waiting',
    statement: 'I was anxious the whole time I was waiting for that reply.',
    category: 'feeling',
    difficulty: 'straightforward',
    setting: 'work',
    explanation:
      'Yours, and not up for debate. Naming it separately is useful precisely because the anxiety was real while the reason for the silence was still unknown.',
    alternatives: [
      'A deadline hung on the answer, so the wait itself had teeth.',
      'The message was a risk and you were braced for the reply.',
      'Not knowing is the part you find hardest, whatever it is about.',
    ],
    balancedThought:
      'The anxiety was about not knowing, not about what he decided. What I needed was a timeframe — and I can ask for one next time.',
    howToFindOut: 'Say when you need an answer by, so silence stops having to mean anything.',
  },

  // ── Family and personal ──────────────────────────────────────────────────────
  {
    id: 'f-sister-quote',
    statement:
      'When I said I couldn’t come on Sunday, my sister said “must be nice to have free weekends.”',
    category: 'fact',
    difficulty: 'straightforward',
    setting: 'family',
    explanation:
      'Two things that were said out loud, in order. You may have a strong sense of what she meant, but the sentence itself stops at what was said.',
    alternatives: [
      'It was a joke that landed badly.',
      'She is worn out and envious of anyone with a free Sunday.',
      'She was letting you know she thinks you dodge these weekends.',
    ],
    balancedThought:
      'Those were her words. What she meant is still open, and I can answer what was said rather than what I think was behind it.',
    howToFindOut: 'Ask her: “That sounded pointed — was it?”',
  },
  {
    id: 'f-sister-label',
    statement: 'My sister is passive-aggressive.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'family',
    explanation:
      'A label puts a permanent trait where a set of specific moments were. This app will not tell you whether the label fits; what it can do is hand you back the moment it came from, which is the part you could talk to her about.',
    checkableVersion: 'On Sunday she said “must be nice to have free weekends,” and changed the subject.',
    alternatives: [
      'She says the awkward thing badly when she is stressed, and it lands as a dig.',
      'She is annoyed about one specific thing — the Sundays — and has not said it straight.',
      'She is annoyed with you and does not intend to say so directly.',
    ],
    balancedThought:
      'One remark on Sunday is what I actually have. I can take up that remark without settling what kind of person she is.',
    howToFindOut: 'Ask about the moment, not the trait: “When you said that on Sunday, what did you mean?”',
    pattern: 'labelling',
  },
  {
    id: 'f-partner-asked-tuesday',
    statement:
      'My partner asked how my day was on Tuesday, and didn’t on Wednesday or Thursday.',
    category: 'fact',
    difficulty: 'straightforward',
    setting: 'family',
    explanation:
      'Three days, checkable one at a time. It is narrower than it feels — and narrow is what makes it something you can actually say to someone.',
    alternatives: [
      'Both those evenings ran late and the conversation never got started.',
      'The habit is drifting because the evenings have got busier.',
      'He has stopped asking, and has not noticed that he stopped.',
    ],
    balancedThought:
      'Two days without the question is small and real. Small and real is exactly the size of thing I can mention before it turns into an argument.',
    howToFindOut: 'Say it tonight: “Ask me about my day — I miss it.”',
  },
  {
    id: 'f-partner-never-asks',
    statement: 'My partner never asks how my day went.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'family',
    explanation:
      '“Never” is a claim about all of time, so there is no way to check it and no way for anyone to answer it. The two days you actually have in mind are the checkable part.',
    checkableVersion: 'My partner didn’t ask about my day yesterday or the day before.',
    alternatives: [
      'He asks at odd times — in the car, at bedtime — and it does not register as asking.',
      'The asking dropped off in a particular stretch, and something changed then.',
      'He has stopped being curious about your day and has not noticed.',
    ],
    balancedThought:
      'It has been at least two days, and I want to be asked. Both of those are true without “never” being true.',
    howToFindOut: 'Ask for the thing you want rather than naming what is missing: “Ask me how today went.”',
    pattern: 'all-or-nothing',
  },
  {
    id: 'f-phone-at-dinner',
    statement: 'He looked at his phone several times during dinner.',
    category: 'fact',
    difficulty: 'straightforward',
    setting: 'family',
    explanation:
      'Anyone at the table saw it. This is the camera version of the evening, before any reading is laid on top.',
    alternatives: [
      'Something at work was live and he was watching it.',
      'Phone-at-the-table is a habit with nothing to do with you in it.',
      'He was bored of the conversation.',
    ],
    balancedThought:
      'The phone was out several times. Whatever it was for, a phone-free dinner is a thing I am allowed to ask for.',
    howToFindOut: 'Ask what it was: “Was something going on with your phone tonight?”',
  },
  {
    id: 'f-being-disrespectful',
    statement: 'He was being disrespectful at dinner.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'family',
    explanation:
      'This sounds like a description of him, but it is a conclusion about what the phone meant. It may be fair. It is still the part he could deny, whereas the phone is not.',
    checkableVersion: 'He looked at his phone several times while I was talking.',
    alternatives: [
      'He was distracted and never registered that you were mid-sentence.',
      'He knew it was rude and did it anyway, out of habit.',
      'He was checking something he had been anxious about all day.',
    ],
    balancedThought:
      'The phone came out while I was talking and I did not like it. I can say that without deciding what it proves about how he sees me.',
    howToFindOut:
      'Name the moment and ask: “When you picked up your phone while I was talking — what was that?”',
    pattern: 'emotional-reasoning',
  },
  {
    id: 'f-felt-disrespected',
    statement: 'I felt disrespected at dinner.',
    category: 'feeling',
    difficulty: 'tricky',
    setting: 'family',
    explanation:
      'One word away from the card before, and on the other side of the line. This one is yours, so nobody gets to tell you it is wrong — and it says what the evening did to you rather than what he was up to.',
    alternatives: [
      'It is being interrupted that stings, whoever does it.',
      'That dinner mattered to you and you wanted his attention on it.',
      'It landed hard because it keeps happening and nothing has changed.',
    ],
    balancedThought:
      'I felt disrespected, and that is real. What it tells me is that I want his attention at dinner — a request I can make, not a verdict I have to prove.',
  },
  {
    id: 'f-mother-guilt',
    statement: 'I feel like my mother is trying to make me feel guilty.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'family',
    explanation:
      'The guilt is real — that part is yours. But “I feel like” here introduces a conclusion about her intent rather than a feeling, and intent is the one thing you cannot see from where you are standing.',
    checkableVersion:
      'She mentioned three times that she has not seen the kids since March. I felt guilty afterwards.',
    alternatives: [
      'She misses the kids and says it the only way she knows how.',
      'She has been counting the months and told you the number.',
      'She is using the count to move you, and it works.',
    ],
    balancedThought:
      'The guilt is real. Whether she aimed it is unknown, and either way I get to decide what I can actually offer.',
    howToFindOut: 'Answer the surface request: “Do you want to put a date in for seeing them?”',
    pattern: 'mind-reading',
  },
  {
    id: 'f-money-fight',
    statement: 'If I bring up the money thing, it’ll turn into a fight.',
    category: 'guess',
    difficulty: 'straightforward',
    setting: 'family',
    explanation:
      'A prediction, usually built from real history. Holding it as a guess is what leaves room for it to go differently this time.',
    checkableVersion: 'The last two times money came up, we both raised our voices and stopped talking.',
    alternatives: [
      'It goes badly again, the way it has before.',
      'It goes badly, and you get further in than last time before it does.',
      'It goes better, because you picked a calmer hour and a smaller question.',
    ],
    balancedThought:
      'The last two attempts went badly, so the worry is earned. It is still a forecast, and how I open it is the part I control.',
    howToFindOut: 'Try one small piece of it at a good moment, and see what actually happens.',
    pattern: 'fortune-telling',
  },
  {
    id: 'f-teen-door',
    statement: 'My teenager went to their room after dinner and shut the door.',
    category: 'fact',
    difficulty: 'straightforward',
    setting: 'family',
    explanation:
      'Plain and observable, with nothing about what the closed door means. Which is what makes it a place to start rather than a verdict to defend.',
    alternatives: [
      'They are fifteen and their room is where they live.',
      'Something happened at school that has nothing to do with home.',
      'They are avoiding you specifically.',
    ],
    balancedThought:
      'A closed door is a closed door. It fits several stories, and I can knock without knowing which one it is.',
    howToFindOut: 'Knock with something low-stakes — food, a lift, a question about nothing.',
  },
  {
    id: 'f-teen-hates-me',
    statement: 'My teenager hates me.',
    category: 'guess',
    difficulty: 'tricky',
    setting: 'family',
    explanation:
      'One of the heaviest guesses people carry, and one of the least checkable — it is a claim about someone else’s feelings, drawn from what they did not say.',
    checkableVersion: 'We have barely talked this week. Most evenings end with their door closed.',
    alternatives: [
      'They are wrung out by seven and have no words left for anyone.',
      'They are angry about one specific thing, which you could still hear about.',
      'They want distance from you right now — which can be true, and is not the same as hate.',
    ],
    balancedThought:
      'We have barely talked this week and I miss them. That is what I know, and it is enough to keep showing up with something small.',
    howToFindOut: 'Offer a low-stakes ten minutes — a drive, a takeaway run — and see what happens.',
    pattern: 'catastrophising',
  },
  {
    id: 'f-lonely-at-home',
    statement: 'I feel lonely in this house even when everyone is home.',
    category: 'feeling',
    difficulty: 'straightforward',
    setting: 'family',
    explanation:
      'Yours, and worth saying out loud. Kept as a feeling it is something you can tell someone; turned into a claim about them, it becomes something to argue about.',
    alternatives: [
      'Everyone is home and on separate screens.',
      'The people you talk to properly are somewhere else in your life.',
      'You have stopped saying much yourself, and the quiet has become the default.',
    ],
    balancedThought:
      'The loneliness is real, and it points at something I want: actual contact with someone in this house, not just company in the same rooms.',
  },
];

// ── Deterministic shuffle ─────────────────────────────────────────────────────

/** mulberry32: tiny, seeded, and good enough for shuffling a 24-card deck. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates against a seeded generator, so the same seed always gives the same run. The demo
 * seed is fixed in the component; the shuffle control just picks a new one.
 */
export function shuffleDeck(
  cards: readonly FactOrGuessCard[],
  seed: number,
): readonly FactOrGuessCard[] {
  const out = [...cards];
  const random = makeRandom(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The seed the exercise opens on, so a demo run is the same run every time. */
export const DEFAULT_DECK_SEED = 20260828;

// ── Scoring ───────────────────────────────────────────────────────────────────

/** One graded card. `chosen` is what the user pressed; the card holds the answer. */
export type CardAnswer = {
  cardId: string;
  chosen: CardCategory;
  actual: CardCategory;
};

export type MixUp = {
  /** What the card was. */
  actual: CardCategory;
  /** What the user called it. */
  chosen: CardCategory;
  count: number;
};

export type PatternTally = {
  pattern: ThinkingPattern;
  count: number;
  /** true when it was counted from cards the user misread, rather than from the whole run. */
  fromMistakes: boolean;
};

export type RunSummary = {
  correct: number;
  total: number;
  /** The mistake made most often, when there was one. The useful half of the feedback. */
  topMixUp?: MixUp;
  /** The thinking habit that came up most, named about the thought and not the person. */
  topPattern?: PatternTally;
  /** A sentence naming that pattern, or naming a clean run. */
  headline: string;
  note: string;
  /** The one thing to take away, always present. */
  habit: string;
};

/** Reads like prose in a sentence: "read a guess as a fact". */
const AS_PHRASE: Record<CardCategory, string> = {
  fact: 'a fact',
  guess: 'a guess',
  feeling: 'a feeling',
};

/**
 * Which confusion to name back to the user. Ties break toward the earlier pair in this order,
 * which puts the two most consequential mix-ups first: calling a guess a fact, and treating a
 * feeling as evidence about someone else.
 */
const MIXUP_PRIORITY: readonly (readonly [CardCategory, CardCategory])[] = [
  ['guess', 'fact'],
  ['feeling', 'fact'],
  ['guess', 'feeling'],
  ['fact', 'guess'],
  ['fact', 'feeling'],
  ['feeling', 'guess'],
];

const MIXUP_NOTES: Record<string, string> = {
  'guess>fact':
    'The pattern to watch: conclusions that arrive feeling like evidence. When a sentence carries a motive, a label, or a word like “never”, it is your read of the moment — worth saying, worth not defending as fact.',
  'feeling>fact':
    'Your feelings are real, and they are not proof of what the other person was doing. Keeping them on your own side of the line is what makes them sayable instead of arguable.',
  'guess>feeling':
    'A few conclusions got filed as feelings. “I feel like he doesn’t care” is a guess wearing the word feel — the feeling underneath it is usually simpler, and yours.',
  'fact>guess':
    'You were cautious with things that were actually checkable. Plain observations — a timestamp, a count, a quote — are the strongest ground you have. Claim them.',
  'fact>feeling':
    'Some plain observations got read as feelings. A quote or a count stays a fact even when it stings to say it.',
  'feeling>guess':
    'Your own responses got treated as speculation. You do not have to hedge about what you felt; that part you actually know.',
};

/**
 * Scores a run and, more usefully, names the habit behind it. Patterns are counted from the cards
 * the user misread first — that is the honest signal — and fall back to the patterns the run
 * contained when every answer was right.
 */
export function summariseRun(
  answers: readonly CardAnswer[],
  cards: readonly FactOrGuessCard[] = FACT_OR_GUESS_DECK,
): RunSummary {
  const correct = answers.filter((answer) => answer.chosen === answer.actual).length;
  const total = answers.length;
  const byId = new Map(cards.map((card) => [card.id, card]));

  const counts = new Map<string, number>();
  const missedPatterns = new Map<ThinkingPattern, number>();
  const seenPatterns = new Map<ThinkingPattern, number>();

  for (const answer of answers) {
    const pattern = byId.get(answer.cardId)?.pattern;
    if (pattern) seenPatterns.set(pattern, (seenPatterns.get(pattern) ?? 0) + 1);
    if (answer.chosen === answer.actual) continue;
    const key = `${answer.actual}>${answer.chosen}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (pattern) missedPatterns.set(pattern, (missedPatterns.get(pattern) ?? 0) + 1);
  }

  const fromMistakes = missedPatterns.size > 0;
  const tallies = fromMistakes ? missedPatterns : seenPatterns;
  let topPattern: PatternTally | undefined;
  for (const [pattern, count] of tallies) {
    if (topPattern === undefined || count > topPattern.count) {
      topPattern = { pattern, count, fromMistakes };
    }
  }

  const habit = topPattern ? PATTERN_META[topPattern.pattern].habit : GENERAL_HABIT;

  let topMixUp: MixUp | undefined;
  for (const [actual, chosen] of MIXUP_PRIORITY) {
    const count = counts.get(`${actual}>${chosen}`) ?? 0;
    if (count === 0) continue;
    if (topMixUp === undefined || count > topMixUp.count) {
      topMixUp = { actual, chosen, count };
    }
  }

  if (topMixUp === undefined) {
    return {
      correct,
      total,
      topPattern,
      headline: 'You sorted every one of them.',
      note: 'That is the whole skill this app is built on: what happened, what you concluded, and what you felt, kept in three separate piles.',
      habit,
    };
  }

  const headline = `Most often, you read ${AS_PHRASE[topMixUp.actual]} as ${AS_PHRASE[topMixUp.chosen]}.`;

  return {
    correct,
    total,
    topMixUp,
    topPattern,
    headline,
    note: MIXUP_NOTES[`${topMixUp.actual}>${topMixUp.chosen}`] ?? '',
    habit,
  };
}
