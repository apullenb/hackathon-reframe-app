import { MapPin } from 'lucide-react';
import type { CommunicationContext, ContextSwitchMode } from '@/types/contracts';
import { Select } from '@/components/ui';
import { CHANNELS, DESIRED_OUTCOMES, RELATIONSHIPS, TONES } from '@/data/vocabulary';
import { ChipGroup } from './ChipGroup';
import { OptionalControls } from './OptionalControls';
import { RoleRoute } from './RoleRoute';
import { RoleSelector } from './RoleSelector';
import { roleLabelsFor, routeFor } from './routeFor';

type ContextBuilderProps = {
  mode: ContextSwitchMode;
  context: Partial<CommunicationContext>;
  onChange: (patch: Partial<CommunicationContext>) => void;
  /** True while a request is in flight, so the route arrow animates. */
  routeActive?: boolean;
};

/**
 * "Set the context" (spec §13.2). The role pair is the most prominent thing on the screen
 * because the role pair is the product — everything else is a refinement of it.
 *
 * Visual order, top to bottom: the route (what you are building), the two role selectors (the
 * headline decision), the situation, the intent chips, then the collapsed fine-tuning. Each
 * band is its own card so the eye can step down the page rather than scan one long form.
 */
export function ContextBuilder({
  mode,
  context,
  onChange,
  routeActive = false,
}: ContextBuilderProps) {
  const labels = roleLabelsFor(mode);
  const route = routeFor(mode, context);

  return (
    <section aria-labelledby="set-context-heading" className="space-y-5">
      <header className="space-y-2">
        <p className="font-mono text-sm uppercase tracking-[0.22em] text-ink-muted">
          {mode === 'decode_it' ? 'Before you reply' : 'Before you write'}
        </p>
        <h2
          id="set-context-heading"
          className="font-display text-display-sm text-ink"
        >
          Set the <span className="text-gradient">context</span>
        </h2>
        <p className="max-w-prose text-base font-medium leading-relaxed text-ink-muted">
          The same words land differently depending on who is speaking and who is listening. This
          is what makes the result specific rather than generic.
        </p>
      </header>

      <RoleRoute from={route.from} to={route.to} active={routeActive} />

      {/* Two-up only when the column is actually wide: App splits the workspace at `lg`, so a
          plain md:grid-cols-2 would squeeze these into ~270px there. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        <RoleSelector
          label={labels.self}
          hint={labels.selfHint}
          value={context.selfRole}
          onChange={(value) => onChange({ selfRole: value })}
          tone={mode === 'decode_it' ? 'to' : 'from'}
        />
        <RoleSelector
          label={labels.other}
          hint={labels.otherHint}
          value={context.otherRole}
          onChange={(value) => onChange({ otherRole: value })}
          tone={mode === 'decode_it' ? 'from' : 'to'}
        />
      </div>

      <div className="rounded-card-lg border border-line bg-surface p-4 shadow-card sm:p-5">
        <p className="mb-4 inline-flex items-center gap-2.5 font-mono text-sm uppercase tracking-[0.16em] text-ink-muted">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Where this is happening
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Relationship"
            placeholder="Choose a relationship…"
            value={context.relationship ?? ''}
            onChange={(event) => onChange({ relationship: event.target.value })}
            options={RELATIONSHIPS.map((option) => ({
              value: option.label,
              label: option.label,
            }))}
          />
          <Select
            label="Channel"
            hint="Changes length and formality."
            placeholder="Choose a channel…"
            value={context.channel ?? ''}
            onChange={(event) => onChange({ channel: event.target.value })}
            options={CHANNELS.map((option) => ({ value: option.label, label: option.label }))}
          />
        </div>
      </div>

      {mode !== 'conflict_lens' ? (
        <div className="space-y-4">
          <ChipGroup
            legend={mode === 'decode_it' ? 'What you need from this' : 'Desired outcome'}
            options={DESIRED_OUTCOMES}
            value={context.desiredOutcome}
            onChange={(label) => onChange({ desiredOutcome: label || undefined })}
          />
          {mode === 'say_it_better' ? (
            <ChipGroup
              legend="Tone"
              hint="How you want it to sound when it arrives."
              options={TONES}
              value={context.desiredTone}
              onChange={(label) => onChange({ desiredTone: label || undefined })}
            />
          ) : null}
        </div>
      ) : null}

      <OptionalControls context={context} onChange={onChange} />
    </section>
  );
}
