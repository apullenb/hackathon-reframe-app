import { CheckCircle2 } from 'lucide-react';
import { Badge, Card, CardBody, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';

export type KnownFactsCardProps = {
  /** `DecodeResponse.knownFacts` — its own P0 element, never folded into the literal reading. */
  knownFacts: string[];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 1b of the Decode result. `knownFacts` is a separate P0 element and a separate schema
 * field from `literalMeaning` (spec §10.1), so it gets its own card, its own heading, and its
 * own tone. Teal is the confirmed-facts hue throughout the app (src/styles/tokens.ts).
 */
export function KnownFactsCard({
  knownFacts,
  className,
  style,
}: KnownFactsCardProps): JSX.Element | null {
  if (knownFacts.length === 0) return null;

  return (
    <Card tone="teal" className={cn('overflow-hidden', className)} style={style}>
      <div aria-hidden="true" className="h-1.5 w-full bg-grad-teal" />
      <CardHeader
        eyebrow="Known facts"
        title="What we actually know from the message"
        icon={CheckCircle2}
        className="border-teal/30"
        actions={
          <Badge tone="teal" size="sm" icon={CheckCircle2}>
            {knownFacts.length === 1 ? '1 fact' : `${knownFacts.length} facts`}
          </Badge>
        }
      />
      <CardBody className="sm:px-7 sm:py-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {knownFacts.map((fact) => (
            <li
              key={fact}
              className="flex min-w-0 items-start gap-3 rounded-card border border-teal/30 bg-surface px-4 py-3.5 shadow-card"
            >
              <span
                aria-hidden="true"
                className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-chip bg-grad-teal"
              >
                <CheckCircle2 className="h-4 w-4 text-surface" />
              </span>
              <span className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                {fact}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
