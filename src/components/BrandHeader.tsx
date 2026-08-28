import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

type BrandHeaderProps = {
  /** Compact drops the tagline — used once the workspace is active. */
  compact?: boolean;
};

/** The wordmark. The mark itself echoes the role-route motif that runs through the product. */
export function BrandHeader({ compact = false }: BrandHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-grad-primary text-white shadow-glow-primary edge-sheen"
      >
        <ArrowRight className="h-[22px] w-[22px]" strokeWidth={2.75} />
        <span className="absolute inset-x-0 -top-px h-px bg-sheen" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'font-display font-semibold leading-none tracking-tight text-ink',
            compact ? 'text-lg' : 'text-xl sm:text-[1.6rem]',
          )}
        >
          Context Switch
        </p>
        {compact ? null : (
          <p className="mt-1 text-sm font-medium leading-none text-ink-muted">
            Translate intent into impact.
          </p>
        )}
      </div>
    </div>
  );
}
