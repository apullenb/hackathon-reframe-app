import { useId } from 'react';
import { Palette } from 'lucide-react';
import { Badge, Card, CardBody } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { CopyButton } from '@/components/shared';
import { cn } from '@/lib/cn';
import type { SayItBetterResponse } from '@/types/contracts';

type Alternative = NonNullable<SayItBetterResponse['alternatives']>[number];

export type AlternativeToneCardsProps = {
  /** `response.alternatives` — normally two (spec §13.5). */
  alternatives: Alternative[];
  className?: string;
  style?: React.CSSProperties;
};

type Tint = {
  /** Gradient cap along the card's top edge. */
  bar: string;
  border: string;
  header: string;
  badge: BadgeTone;
};

/**
 * One tint per card so the two alternatives read as siblings rather than duplicates. Written as
 * whole class strings — never assembled from fragments — so Tailwind can see every one of them.
 * Cycled by index, which keeps the component correct if a response ever returns three.
 */
const tints: readonly Tint[] = [
  {
    bar: 'bg-grad-primary',
    border: 'border-primary/25',
    header: 'border-primary/20 bg-primary-soft/60',
    badge: 'primary',
  },
  {
    bar: 'bg-grad-teal',
    border: 'border-teal/30',
    header: 'border-teal/20 bg-teal-soft/60',
    badge: 'teal',
  },
];

/**
 * Layer 3 of the result view (spec §13.5) — two smaller cards, each independently copyable,
 * side by side from `sm` up and stacked below it.
 *
 * Both the human label and the tone description are shown: the label is what the user picks
 * by, the tone is the promise about delivery. Every copy button names its own version so a
 * screen-reader user is never choosing between three buttons all called "Copy" (spec §24).
 */
export function AlternativeToneCards({
  alternatives,
  className,
  style,
}: AlternativeToneCardsProps): JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('space-y-4', className)} style={style}>
      <div>
        <h2
          id={headingId}
          className="font-display inline-flex items-center gap-2.5 text-display-sm font-semibold text-ink"
        >
          <Palette aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" />
          Try another tone
        </h2>
        <p className="mt-1.5 text-base text-ink-muted">
          Same facts, different delivery. Nothing here adds a claim the version above does not
          make.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {alternatives.map((alternative, index) => {
          const tint = tints[index % tints.length];
          return (
            <li key={alternative.id} className="flex">
              <Card
                elevation="card"
                className={cn(
                  'relative flex w-full flex-col overflow-hidden transition-shadow duration-200 ease-smooth hover:shadow-lift',
                  tint.border,
                )}
              >
                <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1', tint.bar)} />

                <div
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-5 pb-3.5 pt-4',
                    tint.header,
                  )}
                >
                  <h3 className="font-display text-xl font-semibold leading-snug text-ink">
                    {alternative.label}
                  </h3>
                  <Badge tone={tint.badge}>{alternative.tone}</Badge>
                </div>

                <CardBody className="flex flex-1 flex-col gap-5 py-5">
                  <p className="flex-1 whitespace-pre-wrap text-base leading-relaxed text-ink">
                    {alternative.message}
                  </p>
                  <div>
                    <CopyButton
                      value={alternative.message}
                      label={`Copy ${alternative.label.toLowerCase()}`}
                      variant="outline"
                      size="md"
                    />
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
