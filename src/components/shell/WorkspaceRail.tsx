import { useEffect, useState } from 'react';
import type { Dispatch } from 'react';
import {
  Home,
  LayoutGrid,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  ScanSearch,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { WORKSPACES, featuresForWorkspace } from '@/features/registry';
import type { SituationAction } from '@/situation/reducer';
import type { CurrentSituation, WorkspaceId } from '@/situation/types';

/**
 * The left navigation rail (brief §6.3).
 *
 * Only the active workspace expands to show its tools, so the rail stays a map of the product
 * rather than a wall of twelve links. It collapses to icons on tablet automatically and by hand
 * on desktop; the compact all-tools launcher at the bottom is the escape hatch either way.
 */

export type WorkspaceRailProps = {
  situation: CurrentSituation;
  dispatch: Dispatch<SituationAction>;
  onOpenCommandPalette: () => void;
  className?: string;
};

/** Workspace icons live here rather than in the registry, which owns feature icons only. */
const WORKSPACE_ICON: Record<WorkspaceId, LucideIcon> = {
  home: Home,
  inspect: ScanSearch,
  communicate: MessageSquareText,
  understand: Radar,
  repair: Wrench,
  patterns: TrendingUp,
};

/** Below this width the rail is icons-only; the drawer and workspace need the room. */
const EXPANDED_QUERY = '(min-width: 1024px)';

export function WorkspaceRail({
  situation,
  dispatch,
  onOpenCommandPalette,
  className,
}: WorkspaceRailProps): JSX.Element {
  const [expanded, setExpanded] = useState(true);

  // Tablet starts collapsed and desktop starts expanded, but a manual toggle is never undone
  // until the viewport actually crosses the breakpoint again.
  useEffect(() => {
    const query = window.matchMedia(EXPANDED_QUERY);
    const apply = (matches: boolean): void => setExpanded(matches);
    apply(query.matches);
    const onChange = (event: MediaQueryListEvent): void => apply(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const activeWorkspace = situation.activeWorkspace;

  return (
    <nav
      aria-label="Workspaces"
      className={cn(
        'shrink-0 border-r border-line bg-paper-sunk',
        'transition-[width] duration-200 ease-smooth',
        expanded ? 'w-60' : 'w-[4.5rem]',
        className,
      )}
    >
      <div className="sticky top-[3.75rem] flex h-[calc(100dvh-3.75rem)] flex-col gap-1 overflow-y-auto p-2">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className={cn(
            'mb-1 inline-flex min-h-tap items-center gap-2.5 rounded-card px-3 text-sm font-semibold',
            'text-ink-muted transition-colors duration-150 ease-smooth hover:bg-surface hover:text-ink',
            !expanded && 'justify-center px-0',
          )}
        >
          {expanded ? (
            <PanelLeftClose aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <PanelLeftOpen aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          )}
          <span className={cn(!expanded && 'sr-only')}>
            {expanded ? 'Collapse navigation' : 'Expand navigation'}
          </span>
        </button>

        <ul className="flex list-none flex-col gap-1">
          {WORKSPACES.map((workspace) => {
            const Icon = WORKSPACE_ICON[workspace.id];
            const isActive = workspace.id === activeWorkspace;
            const tools = featuresForWorkspace(workspace.id);

            return (
              <li key={workspace.id}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'open_workspace', workspace: workspace.id })}
                  aria-current={isActive ? 'true' : undefined}
                  title={expanded ? undefined : workspace.label}
                  className={cn(
                    'relative flex min-h-tap w-full items-center gap-2.5 rounded-card border px-3 text-left',
                    'transition-[background-color,border-color,color] duration-150 ease-smooth',
                    isActive
                      ? 'border-primary/30 bg-primary-soft text-primary'
                      : 'border-transparent text-ink-muted hover:bg-surface hover:text-ink',
                    !expanded && 'justify-center px-0',
                  )}
                >
                  {/* Position, not just colour, marks the active workspace. */}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary"
                    />
                  ) : null}
                  <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                  <span className={cn('truncate text-sm font-semibold tracking-tight', !expanded && 'sr-only')}>
                    {workspace.label}
                  </span>
                </button>

                {isActive && expanded ? (
                  <ul className="mb-1 ml-5 mt-1 flex list-none flex-col gap-0.5 border-l border-line pl-2">
                    <li>
                      <p className="px-2 py-1 text-xs font-medium leading-snug text-ink-muted">
                        {workspace.question}
                      </p>
                    </li>
                    {tools.map((tool) => {
                      const ToolIcon = tool.icon;
                      const isOpen = tool.id === situation.activeTool;
                      return (
                        <li key={tool.id}>
                          <button
                            type="button"
                            onClick={() =>
                              dispatch({ type: 'open_tool', tool: tool.id, workspace: workspace.id })
                            }
                            aria-current={isOpen ? 'true' : undefined}
                            className={cn(
                              'flex min-h-tap w-full items-center gap-2 rounded-card px-2 text-left',
                              'transition-colors duration-150 ease-smooth',
                              isOpen
                                ? 'bg-surface text-ink'
                                : 'text-ink-muted hover:bg-surface hover:text-ink',
                            )}
                          >
                            <ToolIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                            <span className="truncate text-sm font-medium tracking-tight">
                              {tool.name}
                            </span>
                            {isOpen ? <span className="sr-only">(open)</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          title={expanded ? undefined : 'All tools'}
          className={cn(
            'mt-auto flex min-h-tap items-center gap-2.5 rounded-card border border-line-strong bg-surface px-3',
            'text-sm font-semibold text-ink-muted shadow-card',
            'transition-[background-color,border-color,color] duration-150 ease-smooth',
            'hover:border-primary-ring hover:text-primary',
            !expanded && 'justify-center px-0',
          )}
        >
          <LayoutGrid aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          <span className={cn(!expanded && 'sr-only')}>All tools</span>
          {expanded ? (
            <span className="ml-auto font-mono text-xs tracking-[0.08em] text-ink-muted">⌘K</span>
          ) : null}
        </button>
      </div>
    </nav>
  );
}
