import { EyeOff } from 'lucide-react';
import { Badge, Card, CardBody, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';

export type UnknownsCardProps = {
  /** `DecodeResponse.unknowns` — a required, non-empty field in the schema, by design. */
  unknowns: string[];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 3 of the Decode result (spec §13.6): "What you cannot know from this message".
 *
 * This card is deliberately one of the heaviest in the view — full elevation, a display-serif
 * lead line, numbered items at full size, nothing greyed out and nothing in a footnote. Spec
 * §5.2 and §10.1 make `unknowns` a P0 element in its own right: refusing to guess is the
 * product, so this reads as a finding rather than as an apology.
 */
export function UnknownsCard({ unknowns, className, style }: UnknownsCardProps): JSX.Element | null {
  if (unknowns.length === 0) return null;

  return (
    <Card
      elevation="lift"
      className={cn('overflow-hidden border-2 border-slate/60 bg-slate-soft', className)}
      style={style}
    >
      <div aria-hidden="true" className="h-1.5 w-full bg-slate" />
      <CardHeader
        eyebrow="Out of reach of this message"
        title="Cannot be determined from what was sent"
        icon={EyeOff}
        className="border-slate/30"
        actions={
          <Badge tone="slate" size="sm" icon={EyeOff}>
            {unknowns.length === 1 ? '1 open item' : `${unknowns.length} open items`}
          </Badge>
        }
      />
      <CardBody className="space-y-5 sm:px-7 sm:py-6">
        <p className="min-w-0 whitespace-pre-wrap break-words font-display text-lg leading-snug text-ink sm:text-xl">
          This list is part of the read, not a gap in it. Each item below would need something this
          message does not contain.
        </p>

        <ol className="grid gap-3">
          {unknowns.map((unknown, index) => (
            <li
              key={unknown}
              className="flex min-w-0 items-start gap-4 rounded-card border border-slate/30 bg-surface px-4 py-4 shadow-card"
            >
              <span
                aria-hidden="true"
                className="mt-px inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-slate font-mono text-sm font-bold text-surface"
              >
                {index + 1}
              </span>
              <span className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                {unknown}
              </span>
            </li>
          ))}
        </ol>

        <p className="border-t border-slate/30 pt-4 text-sm font-semibold leading-relaxed text-ink-muted">
          The fastest way to close one of these is the question in the next layer.
        </p>
      </CardBody>
    </Card>
  );
}
