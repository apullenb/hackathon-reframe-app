import { useId } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type SelectOption = { value: string; label: string };
export type SelectGroup = { group: string; options: SelectOption[] };

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'children'
> & {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  placeholder?: string;
  options: SelectOption[] | SelectGroup[];
  className?: string;
};

function isGrouped(options: SelectOption[] | SelectGroup[]): options is SelectGroup[] {
  return options.length > 0 && 'group' in options[0];
}

/** Native <select> on purpose: full keyboard support and no fine pointer control (spec §24). */
export function Select({
  label,
  hint,
  error,
  hideLabel = false,
  placeholder,
  options,
  className,
  id,
  ...rest
}: SelectProps): JSX.Element {
  const generatedId = useId();
  const fieldId = id ?? `select-${generatedId}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = cn(hint && hintId, error && errorId);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className={cn('text-base font-semibold tracking-tight text-ink', hideLabel && 'sr-only')}
      >
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}

      <div className="group relative mt-0.5">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'min-h-tap w-full cursor-pointer appearance-none rounded-card border py-2.5 pl-4 pr-16 text-base font-medium text-ink',
            'shadow-inner-top',
            'transition-[background-color,border-color] duration-200 ease-smooth',
            error
              ? 'border-coral bg-coral-soft/50'
              : 'border-line-strong bg-paper-sunk/50 hover:border-primary-ring/70 focus:border-primary-ring focus:bg-surface',
            'disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:opacity-70',
            className,
          )}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}

          {isGrouped(options)
            ? options.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>

        {/*
          Custom indicator only — the control underneath stays a real <select>. Sits in a tinted
          tile so the field reads as a switch you can throw rather than a text input.
        */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2',
            'items-center justify-center rounded-lg border transition-colors duration-200 ease-smooth',
            error
              ? 'border-coral/30 bg-coral-soft text-coral-ink'
              : 'border-primary/15 bg-primary-soft text-primary group-hover:border-primary/35',
          )}
        >
          <ChevronDown className="h-[18px] w-[18px]" />
        </span>
      </div>

      {error ? (
        <p id={errorId} className="inline-flex items-center gap-1.5 text-sm font-semibold text-coral-ink">
          <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
