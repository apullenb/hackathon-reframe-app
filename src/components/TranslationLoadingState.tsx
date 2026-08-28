import { useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { CommunicationContext, ContextSwitchMode } from '@/types/contracts';
import { SkeletonCard } from '@/components/ui';
import { RoleRoute } from '@/components/context/RoleRoute';
import { routeFor } from '@/components/context/routeFor';
import { LOADING_STAGES, STAGE_DURATION_MS } from '@/state/loadingStages';
import { cn } from '@/lib/cn';

type TranslationLoadingStateProps = {
  mode: ContextSwitchMode;
  context: Partial<CommunicationContext>;
  stage: number;
  onAdvanceStage: () => void;
};

/**
 * Titles of the cards this mode is actually about to render, so the placeholders resemble the
 * real result and the wait tells the user what is coming.
 */
const SKELETON_CARDS: Record<ContextSwitchMode, ReadonlyArray<{ title: string; lines: number }>> = {
  say_it_better: [
    { title: 'Unfiltered translation', lines: 2 },
    { title: 'Ready to send', lines: 5 },
    { title: 'What changed', lines: 3 },
  ],
  decode_it: [
    { title: 'What it literally says', lines: 2 },
    { title: 'What it might mean', lines: 5 },
    { title: 'What cannot be known yet', lines: 3 },
  ],
  conflict_lens: [
    { title: 'The core problem', lines: 3 },
    { title: 'Both perspectives', lines: 5 },
    { title: 'Better next moves', lines: 3 },
  ],
};

/**
 * Staged status text plus skeleton cards (spec §11.1, §25) — never a bare spinner.
 *
 * The stages advance on a timer rather than tracking real request progress: a single
 * non-streaming model call has no intermediate progress to report, and inventing a fake
 * percentage would be worse than naming the steps honestly. The route above animates only
 * while this component is mounted (spec §14).
 *
 * Each row states its state in words — Done / Working / Queued — so the sequence never depends
 * on the teal-versus-indigo tint to be readable (spec §24).
 */
export function TranslationLoadingState({
  mode,
  context,
  stage,
  onAdvanceStage,
}: TranslationLoadingStateProps) {
  const stages = LOADING_STAGES[mode];
  const route = routeFor(mode, context);
  const atLastStage = stage >= stages.length - 1;

  useEffect(() => {
    if (atLastStage) return;
    const timer = window.setTimeout(onAdvanceStage, STAGE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [stage, atLastStage, onAdvanceStage]);

  return (
    <section aria-labelledby="loading-heading" className="space-y-6">
      <h2 id="loading-heading" className="sr-only">
        Translating
      </h2>

      <RoleRoute from={route.from} to={route.to} active />

      <div className="rounded-card-lg border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-ink-muted">
            Translating
          </p>
          <p className="font-mono text-sm tabular-nums text-primary">
            Stage {Math.min(stage + 1, stages.length)} of {stages.length}
          </p>
        </div>

        <ol className="space-y-2.5" aria-live="polite" aria-atomic="false" aria-busy="true">
          {stages.map((label, index) => {
            const done = index < stage;
            const active = index === stage;
            return (
              <li
                key={label}
                className={cn(
                  'flex items-center gap-3 rounded-card border px-3.5 py-3 transition-all duration-300 ease-smooth sm:px-4',
                  done && 'border-teal/30 bg-teal-soft',
                  active && 'border-primary/35 bg-surface shadow-glow-primary',
                  !done && !active && 'border-line bg-paper-sunk/50',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold leading-none',
                    done && 'bg-grad-teal text-surface',
                    active && 'bg-grad-primary text-surface',
                    !done && !active && 'border border-line-strong bg-surface text-ink-muted',
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                  ) : (
                    index + 1
                  )}
                </span>

                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm font-semibold leading-snug',
                    done && 'text-teal-ink',
                    active && 'text-ink',
                    !done && !active && 'text-ink-muted',
                  )}
                >
                  {label}
                </span>

                <span
                  className={cn(
                    'shrink-0 font-mono text-sm uppercase tracking-[0.12em]',
                    done && 'text-teal-ink',
                    active && 'text-primary',
                    !done && !active && 'text-ink-muted',
                  )}
                >
                  {done ? 'Done' : active ? 'Working' : 'Queued'}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-4">
        {SKELETON_CARDS[mode].map((card) => (
          <SkeletonCard key={card.title} title={card.title} lines={card.lines} />
        ))}
      </div>
    </section>
  );
}
