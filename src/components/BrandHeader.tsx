import reframeLogo from '@/assets/reframe-logo.png';
import { cn } from '@/lib/cn';

type BrandHeaderProps = {
  /** Compact drops the tagline — used once the workspace is active. */
  compact?: boolean;
};

/** The wordmark. The shifting-frame mark carries the reframing motif that runs through the product. */
export function BrandHeader({ compact = false }: BrandHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {/* `brand-mark` flips the mark's dark ink to light on dark themes — see src/index.css. */}
      <img
        src={reframeLogo}
        alt="Reframe"
        className={cn(
          // +120px on both sizes, per request. max-width is lifted above the `sm` breakpoint
          // because the mark is 1.59:1 — at 168px tall it is 267px wide, so a 60vw cap would
          // silently clamp the HEIGHT back to ~147px on a phone instead of honouring it.
          'brand-mark w-auto max-w-[80vw] shrink-0 object-contain sm:max-w-none',
          compact ? 'h-[160px]' : 'h-[168px]',
        )}
      />
      {compact ? null : (
        <div className="min-w-0">
          <p className="mt-1 text-sm font-medium leading-none text-ink-muted">
            Translate intent into impact.
          </p>
        </div>
      )}
    </div>
  );
}
