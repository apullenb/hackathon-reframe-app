/**
 * One participant's column (spec §13.7, "Person A's position" / "What each may need").
 *
 * Two clearly separated registers: what the person actually said, and what may sit underneath
 * it. The second register is inference, so every item carries a ConfidenceBadge and the section
 * says so in words — the reader should never be able to mistake a guess for a quote.
 *
 * Both columns get identical structure, spacing, and elevation. The only difference is a
 * structural hue used to tell one column from the other while scanning, never to rank them.
 */

import { useId } from 'react';
import { MessageSquare, Quote } from 'lucide-react';
import { ConfidenceBadge } from '@/components/shared';
import { Badge, Card, CardBody } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Interpretation } from '@/types/contracts';

type ParticipantPerspectiveProps = {
  /** Display name resolved from the request's speakers[]; falls back to the raw speakerId. */
  displayName: string;
  role?: string;
  isUser?: boolean;
  statedPosition: string[];
  possibleConcerns: Interpretation[];
  className?: string;
  style?: React.CSSProperties;
};

/** First character of the resolved name — falls back to a neutral glyph for an empty label. */
function monogram(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1).toUpperCase() : '·';
}

export function ParticipantPerspective({
  displayName,
  role,
  isUser = false,
  statedPosition,
  possibleConcerns,
  className,
  style,
}: ParticipantPerspectiveProps): JSX.Element {
  // Names can contain spaces, so heading ids come from useId rather than from the label.
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const statedId = `${baseId}-stated`;
  const concernsId = `${baseId}-concerns`;

  // Indigo for the reader's own column, ink for the other. Same weight, different hue: the pair
  // matches the transcript skins in SpeakerConfirmation so the columns stay recognisable.
  /**
   * When the speaker's label IS "You" — which happens whenever the conversation came from a
   * screenshot with no names in it — the name is already doing the pronoun's job. Repeating it
   * gives "What You said" and a "You" badge on a card titled You.
   */
  const nameIsYou = displayName.trim().toLowerCase() === 'you';
  const saidHeading = nameIsYou ? 'What you said' : `What ${displayName} said`;
  const didNotSay = nameIsYou ? 'You did not say these' : `${displayName} did not say these`;

  const rule = isUser ? 'bg-grad-primary' : 'bg-grad-ink';
  const monogramSkin = isUser ? 'bg-grad-primary text-surface' : 'bg-surface-ink text-paper';

  return (
    <Card
      elevation="card"
      aria-labelledby={nameId}
      className={cn('flex h-full min-w-0 flex-col overflow-hidden', className)}
      style={style}
    >
      <div aria-hidden="true" className={cn('h-1.5 w-full', rule)} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card font-display text-xl leading-none',
              monogramSkin,
            )}
          >
            {monogram(displayName)}
          </span>
          <div className="min-w-0">
            {role !== undefined && role.length > 0 ? (
              <p className="font-mono text-sm font-semibold uppercase tracking-wide text-ink-muted">
                {role}
              </p>
            ) : null}
            <h3
              id={nameId}
              className="min-w-0 break-words font-display text-xl leading-tight text-ink"
            >
              {displayName}
            </h3>
          </div>
        </div>
        {isUser && !nameIsYou ? (
          <Badge tone="primary" size="sm">
            You
          </Badge>
        ) : null}
      </div>

      <CardBody className="flex-1 space-y-6 sm:px-6">
        <section aria-labelledby={statedId}>
          <div className="flex items-center gap-2">
            <Quote aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-primary" />
            <h4 id={statedId} className="min-w-0 text-base font-bold text-ink">
              {saidHeading}
            </h4>
          </div>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-muted">
            Taken from the conversation itself.
          </p>
          <ul className="mt-3 space-y-2">
            {statedPosition.map((item, index) => (
              <li
                key={index}
                className="flex min-w-0 gap-3 rounded-card border border-line bg-paper-sunk px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
                <span className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby={concernsId}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <MessageSquare
                aria-hidden="true"
                className="h-[18px] w-[18px] shrink-0 text-secondary"
              />
              <h4 id={concernsId} className="min-w-0 text-base font-bold text-ink">
                What may sit underneath it
              </h4>
            </div>
            <Badge tone="slate" size="sm">
              Inference, not statement
            </Badge>
          </div>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-muted">
            Possible concerns, not statements. {didNotSay} — the label on each one says how far
            the wording actually supports it.
          </p>
          <ul className="mt-3 space-y-3">
            {possibleConcerns.map((concern, index) => (
              <li
                key={index}
                className="relative min-w-0 overflow-hidden rounded-card border border-secondary/30 bg-secondary-soft/70 py-3.5 pl-5 pr-4"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1.5 bg-secondary/50"
                />
                <p className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                  {concern.text}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <ConfidenceBadge support={concern.support} />
                </div>
                {concern.evidence !== undefined && concern.evidence.length > 0 ? (
                  <div className="mt-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
                    <p className="font-mono text-sm font-semibold uppercase tracking-wide text-ink-muted">
                      What the wording shows
                    </p>
                    <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                      {concern.evidence}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </CardBody>
    </Card>
  );
}
