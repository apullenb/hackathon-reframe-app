/**
 * Stand-in for an OpenAI-compatible endpoint that returns SCHEMA-VALID Context Switch responses.
 *
 * Purpose: exercise the whole live pipeline — prompt building, transport, provider failover, JSON
 * extraction, the Zod gate, and rendering — without a paid key. It proves the PLUMBING works.
 * It says nothing about real model quality, because the content here is hand-written.
 */
import { createServer } from 'node:http';

const seen = [];

const SAY_IT_BETTER = {
  mode: 'say_it_better',
  needsFollowUp: false,
  followUpQuestions: [],
  unfilteredTranslation: 'I followed the dopamine instead of the roadmap.',
  sendableMessage:
    'Progress is behind where I expected. I spent time on a related project, which slowed this feature down. I am back on it and will send a realistic scope and ETA by 3:00 PM today.',
  alternatives: [
    { id: 'direct', label: 'Direct and brief', tone: 'Concise and direct', message: 'This slipped. Back on it now; scope and ETA by 3:00 PM today.' },
    { id: 'warm', label: 'Warm and collaborative', tone: 'Warm and collaborative', message: 'Thanks for your patience. I moved time to a related project and this slowed down. Full attention now, with scope and an ETA by 3:00 PM today.' },
  ],
  howItMayLand: [
    { label: 'Honest about the lack of progress', sentiment: 'positive' },
    { label: 'Gives a concrete next checkpoint', sentiment: 'positive' },
  ],
  changesMade: [
    'Replaced dismissive wording with an accountable status',
    'Did not claim that the alternate work was approved',
  ],
  honestyCheck: { passed: true, concerns: [] },
  safety: { category: 'none', allowStandardOutput: true },
};

const DECODE = {
  mode: 'decode_it',
  literalMeaning: 'A request for the current status of a specific piece of work.',
  likelyPurpose: [{ text: 'Collecting status for planning.', support: 'plausible' }],
  knownFacts: ['The sender is asking whether an update exists.'],
  interpretations: [{ text: 'The sender expected an update by now.', support: 'plausible', evidence: '"yet"' }],
  unknowns: ['Whether the sender is frustrated cannot be determined from this message.'],
  toneCues: [{ cue: '"yet"', observation: 'Signals an expectation that an update would already exist.' }],
  usefulResponseShouldInclude: ['Current progress', 'Next milestone', 'When the next update lands'],
  clarificationQuestion: 'Is there a date on your side that this needs to line up with?',
  responseOptions: [
    { id: 'a', label: 'Brief status', message: 'Setup is done, implementation has not started. Scope and ETA by 3:00 PM.' },
    { id: 'b', label: 'Status plus blocker', message: 'Behind where I wanted to be. Nothing blocking; I shifted time elsewhere. ETA by 3:00 PM.' },
    { id: 'c', label: 'Ask what they need', message: 'Happy to share detail — is this for planning, or do you need a date to commit to?' },
  ],
  safety: { category: 'none', allowStandardOutput: true },
};

const CONFLICT = {
  mode: 'conflict_lens',
  neutralSummary: 'Two people disagree about a kitchen task and about how reminders are being handled.',
  participants: [
    { speakerId: 'alex', statedPosition: ['Asked twice about the kitchen.'], possibleConcerns: [{ text: 'May be carrying the follow-up work.', support: 'plausible' }], whatTheyMayBeTryingToSay: 'I need to know it will actually happen.', whatTheOtherPersonMayHear: 'You do not trust me.' },
    { speakerId: 'sam', statedPosition: ['Said the task would be done.'], possibleConcerns: [{ text: 'May feel monitored.', support: 'plausible' }], whatTheyMayBeTryingToSay: 'I heard you the first time.', whatTheOtherPersonMayHear: 'Stop asking me.' },
  ],
  sharedFacts: ['The kitchen task is not finished.'],
  disputedOrUnclear: ['Whether a completion time was ever agreed.'],
  unansweredQuestions: ['When will it be done?'],
  escalationPoints: [
    { excerpt: 'You do not have to keep reminding me.', observation: 'Shifts the subject from the task to the reminders.', effect: 'The original question goes unanswered.' },
  ],
  coreProblem: 'There is no shared definition of when the task is complete, and low trust in follow-through.',
  sharedGoal: 'Both want the task done without another argument.',
  resolutionOptions: [
    { title: 'Agree a completion time', description: 'Name a time, then no reminders before it.', tradeoff: 'Requires committing to a time.' },
    { title: 'Define done once', description: 'Write down what finished means.', tradeoff: 'Feels formal for a small task.' },
  ],
  suggestedConversationStructure: ['Name the task', 'Agree a time', 'Agree no reminders before it'],
  repairMessage: 'I do not think either of us is being unreasonable. Can we pick a time it will be done by, and I will leave it alone until then?',
  safety: { category: 'none', allowStandardOutput: true },
};

/** Pick a response by looking for the mode's own field names in the prompt. */
function chooseResponse(text) {
  if (/coreProblem|escalationPoints/.test(text)) return CONFLICT;
  if (/literalMeaning|usefulResponseShouldInclude/.test(text)) return DECODE;
  return SAY_IT_BETTER;
}

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__seen') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(seen, null, 1));
    return;
  }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let parsed = null;
    try { parsed = JSON.parse(body); } catch { /* ignore */ }
    const prompt = `${parsed?.messages?.[0]?.content ?? ''}\n${parsed?.messages?.[1]?.content ?? ''}`;
    const chosen = chooseResponse(prompt);
    seen.push({
      authScheme: (req.headers.authorization || '').split(' ')[0] || null,
      model: parsed?.model,
      served: chosen.mode,
    });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: JSON.stringify(chosen) } }] }));
  });
}).listen(5399, () => console.log('mock provider on :5399 (schema-valid responses)'));
