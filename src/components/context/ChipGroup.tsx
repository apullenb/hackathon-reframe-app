import { Chip } from '@/components/ui';

type Option = { id: string; label: string };

type ChipGroupProps = {
  legend: string;
  hint?: string;
  options: readonly Option[];
  value: string | undefined;
  onChange: (label: string) => void;
  /** Allows clearing the selection by re-selecting the active chip. */
  clearable?: boolean;
};

/**
 * Outcome and tone are selectable chips (spec §13.2). Implemented as a real fieldset so the
 * group has an accessible name and each chip reports its pressed state.
 *
 * The <legend> is the accessible name but is not the visible title: a legend renders inside the
 * fieldset's top border rather than in normal flow, so styling it breaks the card. The visible
 * header is an aria-hidden duplicate carrying the identical words, which keeps the layout
 * predictable without changing what a screen reader announces.
 *
 * That header also spells out the current selection, so state never rests on the chip's fill
 * alone (spec §24) — the chips' own `aria-pressed` carries it for assistive tech.
 */
export function ChipGroup({
  legend,
  hint,
  options,
  value,
  onChange,
  clearable = true,
}: ChipGroupProps) {
  const selected = options.find((option) => option.label === value);

  return (
    <fieldset className="rounded-card-lg border border-line bg-surface p-4 shadow-card sm:p-5">
      <legend className="sr-only">{legend}</legend>

      <div
        aria-hidden="true"
        className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
      >
        <span className="inline-flex items-baseline gap-2.5">
          <span className="h-4 w-1 shrink-0 self-center rounded-full bg-grad-primary" />
          <span className="text-base font-bold tracking-tight text-ink">{legend}</span>
        </span>
        <span className="font-mono text-sm uppercase tracking-[0.14em] text-ink-muted">
          {selected ? selected.label : 'Not set'}
        </span>
      </div>

      {hint ? (
        <p className="mb-3 text-sm font-medium leading-relaxed text-ink-muted">{hint}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.id}
            selected={value === option.label}
            onSelect={() => onChange(clearable && value === option.label ? '' : option.label)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}
