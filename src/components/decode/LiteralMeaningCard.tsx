import { ScanText, Signature } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';

export type LiteralMeaningCardProps = {
  /** `DecodeResponse.literalMeaning` — the plain reading, before any inference. */
  literalMeaning: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 1a of the Decode result (spec §13.6). Set as a pull quote in the display serif because
 * it is the one statement in the whole view that is not an inference — it earns the typographic
 * weight, and it needs no confidence label and no hedging.
 */
export function LiteralMeaningCard({
  literalMeaning,
  className,
  style,
}: LiteralMeaningCardProps): JSX.Element {
  return (
    <Card className={cn('overflow-hidden bg-wash-panel', className)} style={style}>
      <div aria-hidden="true" className="h-1.5 w-full bg-grad-ink" />
      <CardHeader
        eyebrow="Literal reading"
        title="What the message actually says"
        icon={ScanText}
      />
      <CardBody className="space-y-4 sm:px-7 sm:py-6">
        <p className="min-w-0 whitespace-pre-wrap break-words font-display text-lg leading-snug text-ink sm:text-xl">
          {literalMeaning}
        </p>
        <p className="flex items-start gap-2.5 border-t border-line pt-4 text-sm font-semibold text-ink-muted">
          <Signature aria-hidden="true" className="mt-px h-[18px] w-[18px] shrink-0 text-ink-muted" />
          <span className="min-w-0">
            Nothing here is inferred. Every line below this card is labeled with how well the
            message itself supports it.
          </span>
        </p>
      </CardBody>
    </Card>
  );
}
