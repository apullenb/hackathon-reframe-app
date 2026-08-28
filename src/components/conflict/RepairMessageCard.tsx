/**
 * The repair/reset message (spec §5.3) — the one thing the user can act on right now, so it gets
 * the sendable-message treatment: prominent card, primary glow, Copy front and centre
 * (spec §14).
 *
 * Nothing is ever sent automatically (spec §20), and the copy says so plainly rather than
 * implying the message is finished business.
 */

import { MailCheck } from 'lucide-react';
import { CopyButton } from '@/components/shared';

type RepairMessageCardProps = {
  message: string;
  className?: string;
  style?: React.CSSProperties;
};

export function RepairMessageCard({
  message,
  className,
  style,
}: RepairMessageCardProps): JSX.Element {
  return (
    <section aria-labelledby="repair-message-heading" className={className} style={style}>
      <div className="overflow-hidden rounded-card-lg border-2 border-primary/60 bg-surface shadow-glow-primary">
        <div aria-hidden="true" className="h-2 w-full bg-grad-primary" />

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-primary shadow-lift"
              >
                <MailCheck className="h-5 w-5 text-surface" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
                  Ready to send
                </p>
                <h2
                  id="repair-message-heading"
                  className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
                >
                  A message to reset the conversation
                </h2>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
                  Written to acknowledge impact without deciding who was right. Change anything
                  that does not sound like you.
                </p>
              </div>
            </div>
            <CopyButton value={message} label="Copy message" size="md" variant="primary" />
          </div>

          <div className="mt-5 rounded-card border border-line bg-paper-sunk px-4 py-4 sm:px-6 sm:py-5">
            <p className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink sm:text-lg">
              {message}
            </p>
          </div>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-ink-muted">
            Nothing is sent for you. Copy it, read it once more, and send it yourself.
          </p>
        </div>
      </div>
    </section>
  );
}
