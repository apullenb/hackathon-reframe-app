import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Where the tally starts. */
const STARTING_COUNT = 3;

/**
 * A small running joke, tucked at the bottom of Inspect.
 *
 * Deliberately in-memory: the count resets to its starting value on reload, so the modal always
 * opens on the same number rather than drifting. Nothing is persisted and nothing leaves the page.
 *
 * The trigger is visually tiny, as asked, but its hit area is padded out to the 44px minimum the
 * rest of the app holds to — a 16px tap target would fail the accessibility bar even for an
 * easter egg.
 */
export function ScottCounter() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(STARTING_COUNT);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Focus the close button on open, and hand focus back to the trigger on close.
  useEffect(() => {
    if (open) closeRef.current?.focus();
    else triggerRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <div className="mt-10 flex justify-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            'inline-flex min-h-tap min-w-tap items-center justify-center rounded-chip',
            'text-ink-muted/50 transition-colors hover:text-ink-muted',
          )}
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
          <span className="text-[11px] font-bold leading-none" aria-hidden="true">
            1
          </span>
          <span className="sr-only">Open the Scott counter</span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close the Scott counter"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="scott-counter-title"
            className="relative w-full max-w-md rounded-card border border-line bg-surface p-6 text-center shadow-lift"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-card text-ink-muted hover:bg-paper-sunk hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>

            <h2
              id="scott-counter-title"
              className="mx-auto max-w-[16rem] pt-4 font-display text-xl font-semibold leading-tight tracking-tight text-ink"
            >
              # of times Scott was right counter
            </h2>

            <p
              className="mt-6 font-display text-7xl font-semibold leading-none tabular-nums text-primary"
              aria-live="polite"
            >
              {count}
              <span className="sr-only">
                {` time${count === 1 ? '' : 's'} Scott was right`}
              </span>
            </p>

            <div className="mt-8">
              <Button
                variant="primary"
                size="lg"
                leadingIcon={Plus}
                fullWidth
                onClick={() => setCount((value) => value + 1)}
              >
                Scott was right again
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
