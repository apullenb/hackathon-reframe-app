/**
 * Functional checks for the spec §27 items that are verifiable at the logic level.
 *
 * These cover the state machine, the request builder, and the validation gate. UI-level items
 * (copy button behavior, focus order, responsive layout) are verified in the browser and
 * recorded separately in the build log — a script cannot honestly claim those.
 *
 * Run with: npm run check:functional
 */

import {
  INITIAL_STATE,
  canSubmit,
  requiredFollowUpsAnswered,
  sessionReducer,
  toCommunicationContext,
  type SessionState,
} from '../src/state/sessionState';
import { buildRequest } from '../src/hooks/buildRequest';
import { validateResponse } from '../src/schemas';
import {
  FIXTURES,
  PREPARED_SCENARIOS,
  invalidSayItBetterResponse,
  sayItBetterFollowUp,
  timeoutErrorCustomContent,
  timeoutErrorPreparedScenario,
} from '../src/fixtures';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

/** Drive the reducer through a list of actions. */
function run(actions: Parameters<typeof sessionReducer>[1][], from = INITIAL_STATE): SessionState {
  return actions.reduce((state, action) => sessionReducer(state, action), from);
}

const engineerScenario = PREPARED_SCENARIOS.find((s) => s.id === 'engineer_pm_status');
const decodeScenario = PREPARED_SCENARIOS.find((s) => s.id === 'decode_pm_checkin');
const conflictScenario = PREPARED_SCENARIOS.find((s) => s.id === 'alex_sam_kitchen');
if (!engineerScenario || !decodeScenario || !conflictScenario) {
  throw new Error('Prepared scenarios missing — cannot run functional checks.');
}

const loadEngineer = () =>
  run([
    {
      type: 'load_scenario',
      scenarioId: engineerScenario.id,
      mode: engineerScenario.mode,
      context: engineerScenario.context,
      inputs: {
        sourceText: engineerScenario.sourceText ?? '',
        conversation: engineerScenario.conversation ?? '',
        speakers: engineerScenario.speakers ?? [],
      },
      followUpAnswers: engineerScenario.seededFollowUpAnswers,
    },
  ]);

/* ── 1. Required inputs prevent premature submission ─────────────────────── */
section('1. Required inputs prevent premature submission');

check('empty initial state cannot submit', !canSubmit(INITIAL_STATE));

const modeOnly = run([{ type: 'select_mode', mode: 'say_it_better' }]);
check('mode selected but no context cannot submit', !canSubmit(modeOnly));

const contextNoMessage = run([
  { type: 'select_mode', mode: 'say_it_better' },
  {
    type: 'set_context',
    patch: {
      selfRole: 'Engineer',
      otherRole: 'Product manager',
      relationship: 'Cross-functional teammate',
      channel: 'Slack or Teams',
    },
  },
]);
check('full context but empty message cannot submit', !canSubmit(contextNoMessage));

const whitespaceOnly = run(
  [{ type: 'set_inputs', patch: { sourceText: '   \n  \t ' } }],
  contextNoMessage,
);
check('whitespace-only message cannot submit', !canSubmit(whitespaceOnly));

const partialContext = run(
  [{ type: 'set_context', patch: { channel: '' } }, { type: 'set_inputs', patch: { sourceText: 'x' } }],
  contextNoMessage,
);
check('missing channel cannot submit', !canSubmit(partialContext));

check('loaded engineer scenario CAN submit', canSubmit(loadEngineer()));

const conflictNoSpeakers = run([
  { type: 'select_mode', mode: 'conflict_lens' },
  {
    type: 'set_context',
    patch: {
      selfRole: 'Spouse/partner',
      otherRole: 'Spouse/partner',
      relationship: 'Close personal relationship',
      channel: 'Text message',
    },
  },
  { type: 'set_inputs', patch: { conversation: 'Alex: hi\nSam: hello' } },
]);
check(
  'conflict lens with a conversation but no confirmed speakers cannot submit',
  !canSubmit(conflictNoSpeakers),
);
check(
  'conflict lens with exactly 2 confirmed speakers CAN submit',
  canSubmit(
    run(
      [
        {
          type: 'set_inputs',
          patch: {
            speakers: [
              { id: 'alex', label: 'Alex', role: 'Spouse/partner', isUser: true },
              { id: 'sam', label: 'Sam', role: 'Spouse/partner', isUser: false },
            ],
          },
        },
      ],
      conflictNoSpeakers,
    ),
  ),
);

/* ── 2. The role pair actually reaches the model request ─────────────────── */
section('2. Role pair, channel, outcome and tone reach the model request');

const engineerRequest = buildRequest(loadEngineer());
check('request builds from the prepared scenario', engineerRequest !== null);
check(
  'selfRole reaches the request',
  engineerRequest?.context.selfRole === 'Engineer',
  `got ${engineerRequest?.context.selfRole}`,
);
check(
  'otherRole reaches the request',
  engineerRequest?.context.otherRole === 'Product manager',
  `got ${engineerRequest?.context.otherRole}`,
);
check(
  'channel reaches the request',
  engineerRequest?.context.channel === 'Slack or Teams',
  `got ${engineerRequest?.context.channel}`,
);
check(
  'desiredOutcome reaches the request',
  engineerRequest?.context.desiredOutcome === 'Give a status update',
);
check('desiredTone reaches the request', engineerRequest?.context.desiredTone === 'Accountable');
check('humorLevel reaches the request', engineerRequest?.context.humorLevel === 'unfiltered');
check('scenarioId is tagged onto the request', engineerRequest?.scenarioId === 'engineer_pm_status');
check(
  'incomplete context yields a null request rather than a partial one',
  buildRequest(contextNoMessage) === null,
);
check(
  'toCommunicationContext refuses a half-built context',
  toCommunicationContext({ selfRole: 'Engineer' }) === null,
);

/* ── 3. Follow-up answers actually change the request ────────────────────── */
section('3. Follow-up answers change the request');

const withoutAnswers = run([
  { type: 'select_mode', mode: 'say_it_better' },
  {
    type: 'set_context',
    patch: {
      selfRole: 'Engineer',
      otherRole: 'Product manager',
      relationship: 'Cross-functional teammate',
      channel: 'Slack or Teams',
    },
  },
  { type: 'set_inputs', patch: { sourceText: 'I got distracted.' } },
]);
const reqNoAnswers = buildRequest(withoutAnswers);
check('no answers → followUpAnswers omitted', reqNoAnswers?.mode === 'say_it_better' && reqNoAnswers.followUpAnswers === undefined);

const withAnswers = run(
  [
    { type: 'answer_follow_up', questionId: 'reliable_eta', answer: 'By 3:00 PM today' },
  ],
  withoutAnswers,
);
const reqWithAnswers = buildRequest(withAnswers);
check(
  'an answer appears in the request payload',
  reqWithAnswers?.mode === 'say_it_better' &&
    reqWithAnswers.followUpAnswers?.reliable_eta === 'By 3:00 PM today',
);
check(
  'the two requests genuinely differ',
  JSON.stringify(reqNoAnswers) !== JSON.stringify(reqWithAnswers),
);

const seeded = loadEngineer();
check(
  'prepared scenario seeds all three answers',
  Object.keys(seeded.followUpAnswers).length === 3,
  `got ${Object.keys(seeded.followUpAnswers).length}`,
);
check('all seeded required follow-ups count as answered', requiredFollowUpsAnswered({
  ...seeded,
  followUpQuestions: sayItBetterFollowUp.followUpQuestions,
}));
check(
  'a required question with no answer blocks Finish',
  !requiredFollowUpsAnswered({
    ...withoutAnswers,
    followUpQuestions: sayItBetterFollowUp.followUpQuestions,
  }),
);

/* ── 4. The flagship scenario still SHOWS the follow-up step (F-004) ─────── */
section('4. Prepared scenario shows the follow-up step (regression guard for F-004)');

check(
  'seeded answers do NOT mark the follow-up step resolved',
  loadEngineer().followUpResolved === false,
);
check(
  'finishing the follow-up marks it resolved',
  run([{ type: 'finish_follow_up' }], loadEngineer()).followUpResolved === true,
);
check(
  'editing the message re-arms the follow-up step',
  run(
    [{ type: 'finish_follow_up' }, { type: 'set_inputs', patch: { sourceText: 'changed' } }],
    loadEngineer(),
  ).followUpResolved === false,
);

/* ── 5. Reset restores prepared state ───────────────────────────────────── */
section('5. Reset Demo returns to a clean initial state');

const dirty = run(
  [
    { type: 'request_success', response: FIXTURES.sayItBetterEngineerPm, source: 'fixture' },
  ],
  loadEngineer(),
);
check('state is dirty before reset', dirty.result !== null && dirty.scenarioId !== null);
const afterReset = run([{ type: 'reset_demo' }], dirty);
check('reset clears the result', afterReset.result === null);
check('reset clears the scenario', afterReset.scenarioId === null);
check('reset clears message content', afterReset.inputs.sourceText === '');
check('reset returns to mode selection', afterReset.step === 'mode_select');
check('reset equals the initial state exactly', JSON.stringify(afterReset) === JSON.stringify(INITIAL_STATE));

/* ── 6. Every response passes runtime validation ─────────────────────────── */
section('6. Every response passes the validation gate');

for (const [name, fixture] of Object.entries(FIXTURES)) {
  const outcome = validateResponse(fixture.mode, fixture);
  check(`${name} validates`, outcome.ok, outcome.ok ? '' : outcome.issues.join('; '));
}
const invalidOutcome = validateResponse('say_it_better', invalidSayItBetterResponse);
check('the deliberately invalid response is REJECTED', !invalidOutcome.ok);
check(
  'rejection names the sendableMessage path',
  !invalidOutcome.ok && invalidOutcome.issues.some((i) => i.includes('sendableMessage')),
);

/* ── 7. Errors preserve inputs; fallback is offered only for prepared ───── */
section('7. Error handling preserves inputs and never swaps custom content');

const errored = run(
  [{ type: 'request_error', error: timeoutErrorCustomContent }],
  run([{ type: 'set_inputs', patch: { sourceText: 'my own words' } }], withoutAnswers),
);
check('inputs survive an error', errored.inputs.sourceText === 'my own words');
check('step moves to error', errored.step === 'error');
check(
  'custom-content timeout does NOT offer a fixture',
  timeoutErrorCustomContent.fixtureAvailable === false,
);
check(
  'prepared-scenario timeout DOES offer a fixture',
  timeoutErrorPreparedScenario.fixtureAvailable === true,
);
check(
  'prepared-scenario error copy offers the saved example',
  timeoutErrorPreparedScenario.userMessage.includes('saved example response'),
);
check(
  'custom-content error copy says the message was preserved',
  timeoutErrorCustomContent.userMessage.includes('preserved'),
);
check(
  'edit_again clears the error but keeps inputs',
  (() => {
    const back = run([{ type: 'edit_again' }], errored);
    return back.error === null && back.inputs.sourceText === 'my own words';
  })(),
);

/* ── 8. A response asking for facts routes to follow-up, not to a result ── */
section('8. A needsFollowUp response routes to the question step');

const askedForFacts = run(
  [{ type: 'request_success', response: sayItBetterFollowUp, source: 'proxy' }],
  withoutAnswers,
);
check('needsFollowUp response goes to the follow-up step', askedForFacts.step === 'follow_up');
check('it does not render as a result', askedForFacts.result === null);
check(
  'its questions are carried into state',
  askedForFacts.followUpQuestions.length === sayItBetterFollowUp.followUpQuestions.length,
);

/* ── 9. Mode switching keeps the role pair but drops stale results ──────── */
section('9. Mode switching preserves context, drops stale results');

const switched = run([{ type: 'select_mode', mode: 'decode_it' }], dirty);
check('role pair survives a mode switch', switched.context.selfRole === 'Engineer');
check('stale result is dropped', switched.result === null);
check('stale scenario tag is dropped', switched.scenarioId === null);

/* ── Summary ────────────────────────────────────────────────────────────── */
console.log(`\n${'='.repeat(52)}`);
console.log(`  checks run : ${pass + fail}`);
console.log(`  passed     : ${pass}`);
console.log(`  failed     : ${fail}`);
console.log('='.repeat(52));
if (fail > 0) {
  console.log('\nFAILED:');
  for (const name of failures) console.log(`  - ${name}`);
  process.exit(1);
}
console.log('\nFUNCTIONAL GATE PASSED.');
