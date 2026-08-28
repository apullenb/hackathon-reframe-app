import type { Dispatch, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { SituationAction } from '@/situation/reducer';
import type { CurrentSituation } from '@/situation/types';
import { CrossFeatureTrace } from './CrossFeatureTrace';
import { CurrentSituationDrawer } from './CurrentSituationDrawer';
import { MobileNavigation } from './MobileNavigation';
import { RuntimeBar } from './RuntimeBar';
import { WorkspaceRail } from './WorkspaceRail';

/**
 * The four stable regions of the console (brief §6.1): runtime bar, navigation rail, central
 * workspace, situation drawer — with the cross-feature trace pinned directly beneath the bar,
 * because it is the connective tissue that makes twelve tools read as one session.
 *
 * The regions are stable in the literal sense: nothing here unmounts when a tool changes, so
 * the runtime the user configured stays visible while they work inside it.
 */

export type ConsoleShellProps = {
  situation: CurrentSituation;
  dispatch: Dispatch<SituationAction>;
  /** Rendered in the central workspace. */
  children: ReactNode;
  /** Live-AI / example-data indicator, rendered in the runtime bar. */
  aiStatus: ReactNode;
  onOpenContextSwitch: () => void;
  onOpenCommandPalette: () => void;
  onReset: () => void;
  presentationMode?: boolean;
};

export function ConsoleShell({
  situation,
  dispatch,
  children,
  aiStatus,
  onOpenContextSwitch,
  onOpenCommandPalette,
  onReset,
  presentationMode = false,
}: ConsoleShellProps): JSX.Element {
  return (
    <div className="grain relative flex min-h-dvh flex-col overflow-x-clip bg-paper">
      <a
        href="#workspace"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-card bg-primary px-4 py-2.5 text-sm font-bold text-surface shadow-lift"
      >
        Skip to the workspace
      </a>

      <RuntimeBar
        situation={situation}
        dispatch={dispatch}
        aiStatus={aiStatus}
        onOpenContextSwitch={onOpenContextSwitch}
        onOpenCommandPalette={onOpenCommandPalette}
        onReset={onReset}
        presentationMode={presentationMode}
      />

      <div className="flex min-h-0 w-full flex-1 items-stretch">
        <WorkspaceRail
          situation={situation}
          dispatch={dispatch}
          onOpenCommandPalette={onOpenCommandPalette}
          className="hidden md:block"
        />

        <main
          id="workspace"
          className={cn(
            'relative z-10 min-w-0 flex-1',
            /* Room for the mobile bottom sheet handle and bottom navigation. */
            'pb-40 md:pb-10',
          )}
        >
          <div
            className={cn(
              'sticky top-[3.75rem] z-20 flex items-center gap-3 border-b border-line',
              'bg-paper/90 px-4 py-2 backdrop-blur-xl sm:px-6',
            )}
          >
            <span
              aria-hidden="true"
              className="hidden shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted lg:block"
            >
              Trace
            </span>
            <CrossFeatureTrace situation={situation} dispatch={dispatch} className="flex-1" />
          </div>

          <div className="px-4 pt-5 sm:px-6">{children}</div>
        </main>

        <CurrentSituationDrawer
          situation={situation}
          dispatch={dispatch}
          presentation="panel"
          className="hidden md:block"
        />
      </div>

      <CurrentSituationDrawer
        situation={situation}
        dispatch={dispatch}
        presentation="sheet"
        className="md:hidden"
      />

      <MobileNavigation
        situation={situation}
        dispatch={dispatch}
        onOpenMore={onOpenCommandPalette}
        className="md:hidden"
      />
    </div>
  );
}
