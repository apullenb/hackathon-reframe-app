/**
 * Public surface of the AI layer.
 *
 * The UI imports from here and never from a client directly, with one exception: the key
 * drawer imports the key store from DirectAiClient (re-exported below) so there is exactly
 * one place a key is written, read, or cleared.
 */

export type {
  AiResult,
  AiRuntimeConfig,
  AnalyzeOptions,
  ContextSwitchAiClient,
} from './types';
export {
  DEFAULT_AI_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT_MS,
  PROXY_ENDPOINT,
  PROXY_HEALTH_ENDPOINT,
  aiError,
  isAiMode,
  isContextSwitchMode,
  readScenarioId,
  readSourceText,
} from './types';

export {
  FixtureAiClient,
  FIXTURE_DELAY_MS,
  findPreparedScenario,
  hasPreparedFixture,
} from './FixtureAiClient';

export {
  ProxyAiClient,
  extractJsonObject,
  probeProxyHealth,
  runStructuredExchange,
  type ProxyHealthResult,
  type SendPrompt,
} from './ProxyAiClient';

// The key store, re-exported so the settings drawer and Reset Demo have one import path.
// `getUserKey` is deliberately NOT re-exported: only DirectAiClient itself needs to read the
// key, and keeping it off the public surface keeps the read site auditable.
export {
  DIRECT_MODE_PRIVACY_NOTICE,
  DirectAiClient,
  clearUserKey,
  hasUserKey,
  setUserKey,
} from './DirectAiClient';

export {
  createAiRouter,
  createDefaultAiRuntimeConfig,
  resolveAiMode,
  type AiProbeResult,
  type AiRouter,
} from './router';

export {
  buildConflictLensPrompt,
  buildDecodePrompt,
  buildPrompt,
  buildRepairPrompt,
  buildSayItBetterPrompt,
  type PromptPair,
} from './prompts';
