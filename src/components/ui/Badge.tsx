import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'primary' | 'secondary' | 'teal' | 'amber' | 'coral' | 'slate' | 'accent';
export type BadgeSize = 'sm' | 'md';

export type BadgeProps = {
  tone?: BadgeTone;
  icon?: LucideIcon;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
};

/** Soft ground + text-safe ink for every tone — status is never carried by color alone (spec §24). */
const toneClasses: Record<BadgeTone, string> = {
  primary: 'bg-primary-soft text-primary border-primary/25',
  secondary: 'bg-secondary-soft text-secondary border-secondary/25',
  teal: 'bg-teal-soft text-teal-ink border-teal/30',
  amber: 'bg-amber-soft text-amber-ink border-amber/30',
  coral: 'bg-coral-soft text-coral-ink border-coral/30',
  slate: 'bg-slate-soft text-slate-ink border-slate/30',
  accent: 'bg-accent-soft text-accent-ink border-accent-ink/20',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'gap-1.5 px-2.5 py-1 text-sm',
  md: 'gap-2 px-3.5 py-1.5 text-base',
};

const iconClasses: Record<BadgeSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
};

export function Badge({
  tone = 'primary',
  icon: Icon,
  size = 'sm',
  children,
  className,
}: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        /* The white inner top edge is what keeps a small tinted pill from looking like a flat swatch. */
        'inline-flex items-center whitespace-nowrap rounded-chip border font-semibold leading-tight tracking-tight',
        'shadow-inner-top',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className={cn(iconClasses[size], 'shrink-0')} /> : null}
      {/* The label always renders; never color-only. */}
      <span>{children}</span>
    </span>
  );
}
