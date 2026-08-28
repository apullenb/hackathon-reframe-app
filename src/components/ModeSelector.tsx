import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Inbox,
  MessageSquareQuote,
  PenLine,
  Scale,
  ScanSearch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ContextSwitchMode } from '@/types/contracts';
import { cn } from '@/lib/cn';

/** The two modes that share one screen. Conflict Lens is deliberately not one of them. */
type MessageMode = Extract<ContextSwitchMode, 'say_it_better' | 'decode_it'>;

type ToneName = 'primary' | 'secondary' | 'coral';

type ModeDefinition = {
  mode: ContextSwitchMode;
  name: string;
  /** Copy is verbatim from spec §13.1 — do not paraphrase. */
  description: string;
  /** Short verb phrase used on the compact tab row. */
  short: string;
  icon: LucideIcon;
  tone: ToneName;
};

/**
 * The three underlying modes, unchanged.
 *
 * Say It Better and Decode It are no longer separate *entry points* — they are the two
 * directions of one flow — but they are still distinct modes in state, contracts and results,
 * and their §13.1 descriptions are quoted copy. This record stays the single source for both.
 */
const MODE_COPY: Record<ContextSwitchMode, ModeDefinition> = {
  say_it_better: {
    mode: 'say_it_better',
    name: 'Say It Better',
    description:
      'Turn the honest version in your head into the version another person can actually hear.',
    short: 'Write it',
    icon: MessageSquareQuote,
    tone: 'primary',
  },
  decode_it: {
    mode: 'decode_it',
    name: 'Decode It',
    description:
      'Separate what a message says from what it might mean and what still needs to be asked.',
    short: 'Read it',
    icon: ScanSearch,
    tone: 'secondary',
  },
  conflict_lens: {
    mode: 'conflict_lens',
    name: 'Conflict Lens',
    description: 'See both sides, find the real problem, and choose a better next move.',
    short: 'Untangle it',
    icon: Scale,
    tone: 'coral',
  },
};

export const MODES: readonly ModeDefinition[] = [
  MODE_COPY.say_it_better,
  MODE_COPY.decode_it,
  MODE_COPY.conflict_lens,
] as const;

type Direction = {
  mode: MessageMode;
  /** First person: the user is saying what they are doing, not picking a feature name. */
  label: string;
  /** What actually changes when this direction is chosen — the switch is not cosmetic. */
  outcome: string;
  icon: LucideIcon;
};

/** The two directions of the merged message flow, in the order they appear on the switch. */
export const DIRECTIONS: readonly Direction[] = [
  {
    mode: 'say_it_better',
    label: "I'm writing this",
    outcome: 'You get a message you can send, in the tone you choose.',
    icon: PenLine,
  },
  {
    mode: 'decode_it',
    label: 'I received this',
    outcome: 'You get what it says, what it might mean, and what to ask before you reply.',
    icon: Inbox,
  },
] as const;

type Entry = {
  id: string;
  /** The mode a click on this entry starts. */
  mode: ContextSwitchMode;
  /** Every mode this entry covers, so the tab row stays selected across a direction switch. */
  covers: readonly ContextSwitchMode[];
  name: string;
  short: string;
  description: string;
  icon: LucideIcon;
  tone: ToneName;
};

/**
 * Two entry points, not three. The message flow handles both directions behind one card
 * (spec §13.1's two descriptions are shown inside it, so nothing is hidden from the user);
 * Conflict Lens is a genuinely different job and stays on its own.
 */
const ENTRIES: readonly Entry[] = [
  {
    id: 'message',
    mode: 'say_it_better',
    covers: ['say_it_better', 'decode_it'],
    name: 'Message Translator',
    short: 'Message',
    description:
      'One message, either direction — something you are about to send, or something you just received. A switch inside flips which.',
    icon: MessageSquareQuote,
    tone: 'primary',
  },
  {
    id: 'conflict',
    mode: 'conflict_lens',
    covers: ['conflict_lens'],
    name: MODE_COPY.conflict_lens.name,
    short: MODE_COPY.conflict_lens.short,
    description: MODE_COPY.conflict_lens.description,
    icon: MODE_COPY.conflict_lens.icon,
    tone: MODE_COPY.conflict_lens.tone,
  },
] as const;

const TONES = {
  primary: {
    tile: 'bg-grad-primary text-white shadow-glow-primary',
    hover: 'hover:border-primary/45',
    halo: 'bg-primary/10',
    accent: 'text-primary',
  },
  secondary: {
    tile: 'bg-gradient-to-br from-secondary to-primary text-white shadow-glow-primary',
    hover: 'hover:border-secondary/45',
    halo: 'bg-secondary/10',
    accent: 'text-secondary',
  },
  coral: {
    tile: 'bg-grad-coral text-white shadow-lift',
    hover: 'hover:border-coral/45',
    halo: 'bg-coral/10',
    accent: 'text-coral-ink',
  },
} as const;

type ModeSelectorProps = {
  selected: ContextSwitchMode | null;
  onSelect: (mode: ContextSwitchMode) => void;
  variant?: 'cards' | 'tabs';
};

export function ModeSelector({ selected, onSelect, variant = 'cards' }: ModeSelectorProps) {
  if (variant === 'tabs') {
    return (
      <div
        className="flex w-full items-center gap-1 rounded-chip border border-line bg-surface/80 p-1 shadow-card sm:w-auto"
        role="tablist"
        aria-label="Flow"
      >
        {ENTRIES.map((entry) => {
          const isSelected = selected !== null && entry.covers.includes(selected);
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              // Re-entering the message flow must not silently flip the direction back, so the
              // active mode wins over the entry's default when this tab already owns it.
              onClick={() => onSelect(isSelected && selected ? selected : entry.mode)}
              className={cn(
                'inline-flex min-h-tap flex-1 items-center justify-center gap-2 rounded-chip px-3.5 text-sm font-semibold transition-all duration-200 ease-spring sm:flex-none',
                isSelected
                  ? 'bg-grad-primary text-white shadow-card edge-sheen'
                  : 'text-ink-muted hover:bg-primary-soft hover:text-primary',
              )}
            >
              <entry.icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{entry.name}</span>
              <span className="sm:hidden">{entry.short}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ENTRIES.map((entry, index) => {
        const tone = TONES[entry.tone];
        const isSelected = selected !== null && entry.covers.includes(selected);
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.mode)}
            aria-pressed={isSelected}
            style={{ animationDelay: `${index * 90}ms` }}
            className={cn(
              'group relative flex min-h-tap flex-col items-start gap-4 overflow-hidden rounded-card-lg border border-line bg-surface p-6 text-left shadow-card transition-all duration-300 ease-spring motion-safe:animate-reveal-up',
              'hover:-translate-y-1 hover:shadow-float',
              tone.hover,
              isSelected && 'border-primary/60 shadow-lift',
            )}
          >
            {/* Soft halo that blooms on hover — the only decorative motion here. */}
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-2xl transition-opacity duration-500',
                tone.halo,
                'opacity-0 group-hover:opacity-100',
              )}
            />

            <span
              className={cn(
                'relative flex h-12 w-12 items-center justify-center rounded-[15px] edge-sheen transition-transform duration-300 ease-spring group-hover:scale-105',
                tone.tile,
              )}
              aria-hidden="true"
            >
              <entry.icon className="h-[22px] w-[22px]" strokeWidth={2.25} />
            </span>

            <span className="relative font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
              {entry.name}
            </span>
            <span className="relative text-[1.2rem] font-medium leading-relaxed text-ink-muted">
              {entry.description}
            </span>

            {/* Both directions, spelled out on the card. Spans rather than a list, because a
                button may only contain phrasing content. */}
            {entry.covers.length > 1 ? (
              <span className="relative flex w-full flex-col gap-2">
                {DIRECTIONS.map((direction) => (
                  <span
                    key={direction.mode}
                    className="flex items-start gap-2.5 rounded-card border border-line bg-paper-sunk/60 px-3 py-2.5"
                  >
                    <direction.icon
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary"
                      aria-hidden="true"
                      strokeWidth={2.25}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-snug text-ink">
                        {direction.label}
                        <span className="font-semibold text-ink-muted">
                          {' · '}
                          {MODE_COPY[direction.mode].name}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm font-medium leading-relaxed text-ink-muted">
                        {MODE_COPY[direction.mode].description}
                      </span>
                    </span>
                  </span>
                ))}
              </span>
            ) : null}

            <span
              className={cn(
                'relative mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-bold',
                tone.accent,
              )}
            >
              Start
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-spring motion-safe:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

type DirectionSwitchProps = {
  /** The active mode. Only the two message modes are switchable. */
  mode: ContextSwitchMode;
  onChange: (mode: ContextSwitchMode) => void;
  className?: string;
};

/**
 * The direction switch that replaced two mode cards (owner's note: "Decode and Say it Better
 * are basically the exact same UI so just add a switch").
 *
 * A real radio group, so arrow keys work and each option reports its own checked state to
 * assistive tech. Selection is never carried by colour alone: the checked option gains a filled
 * check glyph, and the header spells the active mode out in words — the same device ChipGroup
 * uses for spec §24.
 */
export function DirectionSwitch({ mode, onChange, className }: DirectionSwitchProps) {
  const active = DIRECTIONS.find((direction) => direction.mode === mode) ?? DIRECTIONS[0];

  return (
    <fieldset
      className={cn(
        'rounded-card-lg border border-line bg-surface bg-wash-panel p-4 shadow-card sm:p-5',
        className,
      )}
    >
      <legend className="sr-only">Which direction is this message going?</legend>

      {/* Visible header duplicates the legend's words; a <legend> cannot be laid out reliably. */}
      <div
        aria-hidden="true"
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
      >
        <span className="inline-flex items-baseline gap-2.5">
          <span className="h-4 w-1 shrink-0 self-center rounded-full bg-grad-primary" />
          <span className="text-base font-bold tracking-tight text-ink">
            Which direction is this message going?
          </span>
        </span>
        <span className="font-mono text-sm uppercase tracking-[0.14em] text-ink-muted">
          {MODE_COPY[active.mode].name}
        </span>
      </div>

      <p className="mb-4 mt-2 text-sm font-medium leading-relaxed text-ink-muted">
        This changes what happens, not just the labels: the route, the questions you are asked,
        and the result you get back all follow it.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {DIRECTIONS.map((direction) => {
          const isActive = direction.mode === active.mode;
          const inputId = `cs-direction-${direction.mode}`;
          const StatusIcon = isActive ? CheckCircle2 : Circle;
          return (
            <div key={direction.mode} className="relative">
              <input
                type="radio"
                id={inputId}
                name="cs-direction"
                className="peer sr-only"
                value={direction.mode}
                checked={isActive}
                onChange={() => onChange(direction.mode)}
              />
              {/* The input is visually hidden, so the focus ring is mirrored onto the label. */}
              <label
                htmlFor={inputId}
                className={cn(
                  'flex h-full min-h-tap cursor-pointer items-start gap-3 rounded-card border p-3.5 transition-all duration-200 ease-spring',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper',
                  isActive
                    ? 'border-primary/60 bg-primary-soft shadow-card'
                    : 'border-line-strong bg-surface hover:border-primary-ring hover:bg-primary-soft/50 hover:shadow-lift motion-safe:hover:-translate-y-0.5',
                )}
              >
                <span
                  className={cn(
                    'edge-sheen flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isActive ? 'bg-grad-primary text-surface' : 'bg-paper-sunk text-ink-muted',
                  )}
                  aria-hidden="true"
                >
                  <direction.icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <StatusIcon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0',
                        isActive ? 'text-primary' : 'text-line-strong',
                      )}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                    <span className="text-base font-bold leading-tight tracking-tight text-ink">
                      {direction.label}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-sm font-medium leading-relaxed text-ink-muted">
                    {direction.outcome}
                  </span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
