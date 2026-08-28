import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  isLoading?: boolean;
  fullWidth?: boolean;
};

/**
 * Resting appearance per variant. Filled variants carry a layered shadow plus a hairline sheen
 * along the top edge (the `before:` pseudo element in `baseClasses`) so they read as physical
 * keys rather than colored rectangles.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-grad-primary text-surface shadow-card',
  secondary:
    'border-transparent bg-gradient-to-br from-secondary via-secondary to-primary text-surface shadow-card',
  ghost: 'border-transparent bg-transparent text-primary',
  outline: 'border-line-strong bg-surface text-ink shadow-card',
};

/** Hover/active behavior, applied only while the button can actually be pressed. */
const interactiveClasses: Record<ButtonVariant, string> = {
  primary:
    'hover:shadow-glow-primary active:shadow-card motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px',
  secondary:
    'hover:shadow-lift active:shadow-card motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px',
  ghost: 'hover:bg-primary-soft hover:text-primary-hover active:bg-primary-soft',
  outline:
    'hover:border-primary-ring hover:text-primary hover:shadow-lift active:shadow-card motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px',
};

/** The top-edge highlight only makes sense on a filled, saturated ground. */
const sheenVariants: ReadonlySet<ButtonVariant> = new Set<ButtonVariant>(['primary', 'secondary']);

/**
 * `sm` drops to 36px and is reserved for inline secondary actions (spec §24 allows the
 * exception only there). `md` and `lg` always clear the 44px pointer-target minimum.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'min-h-tap px-5 py-2.5 text-base gap-2 rounded-xl',
  lg: 'min-h-[52px] px-7 py-3 text-lg gap-2.5 rounded-card',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
  lg: 'h-5 w-5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  isLoading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element {
  const iconClass = iconSizeClasses[size];
  const Leading = isLoading ? Loader2 : LeadingIcon;
  const isInert = (disabled ?? false) || isLoading;

  return (
    <button
      type={type}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'relative isolate inline-flex select-none items-center justify-center border',
        'font-semibold tracking-tight',
        'transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-spring',
        // Hairline highlight across the top edge of filled variants.
        sheenVariants.has(variant) &&
          'before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-sheen',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none',
        sizeClasses[size],
        variantClasses[variant],
        !isInert && interactiveClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {Leading ? (
        <Leading
          aria-hidden="true"
          className={cn(iconClass, 'shrink-0', isLoading && 'motion-safe:animate-spin')}
        />
      ) : null}
      <span className="truncate">{children}</span>
      {TrailingIcon && !isLoading ? (
        <TrailingIcon aria-hidden="true" className={cn(iconClass, 'shrink-0')} />
      ) : null}
    </button>
  );
}
