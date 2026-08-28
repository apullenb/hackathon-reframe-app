import { useId, useState } from 'react';
import { ChevronDown, Quote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Card, CardBody, CardHeader } from '@/components/ui';
import { ConfidenceBadge } from '@/components/shared';
import { cn } from '@/lib/cn';
import type { Interpretation, SupportLevel } from '@/types/contracts';

export type InterpretationListProps = {
  /** Card heading — e.g. "Why this message may exist" vs "What it may mean". */
  title: string;
  eyebrow?: string;
  /** One neutral line explaining what this particular list is. */
  description?: string;
  items: Interpretation[];
  icon?: LucideIcon;
  className?: string;
  style?: React.CSSProperties;
};

const SPECULATIVE_CAUTION =
  'These are possible but weakly evidenced by the message itself. Treat them as guesses to rule out, not as readings.';

/**
 * Each support level gets a visible rail and ground of its own, so the confidence ramp is legible
 * at a glance — with the `ConfidenceBadge` text label always present, never color alone.
 */
const supportSkin: Record<SupportLevel, { rail: string; shell: string }> = {
  strongly_supported: { rail: 'bg-grad-teal', shell: 'border-teal/35 bg-teal-soft/60' },
  plausible: { rail: 'bg-amber', shell: 'border-amber/40 bg-amber-soft/60' },
  speculative: { rail: 'bg-slate', shell: 'border-slate/40 bg-slate-soft' },
};

/** One inference. Never rendered without a ConfidenceBadge — that is the rule of this mode. */
function InterpretationItem({ item }: { item: Interpretation }): JSX.Element {
  const skin = supportSkin[item.support];

  return (
    <li
      className={cn(
        'relative min-w-0 overflow-hidden rounded-card border pl-5 pr-4 py-4 shadow-card',
        'transition-shadow duration-200 ease-smooth hover:shadow-lift',
        skin.shell,
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1.5', skin.rail)} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-[13rem] flex-1 whitespace-pre-wrap break-words text-base font-medium leading-relaxed text-ink">
          {item.text}
        </p>
        <ConfidenceBadge support={item.support} />
      </div>

      {item.evidence ? (
        <div className="mt-3.5 rounded-lg border border-line bg-surface px-4 py-3">
          <p className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wide text-ink-muted">
            <Quote aria-hidden="true" className="h-4 w-4 shrink-0" />
            The wording that supports this
          </p>
          <p className="mt-1.5 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
            {item.evidence}
          </p>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Layer 2 of the Decode result (spec §13.6). Every `Interpretation` carries a
 * `ConfidenceBadge`, so no inference can appear unlabeled.
 *
 * Speculative items are collapsed behind a disclosure rather than shown by default
 * (spec §5.2: "Do not present speculative content by default if it is likely to inflame the
 * situation"). Strongly supported and plausible items are always visible.
 */
export function InterpretationList({
  title,
  eyebrow,
  description,
  items,
  icon,
  className,
  style,
}: InterpretationListProps): JSX.Element | null {
  const [showSpeculative, setShowSpeculative] = useState(false);
  const regionId = useId();

  if (items.length === 0) return null;

  const shown = items.filter((item) => item.support !== 'speculative');
  const speculative = items.filter((item) => item.support === 'speculative');

  return (
    <Card className={cn('overflow-hidden', className)} style={style}>
      <div aria-hidden="true" className="h-1.5 w-full bg-grad-primary" />
      <CardHeader
        eyebrow={eyebrow}
        title={title}
        icon={icon}
        actions={
          <Badge tone="slate" size="sm">
            {items.length === 1 ? '1 reading' : `${items.length} readings`}
          </Badge>
        }
      />
      <CardBody className="space-y-4 sm:px-7 sm:py-6">
        {description ? (
          <p className="min-w-0 text-sm font-semibold leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}

        {shown.length > 0 ? (
          <ul className="space-y-3">
            {shown.map((item) => (
              <InterpretationItem key={item.text} item={item} />
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-line-strong bg-paper-sunk px-4 py-3.5 text-base leading-relaxed text-ink">
            Nothing here is supported strongly enough to show by default.
          </p>
        )}

        {speculative.length > 0 ? (
          <div className="rounded-card border border-dashed border-slate/50 bg-slate-soft p-4">
            <button
              type="button"
              aria-expanded={showSpeculative}
              aria-controls={regionId}
              onClick={() => setShowSpeculative((open) => !open)}
              className={cn(
                'flex min-h-tap w-full items-center justify-between gap-3 rounded-card px-3 py-2 text-left',
                'text-base font-semibold text-ink transition-colors duration-150 hover:bg-surface',
              )}
            >
              <span className="min-w-0">
                {showSpeculative ? 'Hide' : 'Show'} weaker possibilities ({speculative.length})
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'h-5 w-5 shrink-0 text-slate-ink transition-transform duration-200 ease-smooth',
                  showSpeculative && 'rotate-180',
                )}
              />
            </button>

            <p className="px-3 pt-1 text-sm font-semibold leading-relaxed text-ink-muted">
              {SPECULATIVE_CAUTION}
            </p>

            <div id={regionId} hidden={!showSpeculative}>
              <ul className="space-y-3 pt-3">
                {speculative.map((item) => (
                  <InterpretationItem key={item.text} item={item} />
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
