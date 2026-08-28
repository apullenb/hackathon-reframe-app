import { useId, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  label: string;
  hint?: string;
  error?: string;
  /** visually hide the label but keep it for screen readers */
  hideLabel?: boolean;
  showCount?: boolean;
  className?: string;
};

export function Textarea({
  label,
  hint,
  error,
  hideLabel = false,
  showCount = false,
  className,
  id,
  value,
  defaultValue,
  maxLength,
  onChange,
  rows = 6,
  ...rest
}: TextareaProps): JSX.Element {
  const generatedId = useId();
  const fieldId = id ?? `textarea-${generatedId}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const countId = `${fieldId}-count`;

  const [uncontrolledLength, setUncontrolledLength] = useState(
    () => String(defaultValue ?? '').length,
  );
  const length = value === undefined ? uncontrolledLength : String(value).length;

  const describedBy = cn(hint && hintId, error && errorId, showCount && countId);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className={cn(
          'text-base font-semibold tracking-tight text-ink',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}

      <textarea
        id={fieldId}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => {
          if (value === undefined) setUncontrolledLength(event.target.value.length);
          onChange?.(event);
        }}
        className={cn(
          /**
           * The field is a slightly recessed well: warm sunk ground plus a white inner top edge.
           * Focus lifts it to pure white so typing feels like the surface came forward.
           */
          'mt-0.5 w-full resize-y rounded-card border px-4 py-3.5 text-base leading-relaxed text-ink',
          'shadow-inner-top placeholder:text-ink-muted/70',
          'transition-[background-color,border-color] duration-200 ease-smooth',
          error
            ? 'border-coral bg-coral-soft/50 focus:bg-coral-soft/30'
            : 'border-line-strong bg-paper-sunk/50 hover:border-primary-ring/70 focus:border-primary-ring focus:bg-surface',
          'disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:opacity-70',
          className,
        )}
        {...rest}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {error ? (
          <p id={errorId} className="inline-flex items-center gap-1.5 text-sm font-semibold text-coral-ink">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : (
          <span />
        )}
        {showCount ? (
          <p
            id={countId}
            className="font-mono text-sm tabular-nums text-ink-muted"
            aria-live="off"
          >
            {maxLength === undefined
              ? `${length} characters`
              : `${length} / ${maxLength} characters`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
