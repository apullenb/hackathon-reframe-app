import { Reply } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { CopyButton } from '@/components/shared';
import { cn } from '@/lib/cn';
import type { DecodeResponse } from '@/types/contracts';

export type ResponseOptionsProps = {
  /** `DecodeResponse.responseOptions` — exactly three, per the schema. */
  responseOptions: DecodeResponse['responseOptions'];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * The three reply cards that sit below the four layers (spec §13.6). Equal weight, no ranking,
 * and each one independently copyable, because the user picks one and sends it.
 */
export function ResponseOptions({
  responseOptions,
  className,
  style,
}: ResponseOptionsProps): JSX.Element | null {
  if (responseOptions.length === 0) return null;

  return (
    <section
      aria-labelledby="decode-response-options"
      className={cn('space-y-5', className)}
      style={style}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-primary shadow-lift"
        >
          <Reply className="h-5 w-5 text-surface" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Ready to send
          </p>
          <h2
            id="decode-response-options"
            className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
          >
            Three ways to reply
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            Drafts, not scripts. Fill the bracketed parts with facts only you have.
          </p>
        </div>
      </div>

      <ul className="grid gap-4 lg:grid-cols-3">
        {responseOptions.map((option, index) => (
          <li key={option.id} className="min-w-0">
            <Card
              className={cn(
                'flex h-full flex-col overflow-hidden',
                'transition-shadow duration-200 ease-smooth hover:shadow-lift',
              )}
            >
              <div aria-hidden="true" className="h-1.5 w-full bg-grad-primary" />
              <div className="flex items-start gap-3 border-b border-line/70 px-5 py-4">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-primary-soft font-mono text-sm font-bold text-primary"
                >
                  {index + 1}
                </span>
                <h3 className="min-w-0 break-words text-lg font-semibold leading-snug text-ink">
                  <span className="sr-only">{`Option ${index + 1} of ${responseOptions.length}: `}</span>
                  {option.label}
                </h3>
              </div>
              <CardBody className="flex-1">
                <p className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                  {option.message}
                </p>
              </CardBody>
              <div className="border-t border-line/70 bg-paper-sunk px-5 py-4">
                <CopyButton value={option.message} label="Copy reply" size="md" fullWidth />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
