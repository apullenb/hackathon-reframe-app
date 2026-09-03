/// <reference types="vite/client" />

/**
 * Client router (spec §16).
 *
 * Preference order is ALWAYS: proxy -> direct (only when the user supplied a key) -> fixture.
 *
 * KEY HANDLING: this file reads exactly one env var, `VITE_AI_MODE`. That is a NON-SECRET UI
 * preference (live | fixture | auto) and is safe to inline into the browser bundle.
 *
 *   THE API KEY IS NEVER READ THIS WAY. Every VITE_-prefixed variable is inlined into the
 *   client bundle, so a key in one would be published with the app. The server key lives only
 *   in the Node process (vite-plugin-ai-proxy.ts), or on the Vibeland platform when the build
 *   targets it (platform.ts), and the BYOK key lives only in DirectAiClient.ts's runtime store.
 *   None of them is an env var this file can see.
 */

import type { AiMode, AiSource, ContextSwitchRequest } from '@/types/contracts';
import { FixtureAiClient, hasPreparedFixture } from './FixtureAiClient';
import { DirectAiClient, hasUserKey } from './DirectAiClient';
import { ProxyAiClient, probeProxyHealth } from './ProxyAiClient';
import { isPlatformRelay } from './platform';
import {
  DEFAULT_AI_MODEL,
  aiError,
  isAiMode,
  type AiResult,
  type AiRuntimeConfig,
  type AnalyzeOptions,
} from './types';

/**
 * Reads the AI mode from the client environment. Non-secret by design; defaults to 'auto'.
 */
export function resolveAiMode(): AiMode {
  const raw: string | undefined = import.meta.env.VITE_AI_MODE;
  return isAiMode(raw) ? raw : 'auto';
}

/** Startup config for the router. `hasUserKey` is a boolean — never the key itself. */
export function createDefaultAiRuntimeConfig(): AiRuntimeConfig {
  return {
    mode: resolveAiMode(),
    model: DEFAULT_AI_MODEL,
    hasUserKey: hasUserKey(),
  };
}

export interface AiProbeResult {
  /** Dev proxy answered its health route AND reports a configured key. */
  proxyAvailable: boolean;
  /** Model the proxy says it will use, for the demo indicator. */
  proxyModel: string | null;
  /** True only when live AI is wanted, the proxy is unusable, and no user key exists yet. */
  needsUserKey: boolean;
  /** Which client the router would use right now. */
  preferredSource: AiSource;
}

export interface AiRouter {
  analyze(request: ContextSwitchRequest, options?: AnalyzeOptions): Promise<AiResult>;
  /** Which client ACTUALLY produced the result currently on screen (demo indicator). */
  getActiveSource(): AiSource | null;
  probe(): Promise<AiProbeResult>;
  currentConfig(): AiRuntimeConfig;
}

export function createAiRouter(config: AiRuntimeConfig): AiRouter {
  const proxy = new ProxyAiClient();
  const direct = new DirectAiClient(config.model);
  const fixture = new FixtureAiClient();

  let activeSource: AiSource | null = null;
  let probed: AiProbeResult | null = null;
  let inFlightProbe: Promise<AiProbeResult> | null = null;

  const liveWanted = (): boolean => config.mode !== 'fixture';

  function preferredSource(proxyAvailable: boolean): AiSource {
    if (config.mode === 'fixture') return 'fixture';
    if (proxyAvailable) return 'proxy';
    if (hasUserKey()) return 'direct';
    return config.mode === 'live' ? 'proxy' : 'fixture';
  }

  async function probe(): Promise<AiProbeResult> {
    if (probed) return probed;
    if (inFlightProbe) return inFlightProbe;

    inFlightProbe = (async () => {
      // In fixture mode there is nothing to probe and nothing to prompt for.
      const health =
        config.mode === 'fixture'
          ? { reachable: false, keyConfigured: false, model: null, mode: null }
          : await probeProxyHealth();

      const proxyAvailable = health.reachable && health.keyConfigured;
      const result: AiProbeResult = {
        proxyAvailable,
        proxyModel: health.model,
        // If the proxy is reachable and keyed, the UI must never prompt for a key.
        needsUserKey: liveWanted() && !proxyAvailable && !hasUserKey(),
        preferredSource: preferredSource(proxyAvailable),
      };
      probed = result;
      inFlightProbe = null;
      return result;
    })();

    return inFlightProbe;
  }

  /**
   * Downgrades the cached probe after a relay proves it cannot serve. `needsUserKey` stays
   * false on the platform: the key belongs to the app, not the visitor, and there is no key
   * field there to point anyone at.
   */
  function markProxyUnavailable(): void {
    if (!probed) return;
    probed = {
      ...probed,
      proxyAvailable: false,
      needsUserKey: !isPlatformRelay() && liveWanted() && !hasUserKey(),
      preferredSource: preferredSource(false),
    };
  }

  /** A failure that means "this client cannot serve requests", so the cascade may continue. */
  function isUnavailable(result: AiResult): boolean {
    return (
      !result.ok &&
      (result.error.kind === 'no_client_available' || result.error.kind === 'network')
    );
  }

  async function analyze(
    request: ContextSwitchRequest,
    options: AnalyzeOptions = {},
  ): Promise<AiResult> {
    const fixtureAvailable = hasPreparedFixture(request);

    /* fixture mode: always deterministic prepared responses. */
    if (config.mode === 'fixture') {
      const result = await fixture.analyze(request, options);
      activeSource = result.ok ? result.source : null;
      return result;
    }

    const { proxyAvailable } = await probe();

    /* Preference order: proxy -> direct -> (auto only) fixture. */
    let lastFailure: AiResult | null = null;

    if (proxyAvailable) {
      const result = await proxy.analyze(request, options);
      if (result.ok) {
        activeSource = result.source;
        return result;
      }
      // Only a truly unavailable proxy cascades; a timeout or a schema failure is reported as
      // itself rather than silently re-run on a second, slower path.
      if (!isUnavailable(result)) {
        return finishFailure(result, fixtureAvailable);
      }
      if (result.error.kind === 'no_client_available') {
        // A relay that reports it holds no key was never configured — that is not a failure
        // worth showing anyone. Locally the health probe catches this before a request is ever
        // sent; the platform relay has no health route, so the first real request is where we
        // find out. Latch it, and deliberately do NOT record it as `lastFailure`, so this and
        // every later request behave exactly like the never-configured case: prepared
        // scenarios simply run, and custom text gets the honest "not configured" refusal.
        markProxyUnavailable();
      } else {
        lastFailure = result;
      }
    }

    if (hasUserKey()) {
      const result = await direct.analyze(request, options);
      if (result.ok) {
        activeSource = result.source;
        return result;
      }
      lastFailure = result;
      if (!isUnavailable(result)) {
        return finishFailure(result, fixtureAvailable);
      }
    }

    /* No live client could serve the request. */

    // live mode: fail visibly with retry. Never substitute a fixture (spec §16).
    if (config.mode === 'live') {
      activeSource = null;
      const failure: AiResult = lastFailure ?? {
        ok: false,
        source: null,
        error: aiError('no_client_available', {
          detail: 'no dev proxy and no user key',
        }),
      };
      return finishFailure(failure, false);
    }

    // auto mode with NO live client configured at all: fixtures are the configured path, not a
    // substitution — but only for a prepared scenario. Custom content is never answered with
    // unrelated fixture content (spec §16, §25).
    if (!lastFailure) {
      if (fixtureAvailable) {
        const result = await fixture.analyze(request, options);
        activeSource = result.ok ? result.source : null;
        return result;
      }
      activeSource = null;
      return finishFailure(
        {
          ok: false,
          source: null,
          error: aiError('no_client_available', { detail: 'no dev proxy and no user key' }),
        },
        false,
      );
    }

    // auto mode after a live attempt failed: return the typed error and let the UI OFFER the
    // fixture. The router does not swap it in.
    return finishFailure(lastFailure, fixtureAvailable);
  }

  /**
   * Stamps `fixtureAvailable` centrally. Clients always report `false`; only the router knows
   * whether this request is a prepared scenario, and only `auto` may offer a fixture at all.
   */
  function finishFailure(result: AiResult, fixtureAvailable: boolean): AiResult {
    if (result.ok) return result;
    activeSource = null;
    const offerFixture = config.mode === 'auto' && fixtureAvailable;
    return {
      ok: false,
      source: result.source,
      error: { ...result.error, fixtureAvailable: offerFixture },
    };
  }

  return {
    analyze,
    getActiveSource: () => activeSource,
    probe,
    currentConfig: () => ({ ...config, hasUserKey: hasUserKey() }),
  };
}
