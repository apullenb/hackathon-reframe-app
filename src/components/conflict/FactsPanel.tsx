/**
 * Shared facts / disputed or unclear / unanswered questions (spec §5.3, §13.7).
 *
 * Three distinct regions with three distinct treatments, because collapsing them would be the
 * quiet version of false equivalence: "both agree the task was raised" and "nobody knows what
 * done means" are not the same kind of statement and must not look alike.
 *
 * An empty list renders nothing at all — no orphan heading promising content that is not there.
 */

import { CheckCircle2, CircleDashed, HelpCircle, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';

type FactsPanelProps = {
  sharedFacts: string[];
  disputedOrUnclear: string[];
  unansweredQuestions: string[];
  className?: string;
  style?: React.CSSProperties;
};

type RegionTone = 'teal' | 'amber' | 'slate';

const regionClasses: Record<
  RegionTone,
  { shell: string; rule: string; icon: string; marker: string; badge: BadgeTone }
> = {
  teal: {
    shell: 'border-teal/40 bg-teal-soft',
    rule: 'bg-grad-teal',
    icon: 'text-teal-ink',
    marker: 'bg-teal',
    badge: 'teal',
  },
  amber: {
    shell: 'border-amber/45 bg-amber-soft',
    rule: 'bg-amber',
    icon: 'text-amber-ink',
    marker: 'bg-amber',
    badge: 'amber',
  },
  slate: {
    shell: 'border-primary/25 bg-primary-soft',
    rule: 'bg-grad-primary',
    icon: 'text-primary',
    marker: 'bg-primary',
    badge: 'primary',
  },
};

type Region = {
  tone: RegionTone;
  icon: LucideIcon;
  title: string;
  helper: string;
  items: string[];
  /** Questions read better as a numbered list; facts do not. */
  ordered?: boolean;
};

export function FactsPanel({
  sharedFacts,
  disputedOrUnclear,
  unansweredQuestions,
  className,
  style,
}: FactsPanelProps): JSX.Element | null {
  const allRegions: Region[] = [
    {
      tone: 'teal',
      icon: CheckCircle2,
      title: 'Agreed on',
      helper: 'Both accounts point the same way on these.',
      items: sharedFacts,
    },
    {
      tone: 'amber',
      icon: CircleDashed,
      title: 'Disputed or unclear',
      helper: 'The conversation does not settle these either way.',
      items: disputedOrUnclear,
    },
    {
      tone: 'slate',
      icon: HelpCircle,
      title: 'Asked but not answered',
      helper: 'Still open at the end of the exchange.',
      items: unansweredQuestions,
      ordered: true,
    },
  ];
  // Empty lists render nothing at all, rather than a heading with no content under it.
  const regions = allRegions.filter((region) => region.items.length > 0);

  if (regions.length === 0) return null;

  return (
    <section aria-labelledby="facts-panel-heading" className={className} style={style}>
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-teal shadow-lift"
        >
          <Scale className="h-5 w-5 text-surface" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
            The evidence
          </p>
          <h2
            id="facts-panel-heading"
            className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
          >
            What is settled, and what is not
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            Separated on purpose. Agreement, disagreement, and the questions nobody answered are
            three different things.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'mt-5 grid items-start gap-4',
          regions.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2',
        )}
      >
        {regions.map((region) => {
          const styles = regionClasses[region.tone];
          const Icon = region.icon;
          const ListTag = region.ordered === true ? 'ol' : 'ul';

          return (
            <div
              key={region.title}
              className={cn(
                'min-w-0 overflow-hidden rounded-card-lg border-2 shadow-card',
                styles.shell,
              )}
            >
              <div aria-hidden="true" className={cn('h-1.5 w-full', styles.rule)} />

              <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon aria-hidden="true" className={cn('mt-0.5 h-5 w-5 shrink-0', styles.icon)} />
                  <div className="min-w-0">
                    <h3 className="min-w-0 font-display text-lg leading-tight text-ink">
                      {region.title}
                    </h3>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-muted">
                      {region.helper}
                    </p>
                  </div>
                </div>
                <Badge tone={styles.badge} size="sm" className="bg-surface">
                  {region.items.length === 1 ? '1 item' : `${region.items.length} items`}
                </Badge>
              </div>

              <ListTag className="space-y-2.5 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                {region.items.map((item, index) => (
                  <li
                    key={index}
                    className="flex min-w-0 gap-3 rounded-card border border-line bg-surface px-3.5 py-3"
                  >
                    {region.ordered === true ? (
                      <span
                        aria-hidden="true"
                        className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-chip bg-primary font-mono text-sm font-bold text-surface"
                      >
                        {index + 1}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', styles.marker)}
                      />
                    )}
                    <span className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                      {item}
                    </span>
                  </li>
                ))}
              </ListTag>
            </div>
          );
        })}
      </div>
    </section>
  );
}
