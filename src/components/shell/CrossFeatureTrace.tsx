import type { Dispatch } from 'react';
import { Check, ChevronRight, CircleDashed, CircleDot, MinusCircle, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { featureById } from '@/features/registry';
import type { SituationAction } from '@/situation/reducer';
import type { CurrentSituation, TraceStatus } from '@/situation/types';

/**
 * The cross-feature trace (brief §6.5) — the connective tissue that keeps twelve tools reading
 * as one runtime rather than twelve unrelated screens.
 *
 * Every frame carries an icon *and* a written status word, because trace state is exactly the
 * kind of thing that must never be communicated by colour alone (brief §17). The whole sequence
 * is also summarised in one sr-only sentence, which is the "text description for trace
 * visualisations" the same section asks for.
 */

export type CrossFeatureTraceProps = {
  situation: CurrentSituation;
  dispatch: Dispatch<SituationAction>;
  /** Horizontal reads as a pipeline; vertical is the compact form used in the drawer and on mobile. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

type StatusPresentation = {
  /** Written status. Never abbreviate this away — it is the non-colour cue. */
  label: string;
  icon: LucideIcon;
  frame: string;
  marker: string;
};

const STATUS_PRESENTATION: Record<TraceStatus, StatusPresentation> = {
  complete: {
    label: 'Complete',
    icon: Check,
    frame: 'border-teal/40 bg-teal-soft text-teal-ink',
    marker: 'border-teal/40 bg-teal-soft text-teal-ink',
  },
  active: {
    label: 'Active',
    icon: CircleDot,
    frame: 'border-primary bg-primary-soft text-primary shadow-glow-primary',
    marker: 'border-primary/60 bg-primary-soft text-primary',
  },
  recommended: {
    label: 'Recommended next',
    icon: Sparkles,
    frame: 'border-dashed border-amber/50 bg-amber-soft text-amber-ink',
    marker: 'border-dashed border-amber/50 bg-amber-soft text-amber-ink',
  },
  available: {
    label: 'Available',
    icon: CircleDashed,
    frame: 'border-line bg-surface text-ink-muted',
    marker: 'border-line bg-paper-sunk text-ink-muted',
  },
  skipped: {
    label: 'Skipped',
    icon: MinusCircle,
    frame: 'border-dashed border-line bg-paper-sunk text-ink-muted',
    marker: 'border-dashed border-line bg-paper-sunk text-ink-muted',
  },
};

export function CrossFeatureTrace({
  situation,
  dispatch,
  orientation = 'horizontal',
  className,
}: CrossFeatureTraceProps): JSX.Element {
  const frames = situation.trace;
  const isVertical = orientation === 'vertical';

  if (frames.length === 0) {
    return (
      <p
        className={cn(
          'rounded-card border border-dashed border-line bg-paper-sunk px-4 py-3',
          'text-sm font-medium leading-relaxed text-ink-muted',
          className,
        )}
      >
        The trace records every tool you open, so you can always retrace how a draft was reached.
        Nothing has run yet.
      </p>
    );
  }

  const description = frames
    .map((frame, index) => {
      const status = STATUS_PRESENTATION[frame.status].label.toLowerCase();
      return `${index + 1}. ${featureById(frame.tool).name}, ${status}`;
    })
    .join('. ');

  return (
    <div className={cn('min-w-0', className)}>
      <p className="sr-only">{`Cross-feature trace, ${frames.length} frames. ${description}.`}</p>

      <ol
        className={cn(
          'flex min-w-0 list-none',
          isVertical ? 'flex-col gap-1.5' : 'items-stretch gap-1.5 overflow-x-auto pb-1',
        )}
      >
        {frames.map((frame, index) => {
          const feature = featureById(frame.tool);
          const presentation = STATUS_PRESENTATION[frame.status];
          const StatusIcon = presentation.icon;
          const FeatureIcon = feature.icon;

          return (
            <li
              key={frame.tool}
              className={cn(
                'flex min-w-0',
                isVertical ? 'w-full flex-col items-start' : 'shrink-0 items-center gap-1.5',
              )}
            >
              <button
                type="button"
                onClick={() => dispatch({ type: 'open_tool', tool: frame.tool, workspace: feature.workspace })}
                aria-current={frame.status === 'active' ? 'step' : undefined}
                className={cn(
                  'group flex min-h-tap min-w-0 items-center gap-2.5 rounded-card border px-3 py-2',
                  'text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-smooth',
                  'hover:border-primary-ring hover:text-ink motion-safe:hover:-translate-y-px',
                  presentation.frame,
                  isVertical && 'w-full',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                    'font-mono text-xs font-bold',
                    presentation.marker,
                  )}
                >
                  {index + 1}
                </span>

                <span className="flex min-w-0 flex-col">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <FeatureIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-semibold tracking-tight text-ink">
                      {feature.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                    <StatusIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
                    {presentation.label}
                  </span>
                </span>
              </button>

              {index < frames.length - 1 ? (
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0 text-ink-muted',
                    isVertical && 'ml-3.5 rotate-90',
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
