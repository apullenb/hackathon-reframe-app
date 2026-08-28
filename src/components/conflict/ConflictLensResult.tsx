/**
 * The Conflict Lens map (spec §13.7).
 *
 * Order is an ethical decision, not just a layout one:
 *   1. FalseEquivalenceNotice and SafetyNotice come FIRST. If the exchange contains conduct that
 *      should not be split down the middle, the reader sees that before they see anything that
 *      looks even-handed (spec §5.3 critical rule, §20).
 *   2. Then the neutral summary, both sides, meant/heard, the facts split, the escalation
 *      sequence, the core problem, the options, the structure, and the repair message.
 *
 * The response carries no names — `participants[].speakerId` is joined against the request's
 * `speakers[]` here (see src/schemas/conflictLens.ts). A missing match falls back to the raw id
 * rather than rendering a nameless column.
 *
 * No panel declares a winner, scores either person, or diagnoses anyone.
 */

import { ListOrdered, Pencil, RefreshCw, Users } from 'lucide-react';
import { FalseEquivalenceNotice, SafetyNotice } from '@/components/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ConflictLensResponse, ConflictSpeaker } from '@/types/contracts';
import { CoreProblemCard } from './CoreProblemCard';
import { EscalationTimeline } from './EscalationTimeline';
import { FactsPanel } from './FactsPanel';
import { MeaningVsImpact } from './MeaningVsImpact';
import type { MeaningVsImpactRow } from './MeaningVsImpact';
import { ParticipantPerspective } from './ParticipantPerspective';
import { RepairMessageCard } from './RepairMessageCard';
import { ResolutionOptions } from './ResolutionOptions';

type ConflictLensResultProps = {
  response: ConflictLensResponse;
  speakers: ConflictSpeaker[];
  onEditContext: () => void;
  onRegenerate: () => void;
};

/** Reveal results in logical order (spec §14) without making the demo wait. */
const STAGGER_MS = 75;

const revealClass = 'motion-safe:animate-reveal-up';

function revealStyle(step: number): React.CSSProperties {
  return { animationDelay: `${step * STAGGER_MS}ms` };
}

type ResolvedParticipant = {
  speakerId: string;
  displayName: string;
  role?: string;
  isUser: boolean;
  statedPosition: string[];
  possibleConcerns: ConflictLensResponse['participants'][number]['possibleConcerns'];
  whatTheyMayBeTryingToSay: string;
  whatTheOtherPersonMayHear: string;
};

/** Join speakerId → speakers[]. Falls back to the raw id so a column is never nameless. */
function resolveParticipants(
  response: ConflictLensResponse,
  speakers: ConflictSpeaker[],
): ResolvedParticipant[] {
  return response.participants.map((participant) => {
    const match = speakers.find((speaker) => speaker.id === participant.speakerId);

    return {
      speakerId: participant.speakerId,
      displayName: match?.label ?? participant.speakerId,
      role: match?.role,
      isUser: match?.isUser ?? false,
      statedPosition: participant.statedPosition,
      possibleConcerns: participant.possibleConcerns,
      whatTheyMayBeTryingToSay: participant.whatTheyMayBeTryingToSay,
      whatTheOtherPersonMayHear: participant.whatTheOtherPersonMayHear,
    };
  });
}

function meaningRows(participants: ResolvedParticipant[]): MeaningVsImpactRow[] {
  return participants.map((participant, index) => {
    const other = participants[(index + 1) % participants.length];

    return {
      speakerName: participant.displayName,
      otherName:
        other !== undefined && other.speakerId !== participant.speakerId
          ? other.displayName
          : 'the other person',
      whatTheyMayBeTryingToSay: participant.whatTheyMayBeTryingToSay,
      whatTheOtherPersonMayHear: participant.whatTheOtherPersonMayHear,
    };
  });
}

export function ConflictLensResult({
  response,
  speakers,
  onEditContext,
  onRegenerate,
}: ConflictLensResultProps): JSX.Element {
  const participants = resolveParticipants(response, speakers);
  const rows = meaningRows(participants);

  let step = 0;
  const nextStep = (): number => step++;

  return (
    <div className="w-full max-w-full space-y-12">
      {response.falseEquivalenceWarning !== undefined ? (
        <FalseEquivalenceNotice
          warning={response.falseEquivalenceWarning}
          className={revealClass}
          // Rendered above everything else on purpose — never folded into the analysis.
        />
      ) : null}

      {response.safety !== undefined ? (
        <SafetyNotice safety={response.safety} className={revealClass} />
      ) : null}

      {/* 2. Neutral summary, as the view's masthead */}
      <header
        aria-labelledby="neutral-summary-heading"
        className={cn(
          'relative overflow-hidden rounded-card-lg border border-line bg-wash-panel p-5 shadow-card sm:p-7',
          revealClass,
        )}
        style={revealStyle(nextStep())}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-grad-coral" />

        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-2 rounded-chip border border-coral/30 bg-coral-soft px-3 py-1 font-mono text-sm font-semibold uppercase tracking-widest text-coral-ink">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-coral" />
            Conflict Lens
          </p>
          {participants.length > 0 ? (
            <p className="flex min-w-0 flex-wrap items-center gap-2 font-mono text-sm font-semibold text-ink-muted">
              {participants.map((participant, index) => (
                <span key={participant.speakerId} className="min-w-0">
                  {index > 0 ? <span aria-hidden="true" className="pr-2">·</span> : null}
                  <span className="break-words text-ink">{participant.displayName}</span>
                  {/* Skip the tag when the name already says it, so it never reads "You (you)". */}
                  {participant.isUser && participant.displayName.trim().toLowerCase() !== 'you' ? (
                    <span className="pl-1">(you)</span>
                  ) : null}
                </span>
              ))}
            </p>
          ) : null}
        </div>

        <h1
          id="neutral-summary-heading"
          className="mt-4 max-w-3xl font-display text-2xl leading-tight text-ink sm:text-display-sm lg:text-display-md"
        >
          What happened, <span className="text-gradient">without a verdict</span>
        </h1>

        <p className="mt-5 min-w-0 max-w-4xl whitespace-pre-wrap break-words border-t border-line pt-5 font-display text-lg leading-snug text-ink sm:text-xl">
          {response.neutralSummary}
        </p>
      </header>

      {/* 3. Both sides, side by side and equal width on desktop */}
      <section
        aria-labelledby="participants-heading"
        className={revealClass}
        style={revealStyle(nextStep())}
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-ink shadow-lift"
          >
            <Users className="h-5 w-5 text-paper" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
              The two accounts
            </p>
            <h2
              id="participants-heading"
              className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
            >
              What each of you said
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
              And what may be sitting underneath it.
            </p>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          {participants.map((participant) => (
            <ParticipantPerspective
              key={participant.speakerId}
              displayName={participant.displayName}
              role={participant.role}
              isUser={participant.isUser}
              statedPosition={participant.statedPosition}
              possibleConcerns={participant.possibleConcerns}
            />
          ))}
        </div>
      </section>

      {/* 4. Meant vs heard */}
      <MeaningVsImpact rows={rows} className={revealClass} style={revealStyle(nextStep())} />

      {/* 5. Facts */}
      <FactsPanel
        sharedFacts={response.sharedFacts}
        disputedOrUnclear={response.disputedOrUnclear}
        unansweredQuestions={response.unansweredQuestions}
        className={revealClass}
        style={revealStyle(nextStep())}
      />

      {/* 6. Escalation sequence */}
      <EscalationTimeline
        points={response.escalationPoints}
        className={revealClass}
        style={revealStyle(nextStep())}
      />

      {/* 7. The payoff */}
      <CoreProblemCard
        coreProblem={response.coreProblem}
        sharedGoal={response.sharedGoal}
        className={revealClass}
        style={revealStyle(nextStep())}
      />

      {/* 8. Options */}
      <ResolutionOptions
        options={response.resolutionOptions}
        className={revealClass}
        style={revealStyle(nextStep())}
      />

      {/* 9. How to structure the next conversation */}
      {response.suggestedConversationStructure.length > 0 ? (
        <section
          aria-labelledby="structure-heading"
          className={revealClass}
          style={revealStyle(nextStep())}
        >
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-grad-primary shadow-lift"
            >
              <ListOrdered className="h-5 w-5 text-surface" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
                In this order
              </p>
              <h2
                id="structure-heading"
                className="mt-1 font-display text-2xl leading-tight text-ink sm:text-display-sm"
              >
                How to structure the next conversation
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
                A sequence that tends to keep a conversation about the problem instead of about the
                last conversation.
              </p>
            </div>
          </div>

          <ol className="mt-5 space-y-3">
            {response.suggestedConversationStructure.map((item, index) => (
              <li key={index} className="relative min-w-0">
                {index < response.suggestedConversationStructure.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[19px] top-11 h-[calc(100%_+_0.75rem)] w-0.5 bg-primary/25"
                  />
                ) : null}
                <div className="flex min-w-0 gap-4 rounded-card-lg border border-line bg-surface px-4 py-3.5 shadow-card">
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-grad-primary font-mono text-sm font-bold text-surface"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 self-center whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
                    {item}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* 10. The one actionable artifact */}
      <RepairMessageCard
        message={response.repairMessage}
        className={revealClass}
        style={revealStyle(nextStep())}
      />

      {/* 11. Footer */}
      <div
        className={cn(
          'flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between',
          revealClass,
        )}
        style={revealStyle(nextStep())}
      >
        <p className="max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Conflict Lens describes what the wording may be doing. It does not decide who is right,
          and it cannot see anything the conversation does not contain.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" leadingIcon={RefreshCw} onClick={onRegenerate}>
            Regenerate
          </Button>
          <Button variant="ghost" leadingIcon={Pencil} onClick={onEditContext}>
            Edit context
          </Button>
        </div>
      </div>
    </div>
  );
}
