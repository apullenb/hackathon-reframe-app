import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAiRouter,
  createDefaultAiRuntimeConfig,
  type AiProbeResult,
  type AiRouter,
} from '@/ai';
import type { AiRuntimeConfig } from '@/ai';

/**
 * Owns the AI router and its startup probe.
 *
 * The router is rebuilt only when the runtime config changes — which happens when the user
 * supplies or clears their own key. `bumpConfig` is how the settings drawer tells us to
 * re-read `hasUserKey()` without ever handing the key itself through React state.
 */
export function useAiRouter(): {
  router: AiRouter;
  config: AiRuntimeConfig;
  probe: AiProbeResult | null;
  refreshConfig: () => void;
} {
  const [configVersion, setConfigVersion] = useState(0);
  const [probe, setProbe] = useState<AiProbeResult | null>(null);

  const config = useMemo(
    () => createDefaultAiRuntimeConfig(),
    // configVersion is the dependency on purpose: it forces a fresh read of hasUserKey().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configVersion],
  );

  const router = useMemo(() => createAiRouter(config), [config]);

  useEffect(() => {
    let cancelled = false;
    void router.probe().then((result) => {
      if (!cancelled) setProbe(result);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshConfig = useCallback(() => {
    setProbe(null);
    setConfigVersion((version) => version + 1);
  }, []);

  return { router, config, probe, refreshConfig };
}
