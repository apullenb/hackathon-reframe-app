import { useId } from 'react';
import { AlertTriangle, Minus, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SayItBetterResponse } from '@/types/contracts';

type ImpactTag = NonNullable<SayItBetterResponse['howItMayLand']>[number];
type Sentiment = ImpactTag['sentiment'];

type SentimentStyle = {
  icon: LucideIcon;
  /** Mandatory on screen: sentiment is never carried by color alone (spec §24). */
  word: string;
  pill: string;
  disc: string;
  wordInk: string;
};

/**
 * Icon + word + tone per sentiment. Whole class strings, never assembled from fragments, so
 * every one of them is visible to Tailwind's scanner.
 */
const presentation: Record<Sentiment, SentimentStyle> = {
  positive: {
    icon: ThumbsUp,
    word: 'Positive',
    pill: 'border-teal/35',
    disc: 'bg-teal-soft text-teal-ink',
    wordInk: 'text-teal-ink',
  },
  neutral: {
    icon: Minus,
    word: 'Neutral',
    pill: 'border-slate/35',
    disc: 'bg-slate-soft text-slate-ink',
    wordInk: 'text-slate-ink',
  },
  caution: {
    icon: AlertTriangle,
    word: 'Caution',
    pill: 'border-amber/40',
    disc: 'bg-amber-soft text-amber-ink',
    wordInk: 'text-amber-ink',
  },
};

export type ImpactPreviewProps = {
  /** `response.howItMayLand`. */
  items: ImpactTag[];
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Layer 4 of the result view (spec §13.5) — compact impact tags, built as lozenges with an
 * icon disc, the sentiment word, and the reading itself.
 *
 * Copy is hedged on purpose (spec §15): this is how the message *may* land, not a promise
 * about how the reader will feel.
 */
export function ImpactPreview({ items, className, style }: ImpactPreviewProps): JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('space-y-4', className)} style={style}>
      <div>
        <h2 id={headingId} className="font-display text-display-sm font-semibold text-ink">
          How it may land
        </h2>
        <p className="mt-1.5 text-base text-ink-muted">
          One reading of the message, not a guarantee about the other person.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const { icon: Icon, word, pill, disc, wordInk } = presentation[item.sentiment];
          return (
            <li key={`${item.sentiment}-${item.label}`} className="flex">
              <span
                className={cn(
                  'flex w-full items-center gap-3 rounded-chip border bg-surface py-2 pl-2 pr-5 shadow-card',
                  pill,
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-chip',
                    disc,
                  )}
                >
                  <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  {/* Outside the uppercase span: `text-transform` can change how a screen
                      reader pronounces the text it applies to. */}
                  <span className="sr-only">Reading: </span>
                  <span className={cn('block text-sm font-bold uppercase tracking-[0.14em]', wordInk)}>
                    {word}
                  </span>
                  <span className="block text-base font-medium leading-snug text-ink">
                    {item.label}
                  </span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
