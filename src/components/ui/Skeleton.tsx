import { cn } from '@/lib/cn';

/** Varied widths so a multi-line block reads as text, not as a solid slab. */
const lineWidths = ['w-full', 'w-11/12', 'w-4/5', 'w-10/12', 'w-3/4'];

export function Skeleton({
  className,
  lines = 1,
}: {
  className?: string;
  lines?: number;
}): JSX.Element {
  const count = Math.max(1, lines);

  if (count === 1) {
    return <div className={cn('skeleton h-4 w-full', className)} aria-hidden="true" />;
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn('skeleton h-4', lineWidths[index % lineWidths.length])} />
      ))}
    </div>
  );
}

/**
 * Card-shaped placeholder that mirrors the real card it stands in for — same border, radius,
 * shadow, header rule, and a button-sized block where the action row will land — so the layout
 * does not jump when content arrives. Pass `title` to keep a real, readable heading on screen
 * while the body loads: spec §25 forbids an unexplained spinner.
 */
export function SkeletonCard({
  title,
  lines = 3,
  className,
}: {
  title?: string;
  lines?: number;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-card border border-line bg-surface bg-wash-panel shadow-card',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="edge-sheen pointer-events-none absolute inset-0 rounded-[inherit]"
      />

      {/* Header: icon tile + eyebrow + title, matching CardHeader's rhythm. */}
      <div className="flex items-center gap-3 border-b border-line/80 px-5 py-4">
        <div className="skeleton h-9 w-9 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton h-3 w-24" aria-hidden="true" />
          {title ? (
            <p className="font-display text-xl font-semibold leading-tight tracking-tight text-ink">
              {title}
            </p>
          ) : (
            <>
              <span className="sr-only">Loading</span>
              <div className="skeleton h-5 w-2/5" aria-hidden="true" />
            </>
          )}
        </div>
      </div>

      <div className="space-y-5 px-5 py-4">
        <Skeleton lines={lines} />
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-9 w-28" aria-hidden="true" />
          <div className="skeleton h-9 w-20" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
