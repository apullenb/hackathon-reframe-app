/**
 * Deterministic fixture client — the demo-safe path that works with zero configuration.
 *
 * Holds no key and makes no network call. Fixtures go through `validateResponse()` exactly
 * like a live response: a fixture that skipped the gate would hide the bug the gate exists
 * to catch.
 */

import {
  FIXTURES,
  PREPARED_SCENARIOS,
  type FixtureKey,
  type PreparedScenario,
} from '@/fixtures';
import { validateResponse } from '@/schemas';
import type { ContextSwitchRequest } from '@/types/contracts';
import {
  aiError,
  readScenarioId,
  readSourceText,
  type AiResult,
  type AnalyzeOptions,
  type ContextSwitchAiClient,
} from './types';

/**
 * Artificial latency so the staged loading copy (spec §25) is actually visible in the demo.
 * Exported so polish work can tune it in one place.
 */
export const FIXTURE_DELAY_MS = 1300;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function scenarioInputText(scenario: PreparedScenario): string {
  return scenario.sourceText ?? scenario.conversation ?? '';
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Finds the prepared scenario a request corresponds to: an explicit `scenarioId` first, then
 * an exact (whitespace/case-insensitive) match on the scenario's own input text. Custom
 * content matches nothing — which is what makes `fixtureAvailable` honest in the router.
 */
export function findPreparedScenario(request: ContextSwitchRequest): PreparedScenario | null {
  const scenarioId = readScenarioId(request);
  if (scenarioId) {
    const byId = PREPARED_SCENARIOS.find((scenario) => scenario.id === scenarioId);
    if (byId && byId.mode === request.mode) return byId;
  }

  const input = normalize(readSourceText(request));
  if (input.length === 0) return null;
  return (
    PREPARED_SCENARIOS.find(
      (scenario) =>
        scenario.mode === request.mode && normalize(scenarioInputText(scenario)) === input,
    ) ?? null
  );
}

/** True when this request is a prepared scenario, i.e. a fixture may honestly be offered. */
export function hasPreparedFixture(request: ContextSwitchRequest): boolean {
  return findPreparedScenario(request) !== null;
}

function hasAnsweredFollowUps(request: ContextSwitchRequest): boolean {
  if (request.mode !== 'say_it_better') return false;
  const answers = request.followUpAnswers;
  if (!answers) return false;
  return Object.values(answers).some((value) => value.trim().length > 0);
}

/**
 * Fixture selection.
 *
 * Say It Better has two fixtures on purpose: the Honesty Guard follow-up and the sendable
 * result. A first pass with no follow-up answers returns the follow-up fixture, so the
 * flagship demo shows the guard firing (spec §8, §18) instead of skipping straight to the
 * polished message. Once answers exist, the sendable fixture is returned.
 */
function selectFixtureKey(request: ContextSwitchRequest): FixtureKey | null {
  const scenario = findPreparedScenario(request);

  if (scenario) {
    if (scenario.mode === 'say_it_better' && !hasAnsweredFollowUps(request)) {
      return 'sayItBetterFollowUp';
    }
    return scenario.fixtureKey;
  }

  // No prepared scenario: fall back to the first fixture for this mode. Reached only in
  // AI_MODE=fixture, where the contract is "always deterministic prepared responses".
  const byMode = PREPARED_SCENARIOS.find((entry) => entry.mode === request.mode);
  if (byMode) {
    if (byMode.mode === 'say_it_better' && !hasAnsweredFollowUps(request)) {
      return 'sayItBetterFollowUp';
    }
    return byMode.fixtureKey;
  }

  const entry = (Object.entries(FIXTURES) as Array<[FixtureKey, { mode: string }]>).find(
    ([, fixture]) => fixture.mode === request.mode,
  );
  return entry ? entry[0] : null;
}

export class FixtureAiClient implements ContextSwitchAiClient {
  readonly source = 'fixture' as const;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  /** Synchronous availability check for the router's preference ordering. */
  hasFixtureFor(request: ContextSwitchRequest): boolean {
    return hasPreparedFixture(request);
  }

  async analyze(request: ContextSwitchRequest, options: AnalyzeOptions = {}): Promise<AiResult> {
    const started = Date.now();
    const key = selectFixtureKey(request);

    if (!key) {
      return {
        ok: false,
        source: 'fixture',
        error: aiError('no_client_available', {
          detail: `no fixture for mode ${request.mode}`,
          userMessage: 'There is no prepared demo response for this mode yet.',
        }),
      };
    }

    try {
      await delay(FIXTURE_DELAY_MS, options.signal);
    } catch {
      return { ok: false, source: 'fixture', error: aiError('aborted') };
    }

    // Same gate as a live response — no exceptions for fixtures.
    const validated = validateResponse(request.mode, FIXTURES[key]);
    if (!validated.ok) {
      return {
        ok: false,
        source: 'fixture',
        error: aiError('schema_invalid', {
          detail: `fixture ${key}: ${validated.issues.join('; ')}`,
          userMessage:
            'The prepared demo response failed validation, so it was not shown. This is a bug in the fixture, not in your message.',
        }),
      };
    }

    return {
      ok: true,
      source: 'fixture',
      response: validated.value,
      latencyMs: Date.now() - started,
    };
  }
}
