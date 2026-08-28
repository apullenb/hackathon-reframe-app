import { useId, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { CommunicationContext } from '@/types/contracts';
import { Select } from '@/components/ui';
import {
  HUMOR_LEVELS,
  LENGTH_PREFERENCES,
  RELATIONSHIP_TEMPERATURES,
  URGENCY_LEVELS,
} from '@/data/vocabulary';
import { cn } from '@/lib/cn';

type OptionalControlsProps = {
  context: Partial<CommunicationContext>;
  onChange: (patch: Partial<CommunicationContext>) => void;
};

/**
 * The optional controls from spec §6, collapsed by default so they don't compete with the role
 * pair. Humor level matters most: `off` hides the unfiltered translation entirely.
 *
 * The panel is conditionally rendered rather than hidden with CSS, so nothing inside it is
 * reachable by keyboard while collapsed; the reveal animation runs on mount instead.
 */
export function OptionalControls({ context, onChange }: OptionalControlsProps) {
  const [open, setOpen] = useState(false);
  const panelId = `fine-tune-${useId()}`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card-lg border bg-surface shadow-card transition-colors duration-300 ease-smooth',
        open ? 'border-primary/25' : 'border-line',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex min-h-tap w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-primary-soft/40 sm:px-5"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
            open ? 'bg-grad-primary text-surface' : 'bg-primary-soft text-primary',
          )}
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold tracking-tight text-ink">Fine-tune</span>
          <span className="block text-sm font-medium text-ink-muted">
            Urgency, warmth, length, humor. All optional.
          </span>
        </span>

        <span
          aria-hidden="true"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-spring',
            open
              ? 'rotate-180 border-primary/30 bg-primary-soft text-primary'
              : 'border-line-strong bg-paper-sunk text-ink-muted',
          )}
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="grid gap-4 border-t border-line bg-paper-sunk/40 px-4 py-5 motion-safe:animate-reveal-up sm:grid-cols-2 sm:px-5"
        >
          <Select
            label="Urgency"
            value={context.urgency ?? 'normal'}
            onChange={(event) =>
              onChange({ urgency: event.target.value as CommunicationContext['urgency'] })
            }
            options={URGENCY_LEVELS.map((o) => ({ value: o.id, label: o.label }))}
          />
          <Select
            label="Relationship temperature"
            value={context.relationshipTemperature ?? 'calm'}
            onChange={(event) =>
              onChange({
                relationshipTemperature: event.target
                  .value as CommunicationContext['relationshipTemperature'],
              })
            }
            options={RELATIONSHIP_TEMPERATURES.map((o) => ({ value: o.id, label: o.label }))}
          />
          <Select
            label="Length"
            value={context.lengthPreference ?? 'medium'}
            onChange={(event) =>
              onChange({
                lengthPreference: event.target.value as CommunicationContext['lengthPreference'],
              })
            }
            options={LENGTH_PREFERENCES.map((o) => ({ value: o.id, label: o.label }))}
          />
          <Select
            label="Humor"
            hint="Off hides the unfiltered translation."
            value={context.humorLevel ?? 'subtle'}
            onChange={(event) =>
              onChange({ humorLevel: event.target.value as CommunicationContext['humorLevel'] })
            }
            options={HUMOR_LEVELS.map((o) => ({ value: o.id, label: o.label }))}
          />
          <label className="flex min-h-tap cursor-pointer items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 transition-colors duration-150 hover:border-primary-ring sm:col-span-2">
            <input
              type="checkbox"
              checked={context.reduceJargon ?? false}
              onChange={(event) => onChange({ reduceJargon: event.target.checked })}
              className="h-5 w-5 shrink-0 rounded border-line-strong text-primary focus-visible:ring-primary-ring"
            />
            <span className="text-base font-semibold text-ink">Reduce corporate jargon</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
