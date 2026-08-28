import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type CardTone = 'default' | 'sunk' | 'mono' | 'primary' | 'accent' | 'coral' | 'teal';
export type CardElevation = 'flat' | 'card' | 'lift';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
  elevation?: 'flat' | 'card' | 'lift';
  /** adds the land-glow animation once on mount */
  glow?: boolean;
};

/**
 * Ground + hairline per tone. `default` layers the panel wash over white so the surface has a
 * faint top-to-bottom fall-off instead of reading as flat paint.
 */
const toneClasses: Record<CardTone, string> = {
  default: 'bg-surface bg-wash-panel border-line text-ink',
  sunk: 'bg-paper-sunk border-line text-ink',
  /** Unfiltered Translation card (spec §12 signature element) — the one chartreuse moment. */
  mono: 'bg-accent-soft border-accent-ink/25 text-ink font-mono',
  primary: 'bg-primary-soft border-primary/25 text-ink',
  accent: 'bg-secondary-soft border-secondary/25 text-ink',
  coral: 'bg-coral-soft border-coral/30 text-ink',
  teal: 'bg-teal-soft border-teal/30 text-ink',
};

/**
 * A colored edge along the leading side of the tinted feature tones. Reads as a tab or a spine
 * rather than another flat wash, and gives each tone a second, non-color cue (its position).
 */
const railClasses: Partial<Record<CardTone, string>> = {
  mono: 'bg-grad-accent',
  primary: 'bg-grad-primary',
  accent: 'bg-gradient-to-b from-secondary to-primary',
  coral: 'bg-grad-coral',
  teal: 'bg-grad-teal',
};

const elevationClasses: Record<CardElevation, string> = {
  flat: 'shadow-none',
  card: 'shadow-card',
  lift: 'shadow-float',
};

export function Card({
  tone = 'default',
  elevation = 'card',
  glow = false,
  className,
  children,
  ...rest
}: CardProps): JSX.Element {
  const rail = railClasses[tone];

  return (
    <div
      className={cn(
        'relative isolate rounded-card border',
        toneClasses[tone],
        elevationClasses[elevation],
        className,
      )}
      {...rest}
    >
      {rail ? (
        <span
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-l-[inherit]', rail)}
        />
      ) : null}

      {/* Top-edge highlight. On its own element so it never competes with the card's shadow. */}
      {elevation !== 'flat' ? (
        <span
          aria-hidden="true"
          className="edge-sheen pointer-events-none absolute inset-0 rounded-[inherit]"
        />
      ) : null}

      {/* The arrival glow rides an overlay too, for the same reason. Overlays are absolutely
          positioned siblings so Card's own layout (flex, grid) stays whatever the consumer set. */}
      {glow ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] motion-safe:animate-land-glow"
        />
      ) : null}

      {children}
    </div>
  );
}

export type CardHeaderProps = {
  eyebrow?: string;
  title: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  step?: string;
  className?: string;
};

export function CardHeader({
  eyebrow,
  title,
  icon: Icon,
  actions,
  step,
  className,
}: CardHeaderProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-line/80 px-5 py-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {step ? (
          <span
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-grad-primary font-mono text-sm font-bold text-surface shadow-card before:pointer-events-none before:absolute before:inset-x-1.5 before:top-0 before:h-px before:bg-sheen"
            aria-hidden="true"
          >
            {step}
          </span>
        ) : null}
        {Icon ? (
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="font-display text-xl font-semibold leading-tight tracking-tight text-ink">
            {step ? <span className="sr-only">{`Step ${step}: `}</span> : null}
            {title}
          </h3>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}
