import { useId } from 'react';
import { EyeOff, Laugh } from 'lucide-react';
import { Badge, Card, CardBody } from '@/components/ui';
import { cn } from '@/lib/cn';

export type UnfilteredCardProps = {
  /** `response.unfilteredTranslation`. The caller decides whether humor is on. */
  translation: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 1 of the result view (spec §13.5) — the playful monospaced card.
 *
 * Styled as a small terminal window on purpose: the window chrome, the prompt glyph and the
 * caret all say "internal tooling" in under a second, which is exactly the read the demo needs
 * before the sendable card lands (spec §8, "Recommended demo transition"). It stays lighter in
 * weight than the card below it — `shadow-card`, not `shadow-lift` — so it can be charming
 * without competing for the eye.
 *
 * This component never decides visibility. `SayItBetterResult` renders it only when humor is
 * `subtle` or `unfiltered`, which keeps the spec §27 content test in one place.
 */
export function UnfilteredCard({ translation, className, style }: UnfilteredCardProps): JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('space-y-3', className)} style={style}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Laugh aria-hidden="true" className="h-6 w-6 shrink-0 text-accent-ink" />
        <h2 id={headingId} className="font-display text-display-sm font-semibold text-ink">
          Unfiltered translation
        </h2>
        <Badge tone="accent" icon={EyeOff}>
          Internal only
        </Badge>
      </div>

      <Card tone="mono" elevation="card" className="overflow-hidden">
        {/* Window chrome — the wink. Decorative only; the label below it carries the meaning. */}
        <div className="flex items-center gap-3 border-b border-accent-ink/15 bg-surface/70 px-4 py-2.5">
          <span aria-hidden="true" className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-chip bg-coral/70" />
            <span className="h-2.5 w-2.5 rounded-chip bg-amber/70" />
            <span className="h-2.5 w-2.5 rounded-chip bg-teal/70" />
          </span>
          <p className="truncate text-sm font-semibold tracking-tight text-accent-ink">
            your inside voice
          </p>
        </div>

        <CardBody className="py-5">
          <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-ink">
            <span aria-hidden="true" className="mr-2 select-none font-bold text-accent-ink">
              &gt;
            </span>
            {translation}
            <span
              aria-hidden="true"
              className="ml-1.5 inline-block h-[1.05em] w-[0.5ch] translate-y-[0.15em] rounded-sm bg-accent-ink/70 align-baseline"
            />
          </p>
        </CardBody>
      </Card>

      <p className="text-base font-semibold text-ink-muted">
        This is not the message to send. It is here to name the feeling — the version you can
        actually send is next.
      </p>
    </section>
  );
}
