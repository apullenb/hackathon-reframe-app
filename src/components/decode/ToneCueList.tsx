import { AudioLines, Type } from 'lucide-react';
import { Badge, Card, CardBody, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { DecodeResponse } from '@/types/contracts';

export type ToneCueListProps = {
  /** `DecodeResponse.toneCues` — may legitimately be empty, in which case nothing renders. */
  toneCues: DecodeResponse['toneCues'];
  className?: string;
  style?: React.CSSProperties;
};

const OPENING_MARKS = ['"', '“', '‘', "'"];
const CLOSING_MARKS = ['"', '”', '’', "'"];

/**
 * A cue is either a literal fragment of the message or a description of its shape
 * ("Two short sentences, no detail"). Quote marks are added to the first kind and withheld from
 * the second, because quoting something the sender never wrote would be its own small lie.
 */
function readCue(raw: string): { text: string; quoted: boolean } {
  const trimmed = raw.trim();
  const isQuoted =
    trimmed.length >= 2 &&
    OPENING_MARKS.includes(trimmed[0]) &&
    CLOSING_MARKS.includes(trimmed[trimmed.length - 1]);

  return isQuoted
    ? { text: trimmed.slice(1, -1), quoted: true }
    : { text: trimmed, quoted: false };
}

/**
 * Tone cues, spec §5.2: "Emotional/tone cues present in the actual language". The pairing is
 * the whole point — the real wording on one side, set in mono so it reads as quoted material,
 * and a neutral observation about that wording on the other. The observation is about the words
 * and nothing beyond them, which is why the helper line says so out loud.
 *
 * Renders `null` for an empty list rather than an empty heading.
 */
export function ToneCueList({ toneCues, className, style }: ToneCueListProps): JSX.Element | null {
  if (toneCues.length === 0) return null;

  return (
    <Card className={cn('overflow-hidden', className)} style={style}>
      <div aria-hidden="true" className="h-1.5 w-full bg-grad-accent" />
      <CardHeader
        eyebrow="Tone cues"
        title="Wording present in the message"
        icon={AudioLines}
        actions={
          <Badge tone="accent" size="sm">
            {toneCues.length === 1 ? '1 cue' : `${toneCues.length} cues`}
          </Badge>
        }
      />
      <CardBody className="space-y-4 sm:px-7 sm:py-6">
        <p className="text-sm font-semibold leading-relaxed text-ink-muted">
          Each observation is about the wording beside it, and stops there. Wording alone does not
          establish intent.
        </p>

        <dl className="grid gap-3">
          {toneCues.map((cue) => {
            const { text, quoted } = readCue(cue.cue);

            return (
              <div
                key={cue.cue}
                className={cn(
                  'grid min-w-0 gap-3 rounded-card border border-line bg-paper-sunk p-4',
                  'sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-start sm:gap-5',
                )}
              >
                <dt className="min-w-0">
                  <span className="sr-only">
                    {quoted ? 'Wording in the message: ' : 'Pattern in the wording: '}
                  </span>
                  <span
                    className={cn(
                      'inline-flex min-w-0 max-w-full items-start gap-2 rounded-lg border bg-surface px-3 py-2 shadow-card',
                      quoted ? 'border-line-strong' : 'border-dashed border-line-strong',
                    )}
                  >
                    {quoted ? null : (
                      <Type aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                    )}
                    <span className="min-w-0 break-words font-mono text-base font-semibold text-ink">
                      {quoted ? `“${text}”` : text}
                    </span>
                  </span>
                </dt>
                <dd className="min-w-0">
                  <span className="sr-only">Observation about that wording: </span>
                  <span className="whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                    {cue.observation}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </CardBody>
    </Card>
  );
}
