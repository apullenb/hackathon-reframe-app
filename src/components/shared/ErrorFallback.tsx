import { PlayCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ContextSwitchError } from '@/types/contracts';

export type ErrorFallbackProps = {
  error: ContextSwitchError;
  onRetry: () => void;
  /** shown only when error.fixtureAvailable — "Show saved example" */
  onUseFixture?: () => void;
};

/**
 * `error.userMessage` is already user-safe copy (spec §25). Raw model output never reaches here.
 * Designed as a deliberate card — icon tile, display heading, real action row — so a failure
 * still looks like part of the product rather than a browser error page.
 */
export function ErrorFallback({ error, onRetry, onUseFixture }: ErrorFallbackProps): JSX.Element {
  const showFixture = error.fixtureAvailable && Boolean(onUseFixture);

  return (
    <Card tone="coral" elevation="lift" role="alert" aria-live="assertive">
      <div className="flex items-start gap-4 px-6 py-6 pl-7">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-coral/35 bg-surface/80 text-coral-ink shadow-inner-top"
        >
          <TriangleAlert className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1.5">
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-coral-ink">
              Something broke
            </p>
            <h2 className="font-display text-xl font-semibold leading-tight tracking-tight text-ink">
              That didn’t go through
            </h2>
          </div>

          <p className="text-base leading-relaxed text-ink">{error.userMessage}</p>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="md" leadingIcon={RotateCcw} onClick={onRetry}>
              Try again
            </Button>
            {showFixture ? (
              <Button
                variant="outline"
                size="md"
                leadingIcon={PlayCircle}
                onClick={() => onUseFixture?.()}
              >
                Show saved example
              </Button>
            ) : null}
          </div>

          {error.detail ? (
            <p className="rounded-lg border border-coral/25 bg-surface/70 px-3 py-2 font-mono text-sm leading-relaxed text-ink-muted">
              {error.detail}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
