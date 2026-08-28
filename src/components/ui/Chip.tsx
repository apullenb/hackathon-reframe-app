import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ChipProps = {
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  /** when false renders a non-interactive span */
  interactive?: boolean;
};

const baseClasses = cn(
  'relative isolate inline-flex items-center gap-2 rounded-chip border',
  'px-4 text-base font-semibold leading-none tracking-tight',
  'transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-spring',
);

/** Filled indigo with a top sheen — a selected chip should be unmistakable at a glance. */
const selectedClasses = cn(
  'border-transparent bg-grad-primary text-surface shadow-card',
  'before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-sheen',
);

const unselectedClasses = 'border-line-strong bg-surface text-ink shadow-card';

export function Chip({
  selected = false,
  onSelect,
  disabled = false,
  icon: Icon,
  children,
  className,
  interactive = true,
}: ChipProps): JSX.Element {
  const content = (
    <>
      {Icon ? <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" /> : null}
      <span>{children}</span>
    </>
  );

  if (!interactive) {
    return (
      <span
        className={cn(
          baseClasses,
          'min-h-9 py-2',
          selected ? selectedClasses : 'border-line-strong bg-paper-sunk text-ink',
          className,
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        baseClasses,
        /* Role selectors must not require fine pointer control (spec §24). */
        'min-h-tap py-2',
        selected ? selectedClasses : unselectedClasses,
        !disabled &&
          (selected
            ? 'hover:shadow-glow-primary motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px'
            : 'hover:border-primary-ring hover:bg-primary-soft hover:text-primary hover:shadow-lift motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px'),
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none',
        className,
      )}
    >
      {content}
    </button>
  );
}
