/**
 * Shared AI-layer types and small pure helpers.
 *
 * KEY SAFETY: nothing in this file reads, stores, or transports an API key. The only two
 * places in the entire codebase that touch a key are:
 *   1. vite-plugin-ai-proxy.ts  (Node process only, never serialized to the client)
 *   2. src/ai/DirectAiClient.ts (bring-your-own-key, memory + sessionStorage only)
 */

import type {
  AiMode,
  AiSource,
  ContextSwitchError,
  ContextSwitchErrorKind,
  ContextSwitchMode,
  ContextSwitchRequest,
  ContextSwitchResponse,
} from '@/types/contracts';

export type AiResult =
  | {
      ok: true;
      response: ContextSwitchResponse;
      source: AiSource;
      latencyMs: number;
      /**
       * Which upstream provider actually produced the text ('anthropic' | 'openai' |
       * 'compatible'), when the transport reports one. The indicator shows this, because
       * "live" is not specific enough once there is a failover chain.
       */
      provider?: string;
      /** Providers that failed before the one that served this result. */
      failedOver?: readonly string[];
    }
  | { ok: false; error: ContextSwitchError; source: AiSource | null };

export interface AnalyzeOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ContextSwitchAiClient {
  readonly source: AiSource;
  /** Resolves with a validated response or a typed error. Never throws for expected failures. */
  analyze(request: ContextSwitchRequest, options?: AnalyzeOptions): Promise<AiResult>;
  /** Cheap check used by the router at startup. */
  isAvailable(): Promise<boolean>;
}

/**
 * Runtime configuration for the router.
 *
 * `model` is a non-secret provider model id. `hasUserKey` is a BOOLEAN — the key itself is
 * never carried in config, props, or state.
 */
export interface AiRuntimeConfig {
  mode: AiMode;
  model: string;
  hasUserKey: boolean;
}

/**
 * Fallback model id for the browser-side direct path. The dev proxy prefers the server-side
 * `AI_MODEL` env var (see .env.example) and only falls back to this.
 */
export const DEFAULT_AI_MODEL = 'claude-sonnet-5';

/** Generous enough for a live demo, short enough that a wedged provider can't kill the demo. */
export const DEFAULT_TIMEOUT_MS = 25_000;

/** Ceiling on model output. Conflict Lens is the largest response shape. */
export const DEFAULT_MAX_TOKENS = 4096;

/** Path served by vite-plugin-ai-proxy.ts on the dev server. */
export const PROXY_ENDPOINT = '/api/context-switch';
export const PROXY_HEALTH_ENDPOINT = '/api/context-switch/health';

/* ── User-facing error copy (spec §25) ───────────────────────────────────── */

const ERROR_COPY: Record<ContextSwitchErrorKind, string> = {
  timeout: 'The live translation took too long. Your message has been preserved.',
  network:
    'The translation could not be completed. Your message has been preserved. Try again.',
  schema_invalid:
    'The AI returned a response this app could not read safely. Nothing was shown to you unchecked. Your message has been preserved. Try again.',
  no_client_available:
    'Live translation is not configured right now. The built-in examples are still available.',
  provider_error:
    'The AI provider could not complete this request. Your message has been preserved. Try again.',
  aborted: 'That request was cancelled. Your message has been preserved.',
};

/**
 * Builds the only failure shape the UI ever sees. `detail` is restricted to non-sensitive
 * strings (status codes, provider error types, Zod issue paths) — never message content,
 * never a key, never raw model output.
 */
export function aiError(
  kind: ContextSwitchErrorKind,
  options: { detail?: string; fixtureAvailable?: boolean; userMessage?: string } = {},
): ContextSwitchError {
  return {
    kind,
    userMessage: options.userMessage ?? ERROR_COPY[kind],
    fixtureAvailable: options.fixtureAvailable ?? false,
    detail: options.detail,
  };
}

/* ── Request helpers ─────────────────────────────────────────────────────── */

/**
 * Prepared-scenario requests may carry a `scenarioId` the contract types do not declare
 * (spec §21 stores a "demo scenario identifier" alongside the form state). Read it
 * structurally rather than widening the request type.
 */
export function readScenarioId(request: ContextSwitchRequest): string | null {
  const candidate = (request as { scenarioId?: unknown }).scenarioId;
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

/** The user-authored text for a request, whichever field the mode uses. */
export function readSourceText(request: ContextSwitchRequest): string {
  return request.mode === 'conflict_lens' ? request.conversation : request.sourceText;
}

export function isAiMode(value: unknown): value is AiMode {
  return value === 'live' || value === 'fixture' || value === 'auto';
}

export function isContextSwitchMode(value: unknown): value is ContextSwitchMode {
  return value === 'say_it_better' || value === 'decode_it' || value === 'conflict_lens';
}
