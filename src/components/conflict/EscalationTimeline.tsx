/**
 * Escalation points as a sequence (spec §5.3, §13.7).
 *
 * Horizontal on desktop, vertical on mobile. Numbered, because the order is the finding: each
 * step raised the temperature for the next one.
 *
 * Hard rule, in the data and in this file's own copy: describe the WORDING and its EFFECT, never
 * the person. No excerpt is attributed to a speaker here, no heading asks who escalated, and
 * nothing is scored. "The wording supports…" is the register (spec §15).
 */

import { Flame } from 'lucide-react';
import { cn } from '@/lib/cn';

export type EscalationPoint = {
  excerpt: string;
  observation: string;
  effect: string;
};

type EscalationTimelineProps = {
  points: EscalationPoint[];
  className?: string;
  style?: React.CSSProperties;
};

export function EscalationTimeline({
  points,
  className,
  style,
}: EscalationTimelineProps): JSX.Element | null {
  if (points.length === 0) return null;

  return (
    <section aria-labelledby="escalation-heading" className={className} style={style}>
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-coral shadow-lift"
        >
          <Flame className="h-5 w-5 text-surface" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
            {points.length === 1 ? '1 moment, in order' : `${points.length} moments, in order`}
          </p>
          <h2
            id="escalation-heading"
            className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
          >
            Where the temperature rose
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            Points where the wording changed what the conversation was about. These describe what
            the words did next — not what either person is like.
          </p>
        </div>
      </div>

      <ol
        className={cn(
          'mt-6 grid gap-6 lg:gap-4',
          /* Vertical on mobile; a horizontal run of equal cards on desktop, wrapping rather
             than overflowing when there are many points. */
          'lg:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]',
        )}
      >
        {points.map((point, index) => (
          <li key={index} className="relative min-w-0">
            {/* Rail to the next step: down the left on mobile, across the top on desktop. */}
            {index < points.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-[17px] top-10 h-[calc(100%_+_1.5rem)] w-0.5 bg-coral/30',
                  'lg:left-10 lg:top-[17px] lg:h-0.5 lg:w-full',
                )}
              />
            ) : null}

            <div className="relative flex min-w-0 gap-4 lg:block">
              {/*
                soft ground + ink text, not the coral gradient: white on the gradient's light
                stop measured 2.32:1, well under the 4.5:1 floor for 14px. The soft/ink pairing
                is contrast-guaranteed by the theme contract, so this holds in every theme.
              */}
              <span
                aria-hidden="true"
                className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-chip border border-coral/50 bg-coral-soft font-mono text-sm font-bold text-coral-ink shadow-lift"
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1 overflow-hidden rounded-card-lg border border-coral/40 bg-surface shadow-card lg:mt-5">
                <p className="sr-only">{`Point ${index + 1} of ${points.length}.`}</p>

                <blockquote className="border-b border-coral/25 bg-coral-soft px-4 py-3.5">
                  <p className="min-w-0 whitespace-pre-wrap break-words font-mono text-base font-semibold leading-relaxed text-ink">
                    {`“${point.excerpt}”`}
                  </p>
                </blockquote>

                <div className="space-y-3 px-4 py-4">
                  <div>
                    <h3 className="font-mono text-sm font-semibold uppercase tracking-wide text-ink-muted">
                      What the wording does
                    </h3>
                    <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                      {point.observation}
                    </p>
                  </div>
                  <div className="border-t border-line pt-3">
                    <h3 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wide text-coral-ink">
                      <Flame aria-hidden="true" className="h-4 w-4 shrink-0" />
                      Effect on the exchange
                    </h3>
                    <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                      {point.effect}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
