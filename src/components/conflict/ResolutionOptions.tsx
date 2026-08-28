/**
 * Two to four possible next moves (spec §5.3, §13.7 "Possible next moves").
 *
 * Options, presented as options: no ranking, no "recommended" badge, nothing guaranteed to work
 * (spec §15). Every card is the same size and weight, and the tradeoff is labeled as a tradeoff
 * at the same text size as the pitch, because an option whose cost is in fine print is not
 * really being offered.
 */

import { Scale, Waypoints } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ResolutionOption = {
  title: string;
  description: string;
  tradeoff?: string;
};

type ResolutionOptionsProps = {
  options: ResolutionOption[];
  className?: string;
  style?: React.CSSProperties;
};

export function ResolutionOptions({
  options,
  className,
  style,
}: ResolutionOptionsProps): JSX.Element | null {
  if (options.length === 0) return null;

  return (
    <section aria-labelledby="resolution-heading" className={className} style={style}>
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-primary shadow-lift"
        >
          <Waypoints className="h-5 w-5 text-surface" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
            {options.length === 1 ? '1 route' : `${options.length} routes, none ranked`}
          </p>
          <h2
            id="resolution-heading"
            className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
          >
            Possible next moves
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            Not ranked, and none of them is guaranteed to work. Each one costs something, so the
            cost is listed with it.
          </p>
        </div>
      </div>

      <ul className="mt-5 grid items-start gap-4 md:grid-cols-2">
        {options.map((option, index) => (
          <li
            key={index}
            className={cn(
              'flex min-w-0 flex-col overflow-hidden rounded-card-lg border border-line bg-surface shadow-card',
              'transition-shadow duration-200 ease-smooth hover:shadow-lift',
            )}
          >
            <div aria-hidden="true" className="h-1.5 w-full bg-grad-primary" />

            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-secondary-soft font-mono text-sm font-bold text-secondary"
                >
                  {index + 1}
                </span>
                <h3 className="min-w-0 whitespace-pre-wrap break-words font-display text-lg leading-snug text-ink sm:text-xl">
                  <span className="sr-only">{`Option ${index + 1} of ${options.length}: `}</span>
                  {option.title}
                </h3>
              </div>

              <p className="mt-3.5 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                {option.description}
              </p>

              {option.tradeoff !== undefined && option.tradeoff.length > 0 ? (
                <div className="mt-4 rounded-card border border-amber/45 bg-amber-soft px-4 py-3.5">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Scale
                      aria-hidden="true"
                      className="mt-px h-[18px] w-[18px] shrink-0 text-amber-ink"
                    />
                    <div className="min-w-0">
                      <h4 className="font-mono text-sm font-semibold uppercase tracking-wide text-amber-ink">
                        The tradeoff
                      </h4>
                      <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                        {option.tradeoff}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
