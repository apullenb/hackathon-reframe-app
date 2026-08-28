import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { ToolId } from '@/situation/types';
import { FEATURES } from '@/features/registry';
import { cn } from '@/lib/cn';

/**
 * ⌘/Ctrl+K palette (brief §6.6).
 *
 * The aliases matter more than the feature names: someone in the middle of a bad moment types
 * "I already sent it", not "Patch". Those phrasings come from the feature registry so a new
 * feature cannot be findable in one surface and invisible here.
 */

export type PaletteCommand = {
  id: string;
  label: string;
  hint?: string;
  keywords: string[];
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onOpenTool: (tool: ToolId) => void;
  /** Non-feature commands: scenarios, presentation mode, reset, privacy, under the hood. */
  extraCommands: PaletteCommand[];
};

export function CommandPalette({ open, onClose, onOpenTool, extraCommands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const commands = useMemo<PaletteCommand[]>(
    () => [
      ...FEATURES.map((feature) => ({
        id: feature.id,
        label: feature.name,
        hint: feature.summary,
        keywords: feature.aliases,
        run: () => onOpenTool(feature.id),
      })),
      ...extraCommands,
    ],
    [onOpenTool, extraCommands],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) ||
        command.hint?.toLowerCase().includes(q) ||
        command.keywords.some((keyword) => keyword.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      // Restore focus where it was, so keyboard users are not dumped at the top of the page.
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const chosen = results[index];
        if (chosen) {
          chosen.run();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, results, index, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="absolute inset-0 bg-surface-ink/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl overflow-hidden rounded-card-lg border border-line bg-surface shadow-float"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            placeholder="Search tools, or describe what happened…"
            aria-label="Search tools"
            className="min-h-tap w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <ul className="max-h-[52vh] overflow-y-auto py-2" role="listbox" aria-label="Results">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-sm font-medium text-ink-muted">
              Nothing matches that. Try “I already sent it” or “what does this mean”.
            </li>
          ) : (
            results.map((command, i) => (
              <li key={command.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    command.run();
                    onClose();
                  }}
                  className={cn(
                    'flex min-h-tap w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors',
                    i === index ? 'bg-primary-soft' : 'hover:bg-paper-sunk',
                  )}
                >
                  <span className={cn('text-sm font-semibold', i === index ? 'text-primary' : 'text-ink')}>
                    {command.label}
                  </span>
                  {command.hint ? (
                    <span className="text-xs font-medium text-ink-muted">{command.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
