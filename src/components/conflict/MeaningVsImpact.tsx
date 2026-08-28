/**
 * "What they may be trying to say" versus "what the other person may be hearing" (spec §5.3).
 *
 * The pairing is the point, so it is never two separate lists: each participant gets one row
 * with an explicit hinge from intent to impact — mirrored panels side by side on desktop,
 * stacked with a downward hinge on mobile (spec §13.7). Both halves are possibilities; neither
 * is a verdict, and the copy says so once, up front, instead of hedging every line.
 */

import { ArrowDown, ArrowRight, Ear, Megaphone, Repeat2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type MeaningVsImpactRow = {
  /** Resolved display name of the speaker whose intent this is. */
  speakerName: string;
  /** Resolved display name of the person on the receiving end. */
  otherName: string;
  whatTheyMayBeTryingToSay: string;
  whatTheOtherPersonMayHear: string;
};

type MeaningVsImpactProps = {
  rows: MeaningVsImpactRow[];
  className?: string;
  style?: React.CSSProperties;
};

export function MeaningVsImpact({ rows, className, style }: MeaningVsImpactProps): JSX.Element {
  return (
    <section aria-labelledby="meaning-vs-impact-heading" className={className} style={style}>
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-coral shadow-lift"
        >
          <Repeat2 className="h-5 w-5 text-surface" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Intent and impact
          </p>
          <h2
            id="meaning-vs-impact-heading"
            className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
          >
            Meant, and heard
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            The same line from both ends. Each pair is one possible reading of the wording, not a
            claim about what either person intended.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div
            key={row.speakerName}
            className="min-w-0 overflow-hidden rounded-card-lg border border-line bg-surface shadow-card"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-paper-sunk px-5 py-3.5">
              <h3 className="min-w-0 break-words font-display text-lg leading-tight text-ink">
                {row.speakerName}
              </h3>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-coral" />
              <span className="min-w-0 break-words font-display text-lg leading-tight text-ink">
                {row.otherName}
              </span>
            </div>

            <div className="grid items-stretch gap-0 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <Half
                icon={Megaphone}
                iconClass="text-primary"
                label={`What ${row.speakerName} may be trying to say`}
                body={row.whatTheyMayBeTryingToSay}
                toneClass="border-primary/30 bg-primary-soft"
              />

              {/* The hinge: horizontal between stacked panels, vertical between mirrored ones. */}
              <div
                aria-hidden="true"
                className="relative flex items-center justify-center py-3 md:w-14 md:py-0"
              >
                <span className="absolute inset-x-6 top-1/2 h-px bg-line-strong md:inset-x-auto md:inset-y-4 md:left-1/2 md:top-auto md:h-auto md:w-px" />
                <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-chip border border-line-strong bg-surface shadow-lift">
                  <ArrowDown className="h-5 w-5 text-coral md:hidden" />
                  <ArrowRight className="hidden h-5 w-5 text-coral md:block" />
                </span>
              </div>

              <Half
                icon={Ear}
                iconClass="text-coral-ink"
                label={`What ${row.otherName} may be hearing`}
                body={row.whatTheOtherPersonMayHear}
                toneClass="border-coral/40 bg-coral-soft"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type HalfProps = {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  body: string;
  toneClass: string;
};

function Half({ icon: Icon, iconClass, label, body, toneClass }: HalfProps): JSX.Element {
  return (
    <div className={cn('min-w-0 rounded-card border px-4 py-4', toneClass)}>
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className={cn('mt-px h-[18px] w-[18px] shrink-0', iconClass)} />
        <p className="min-w-0 break-words font-mono text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </p>
      </div>
      <p className="mt-2.5 min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
        {body}
      </p>
    </div>
  );
}
