import { ArrowRight, CheckCircle2, CircleDashed, Radio, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';

type RoleRouteProps = {
  from: string | undefined;
  to: string | undefined;
  /** Animates the route as if the message is moving through a translation circuit. */
  active?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
};

const PLACEHOLDER = '— — —';

/** Enough beads to read as a calibrated rail, few enough to survive a 56px mobile connector. */
const TICK_COUNT = 9;

/**
 * The signature element (spec §12): a switchboard that routes a message from one role to
 * another. Two tinted nodes — sender in indigo, recipient in violet — joined by a ticked rail.
 *
 * Motion is meaning, not decoration (spec §14): the rail is calm and static at rest, and only
 * when `active` does it light up and send a pulse travelling from sender to recipient. The
 * pulse is the one place chartreuse appears in this surface, which is what makes it read as
 * "something is happening right now".
 */
export function RoleRoute({ from, to, active = false, size = 'lg', className }: RoleRouteProps) {
  const label = `${from ?? 'no role selected'} to ${to ?? 'no role selected'}`;
  const complete = Boolean(from) && Boolean(to);

  if (size === 'sm') {
    return (
      <div
        className={cn('flex flex-wrap items-center gap-x-2 gap-y-1.5', className)}
        aria-label={`Role route: ${label}`}
        role="group"
      >
        <RouteNode value={from} tone="from" size="sm" active={active} />
        <span className="flex min-w-[36px] flex-1 items-center">
          <RouteTrack active={active} size="sm" />
        </span>
        <RouteNode value={to} tone="to" size="sm" active={active} />
      </div>
    );
  }

  const status: { tone: BadgeTone; text: string; icon: LucideIcon } = active
    ? { tone: 'accent', text: 'Routing', icon: Zap }
    : complete
      ? { tone: 'teal', text: 'Route set', icon: CheckCircle2 }
      : { tone: 'slate', text: 'Awaiting roles', icon: CircleDashed };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card-lg border bg-surface bg-wash-panel p-4 transition-shadow duration-500 ease-smooth sm:p-5',
        active ? 'border-primary/30 shadow-glow-primary' : 'border-line shadow-card',
        className,
      )}
      aria-label={`Role route: ${label}`}
      role="group"
    >
      {/* Hairline highlight along the top edge. A child, not `edge-sheen`: that utility sets
          box-shadow and would silently wipe out the panel's card and glow shadows. */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-sheen" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.2em] text-ink-muted">
          <Radio
            className={cn('h-4 w-4 text-primary', active && 'motion-safe:animate-route-pulse')}
            aria-hidden="true"
          />
          Route
        </span>
        <Badge
          tone={status.tone}
          icon={status.icon}
          className="font-mono uppercase tracking-[0.12em]"
        >
          {status.text}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-stretch sm:gap-3">
        <RouteNode value={from} tone="from" size="lg" active={active} />

        {/* Stacked layout: the same rail, rotated a quarter turn so the pulse travels downward. */}
        <div className="relative h-14 w-full sm:hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 w-14 -translate-x-1/2 -translate-y-1/2 rotate-90">
            <RouteTrack active={active} size="lg" />
          </div>
        </div>

        <div className="hidden min-w-[56px] flex-1 items-center sm:flex">
          <RouteTrack active={active} size="lg" />
        </div>

        <RouteNode value={to} tone="to" size="lg" active={active} />
      </div>
    </div>
  );
}

/**
 * The connecting track: a hairline rail with tick marks, an arrowhead, and — only while
 * `active` — a pulse that travels the full length using the `route-travel` keyframe.
 */
function RouteTrack({ active, size }: { active: boolean; size: 'sm' | 'lg' }) {
  return (
    <div className="flex w-full items-center gap-1.5" aria-hidden="true">
      <div className="relative flex h-4 flex-1 items-center">
        <span
          className={cn(
            'absolute inset-x-0 top-1/2 h-px -translate-y-1/2 transition-colors duration-500',
            active ? 'bg-grad-primary' : 'bg-line-strong',
          )}
        />
        <span className="relative flex w-full items-center justify-between">
          {Array.from({ length: TICK_COUNT }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 w-1 rounded-full transition-colors duration-500',
                active ? 'bg-primary' : 'bg-line-strong',
              )}
            />
          ))}
        </span>
        {active ? (
          <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-route-travel">
            <span className="block h-2.5 w-2.5 rounded-full bg-accent shadow-glow-accent" />
          </span>
        ) : null}
      </div>
      <ArrowRight
        className={cn(
          'shrink-0 transition-colors duration-500',
          size === 'lg' ? 'h-[18px] w-[18px]' : 'h-4 w-4',
          active ? 'text-primary' : 'text-line-strong',
        )}
        strokeWidth={2.75}
      />
    </div>
  );
}

/**
 * A role node. Set roles carry a tinted ground plus an initial tile; an unset role stays
 * dashed and muted so it reads unmistakably as awaiting input rather than as a real value.
 */
function RouteNode({
  value,
  tone,
  size,
  active,
}: {
  value: string | undefined;
  tone: 'from' | 'to';
  size: 'sm' | 'lg';
  active: boolean;
}) {
  const isSet = Boolean(value);
  const lit = isSet && active;

  return (
    <div
      className={cn(
        'flex min-w-0 items-center border transition-all duration-300 ease-smooth',
        size === 'lg'
          ? 'flex-1 gap-2.5 rounded-card px-3 py-3'
          : 'gap-2 rounded-chip px-2 py-1 sm:px-2.5',
        !isSet && 'border-dashed border-line-strong bg-paper-sunk/80',
        isSet && tone === 'from' && 'border-primary/25 bg-primary-soft',
        isSet && tone === 'to' && 'border-secondary/25 bg-secondary-soft',
        lit && (tone === 'from' ? 'border-primary/50' : 'border-secondary/50'),
      )}
    >
      <span
        className={cn(
          'edge-sheen flex shrink-0 items-center justify-center font-mono font-bold leading-none',
          size === 'lg' ? 'h-9 w-9 rounded-xl text-base' : 'h-6 w-6 rounded-lg text-sm',
          !isSet && 'bg-paper text-ink-muted',
          isSet && tone === 'from' && 'bg-grad-primary text-surface',
          isSet && tone === 'to' && 'bg-secondary text-surface',
        )}
        aria-hidden="true"
      >
        {initialsFor(value)}
      </span>

      <span className="min-w-0">
        {size === 'lg' ? (
          <span className="block font-mono text-sm uppercase leading-tight tracking-[0.16em] text-ink-muted">
            {tone === 'from' ? 'Sender' : 'Recipient'}
          </span>
        ) : null}
        <span
          className={cn(
            'block break-words font-mono font-bold uppercase leading-tight tracking-[0.02em]',
            size === 'lg' ? 'text-base' : 'text-sm',
            isSet ? 'text-ink' : 'text-ink-muted',
          )}
        >
          {value ?? PLACEHOLDER}
        </span>
      </span>
    </div>
  );
}

/**
 * `Product manager` becomes `PM`; `Engineer` becomes `E`. Purely decorative — every caller
 * renders it aria-hidden alongside the real role name, so it never carries meaning alone.
 */
export function initialsFor(value: string | undefined): string {
  if (!value) return '··';
  const initials = value
    .split(/[^A-Za-z]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  return initials || '·';
}
