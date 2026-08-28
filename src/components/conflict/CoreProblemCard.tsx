/**
 * The core unresolved problem — the payoff of Conflict Lens (spec §5.3, §13.7).
 *
 * Given the most visual weight in the view on purpose: inverted gradient ground, the deepest
 * elevation in the app, and display type at the largest size any body copy gets. It is the one
 * panel that is supposed to change how the reader sees the argument, and it names the loop
 * rather than a culprit.
 *
 * `sharedGoal` sits directly beneath it in teal as the counterweight — the thing both people
 * already agree on, which is what makes the next conversation possible.
 */

import { Handshake, Target } from 'lucide-react';

type CoreProblemCardProps = {
  coreProblem: string;
  sharedGoal?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function CoreProblemCard({
  coreProblem,
  sharedGoal,
  className,
  style,
}: CoreProblemCardProps): JSX.Element {
  return (
    <section aria-labelledby="core-problem-heading" className={className} style={style}>
      <div className="relative overflow-hidden rounded-card-lg bg-grad-ink p-5 shadow-float sm:p-8 lg:p-10">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-sheen" />

        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-paper/20 bg-paper/10"
          >
            <Target className="h-6 w-6 text-paper" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-widest text-paper-sunk">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
              The unresolved problem
            </p>
            <h2
              id="core-problem-heading"
              className="mt-3 max-w-4xl whitespace-pre-wrap break-words font-display text-xl leading-snug text-paper sm:text-2xl lg:text-display-sm"
            >
              {coreProblem}
            </h2>
          </div>
        </div>

        {sharedGoal !== undefined && sharedGoal.length > 0 ? (
          <div className="mt-7 overflow-hidden rounded-card border-2 border-teal/60 bg-teal-soft">
            <div aria-hidden="true" className="h-1.5 w-full bg-grad-teal" />
            <div className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-grad-teal"
              >
                <Handshake className="h-[18px] w-[18px] text-surface" />
              </span>
              <div className="min-w-0">
                <h3 className="font-mono text-sm font-semibold uppercase tracking-wide text-teal-ink">
                  Already shared
                </h3>
                <p className="mt-1.5 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink sm:text-lg">
                  {sharedGoal}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
