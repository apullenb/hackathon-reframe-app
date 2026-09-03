/**
 * Platform relay — the live-AI path when this build is hosted on Realms / Vibeland
 * (vibeland.240.org).
 *
 * WHY THIS EXISTS: the dev-server relay in vite-plugin-ai-proxy.ts only exists while `npm run
 * dev` is running. A statically hosted build has no Node process, which is why the GitHub Pages
 * build can only offer prepared responses or ask the visitor for their own key. Vibeland does
 * have a server side: it holds an Anthropic key and exposes it at a per-app route. So on that
 * host the app gets full live AI with the key on the server, exactly like local dev — and the
 * bring-your-own-key path is never needed.
 *
 * KEY HANDLING: unchanged in principle. This file holds no key and never sees one. It POSTs
 * rendered prompt text to a same-origin path; the platform attaches the key server-side. The
 * request rides the caller's existing SSO session, so there is no token to store either.
 *
 * WIRE SHAPE: unlike the dev relay's `{ system, user, maxTokens }`, this route takes a plain
 * Anthropic Messages API body and returns the Messages response untouched.
 */

import { DEFAULT_AI_MODEL, TransportError } from './types';

/**
 * Set by the build (`VITE_DEPLOY_TARGET=vibeland`), forwarded through vite.config.ts's `define`
 * block alongside VITE_AI_MODE. It is a non-secret deployment label, safe to inline.
 */
function deployTarget(): string {
  return import.meta.env.VITE_DEPLOY_TARGET ?? '';
}

/** True only in a build made for the Vibeland/Realms host. */
export function isPlatformRelay(): boolean {
  return deployTarget() === 'vibeland';
}

/** Model id sent to the relay. Must be one the platform allows. */
export const PLATFORM_RELAY_MODEL = DEFAULT_AI_MODEL;

/** Fallback slug baked at build time, used only if the path does not yield a usable one. */
const BUILD_SLUG = (import.meta.env.VITE_VIBELAND_SLUG ?? '').trim();

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The app's own slug, which is the first path segment on the platform: the app is served from
 * `/<slug>/`, inside the platform's iframe wrapper. Read from the path rather than hardcoded so
 * a slug rename does not silently break live AI.
 */
export function platformSlug(): string {
  const fromPath =
    typeof window === 'undefined' ? '' : window.location.pathname.split('/').filter(Boolean)[0];
  if (fromPath && SLUG_PATTERN.test(fromPath)) return fromPath;
  return BUILD_SLUG;
}

/** Per-app relay route. Same-origin, so the SSO cookie rides along on its own. */
export function platformRelayEndpoint(): string {
  return `/api/_ai/${platformSlug()}/messages`;
}

/* ── Transport ───────────────────────────────────────────────────────────── */

/** A Messages API content value: plain text, or blocks when an image is attached. */
export type RelayContent = string | readonly unknown[];

interface MessagesTextBlock {
  type?: unknown;
  text?: unknown;
}

interface MessagesPayload {
  content?: unknown;
  error?: { type?: unknown };
}

function extractText(payload: MessagesPayload): string {
  if (!Array.isArray(payload.content)) return '';
  return (payload.content as MessagesTextBlock[])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n')
    .trim();
}

/**
 * Sends one exchange through the platform relay and resolves the model's raw text.
 *
 * Throws `TransportError` for every expected failure so callers map onto the same typed error
 * kinds as the other two clients. Raw model output is never logged, and no request body is
 * echoed back into an error.
 */
export async function callPlatformRelay(args: {
  system: string;
  content: RelayContent;
  maxTokens: number;
  signal: AbortSignal;
}): Promise<string> {
  let response: Response;
  try {
    response = await fetch(platformRelayEndpoint(), {
      method: 'POST',
      signal: args.signal,
      headers: { 'content-type': 'application/json' },
      // No key and no auth header: the platform attaches the key and reads identity from the
      // session cookie already on the request.
      body: JSON.stringify({
        model: PLATFORM_RELAY_MODEL,
        max_tokens: args.maxTokens,
        system: args.system,
        messages: [{ role: 'user', content: args.content }],
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new TransportError('network', 'platform relay unreachable');
  }

  if (!response.ok) {
    // The relay cannot be probed ahead of time — whether a key is configured is only knowable
    // from a real request — so these two statuses are the whole of that signal.
    if (response.status === 403) {
      throw new TransportError(
        'no_client_available',
        'platform relay has no key configured',
        'Live AI is not switched on for this app yet. An owner needs to add a Claude API key in Manage → Claude API key. The built-in examples still work.',
      );
    }
    if (response.status === 429) {
      throw new TransportError(
        'provider_error',
        '429:rate_limited',
        'That is more requests than this app is allowed in a minute. Wait a moment and try again — your message has been preserved.',
      );
    }
    const payload = (await response.json().catch(() => ({}))) as MessagesPayload;
    const type = typeof payload.error?.type === 'string' ? payload.error.type : 'unknown';
    throw new TransportError('provider_error', `${response.status}:${type}`);
  }

  const payload = (await response.json()) as MessagesPayload;
  const text = extractText(payload);
  if (text.length === 0) {
    throw new TransportError('provider_error', 'empty_response');
  }
  return text;
}
