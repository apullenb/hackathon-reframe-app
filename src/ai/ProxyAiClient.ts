/**
 * Dev-proxy client — the live-AI path for a local demo.
 *
 * KEY HANDLING: this client holds NO key and never sees one. It POSTs already-rendered prompt
 * text to `/api/context-switch`, which is served by vite-plugin-ai-proxy.ts inside the Node
 * process. The key stays in that process.
 *
 * This file also exports the shared model-output pipeline (`extractJsonObject`,
 * `runStructuredExchange`) that DirectAiClient reuses, so JSON extraction, the Zod gate, and
 * the retry-once-on-schema-failure rule exist in exactly one place.
 */

import { validateResponse } from '@/schemas';
import type {
  AiSource,
  ContextSwitchMode,
  ContextSwitchRequest,
  ContextSwitchResponse,
} from '@/types/contracts';
import { buildPrompt, buildRepairPrompt, type PromptPair } from './prompts';
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT_MS,
  PROXY_ENDPOINT,
  PROXY_HEALTH_ENDPOINT,
  aiError,
  type AiResult,
  type AnalyzeOptions,
  type ContextSwitchAiClient,
} from './types';

const HEALTH_TIMEOUT_MS = 1200;

/* ── Shared model-output pipeline ────────────────────────────────────────── */

/**
 * Pulls the outermost balanced JSON object out of a model's text response.
 *
 * Models sometimes wrap JSON in prose or a ```json fence. A naive regex fails on nested
 * braces and on braces inside string literals, so this walks the string tracking string state
 * and escapes. Returns null when no balanced object exists.
 */
export function extractJsonObject(text: string): string | null {
  let body = text.trim();

  // Strip a leading/trailing markdown fence if present.
  const fenced = /^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/.exec(body);
  if (fenced) body = fenced[1].trim();

  const start = body.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < body.length; index += 1) {
    const char = body[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return body.slice(start, index + 1);
      }
    }
  }

  return null;
}

/** Sends one rendered prompt pair and resolves the model's raw text. Implemented per client. */
/** What a transport returns: the model's text, plus which provider produced it when known. */
export type SendResult = {
  text: string;
  provider?: string;
  failedOver?: readonly string[];
};

export type SendPrompt = (prompt: PromptPair, signal: AbortSignal) => Promise<SendResult>;

/**
 * Non-schema failures a transport can report. Kept as a typed throw so the shared pipeline can
 * map transports onto the same `ContextSwitchError` kinds.
 */
export class TransportError extends Error {
  constructor(
    readonly kind: 'network' | 'provider_error' | 'no_client_available',
    readonly detail: string,
  ) {
    super(kind);
    this.name = 'TransportError';
  }
}

function parseCandidate(raw: string): unknown | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

type Attempt =
  | { ok: true; value: ContextSwitchResponse }
  | { ok: false; issues: string[] };

function attemptValidation(mode: ContextSwitchMode, raw: string): Attempt {
  const candidate = parseCandidate(raw);
  if (candidate === null) {
    return { ok: false, issues: ['(root): response did not contain a parseable JSON object.'] };
  }
  const validated = validateResponse(mode, candidate);
  if (validated.ok) return { ok: true, value: validated.value };
  return { ok: false, issues: validated.issues };
}

/**
 * The one live-response pipeline: send -> extract JSON -> validate -> on failure retry ONCE
 * with a schema-repair instruction -> on second failure return a typed `schema_invalid` error
 * (spec §25).
 *
 * Raw model output is never returned, rendered, or logged. Only Zod issue strings
 * (`path: message`) travel back, and those contain no model output and no user content.
 */
export async function runStructuredExchange(
  request: ContextSwitchRequest,
  source: AiSource,
  send: SendPrompt,
  options: AnalyzeOptions = {},
): Promise<AiResult> {
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = (): void => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort, { once: true });

  const finish = (): void => {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  };

  try {
    const prompt = buildPrompt(request);
    const first = await send(prompt, controller.signal);
    const firstAttempt = attemptValidation(request.mode, first.text);

    if (firstAttempt.ok) {
      finish();
      return {
        ok: true,
        source,
        response: firstAttempt.value,
        latencyMs: Date.now() - started,
        provider: first.provider,
        failedOver: first.failedOver,
      };
    }

    // One repair attempt. The issue strings are safe to echo back — they are Zod paths and
    // messages, never model output.
    const second = await send(
      buildRepairPrompt(prompt, firstAttempt.issues),
      controller.signal,
    );
    const secondAttempt = attemptValidation(request.mode, second.text);

    if (secondAttempt.ok) {
      finish();
      return {
        ok: true,
        source,
        response: secondAttempt.value,
        latencyMs: Date.now() - started,
        provider: second.provider,
        failedOver: second.failedOver,
      };
    }

    finish();
    return {
      ok: false,
      source,
      error: aiError('schema_invalid', {
        detail: `two attempts failed validation: ${secondAttempt.issues.slice(0, 4).join('; ')}`,
      }),
    };
  } catch (error) {
    finish();

    if (error instanceof TransportError) {
      return { ok: false, source, error: aiError(error.kind, { detail: error.detail }) };
    }
    const aborted = error instanceof Error && error.name === 'AbortError';
    if (aborted) {
      return {
        ok: false,
        source,
        error: timedOut
          ? aiError('timeout', { detail: `no response within ${timeoutMs}ms` })
          : aiError('aborted'),
      };
    }
    return {
      ok: false,
      source,
      error: aiError('network', {
        detail: error instanceof Error ? error.name : 'unknown_error',
      }),
    };
  }
}

/* ── Proxy client ────────────────────────────────────────────────────────── */

interface ProxySuccess {
  text?: unknown;
  /** Which provider in the relay's chain served this request. */
  provider?: unknown;
  /** Providers that failed before the one that served it. */
  failedOver?: unknown;
}

interface ProxyFailure {
  error?: unknown;
  /** Provider-generated explanation, present only for configuration-class failures. */
  providerMessage?: unknown;
}

interface ProxyHealth {
  ok?: unknown;
  keyConfigured?: unknown;
  model?: unknown;
  mode?: unknown;
}

export interface ProxyHealthResult {
  reachable: boolean;
  keyConfigured: boolean;
  model: string | null;
  mode: string | null;
}

/** GETs the dev-proxy health route. `keyConfigured` is a boolean; no key crosses this wire. */
export async function probeProxyHealth(): Promise<ProxyHealthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(PROXY_HEALTH_ENDPOINT, {
      method: 'GET',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      return { reachable: false, keyConfigured: false, model: null, mode: null };
    }
    const payload = (await response.json()) as ProxyHealth;
    return {
      reachable: payload.ok === true,
      keyConfigured: payload.keyConfigured === true,
      model: typeof payload.model === 'string' ? payload.model : null,
      mode: typeof payload.mode === 'string' ? payload.mode : null,
    };
  } catch {
    return { reachable: false, keyConfigured: false, model: null, mode: null };
  } finally {
    clearTimeout(timer);
  }
}

export class ProxyAiClient implements ContextSwitchAiClient {
  readonly source = 'proxy' as const;

  async isAvailable(): Promise<boolean> {
    const health = await probeProxyHealth();
    return health.keyConfigured;
  }

  async analyze(request: ContextSwitchRequest, options: AnalyzeOptions = {}): Promise<AiResult> {
    return runStructuredExchange(request, 'proxy', sendViaProxy, options);
  }
}

const sendViaProxy: SendPrompt = async (prompt, signal) => {
  let response: Response;
  try {
    response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      // No key, no model: the proxy supplies both from the Node-side AI_MODEL / API key.
      body: JSON.stringify({
        system: prompt.system,
        user: prompt.user,
        maxTokens: DEFAULT_MAX_TOKENS,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new TransportError('network', 'dev proxy unreachable');
  }

  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as ProxyFailure;
    const code = typeof failure.error === 'string' ? failure.error : `http_${response.status}`;
    if (response.status === 503 && code === 'no_key_configured') {
      throw new TransportError('no_client_available', 'proxy has no key configured');
    }
    // Carry the provider's own explanation when it sent one. It only accompanies
    // configuration-class failures (auth, billing, rate limit, bad model), so it names what the
    // operator has to fix rather than leaving them with an opaque code.
    const providerMessage =
      typeof failure.providerMessage === 'string' && failure.providerMessage.trim().length > 0
        ? ` — ${failure.providerMessage.trim()}`
        : '';
    throw new TransportError('provider_error', `${response.status}:${code}${providerMessage}`);
  }

  const payload = (await response.json()) as ProxySuccess;
  if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
    throw new TransportError('provider_error', 'proxy returned no text');
  }
  return {
    text: payload.text,
    provider: typeof payload.provider === 'string' ? payload.provider : undefined,
    failedOver: Array.isArray(payload.failedOver)
      ? payload.failedOver.filter((entry): entry is string => typeof entry === 'string')
      : undefined,
  };
};
