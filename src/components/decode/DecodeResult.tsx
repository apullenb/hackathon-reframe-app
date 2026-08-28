import {
  ArrowRight,
  Lightbulb,
  RotateCcw,
  ScanText,
  SlidersHorizontal,
  Target,
  EyeOff,
  MessageCircleQuestion,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';
import { SafetyNotice } from '@/components/shared';
import { cn } from '@/lib/cn';
import type { DecodeResponse } from '@/types/contracts';
import { ClarificationCard } from './ClarificationCard';
import { InterpretationList } from './InterpretationList';
import { KnownFactsCard } from './KnownFactsCard';
import { LiteralMeaningCard } from './LiteralMeaningCard';
import { ResponseOptions } from './ResponseOptions';
import { ToneCueList } from './ToneCueList';
import { UnknownsCard } from './UnknownsCard';

export type DecodeResultProps = {
  response: DecodeResponse;
  /** For the header line, e.g. "Product manager → Engineer". */
  senderRole: string | undefined;
  recipientRole: string | undefined;
  onEditContext: () => void;
  onRegenerate: () => void;
};

/** 60ms per step (spec §14): layers land in reading order without making anyone wait. */
const STEP_MS = 60;

function delay(step: number): React.CSSProperties {
  return { animationDelay: `${step * STEP_MS}ms` };
}

const REVEAL = 'motion-safe:animate-reveal-up';

/**
 * The four layers read as strata: certainty at the top, and progressively less of it going down.
 * Each layer owns a hue from the token palette — teal for what is known, amber for what is
 * inferred, slate for what cannot be known, indigo for what to do next — and the numeral's
 * foreground is chosen per hue so the pairing clears contrast on its own ground.
 */
const LAYER_SKIN: Record<number, { chip: string; rule: string }> = {
  // Deepened from bg-grad-teal: that gradient's light stop put white text at 2.2:1, under
  // the 3:1 floor for 24px text. teal -> teal-ink keeps the hue and clears it.
  1: { chip: 'bg-gradient-to-br from-teal to-teal-ink text-surface', rule: 'bg-teal/35' },
  2: { chip: 'bg-amber text-ink', rule: 'bg-amber/40' },
  3: { chip: 'bg-slate text-surface', rule: 'bg-slate/40' },
  4: { chip: 'bg-grad-primary text-surface', rule: 'bg-primary/30' },
};

/** The in-page map of the read, so the shape of the analysis is visible before it is scrolled. */
const LAYER_INDEX: Array<{ index: number; short: string; dot: string }> = [
  { index: 1, short: 'What it says', dot: 'bg-teal' },
  { index: 2, short: 'What it may mean', dot: 'bg-amber' },
  { index: 3, short: 'What it cannot tell you', dot: 'bg-slate' },
  { index: 4, short: 'What to ask', dot: 'bg-primary' },
];

type LayerProps = {
  /** 1–4. Rendered as a chip, and as screen-reader text inside the heading. */
  index: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  step: number;
  /** Draws the connector down to the next layer. */
  connect?: boolean;
  children: React.ReactNode;
};

/**
 * One of the four visually distinct layers of the Decode view (spec §13.6). Section headings
 * are `<h2>`; card headings inside them are `<h3>` via `CardHeader`.
 */
function Layer({
  index,
  title,
  subtitle,
  icon: Icon,
  step,
  connect = false,
  children,
}: LayerProps): JSX.Element {
  const headingId = `decode-layer-${index}`;
  const skin = LAYER_SKIN[index] ?? LAYER_SKIN[1];

  return (
    <section
      aria-labelledby={headingId}
      className={cn('relative', REVEAL)}
      style={delay(step)}
    >
      {connect ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-[23px] top-14 hidden w-0.5 rounded-full md:block',
            '-bottom-12',
            skin.rule,
          )}
        />
      ) : null}

      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'relative z-10 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-card',
            'font-display text-2xl leading-none shadow-lift',
            skin.chip,
          )}
        >
          {index}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
            {`Layer ${index} of 4`}
          </p>
          <h2
            id={headingId}
            className="mt-1 flex items-start gap-2.5 font-display text-2xl leading-tight text-ink sm:text-display-sm"
          >
            <span className="sr-only">{`Layer ${index} of 4: `}</span>
            <Icon aria-hidden="true" className="mt-1.5 h-6 w-6 shrink-0 text-primary" />
            <span className="min-w-0">{title}</span>
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 md:pl-16">{children}</div>
    </section>
  );
}

/** "Product manager → Engineer", when we have the roles to say it with. */
function RoleRoute({
  senderRole,
  recipientRole,
}: {
  senderRole: string | undefined;
  recipientRole: string | undefined;
}): JSX.Element | null {
  if (!senderRole && !recipientRole) return null;

  return (
    <p className="flex flex-wrap items-center gap-2.5">
      <span className="inline-flex min-w-0 items-center rounded-chip border border-line-strong bg-surface px-3.5 py-1.5 font-mono text-base font-semibold text-ink shadow-card">
        <span className="min-w-0 break-words">{senderRole ?? 'Unspecified sender'}</span>
      </span>
      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      <span className="inline-flex min-w-0 items-center rounded-chip border border-primary/30 bg-primary-soft px-3.5 py-1.5 font-mono text-base font-semibold text-primary shadow-card">
        <span className="min-w-0 break-words">{recipientRole ?? 'you'}</span>
      </span>
      <span className="sr-only">
        {`Message from ${senderRole ?? 'an unspecified sender'} to ${recipientRole ?? 'you'}`}
      </span>
    </p>
  );
}

/**
 * Decode It result view — four layers in the order spec §11.2 and §13.6 require:
 * Said, May Mean, Unknown, Best Next Question, then the three reply cards.
 *
 * Two product rules are load-bearing here rather than cosmetic. Every inference carries a
 * `ConfidenceBadge`, and speculative inferences stay behind a disclosure (spec §5.2). The
 * "cannot know" layer is rendered at full weight, because admitting the limit is the feature.
 */
export function DecodeResult({
  response,
  senderRole,
  recipientRole,
  onEditContext,
  onRegenerate,
}: DecodeResultProps): JSX.Element {
  const {
    literalMeaning,
    likelyPurpose,
    knownFacts,
    interpretations,
    unknowns,
    toneCues,
    usefulResponseShouldInclude,
    clarificationQuestion,
    responseOptions,
    safety,
  } = response;

  const hasLayerTwo =
    likelyPurpose.length > 0 || interpretations.length > 0 || toneCues.length > 0;

  return (
    <div className="w-full max-w-full space-y-12">
      {safety ? <SafetyNotice safety={safety} className={REVEAL} /> : null}

      <header
        className={cn(
          'relative overflow-hidden rounded-card-lg border border-line bg-wash-panel p-5 shadow-card sm:p-7',
          REVEAL,
        )}
        style={delay(0)}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-grad-primary" />

        <p className="inline-flex items-center gap-2 rounded-chip border border-secondary/30 bg-secondary-soft px-3 py-1 font-mono text-sm font-semibold uppercase tracking-widest text-secondary">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
          Decode It
        </p>

        <h1 className="mt-4 max-w-3xl font-display text-2xl leading-tight text-ink sm:text-display-sm lg:text-display-md">
          What this message says, what it may mean, and{' '}
          <span className="text-gradient">what it cannot tell you</span>
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
          <RoleRoute senderRole={senderRole} recipientRole={recipientRole} />
        </div>

        <ol
          aria-label="The four layers of this read"
          className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {LAYER_INDEX.map((layer) => (
            <li key={layer.index} className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-full', layer.dot)} />
              <span className="min-w-0 font-mono text-sm font-semibold text-ink-muted">
                {`${layer.index}. `}
                <span className="font-sans text-ink">{layer.short}</span>
              </span>
            </li>
          ))}
        </ol>
      </header>

      <Layer
        index={1}
        step={1}
        title="What it literally says"
        subtitle="The wording itself, separated from anything read into it."
        icon={ScanText}
        connect
      >
        <LiteralMeaningCard literalMeaning={literalMeaning} className={REVEAL} style={delay(2)} />
        <KnownFactsCard knownFacts={knownFacts} className={REVEAL} style={delay(3)} />
      </Layer>

      {hasLayerTwo ? (
        <Layer
          index={2}
          step={4}
          title="What it may be trying to accomplish"
          subtitle="Every line in this layer is labeled with how strongly the message supports it."
          icon={Target}
          connect
        >
          <InterpretationList
            eyebrow="Likely purpose"
            title="Why this message may exist"
            description="What the message may be for — the job it may be doing for the sender."
            items={likelyPurpose}
            icon={Target}
            className={REVEAL}
            style={delay(5)}
          />
          <InterpretationList
            eyebrow="Interpretations"
            title="What it may mean"
            description="Readings the wording allows. None of these is settled by the message alone."
            items={interpretations}
            icon={Lightbulb}
            className={REVEAL}
            style={delay(6)}
          />
          <ToneCueList toneCues={toneCues} className={REVEAL} style={delay(7)} />
        </Layer>
      ) : null}

      {unknowns.length > 0 ? (
        <Layer
          index={3}
          step={8}
          title="What you cannot know from this message"
          subtitle="Named on purpose, so nothing here gets filled in with a guess."
          icon={EyeOff}
          connect
        >
          <UnknownsCard unknowns={unknowns} className={REVEAL} style={delay(9)} />
        </Layer>
      ) : null}

      <Layer
        index={4}
        step={10}
        title="Best next question"
        subtitle="The fastest way to replace an unknown with a fact."
        icon={MessageCircleQuestion}
      >
        <ClarificationCard
          clarificationQuestion={clarificationQuestion}
          usefulResponseShouldInclude={usefulResponseShouldInclude}
          className={REVEAL}
          style={delay(11)}
        />
      </Layer>

      <ResponseOptions responseOptions={responseOptions} className={REVEAL} style={delay(12)} />

      <div
        className={cn(
          'flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between',
          REVEAL,
        )}
        style={delay(13)}
      >
        <p className="max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Changing the roles or the relationship changes the read.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" leadingIcon={RotateCcw} onClick={onRegenerate}>
            Regenerate
          </Button>
          <Button variant="ghost" leadingIcon={SlidersHorizontal} onClick={onEditContext}>
            Edit context
          </Button>
        </div>
      </div>
    </div>
  );
}
