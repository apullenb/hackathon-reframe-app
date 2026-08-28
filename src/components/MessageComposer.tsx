import { Lightbulb, PenLine, ShieldCheck } from 'lucide-react';
import { Textarea } from '@/components/ui';

type MessageComposerProps = {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Loads a worked example into the field. */
  exampleText?: string;
  exampleLabel?: string;
  rows?: number;
};

/**
 * Privacy note copy is taken verbatim from spec §20 and is deliberately restrained. It must
 * stay technically true — never "your messages never leave your device", because with live AI
 * they do.
 */
export const PRIVACY_NOTE =
  'Avoid pasting anything you would not want processed by the configured AI provider. Message history is not stored.';

export function MessageComposer({
  label,
  hint,
  placeholder,
  value,
  onChange,
  exampleText,
  exampleLabel = 'Use an example',
  rows = 6,
}: MessageComposerProps) {
  return (
    <section aria-labelledby="composer-heading" className="space-y-3">
      <h2 id="composer-heading" className="sr-only">
        Your message
      </h2>

      <div className="rounded-card-lg border border-line bg-surface p-4 shadow-card sm:p-5">
        <p className="mb-4 inline-flex items-center gap-2.5 font-mono text-sm uppercase tracking-[0.16em] text-ink-muted">
          <PenLine className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Your words
        </p>

        <Textarea
          label={label}
          hint={hint}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          showCount
          className="min-h-[9rem] leading-relaxed"
        />

        {exampleText ? (
          <button
            type="button"
            onClick={() => onChange(exampleText)}
            className="mt-1 inline-flex min-h-tap items-center gap-2 rounded-chip border border-accent-ink/25 bg-accent-soft px-4 py-2 text-sm font-bold text-accent-ink transition-all duration-200 ease-spring hover:border-accent-ink/40 hover:shadow-glow-accent"
          >
            <Lightbulb className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {exampleLabel}
          </button>
        ) : null}
      </div>

      {/* Container styling only — the note's wording is legally load-bearing. */}
      <p className="flex items-start gap-3 rounded-card border border-teal/25 bg-teal-soft/50 px-4 py-3 text-sm font-medium leading-relaxed text-ink-muted">
        <span
          aria-hidden="true"
          className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-grad-teal text-surface"
        >
          <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={2.5} />
        </span>
        <span>{PRIVACY_NOTE}</span>
      </p>
    </section>
  );
}
