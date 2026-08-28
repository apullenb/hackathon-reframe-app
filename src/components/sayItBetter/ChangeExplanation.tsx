import { useId } from 'react';
import { ListChecks } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';

export type ChangeExplanationProps = {
  /** `response.changesMade`. */
  changes: string[];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 5 of the result view (spec §13.5) — the transparent explanation.
 *
 * This is the section that makes the rewrite auditable: every line says what was changed and,
 * where it matters, what was deliberately *not* claimed. Presented as a numbered ledger —
 * a marker per edit, hairline-separated rows — so it can be scanned against the message above
 * rather than read as a paragraph.
 */
export function ChangeExplanation({
  changes,
  className,
  style,
}: ChangeExplanationProps): JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('space-y-4', className)} style={style}>
      <div>
        <h2
          id={headingId}
          className="font-display inline-flex items-center gap-2.5 text-display-sm font-semibold text-ink"
        >
          <ListChecks aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" />
          What changed
        </h2>
        <p className="mt-1.5 text-base text-ink-muted">
          Every edit, stated plainly, so you can check it against what you actually meant.
        </p>
      </div>

      <Card tone="sunk" elevation="card" className="overflow-hidden">
        <ol className="divide-y divide-line">
          {changes.map((change, index) => (
            <li key={change} className="flex items-start gap-4 px-5 py-4">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-surface font-mono text-sm font-bold text-primary shadow-card"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="pt-1 text-base leading-relaxed text-ink">{change}</span>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
