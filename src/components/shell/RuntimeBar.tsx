import type { Dispatch, ReactNode } from 'react';
import { ArrowRight, Command, MonitorPlay, RotateCcw, ShieldAlert, Smile } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui';
import type { SituationAction } from '@/situation/reducer';
import type { CurrentSituation, HumorLevel } from '@/situation/types';

/**
 * The top runtime bar (brief §6.2).
 *
 * It is written as an environment read-out, not a form: no labelled inputs, no submit. Each
 * value is a live property of the running situation, and the two role chips are the way back
 * into Context Switch from anywhere in the app.
 */

export type RuntimeBarProps = {
  situation: CurrentSituation;
  dispatch: Dispatch<SituationAction>;
  /** Live-AI / example-data indicator, supplied by the host app. */
  aiStatus: ReactNode;
  onOpenContextSwitch: () => void;
  onOpenCommandPalette: () => void;
  onReset: () => void;
  presentationMode?: boolean;
  className?: string;
};

const HUMOR_CYCLE: readonly HumorLevel[] = ['off', 'light', 'balanced', 'spicy'];

const HUMOR_LABEL: Record<HumorLevel, string> = {
  off: 'Humor off',
  light: 'Light humor',
  balanced: 'Balanced humor',
  spicy: 'Spicy humor',
};

/** A role chip: micro-label above the value, whole chip is the Context Switch entry point. */
function RoleChip({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} ${value}. Open Context Switch to change it.`}
      className={cn(
        'group flex min-h-tap min-w-0 items-center gap-2.5 rounded-card border border-line-strong',
        'bg-surface px-3 py-1.5 text-left shadow-card',
        'transition-[background-color,border-color,box-shadow,transform] duration-150 ease-smooth',
        'hover:border-primary-ring hover:bg-primary-soft motion-safe:hover:-translate-y-px',
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </span>
        <span className="truncate text-sm font-semibold tracking-tight text-ink">{value}</span>
      </span>
    </button>
  );
}

export function RuntimeBar({
  situation,
  dispatch,
  aiStatus,
  onOpenContextSwitch,
  onOpenCommandPalette,
  onReset,
  presentationMode = false,
  className,
}: RuntimeBarProps): JSX.Element {
  const { roles, humorLevel, safety } = situation;
  const nextHumor = HUMOR_CYCLE[(HUMOR_CYCLE.indexOf(humorLevel) + 1) % HUMOR_CYCLE.length];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
        {/* Product mark + wordmark */}
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              'relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-grad-primary',
              'font-mono text-sm font-bold text-surface shadow-card',
              'before:pointer-events-none before:absolute before:inset-x-1.5 before:top-0 before:h-px before:bg-sheen',
            )}
          >
            CS
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            Context&nbsp;Switch
          </span>
        </div>

        <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-line md:block" />

        {/* Runtime: who is speaking, to whom */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <RoleChip label="I am" value={roles.user} onClick={onOpenContextSwitch} />
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" />
          <RoleChip label="Talking to" value={roles.recipient} onClick={onOpenContextSwitch} />

          <p className="hidden min-w-0 flex-col pl-1 font-mono text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-ink-muted lg:flex">
            <span className="truncate">{roles.relationship}</span>
            <span className="truncate">{roles.channel}</span>
          </p>
        </div>

        {/* Environment read-outs */}
        <div className="flex shrink-0 items-center gap-2">
          {safety.seriousMode ? (
            <Badge tone="slate" icon={ShieldAlert}>
              Serious mode
            </Badge>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'set_humor', level: nextHumor })}
              aria-label={`${HUMOR_LABEL[humorLevel]}. Switch to ${HUMOR_LABEL[nextHumor].toLowerCase()}.`}
              className={cn(
                'hidden min-h-tap items-center rounded-chip px-1',
                'transition-transform duration-150 ease-smooth motion-safe:hover:-translate-y-px sm:inline-flex',
              )}
            >
              <Badge tone="slate" icon={Smile}>
                {HUMOR_LABEL[humorLevel]}
              </Badge>
            </button>
          )}

          {aiStatus ? <div className="hidden sm:block">{aiStatus}</div> : null}

          {presentationMode ? (
            <Badge tone="accent" icon={MonitorPlay}>
              Presentation Mode
            </Badge>
          ) : null}

          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open the command palette"
            className={cn(
              'hidden min-h-tap items-center gap-2 rounded-card border border-line-strong bg-surface px-3',
              'text-sm font-semibold text-ink-muted shadow-card',
              'transition-[background-color,border-color,color] duration-150 ease-smooth',
              'hover:border-primary-ring hover:text-primary md:inline-flex',
            )}
          >
            <Command aria-hidden="true" className="h-4 w-4" />
            <span className="font-mono text-xs tracking-[0.08em]">K</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className={cn(
              'inline-flex min-h-tap items-center gap-2 rounded-card border border-line-strong bg-surface px-3',
              'text-sm font-semibold text-ink-muted shadow-card',
              'transition-[background-color,border-color,color] duration-150 ease-smooth',
              'hover:border-coral hover:text-coral-ink',
            )}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
            <span className="sr-only sm:hidden">Reset the current situation</span>
          </button>
        </div>
      </div>
    </header>
  );
}
