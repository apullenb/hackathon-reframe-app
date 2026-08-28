import { useId } from 'react';
import { Send, ShieldCheck } from 'lucide-react';
import { Badge, Card, CardBody } from '@/components/ui';
import { CopyButton } from '@/components/shared';
import { cn } from '@/lib/cn';

export type SendableMessageCardProps = {
  /** `response.sendableMessage`. */
  message: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 2 of the result view (spec §13.5) — the largest card and the primary copy action.
 *
 * Visual dominance is deliberate and layered: an ambient halo behind the card, the heaviest
 * elevation on the page, a gradient cap along the top edge, the display face at its largest
 * size, and the only `size="lg"` primary button in the result. Body type is sans, not mono:
 * this is the text a human reads and sends.
 *
 * The arrival glow (spec §14) comes from Card's `glow` prop, which rides its own overlay
 * element — `animate-land-glow` animates `box-shadow`, so on the card itself it would blank out
 * the card's layered shadow for the length of the animation. Card renders the top-edge sheen on
 * an overlay for the same reason, so this file adds neither by hand.
 */
export function SendableMessageCard({
  message,
  className,
  style,
}: SendableMessageCardProps): JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('relative', className)} style={style}>
      {/* Ambient warmth behind the hero. Inset stays inside the shell's page padding so it
          can never introduce horizontal scroll. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[34px] bg-wash-hero opacity-80 sm:-inset-5"
      />

      <Card
        elevation="lift"
        glow
        className="relative overflow-hidden rounded-card-lg border-primary/25"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-grad-primary" />

        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-line/70 bg-wash-panel px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <Send aria-hidden="true" className="h-4 w-4 shrink-0" />
              Send this one
            </p>
            <h2
              id={headingId}
              className="font-display mt-1.5 text-display-sm font-semibold text-ink sm:text-display-md"
            >
              Ready to send
            </h2>
          </div>
          <Badge tone="teal" icon={ShieldCheck} size="md">
            Only facts you supplied
          </Badge>
        </div>

        <CardBody className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="shadow-inner-top rounded-card border border-line border-l-4 border-l-accent bg-paper-sunk px-5 py-5 sm:px-7 sm:py-6">
            {/* Line breaks in the generated message are preserved verbatim. */}
            <p className="whitespace-pre-wrap text-lg leading-relaxed text-ink sm:text-xl sm:leading-relaxed">
              {message}
            </p>
          </div>
        </CardBody>

        <div className="flex flex-col gap-4 border-t border-line/70 bg-wash-panel px-5 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-7">
          <div className="w-full [&_button]:shadow-glow-primary [&_button]:transition-transform [&_button]:duration-150 [&_button]:ease-spring [&_button]:active:scale-[0.985] sm:w-auto sm:min-w-[240px]">
            <CopyButton
              value={message}
              label="Copy message"
              variant="primary"
              size="lg"
              fullWidth
            />
          </div>
          <p className="text-base font-medium text-ink-muted">
            Copies exactly what you see. Nothing is sent for you.
          </p>
        </div>
      </Card>
    </section>
  );
}
