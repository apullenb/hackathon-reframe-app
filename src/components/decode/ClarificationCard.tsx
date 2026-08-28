import { Check, ListChecks, MessageCircleQuestion } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { CopyButton } from '@/components/shared';
import { cn } from '@/lib/cn';

export type ClarificationCardProps = {
  /** `DecodeResponse.clarificationQuestion` — sendable, so it gets its own Copy action. */
  clarificationQuestion: string;
  /** `DecodeResponse.usefulResponseShouldInclude` — rendered as a check-style checklist. */
  usefulResponseShouldInclude: string[];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 4 of the Decode result (spec §13.6): the best next question, plus the checklist of what
 * a useful reply has to contain (spec §5.2).
 *
 * The question is the one sendable artifact of this mode, so it gets the strongest treatment in
 * the view — an inverted gradient panel, display type, and its own Copy action.
 */
export function ClarificationCard({
  clarificationQuestion,
  usefulResponseShouldInclude,
  className,
  style,
}: ClarificationCardProps): JSX.Element {
  return (
    <div className={cn('grid gap-4', className)} style={style}>
      <section
        aria-labelledby="decode-clarification-heading"
        className="relative overflow-hidden rounded-card-lg bg-grad-primary p-5 shadow-glow-primary sm:p-7"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-sheen" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-surface/25 bg-surface/15"
            >
              <MessageCircleQuestion className="h-5 w-5 text-surface" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold uppercase tracking-widest text-white/90">
                Suggested clarification
              </p>
              <h3
                id="decode-clarification-heading"
                className="mt-1 font-display text-xl leading-tight text-surface sm:text-2xl"
              >
                The question worth asking first
              </h3>
            </div>
          </div>
          <CopyButton value={clarificationQuestion} label="Copy question" size="md" />
        </div>

        <blockquote className="mt-5 rounded-card border border-surface/20 bg-surface/10 px-4 py-4 sm:px-5">
          <p className="min-w-0 whitespace-pre-wrap break-words font-display text-lg leading-snug text-surface sm:text-xl">
            {clarificationQuestion}
          </p>
        </blockquote>

        <p className="mt-4 text-sm font-semibold leading-relaxed text-white/90">
          One question, aimed at the thing the message left open.
        </p>
      </section>

      {usefulResponseShouldInclude.length > 0 ? (
        <Card className="overflow-hidden">
          <div aria-hidden="true" className="h-1.5 w-full bg-grad-teal" />
          <CardHeader
            eyebrow="Reply checklist"
            title="A useful response should include"
            icon={ListChecks}
          />
          <CardBody className="sm:px-7 sm:py-6">
            <ul className="grid gap-3 sm:grid-cols-2">
              {usefulResponseShouldInclude.map((item) => (
                <li
                  key={item}
                  className="flex min-w-0 items-start gap-3 rounded-card border border-teal/30 bg-teal-soft px-4 py-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-chip bg-grad-teal"
                  >
                    <Check className="h-4 w-4 text-surface" />
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
