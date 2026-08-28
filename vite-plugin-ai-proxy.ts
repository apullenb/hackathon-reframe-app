import type { Connect, Plugin, ResolvedConfig } from 'vite';
import { loadEnv } from 'vite';
import type { ServerResponse } from 'node:http';

/**
 * The AI relay — a dev-server route so the browser never holds a provider key.
 *
 * KEY HANDLING (the part most likely to leak a secret):
 *   - Keys are read via loadEnv(mode, cwd, '') — the empty prefix is required to see non-VITE_
 *     variables, and a key must NEVER be VITE_-prefixed, because those are inlined into the
 *     client bundle.
 *   - They live only in this module's closure, inside the Node process.
 *   - They are never logged, never returned in a response, and never put in a URL. Each key is
 *     used at exactly one place: the Authorization/x-api-key header of its provider's request.
 *   - /health reports only BOOLEANS about which providers are configured.
 *
 * FAILOVER:
 *   `AI_PROVIDER` names the primary and `AI_FALLBACK_PROVIDERS` a comma-separated chain. When a
 *   provider fails for a reason that is about the provider rather than about our request — auth,
 *   billing, rate limit, missing model, 5xx, timeout — the relay moves to the next configured
 *   provider and reports which one actually produced the text. Our own malformed input is
 *   rejected before any provider is called, so a provider 400 always means "this provider can't
 *   serve us", which is exactly when failing over is the right move.
 */

type ProviderId = 'anthropic' | 'openai' | 'compatible';

const PROVIDER_IDS: readonly ProviderId[] = ['anthropic', 'openai', 'compatible'];

const DEFAULTS = {
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  compatible: { baseUrl: '', model: '' },
} as const;

const ANTHROPIC_VERSION = '2023-06-01';
/** Text-only requests stay small. Image requests get their own, larger cap. */
const MAX_BODY_BYTES = 256 * 1024;
const MAX_BODY_BYTES_WITH_IMAGE = 8 * 1024 * 1024;
/** Spec §19: accept one image initially. */
const MAX_IMAGES = 1;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const PROVIDER_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 4096;

type Provider = {
  id: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
};

interface RelayImage {
  mediaType: string;
  /** Base64 payload with no data: prefix. */
  dataBase64: string;
}

interface RelayBody {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  /**
   * Optional images for a vision request. Held only for the duration of the call — the relay
   * never writes them anywhere (spec §19: discard the image after the request).
   */
  images?: RelayImage[];
}

type AttemptFailure = {
  provider: ProviderId;
  status: number;
  code: string;
  /** Provider-generated explanation. Configuration-class failures only. No user content. */
  providerMessage?: string;
};

type Attempt =
  | { ok: true; provider: ProviderId; model: string; text: string }
  | ({ ok: false; retryable: boolean } & AttemptFailure);

/* ── plumbing ─────────────────────────────────────────────────────────────── */

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function readBody(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  maxBytes: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    let settled = false;
    const fail = (status: number, error: string) => {
      if (settled) return;
      settled = true;
      sendJson(res, status, { error });
      resolve(null);
    };
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        fail(413, 'request_too_large');
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', () => fail(400, 'request_read_failed'));
  });
}

function parseRelayBody(raw: string): RelayBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  const { system, user, model, maxTokens } = candidate;
  if (typeof system !== 'string' || system.trim().length === 0) return null;
  if (typeof user !== 'string' || user.trim().length === 0) return null;
  const images: RelayImage[] = [];
  if (Array.isArray(candidate.images)) {
    for (const entry of candidate.images.slice(0, MAX_IMAGES)) {
      if (typeof entry !== 'object' || entry === null) return null;
      const image = entry as Record<string, unknown>;
      const mediaType = image.mediaType;
      const dataBase64 = image.dataBase64;
      if (typeof mediaType !== 'string' || typeof dataBase64 !== 'string') return null;
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mediaType)) return null;
      if (dataBase64.length === 0) return null;
      images.push({ mediaType, dataBase64 });
    }
  }

  return {
    system,
    user,
    model: typeof model === 'string' && model.length > 0 ? model : undefined,
    maxTokens:
      typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0
        ? Math.min(Math.floor(maxTokens), 8192)
        : undefined,
    images: images.length > 0 ? images : undefined,
  };
}

function errorCodeForStatus(status: number): string {
  if (status === 401 || status === 403) return 'provider_auth_failed';
  if (status === 404) return 'provider_model_not_found';
  if (status === 429) return 'provider_rate_limited';
  if (status >= 500) return 'provider_unavailable';
  return 'provider_rejected_request';
}

/** Pull the provider's own message. Both Anthropic and OpenAI nest it under `error.message`. */
function providerMessageFrom(raw: string): string | undefined {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; type?: string } };
    const msg = parsed?.error?.message;
    return msg ? String(msg).slice(0, 240) : undefined;
  } catch {
    return undefined;
  }
}

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/* ── provider calls ───────────────────────────────────────────────────────── */

interface AnthropicSuccess {
  content?: Array<{ type?: string; text?: string }>;
}

interface OpenAiSuccess {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/**
 * One attempt against one provider.
 *
 * `tokenField` and `withJsonMode` exist for a self-healing retry: OpenAI moved from `max_tokens`
 * to `max_completion_tokens` on newer models, and some OpenAI-compatible gateways reject
 * `response_format`. Rather than hardcode a guess about the user's chosen model, a 400 that names
 * either parameter is retried once with that parameter adjusted.
 */
async function callProvider(
  provider: Provider,
  body: RelayBody,
  options: { tokenField: 'max_tokens' | 'max_completion_tokens'; withJsonMode: boolean },
): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  const model = body.model ?? provider.model;
  const maxTokens = body.maxTokens ?? DEFAULT_MAX_TOKENS;

  try {
    let url: string;
    let headers: Record<string, string>;
    let payload: Record<string, unknown>;

    if (provider.id === 'anthropic') {
      url = `${provider.baseUrl}/v1/messages`;
      headers = {
        'content-type': 'application/json',
        // The only outbound use of this key. Node process only.
        'x-api-key': provider.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      };
      // Anthropic: image blocks precede the text block so the model reads the picture first.
      const anthropicContent: Array<Record<string, unknown>> = [
        ...(body.images ?? []).map((image) => ({
          type: 'image',
          source: { type: 'base64', media_type: image.mediaType, data: image.dataBase64 },
        })),
        { type: 'text', text: body.user },
      ];
      payload = {
        model,
        max_tokens: maxTokens,
        system: body.system,
        messages: [{ role: 'user', content: anthropicContent }],
      };
    } else {
      // OpenAI and any OpenAI-compatible gateway share this shape.
      url = `${provider.baseUrl}/chat/completions`;
      headers = {
        'content-type': 'application/json',
        // The only outbound use of this key. Node process only.
        authorization: `Bearer ${provider.apiKey}`,
      };
      // OpenAI-shaped vision: a content array of text plus data-URI image_url parts.
      const openAiUserContent = body.images
        ? [
            { type: 'text', text: body.user },
            ...body.images.map((image) => ({
              type: 'image_url',
              image_url: { url: `data:${image.mediaType};base64,${image.dataBase64}` },
            })),
          ]
        : body.user;
      payload = {
        model,
        [options.tokenField]: maxTokens,
        messages: [
          { role: 'system', content: body.system },
          { role: 'user', content: openAiUserContent },
        ],
        ...(options.withJsonMode ? { response_format: { type: 'json_object' } } : {}),
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const raw = await response.text();
      const providerMessage = providerMessageFrom(raw);

      // Self-heal a parameter mismatch before giving up on this provider.
      if (response.status === 400 && provider.id !== 'anthropic' && providerMessage) {
        const complaint = providerMessage.toLowerCase();
        if (complaint.includes('max_tokens') && options.tokenField === 'max_tokens') {
          console.warn(`[ai-proxy] ${provider.id}: retrying with max_completion_tokens`);
          return callProvider(provider, body, { ...options, tokenField: 'max_completion_tokens' });
        }
        if (complaint.includes('response_format') && options.withJsonMode) {
          console.warn(`[ai-proxy] ${provider.id}: retrying without JSON mode`);
          return callProvider(provider, body, { ...options, withJsonMode: false });
        }
      }

      // Summary only. No request body, no message content, no key.
      console.error(
        `[ai-proxy] ${provider.id} error status=${response.status} code=${errorCodeForStatus(response.status)}`,
      );
      if (providerMessage) console.error(`[ai-proxy] ${provider.id} says: ${providerMessage}`);

      return {
        ok: false,
        provider: provider.id,
        status: response.status,
        code: errorCodeForStatus(response.status),
        providerMessage,
        // Any provider error here is about the provider, not our payload: we validated the relay
        // body before calling, so failing over to the next provider is the correct response.
        retryable: true,
      };
    }

    let text = '';
    if (provider.id === 'anthropic') {
      const parsed = (await response.json()) as AnthropicSuccess;
      text = (parsed.content ?? [])
        .filter((block) => block?.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text as string)
        .join('')
        .trim();
    } else {
      const parsed = (await response.json()) as OpenAiSuccess;
      text = (parsed.choices?.[0]?.message?.content ?? '').trim();
    }

    if (text.length === 0) {
      console.error(`[ai-proxy] ${provider.id} returned no text`);
      return {
        ok: false,
        provider: provider.id,
        status: 502,
        code: 'provider_empty_response',
        retryable: true,
      };
    }

    return { ok: true, provider: provider.id, model, text };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error(`[ai-proxy] ${provider.id} ${aborted ? 'timed out' : 'unreachable'}`);
    return {
      ok: false,
      provider: provider.id,
      status: aborted ? 504 : 502,
      code: aborted ? 'provider_timeout' : 'provider_unreachable',
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ── plugin ───────────────────────────────────────────────────────────────── */

export function aiProxyPlugin(): Plugin {
  // Closure-scoped, Node-only. Nothing below puts a key into a response or a log line.
  let chain: Provider[] = [];
  let aiMode = 'auto';

  return {
    name: 'context-switch-ai-proxy',
    apply: 'serve',

    configResolved(config: ResolvedConfig) {
      // '' prefix is required to read non-VITE_ variables. Keys must never be VITE_-prefixed.
      const env = loadEnv(config.mode, process.cwd(), '');
      aiMode = (env.AI_MODE ?? '').trim() || 'auto';

      const build = (id: ProviderId): Provider => {
        if (id === 'anthropic') {
          return {
            id,
            apiKey: (env.ANTHROPIC_API_KEY ?? '').trim(),
            baseUrl: (env.ANTHROPIC_BASE_URL ?? '').trim() || DEFAULTS.anthropic.baseUrl,
            // AI_MODEL is honoured for backward compatibility with the original single-provider setup.
            model:
              (env.ANTHROPIC_MODEL ?? '').trim() ||
              (env.AI_MODEL ?? '').trim() ||
              DEFAULTS.anthropic.model,
          };
        }
        if (id === 'openai') {
          return {
            id,
            apiKey: (env.OPENAI_API_KEY ?? '').trim(),
            baseUrl: (env.OPENAI_BASE_URL ?? '').trim() || DEFAULTS.openai.baseUrl,
            model: (env.OPENAI_MODEL ?? '').trim() || DEFAULTS.openai.model,
          };
        }
        return {
          id,
          apiKey: (env.COMPATIBLE_API_KEY ?? '').trim(),
          baseUrl: (env.COMPATIBLE_BASE_URL ?? '').trim(),
          model: (env.COMPATIBLE_MODEL ?? '').trim(),
        };
      };

      const primary = ((env.AI_PROVIDER ?? '').trim() || 'anthropic').toLowerCase();
      const fallbacks = ((env.AI_FALLBACK_PROVIDERS ?? 'openai,compatible') as string)
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);

      const ordered = [primary, ...fallbacks].filter(isProviderId);
      const seen = new Set<ProviderId>();
      chain = ordered
        .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
        .map(build)
        // A provider that is not fully configured is simply absent from the chain. Not an
        // error — the next one is tried. The model is part of "configured": without it the
        // request went out with `model: ''` and the endpoint rejected it, which showed up as a
        // confusing extra entry in `attempts` rather than a clean skip.
        .filter(
          (provider) =>
            provider.apiKey.length > 0 &&
            provider.baseUrl.length > 0 &&
            provider.model.length > 0,
        );

      const summary = chain.map((provider) => `${provider.id}(${provider.model})`).join(' → ');
      console.warn(
        `[ai-proxy] dev route ready: providers=${chain.length ? summary : 'none configured'} mode=${aiMode}`,
      );
    },

    configureServer(server) {
      server.middlewares.use('/api/context-switch', (req, res, next) => {
        const path = (req.url ?? '/').split('?')[0];

        if (path === '/health' || path === '/health/') {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            sendJson(res, 405, { error: 'method_not_allowed' });
            return;
          }
          sendJson(res, 200, {
            ok: true,
            // BOOLEAN, and per-provider booleans. Never a key or any part of one.
            keyConfigured: chain.length > 0,
            providers: chain.map((provider) => ({ id: provider.id, model: provider.model })),
            model: chain[0]?.model ?? '',
            mode: aiMode,
          });
          return;
        }

        if (path !== '/' && path !== '') {
          next();
          return;
        }
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'method_not_allowed' });
          return;
        }
        void handlePost(req, res);
      });
    },
  };

  async function handlePost(req: Connect.IncomingMessage, res: ServerResponse): Promise<void> {
    if (chain.length === 0) {
      // 503 so the client falls back cleanly instead of hanging (spec §16).
      sendJson(res, 503, { error: 'no_key_configured' });
      return;
    }

    // A vision request is allowed to be large; a text-only request is not. Read with the
    // generous cap, then re-check against the strict cap once we know whether an image is
    // actually present, so the larger allowance cannot be claimed without one.
    const raw = await readBody(req, res, MAX_BODY_BYTES_WITH_IMAGE);
    if (raw === null) return; // 413/400 already sent.

    const body = parseRelayBody(raw);
    if (!body) {
      sendJson(res, 400, { error: 'invalid_request_body' });
      return;
    }
    if (!body.images && Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      sendJson(res, 413, { error: 'request_too_large' });
      return;
    }

    const failures: AttemptFailure[] = [];

    for (const provider of chain) {
      const attempt = await callProvider(provider, body, {
        tokenField: 'max_tokens',
        withJsonMode: provider.id === 'openai',
      });

      if (attempt.ok) {
        if (failures.length > 0) {
          console.warn(
            `[ai-proxy] served by ${attempt.provider} after ${failures.length} provider failure(s)`,
          );
        }
        sendJson(res, 200, {
          text: attempt.text,
          provider: attempt.provider,
          model: attempt.model,
          // So the UI can say honestly that it failed over.
          failedOver: failures.map((failure) => failure.provider),
        });
        return;
      }

      failures.push({
        provider: attempt.provider,
        status: attempt.status,
        code: attempt.code,
        providerMessage: attempt.providerMessage,
      });
      if (!attempt.retryable) break;
    }

    // Everything in the chain failed. Report the first failure as the headline and include the
    // whole chain — provider ids, statuses, codes and provider-authored messages only.
    const headline = failures[0];
    sendJson(res, headline.status === 429 ? 429 : 502, {
      error: headline.code,
      providerStatus: headline.status,
      providerMessage: headline.providerMessage,
      attempts: failures,
    });
  }
}
