/**
 * Typed AI error fixtures — spec §25 ("Live AI unavailable").
 *
 * Raw model output and provider error bodies are never rendered; the UI only ever sees a
 * `ContextSwitchError` whose `userMessage` is already written for a human. `detail` is for the
 * demo indicator and must never contain message content or a key.
 */

import type { ContextSwitchError } from '@/types/contracts';

/**
 * Timeout on CUSTOM content. There is no fixture to fall back to — substituting an unrelated
 * prepared response for the user's own message is a content-test failure (spec §27), so the
 * only honest move is to preserve the input and let them retry.
 */
export const timeoutErrorCustomContent: ContextSwitchError = {
  kind: 'timeout',
  userMessage:
    'The translation could not be completed. Your message has been preserved. Try again.',
  fixtureAvailable: false,
  detail: 'Request exceeded the client timeout. No saved example matches your own text.',
};

/**
 * Timeout on a PREPARED scenario. Here a fixture legitimately corresponds to the request, so
 * the UI may offer it as a substitute — the user still chooses.
 */
export const timeoutErrorPreparedScenario: ContextSwitchError = {
  kind: 'timeout',
  userMessage: 'That took longer than expected. Show the saved example response instead?',
  fixtureAvailable: true,
  detail: 'Request exceeded the client timeout. A saved example is available for this situation.',
};
