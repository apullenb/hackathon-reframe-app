/**
 * Bring-your-own-key client (CLAUDE.md `byok`) — used ONLY when the dev proxy is unreachable
 * and the user has pasted their own key.
 *
 * ============================ KEY HANDLING (AUDIT POINT) ============================
 * This is the ONLY file in the browser bundle that touches an API key, and the key store
 * below is the only code that reads or writes it. Everything about it:
 *   - it is supplied at runtime by the user, never by an env var, never by a VITE_ var
 *   - it lives in the module-scoped `userKey` variable, mirrored to sessionStorage under
 *     KEY_STORAGE_KEY so a page refresh mid-demo does not lose it
 *   - NEVER localStorage, never a cookie, never a URL or query string, never logged,
 *     never included in an error, never rendered
 *   - clearUserKey() wipes both memory and sessionStorage (Reset Demo calls it)
 * The only outbound use is the `x-api-key` header inside `DirectAiClient.createSender()` below.
 * ====================================================================================
 */

import type { ContextSwitchRequest } from '@/types/contracts';
import {
  TransportError,
  runStructuredExchange,
  type SendPrompt,
} from './ProxyAiClient';
import {
  DEFAULT_AI_MODEL,
  DEFAULT_MAX_TOKENS,
  type AiResult,
  type AnalyzeOptions,
  type ContextSwitchAiClient,
} from './types';

/* ── Key store (the whole of it) ─────────────────────────────────────────── */

const KEY_STORAGE_KEY = 'context-switch:user-key';

let userKey: string | null = null;

function session(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // Storage can throw in a locked-down browser context; memory-only is a fine fallback.
    return null;
  }
}

/** Stores the user's key in memory and sessionStorage. Never logs it. */
export function setUserKey(key: string): void {
  const trimmed = key.trim();
  userKey = trimmed.length > 0 ? trimmed : null;
  const storage = session();
  if (!storage) return;
  try {
    if (userKey) storage.setItem(KEY_STORAGE_KEY, userKey);
    else storage.removeItem(KEY_STORAGE_KEY);
  } catch {
    // Non-fatal: the in-memory copy still works for this page view.
  }
}

export function getUserKey(): string | null {
  if (userKey) return userKey;
  const storage = session();
  if (!storage) return null;
  try {
    const stored = storage.getItem(KEY_STORAGE_KEY);
    userKey = stored && stored.trim().length > 0 ? stored.trim() : null;
    return userKey;
  } catch {
    return null;
  }
}

/** Wipes memory AND sessionStorage. Called by Reset Demo. */
export function clearUserKey(): void {
  userKey = null;
  const storage = session();
  if (!storage) return;
  try {
    storage.removeItem(KEY_STORAGE_KEY);
  } catch {
    // Nothing else to do — memory is already cleared.
  }
}

export function hasUserKey(): boolean {
  return getUserKey() !== null;
}

/* ── Privacy copy (spec §20) ─────────────────────────────────────────────── */

/**
 * Accurate, restrained copy for the key drawer. It must NOT claim messages stay on the
 * device — in this mode they do not.
 */
export const DIRECT_MODE_PRIVACY_NOTICE =
  'Your key is sent from this browser directly to Anthropic, along with the message text you enter. Nothing is proxied through a server of ours, and nothing is saved to disk: the key is held in memory and in this tab’s session storage only, and Start over erases it. Your messages do leave this device — they go to Anthropic, whose own retention terms apply. Avoid pasting anything you would not want processed by the configured AI provider.';

/* ── Client ──────────────────────────────────────────────────────────────── */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicTextBlock {
  type?: unknown;
  text?: unknown;
}

interface AnthropicPayload {
  content?: unknown;
  error?: { type?: unknown };
}

function extractText(payload: AnthropicPayload): string {
  if (!Array.isArray(payload.content)) return '';
  return (payload.content as AnthropicTextBlock[])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n')
    .trim();
}

export class DirectAiClient implements ContextSwitchAiClient {
  readonly source = 'direct' as const;

  constructor(private readonly model: string = DEFAULT_AI_MODEL) {}

  /** Available exactly when the user has supplied a key. No network probe needed. */
  async isAvailable(): Promise<boolean> {
    return hasUserKey();
  }

  async analyze(request: ContextSwitchRequest, options: AnalyzeOptions = {}): Promise<AiResult> {
    // Same pipeline as the proxy: JSON extraction, the Zod gate, and one schema repair.
    return runStructuredExchange(request, 'direct', this.createSender(), options);
  }

  private createSender(): SendPrompt {
    const model = this.model;
    return async (prompt, signal) => {
      const key = getUserKey();
      if (!key) {
        throw new TransportError('no_client_available', 'no user key supplied');
      }

      let response: Response;
      try {
        response = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          signal,
          headers: {
            'content-type': 'application/json',
            // The single outbound use of the user's key in the browser.
            'x-api-key': key,
            'anthropic-version': ANTHROPIC_VERSION,
            // Required for a browser-origin call to the Anthropic API.
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            max_tokens: DEFAULT_MAX_TOKENS,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
          }),
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        throw new TransportError('network', 'anthropic api unreachable from browser');
      }

      if (!response.ok) {
        // Read only the provider's error TYPE enum. The raw body is never surfaced or logged.
        const payload = (await response.json().catch(() => ({}))) as AnthropicPayload;
        const type = typeof payload.error?.type === 'string' ? payload.error.type : 'unknown';
        if (response.status === 401 || response.status === 403) {
          throw new TransportError('provider_error', `${response.status}:auth_failed`);
        }
        throw new TransportError('provider_error', `${response.status}:${type}`);
      }

      const payload = (await response.json()) as AnthropicPayload;
      const text = extractText(payload);
      if (text.length === 0) {
        throw new TransportError('provider_error', 'empty_response');
      }
      // This path is Anthropic-only by design: the browser-key route exists as a last resort
      // for a static build, and adding a second provider here would mean asking the user to
      // paste a second key into the browser. Failover lives on the server route instead.
      return { text, provider: 'anthropic' };
    };
  }
}
