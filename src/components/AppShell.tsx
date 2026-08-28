import type { ReactNode } from 'react';
import { BrandHeader } from './BrandHeader';

type AppShellProps = {
  /** Toolbar rendered on the right of the sticky header. */
  toolbar: ReactNode;
  /** True once a mode is active, which tightens the header. */
  compactHeader?: boolean;
  children: ReactNode;
};

/**
 * `overflow-x-clip` on the root contains the full-bleed hero wash, whose 100vw width includes
 * the scrollbar and otherwise causes an 8px horizontal scroll. `clip` is deliberate over
 * `hidden`: it does not create a scroll container, so the sticky header keeps working.
 */
export function AppShell({ toolbar, compactHeader = false, children }: AppShellProps) {
  return (
    <div className="grain relative min-h-screen overflow-x-clip bg-paper">
      <a
        href="#workspace"
        className="sr-only-focusable absolute left-4 top-4 z-[60] rounded-card bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lift"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <BrandHeader compact={compactHeader} />
          {toolbar}
        </div>
      </header>

      <main id="workspace" className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {children}
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <div className="rounded-card border border-line bg-surface/70 p-5">
          <p className="text-sm font-medium leading-relaxed text-ink-muted">
            Context Switch does not read minds. It separates what was said, what may have been
            meant, what was inferred, and what still needs to be asked. It is not a therapist,
            HR representative, attorney, or crisis service.
          </p>
        </div>
      </footer>
    </div>
  );
}
