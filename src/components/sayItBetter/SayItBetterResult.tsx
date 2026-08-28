import { useId } from 'react';
import { Pencil, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';
import { SafetyNotice } from '@/components/shared';
import { cn } from '@/lib/cn';
import type { CommunicationContext, SayItBetterResponse } from '@/types/contracts';
import { AlternativeToneCards } from './AlternativeToneCards';
import { ChangeExplanation } from './ChangeExplanation';
import { ImpactPreview } from './ImpactPreview';
import { SendableMessageCard } from './SendableMessageCard';
import { StillMissingCard } from './StillMissingCard';
import { UnfilteredCard } from './UnfilteredCard';

export type SayItBetterResultProps = {
  response: SayItBetterResponse;
  /** Hide the unfiltered card when humor is off. */
  humorLevel: CommunicationContext['humorLevel'];
  onRegenerate: () => void;
  onEditContext: () => void;
};

/** Roughly one frame-and-a-half between sections: ordered, quick enough for a live demo. */
const STAGGER_MS = 75;

type Reveal = { className: string; style: React.CSSProperties };

/**
 * Say It Better results (spec §13.5), revealed in a fixed order: unfiltered translation,
 * sendable message, alternative tones, how it may land, what changed, still missing.
 *
 * Two hard rules live in this file:
 * 1. The unfiltered card renders ONLY when humor is `subtle` or `unfiltered` and the model
 *    actually returned a translation. `off` (and `undefined`) must produce no card at all —
 *    that is a content test in spec §27.
 * 2. Safety and a failed honesty check appear ABOVE the results, never underneath them.
 *
 * Reveal order is driven by a per-render counter rather than fixed constants, so a hidden
 * section does not leave a gap in the timing. `motion-safe:` is the only motion gate needed —
 * `prefers-reduced-motion` is handled globally in `src/index.css`.
 *
 * Rhythm: sections are spaced generously and each opens with a display-face heading, so the
 * page reads top-to-bottom as one document with a single hero rather than a stack of boxes.
 */
export function SayItBetterResult({
  response,
  humorLevel,
  onRegenerate,
  onEditContext,
}: SayItBetterResultProps): JSX.Element {
  const honestyHeadingId = useId();

  let order = 0;
  const reveal = (extra?: string): Reveal => {
    const style: React.CSSProperties = { animationDelay: `${order * STAGGER_MS}ms` };
    order += 1;
    return { className: cn('motion-safe:animate-reveal-up', extra), style };
  };

  const humorOn = humorLevel === 'subtle' || humorLevel === 'unfiltered';
  const unfilteredTranslation = response.unfilteredTranslation?.trim();
  const showUnfiltered = humorOn && Boolean(unfilteredTranslation);

  const sendableMessage = response.sendableMessage?.trim();
  const alternatives = response.alternatives ?? [];
  const impact = response.howItMayLand ?? [];
  const changes = response.changesMade ?? [];
  const missing = response.missingInformation ?? [];
  const honestyConcerns =
    response.honestyCheck && !response.honestyCheck.passed ? response.honestyCheck.concerns : [];

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* SafetyNotice renders null for category 'none'; `empty:hidden` keeps the rhythm intact. */}
      {response.safety ? (
        <div {...reveal('empty:hidden')}>
          <SafetyNotice safety={response.safety} />
        </div>
      ) : null}

      {honestyConcerns.length > 0 ? (
        <section aria-labelledby={honestyHeadingId} {...reveal()}>
          {/* `tone="primary"` carries both the ground and the gradient spine. */}
          <Card tone="primary" elevation="card" className="overflow-hidden">
            <CardBody className="space-y-4 py-5">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-surface shadow-card">
                  <ShieldAlert aria-hidden="true" className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id={honestyHeadingId}
                    className="font-display text-display-sm font-semibold text-ink"
                  >
                    The honesty check caught something
                  </h2>
                  <p className="mt-1.5 text-base text-ink-muted">
                    Read this before you send anything below.
                  </p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {honestyConcerns.map((concern) => (
                  <li
                    key={concern}
                    className="rounded-card border border-primary/20 bg-surface/70 px-4 py-3 text-base leading-relaxed text-ink"
                  >
                    {concern}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      ) : null}

      {showUnfiltered && unfilteredTranslation ? (
        <UnfilteredCard translation={unfilteredTranslation} {...reveal()} />
      ) : null}

      {sendableMessage ? (
        <SendableMessageCard message={sendableMessage} {...reveal()} />
      ) : (
        <section {...reveal()}>
          <Card tone="sunk" elevation="card">
            <CardBody className="py-6">
              <h2 className="font-display text-display-sm font-semibold text-ink">
                No sendable version here
              </h2>
              <p className="mt-2 text-base leading-relaxed text-ink">
                A rewrite was held back for this message. Editing the context or the original
                wording is the way forward — the notes above explain why.
              </p>
            </CardBody>
          </Card>
        </section>
      )}

      {alternatives.length > 0 ? (
        <AlternativeToneCards alternatives={alternatives} {...reveal()} />
      ) : null}

      {impact.length > 0 ? <ImpactPreview items={impact} {...reveal()} /> : null}

      {changes.length > 0 ? <ChangeExplanation changes={changes} {...reveal()} /> : null}

      {missing.length > 0 ? <StillMissingCard items={missing} {...reveal()} /> : null}

      <footer {...reveal('rounded-card-lg border border-line bg-wash-panel px-5 py-5 shadow-card')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" leadingIcon={RotateCcw} onClick={onRegenerate}>
            Regenerate
          </Button>
          <Button variant="ghost" leadingIcon={Pencil} onClick={onEditContext}>
            Edit context
          </Button>
        </div>
        <p className="mt-3.5 text-base font-medium text-ink-muted">
          Regenerating gives you another attempt at the wording. It will not add facts you
          haven’t supplied.
        </p>
      </footer>
    </div>
  );
}
