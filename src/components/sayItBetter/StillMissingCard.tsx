import { useId } from 'react';
import { FileQuestion, Plus } from 'lucide-react';
import { Badge, Card, CardBody } from '@/components/ui';
import { cn } from '@/lib/cn';

export type StillMissingCardProps = {
  /** `response.missingInformation` — the caller renders this only when non-empty. */
  items: string[];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 6 of the result view (spec §13.5) — visible only when something is genuinely missing.
 *
 * The point of this card is the Honesty Guard's receipt: these facts are absent from the
 * message because you did not supply them, not because they were smoothed over. Amber and a
 * "+" marker per row, never coral or a warning icon — this is an invitation to add something,
 * not a failure to fix.
 */
export function StillMissingCard({ items, className, style }: StillMissingCardProps): JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn(className)} style={style}>
      {/* Card supplies its own ground and hairline per tone, and there is no amber tone. Tailwind
          orders color utilities alphabetically, so a plain `border-amber/50` would lose to the
          tone's `border-line`; the ground is painted on the body (clipped by `overflow-hidden`)
          and the two border colors are forced. */}
      <Card
        elevation="card"
        className="overflow-hidden border-l-4 !border-amber/50 !border-l-amber"
      >
        <CardBody className="space-y-4 bg-amber-soft py-5">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-chip border border-amber/40 bg-surface">
              <FileQuestion aria-hidden="true" className="h-5 w-5 text-amber-ink" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 id={headingId} className="font-display text-display-sm font-semibold text-ink">
                  Still missing
                </h2>
                <Badge tone="amber">Yours to add</Badge>
              </div>
              <p className="mt-1.5 text-base leading-relaxed text-ink-muted">
                Left out on purpose rather than guessed at. Add any of it yourself before you
                send.
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-card border border-amber/30 bg-surface/70 px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-chip bg-amber-soft text-amber-ink"
                >
                  <Plus className="h-4 w-4" />
                </span>
                <span className="text-base leading-relaxed text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
