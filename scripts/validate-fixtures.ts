/**
 * Fixture gate — `npm run validate:fixtures`.
 *
 * Two structural jobs:
 *   1. Every valid fixture must pass the SAME Zod schema a live model response passes.
 *   2. The deliberately invalid fixture must FAIL, with an issue on the `sendableMessage`
 *      path. If it ever passes, the `superRefine` in src/schemas/sayItBetter.ts has been
 *      weakened and the empty-result-screen bug is back.
 *
 * Plus the content tests from spec §27 — the invariants that keep the demo honest. A schema
 * pass is not enough: a perfectly shaped response that claims the product manager is annoyed,
 * or that invents approval for the side project, is still a failure.
 *
 * Relative imports throughout: this runs under `tsx`, and the gate should not depend on
 * tsconfig path-alias resolution.
 */

import type {
  ConflictLensResponse,
  ContextSwitchMode,
  ContextSwitchResponse,
  DecodeResponse,
  SayItBetterResponse,
} from '../src/types/contracts';
import { validateResponse } from '../src/schemas';
import {
  CONFLICT_ALEX_SAM_CONVERSATION,
  CONFLICT_ALEX_SAM_SPEAKERS,
  SATURDAY_DINNER_CONVERSATION,
  buildSaturdayDinner,
  matchesSaturdayDinner,
  ENGINEER_PM_UNFILTERED_TRANSLATION,
  FIXTURES,
  INVALID_RESPONSE_EXPECTED_ISSUE_PATH,
  INVALID_RESPONSE_MODE,
  PREPARED_SCENARIOS,
  invalidSayItBetterResponse,
  timeoutErrorCustomContent,
  timeoutErrorPreparedScenario,
} from '../src/fixtures';

/* ── Tiny assertion harness (no test dependency — the stack list is fixed) ── */

type Failure = { readonly group: string; readonly detail: string };

const failures: Failure[] = [];
let checksRun = 0;

function log(line: string): void {
  process.stdout.write(line + '\n');
}

function check(group: string, description: string, ok: boolean, detail?: string): void {
  checksRun += 1;
  if (ok) {
    log(`  PASS  ${description}`);
    return;
  }
  failures.push({ group, detail: detail ? `${description} — ${detail}` : description });
  log(`  FAIL  ${description}`);
  if (detail) {
    log(`        ${detail}`);
  }
}

function section(title: string): void {
  log('');
  log(title);
  log('-'.repeat(title.length));
}

/* ── 1. Schema validation of every valid fixture ─────────────────────────── */

const MODE_LABELS: Record<ContextSwitchMode, string> = {
  say_it_better: 'Say It Better',
  decode_it: 'Decode It',
  conflict_lens: 'Conflict Lens',
};

section('Schema validation — every valid fixture through validateResponse()');

const fixtureEntries = Object.entries(FIXTURES) as Array<[string, ContextSwitchResponse]>;

for (const [key, fixture] of fixtureEntries) {
  const outcome = validateResponse(fixture.mode, fixture);
  check(
    'schema',
    `${key} (${MODE_LABELS[fixture.mode]})`,
    outcome.ok,
    outcome.ok ? undefined : outcome.issues.join('; '),
  );
}

/* ── 2. The invalid fixture must fail, on the expected path ──────────────── */

section('Validation gate — the invalid fixture must be rejected');

const invalidOutcome = validateResponse(INVALID_RESPONSE_MODE, invalidSayItBetterResponse);

check(
  'gate',
  'invalidSayItBetterResponse is REJECTED by the schema',
  !invalidOutcome.ok,
  invalidOutcome.ok
    ? 'It passed validation. The superRefine in src/schemas/sayItBetter.ts is no longer closing the missing-sendableMessage hole.'
    : undefined,
);

check(
  'gate',
  `rejection includes an issue on the \`${INVALID_RESPONSE_EXPECTED_ISSUE_PATH}\` path`,
  !invalidOutcome.ok &&
    invalidOutcome.issues.some((issue) =>
      issue.startsWith(`${INVALID_RESPONSE_EXPECTED_ISSUE_PATH}:`),
    ),
  invalidOutcome.ok
    ? 'it produced no issues at all'
    : `issues were: ${invalidOutcome.issues.join('; ')}`,
);

/* ── 3. Content tests — spec §27 ─────────────────────────────────────────── */

const engineer: SayItBetterResponse = FIXTURES.sayItBetterEngineerPm;
const followUp: SayItBetterResponse = FIXTURES.sayItBetterFollowUp;
const decode: DecodeResponse = FIXTURES.decodePmToEngineer;
const conflict: ConflictLensResponse = FIXTURES.conflictAlexSam;
const safetyFixture: SayItBetterResponse = FIXTURES.safetyEscalation;

section('Content tests — Say It Better, engineer to product manager (spec §8)');

check(
  'engineer',
  'unfilteredTranslation is exactly the spec string',
  engineer.unfilteredTranslation === ENGINEER_PM_UNFILTERED_TRANSLATION &&
    ENGINEER_PM_UNFILTERED_TRANSLATION === 'I followed the dopamine instead of the roadmap.',
  `got: ${JSON.stringify(engineer.unfilteredTranslation)}`,
);

const HONESTY_GUARD_FORBIDDEN = ['approved', 'approval', 'nearly complete'] as const;
const sendableLower = (engineer.sendableMessage ?? '').toLowerCase();
const sendableHits = HONESTY_GUARD_FORBIDDEN.filter((word) => sendableLower.includes(word));

check(
  'engineer',
  'sendableMessage invents no approval and no near-completion (Honesty Guard)',
  engineer.sendableMessage !== undefined && sendableHits.length === 0,
  engineer.sendableMessage === undefined
    ? 'there is no sendableMessage to check'
    : `found: ${sendableHits.join(', ')}`,
);

check(
  'engineer',
  'alternatives offer at least two meaningfully different tones',
  (engineer.alternatives?.length ?? 0) >= 2 &&
    new Set((engineer.alternatives ?? []).map((alt) => alt.tone)).size >= 2,
  `tones: ${JSON.stringify((engineer.alternatives ?? []).map((alt) => alt.tone))}`,
);

const alternativeHits = (engineer.alternatives ?? []).flatMap((alt) =>
  HONESTY_GUARD_FORBIDDEN.filter((word) => alt.message.toLowerCase().includes(word)).map(
    (word) => `${alt.id}: ${word}`,
  ),
);

check(
  'engineer',
  'no alternative smuggles approval or near-completion back in',
  alternativeHits.length === 0,
  `found: ${alternativeHits.join(', ')}`,
);

check(
  'engineer',
  "howItMayLand and changesMade each carry the spec's four points",
  engineer.howItMayLand?.length === 4 && engineer.changesMade?.length === 4,
  `howItMayLand=${engineer.howItMayLand?.length}, changesMade=${engineer.changesMade?.length}`,
);

section('Content tests — Say It Better follow-up state (spec §7)');

const EXPECTED_FOLLOW_UP_IDS = ['other_project_status', 'actual_progress', 'reliable_eta'];
const followUpIds = followUp.followUpQuestions.map((question) => question.id);

check(
  'followUp',
  'the three engineer-scenario questions are present, with their contract ids',
  followUpIds.length === EXPECTED_FOLLOW_UP_IDS.length &&
    EXPECTED_FOLLOW_UP_IDS.every((id) => followUpIds.includes(id)),
  `got: ${followUpIds.join(', ')}`,
);

check(
  'followUp',
  'no sendableMessage exists while follow-up is pending',
  followUp.needsFollowUp && followUp.sendableMessage === undefined,
);

check(
  'followUp',
  'every question offers 2-4 options and a stated reason',
  followUp.followUpQuestions.every(
    (question) =>
      (question.options?.length ?? 0) >= 2 &&
      (question.options?.length ?? 0) <= 4 &&
      question.reason.trim().length > 0,
  ),
);

const PREPARED_ANSWER_LABELS = [
  'Exploratory and related, but not formally prioritized',
  'Initial setup only; implementation has not meaningfully started',
  'By 3:00 PM today',
];
const allOptionLabels = followUp.followUpQuestions.flatMap((question) =>
  (question.options ?? []).map((option) => option.label),
);
const missingPreparedAnswers = PREPARED_ANSWER_LABELS.filter(
  (label) => !allOptionLabels.includes(label),
);

check(
  'followUp',
  "the spec's three prepared demo answers appear as selectable options",
  missingPreparedAnswers.length === 0,
  `missing: ${missingPreparedAnswers.join(' | ')}`,
);

section('Content tests — Decode It, product manager check-in (spec §9.1)');

/**
 * The demo-critical rule: no assertion of anger anywhere except inside `unknowns`, where the
 * whole claim is that the emotion is unknowable. Word-boundary matched, so "irritation" inside
 * a neutral observation about wording is not a false positive while "irritated" as a claim
 * about the sender would be caught.
 */
const ANGER_WORDS = '(annoyed|angry|frustrated|irritated|impatient)';
const angerGlobal = new RegExp(`\\b${ANGER_WORDS}\\b`, 'gi');
const angerSingle = new RegExp(`\\b${ANGER_WORDS}\\b`, 'i');

const decodeScanTarget: Record<string, unknown> = { ...decode };
delete decodeScanTarget.unknowns;
const angerHits = JSON.stringify(decodeScanTarget).match(angerGlobal) ?? [];

check(
  'decode',
  'claims no anger outside the `unknowns` section',
  angerHits.length === 0,
  `found: ${angerHits.join(', ')}`,
);

check(
  'decode',
  '`unknowns` explicitly names the emotion as undeterminable',
  decode.unknowns.some((unknown) => angerSingle.test(unknown)),
);

check(
  'decode',
  'has exactly 3 response options',
  decode.responseOptions.length === 3,
  `got: ${decode.responseOptions.length}`,
);

check(
  'decode',
  'the literal reading is a request for current status',
  /status/i.test(decode.literalMeaning),
);

check(
  'decode',
  'at least one `plausible` interpretation covers planning or reporting upward',
  [...decode.likelyPurpose, ...decode.interpretations].some(
    (item) =>
      item.support === 'plausible' && /plan|report|stakeholder|someone else/i.test(item.text),
  ),
);

check(
  'decode',
  'knownFacts are genuinely factual: the ask, and the absence of a stated deadline',
  decode.knownFacts.length >= 2 && decode.knownFacts.some((fact) => /deadline/i.test(fact)),
);

check(
  'decode',
  'every toneCue quotes wording and pairs it with a neutral observation',
  decode.toneCues.length > 0 &&
    decode.toneCues.every(
      (cue) => cue.cue.trim().length > 0 && cue.observation.trim().length > 0,
    ),
);

section('Content tests — Conflict Lens, Alex and Sam (spec §9.2)');

const speakerIds = CONFLICT_ALEX_SAM_SPEAKERS.map((speaker) => speaker.id);
const participantIds = conflict.participants.map((participant) => participant.speakerId);

check(
  'conflict',
  'exactly 2 participants, whose speakerIds match the exported speakers',
  conflict.participants.length === 2 &&
    participantIds.length === speakerIds.length &&
    participantIds.every((id) => speakerIds.includes(id)) &&
    speakerIds.every((id) => participantIds.includes(id)),
  `speakers: ${speakerIds.join(', ')} / participants: ${participantIds.join(', ')}`,
);

check(
  'conflict',
  'exactly one speaker is marked as the user',
  CONFLICT_ALEX_SAM_SPEAKERS.filter((speaker) => speaker.isUser).length === 1,
);

const coreProblemLower = conflict.coreProblem.toLowerCase();

check(
  'conflict',
  'coreProblem names the missing definition of done AND low trust',
  /complet|definition of done|when the task is done/.test(coreProblemLower) &&
    /trust/.test(coreProblemLower),
  `coreProblem: ${conflict.coreProblem}`,
);

check(
  'conflict',
  'coreProblem is not "they should communicate better"',
  !/should communicate better|need to communicate better/.test(coreProblemLower),
);

const REQUIRED_EXCERPTS = ["You don't have to keep reminding me", 'Just do it yourself then'];
const excerptText = conflict.escalationPoints.map((point) => point.excerpt).join(' | ');
const missingExcerpts = REQUIRED_EXCERPTS.filter((excerpt) => !excerptText.includes(excerpt));

check(
  'conflict',
  'escalation points quote the real excerpts from the conversation',
  missingExcerpts.length === 0,
  `missing: ${missingExcerpts.join(' | ')}`,
);

check(
  'conflict',
  'every escalation point pairs an observation with an effect',
  conflict.escalationPoints.length > 0 &&
    conflict.escalationPoints.every(
      (point) => point.observation.trim().length > 0 && point.effect.trim().length > 0,
    ),
);

check(
  'conflict',
  'declares neither person right',
  /neither person is wrong|neither person is right|not about who is right|neither of us is being unreasonable/i.test(
    `${conflict.coreProblem} ${conflict.neutralSummary} ${conflict.repairMessage}`,
  ),
);

check('conflict', 'a shared goal is identified', (conflict.sharedGoal ?? '').trim().length > 0);

check(
  'conflict',
  'every resolution option states a tradeoff',
  conflict.resolutionOptions.length >= 2 &&
    conflict.resolutionOptions.length <= 4 &&
    conflict.resolutionOptions.every((option) => (option.tradeoff ?? '').trim().length > 0),
);

check(
  'conflict',
  'no falseEquivalenceWarning (nothing harmful in this scenario)',
  conflict.falseEquivalenceWarning === undefined,
);


section('Content tests — Conflict Lens fallback, the Saturday dinner');

/**
 * The stage fallback. It is served in place of a failed live analysis, so it is held to the same
 * bar as everything else — and additionally has to bind to runtime speakers and refuse to fire on
 * a conversation that is not the one it analyses.
 */
const dinnerSpeakers = [
  { id: 'you', label: 'You', role: 'Spouse/partner', isUser: true },
  { id: 'spouse-partner', label: 'Spouse/partner', role: 'Spouse/partner', isUser: false },
];
const dinner = buildSaturdayDinner(dinnerSpeakers);

check('dinner', 'builds a response for two speakers with one marked as the user', dinner !== null);

if (dinner) {
  const dinnerResult = validateResponse('conflict_lens', dinner);
  check(
    'dinner',
    'passes the same schema a live response passes',
    dinnerResult.ok,
    dinnerResult.ok ? '' : JSON.stringify(dinnerResult.issues),
  );

  check(
    'dinner',
    'participant speakerIds are stamped from the speakers passed in',
    dinner.participants.map((participant) => participant.speakerId).join(',') ===
      'you,spouse-partner',
  );

  const dinnerExcerpts = dinner.escalationPoints.map((point) => point.excerpt);
  const normalizedConversation = SATURDAY_DINNER_CONVERSATION.replace(/[\u2018\u2019]/g, "'");
  const notInConversation = dinnerExcerpts.filter(
    (excerpt) => !normalizedConversation.includes(excerpt.replace(/[\u2018\u2019]/g, "'")),
  );
  check(
    'dinner',
    'every escalation excerpt is a real line from the conversation',
    notInConversation.length === 0,
    `not found: ${notInConversation.join(' | ')}`,
  );

  check(
    'dinner',
    'every escalation point pairs an observation with an effect',
    dinner.escalationPoints.length > 0 &&
      dinner.escalationPoints.every(
        (point) => point.observation.trim().length > 0 && point.effect.trim().length > 0,
      ),
  );

  check(
    'dinner',
    'coreProblem is not "they should communicate better"',
    !/should communicate better|need to communicate better/i.test(dinner.coreProblem),
  );

  check(
    'dinner',
    'coreProblem lands on the decision, not on the dinner',
    /joint decision|on behalf of/i.test(dinner.coreProblem),
    `coreProblem: ${dinner.coreProblem}`,
  );

  check('dinner', 'a shared goal is identified', (dinner.sharedGoal ?? '').trim().length > 0);

  check(
    'dinner',
    'every resolution option states a tradeoff',
    dinner.resolutionOptions.every((option) => (option.tradeoff ?? '').trim().length > 0),
  );

  check(
    'dinner',
    'every inference carries its evidence',
    dinner.participants.every((participant) =>
      participant.possibleConcerns.every((concern) => (concern.evidence ?? '').trim().length > 0),
    ),
  );

  check(
    'dinner',
    'speculative inferences say they are not stated in the conversation',
    dinner.participants
      .flatMap((participant) => participant.possibleConcerns)
      .filter((concern) => concern.support === 'speculative')
      .every((concern) => /not stated|cannot be determined|inferred/i.test(concern.evidence ?? '')),
  );
}

check('dinner', 'refuses to bind when there is only one speaker', buildSaturdayDinner([]) === null);

check(
  'dinner',
  'refuses to bind when no speaker is marked as the user',
  buildSaturdayDinner([
    { id: 'a', label: 'A', role: 'x', isUser: false },
    { id: 'b', label: 'B', role: 'y', isUser: false },
  ]) === null,
);

check(
  'dinner',
  'matches its own conversation',
  matchesSaturdayDinner(SATURDAY_DINNER_CONVERSATION),
);

check(
  'dinner',
  'still matches with three messages dropped, as OCR may do',
  matchesSaturdayDinner(
    SATURDAY_DINNER_CONVERSATION.split('\n').slice(0, -3).join('\n'),
  ),
);

check(
  'dinner',
  'does NOT match the Alex and Sam kitchen conversation',
  !matchesSaturdayDinner(CONFLICT_ALEX_SAM_CONVERSATION),
);

check(
  'dinner',
  'does NOT match a different argument about a family dinner on Saturday',
  !matchesSaturdayDinner(
    [
      'Them: Are we still hosting your mother on Saturday?',
      'You: Yes, I said we would make it work.',
      'Them: I wish you had asked me first.',
    ].join('\n'),
  ),
);

section('Content tests — safety escalation (spec §20)');


check(
  'safety',
  'category is high_stakes_professional and standard output is still allowed',
  safetyFixture.safety?.category === 'high_stakes_professional' &&
    safetyFixture.safety?.allowStandardOutput === true,
);

check(
  'safety',
  'userMessage states this is communication assistance, not legal or HR advice',
  /not legal or hr advice/i.test(safetyFixture.safety?.userMessage ?? ''),
  `got: ${safetyFixture.safety?.userMessage ?? '(none)'}`,
);

section('Error fixtures — spec §25 copy');

check(
  'errors',
  'custom-content timeout uses the custom-content copy and offers no fixture',
  timeoutErrorCustomContent.kind === 'timeout' &&
    timeoutErrorCustomContent.fixtureAvailable === false &&
    timeoutErrorCustomContent.userMessage ===
      'The translation could not be completed. Your message has been preserved. Try again.',
);

check(
  'errors',
  "prepared-scenario timeout offers the fixture fallback with the spec's copy",
  timeoutErrorPreparedScenario.kind === 'timeout' &&
    timeoutErrorPreparedScenario.fixtureAvailable === true &&
    timeoutErrorPreparedScenario.userMessage ===
      'That took longer than expected. Show the saved example response instead?',
);

section('Prepared scenarios — spec §21');

check(
  'scenarios',
  'three prepared scenarios, with the expected ids',
  PREPARED_SCENARIOS.length === 3 &&
    ['engineer_pm_status', 'decode_pm_checkin', 'alex_sam_kitchen'].every((id) =>
      PREPARED_SCENARIOS.some((scenario) => scenario.id === id),
    ),
  `got: ${PREPARED_SCENARIOS.map((scenario) => scenario.id).join(', ')}`,
);

check(
  'scenarios',
  'every fixtureKey resolves to a fixture whose mode matches the scenario',
  PREPARED_SCENARIOS.every((scenario) => FIXTURES[scenario.fixtureKey].mode === scenario.mode),
);

check(
  'scenarios',
  'each scenario supplies the input its mode needs',
  PREPARED_SCENARIOS.every((scenario) =>
    scenario.mode === 'conflict_lens'
      ? Boolean(scenario.conversation) && scenario.speakers?.length === 2
      : Boolean(scenario.sourceText),
  ),
);

const engineerScenario = PREPARED_SCENARIOS.find(
  (scenario) => scenario.id === 'engineer_pm_status',
);

check(
  'scenarios',
  'engineer scenario is seeded with the three prepared answers',
  Object.keys(engineerScenario?.seededFollowUpAnswers ?? {}).length === 3 &&
    PREPARED_ANSWER_LABELS.every((label) =>
      Object.values(engineerScenario?.seededFollowUpAnswers ?? {}).includes(label),
    ),
  `got: ${JSON.stringify(engineerScenario?.seededFollowUpAnswers ?? {})}`,
);

check(
  'scenarios',
  "engineer scenario keeps humor unfiltered so the demo's laugh line renders",
  engineerScenario?.context.humorLevel === 'unfiltered',
);

const decodeScenario = PREPARED_SCENARIOS.find((scenario) => scenario.id === 'decode_pm_checkin');

check(
  'scenarios',
  'decode scenario reverses the role route (self Engineer, other Product manager)',
  decodeScenario?.context.selfRole === 'Engineer' &&
    decodeScenario?.context.otherRole === 'Product manager',
);

/* ── Summary ─────────────────────────────────────────────────────────────── */

log('');
log('Summary');
log('=======');
log(`  fixtures validated : ${fixtureEntries.length}`);
log(`  checks run         : ${checksRun}`);
log(`  failures           : ${failures.length}`);

if (failures.length > 0) {
  log('');
  log('FIXTURE GATE FAILED');
  for (const failure of failures) {
    log(`  x [${failure.group}] ${failure.detail}`);
  }
  log('');
  process.exit(1);
}

log('');
log(`FIXTURE GATE PASSED - all ${checksRun} checks green.`);
log('');
