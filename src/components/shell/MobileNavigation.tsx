import type { Dispatch } from 'react';
import { Home, MessageSquareText, MoreHorizontal, Radar, ScanSearch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SituationAction } from '@/situation/reducer';
import type { CurrentSituation, WorkspaceId } from '@/situation/types';

/**
 * Bottom navigation for small screens (brief §14).
 *
 * Five destinations only: Home, Inspect, Communicate, Understand, More. Repair and Patterns are
 * reached through More, and Context Switch stays in the runtime bar so the active role is always
 * one tap away regardless of which workspace is open.
 */

export type MobileNavigationProps = {
  situation: CurrentSituation;
  dispatch: Dispatch<SituationAction>;
  /** "More" opens the all-tools command palette. */
  onOpenMore: () => void;
  className?: string;
};

const ITEMS: ReadonlyArray<{ workspace: WorkspaceId; label: string; icon: LucideIcon }> = [
  { workspace: 'home', label: 'Home', icon: Home },
  { workspace: 'inspect', label: 'Inspect', icon: ScanSearch },
  { workspace: 'communicate', label: 'Communicate', icon: MessageSquareText },
  { workspace: 'understand', label: 'Understand', icon: Radar },
];

export function MobileNavigation({
  situation,
  dispatch,
  onOpenMore,
  className,
}: MobileNavigationProps): JSX.Element {
  const isMoreActive = situation.activeWorkspace === 'repair' || situation.activeWorkspace === 'patterns';

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-xl',
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <ul className="flex list-none items-stretch">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = situation.activeWorkspace === item.workspace;
          return (
            <li key={item.workspace} className="flex-1">
              <button
                type="button"
                onClick={() => dispatch({ type: 'open_workspace', workspace: item.workspace })}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'relative flex min-h-tap w-full flex-col items-center justify-center gap-1 px-1 py-2',
                  'transition-colors duration-150 ease-smooth',
                  isActive ? 'text-primary' : 'text-ink-muted',
                )}
              >
                {/* An indicator bar, so the active tab is not colour-only. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-4 top-0 h-0.5 rounded-b-full',
                    isActive ? 'bg-primary' : 'bg-transparent',
                  )}
                />
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span className="truncate text-[11px] font-semibold tracking-tight">{item.label}</span>
              </button>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMore}
            aria-current={isMoreActive ? 'true' : undefined}
            className={cn(
              'relative flex min-h-tap w-full flex-col items-center justify-center gap-1 px-1 py-2',
              'transition-colors duration-150 ease-smooth',
              isMoreActive ? 'text-primary' : 'text-ink-muted',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-x-4 top-0 h-0.5 rounded-b-full',
                isMoreActive ? 'bg-primary' : 'bg-transparent',
              )}
            />
            <MoreHorizontal aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="truncate text-[11px] font-semibold tracking-tight">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
