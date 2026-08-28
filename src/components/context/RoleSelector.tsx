import { useId } from 'react';
import { UserRound } from 'lucide-react';
import { Select, Chip } from '@/components/ui';
import { ROLE_GROUPS } from '@/data/vocabulary';
import { cn } from '@/lib/cn';
import { initialsFor } from './RoleRoute';

/**
 * Quick-pick shortcuts. Labels must match spec §6 exactly so they line up with the select's
 * options; kept local rather than in the vocabulary module because this is a UI affordance,
 * not part of the context model.
 */
const QUICK_ROLE_LABELS = ['Engineer', 'Product manager', 'Manager', 'Spouse/partner'] as const;

type RoleSelectorProps = {
  label: string;
  hint?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  /** Visual emphasis: the two role selectors are the most prominent controls (spec §13.2). */
  tone: 'from' | 'to';
};

/**
 * A grouped native <select> plus quick-pick chips, presented as one of the two headline
 * decisions on the screen (spec §13.2).
 *
 * The native select is deliberate: spec §24 requires role selection to work by keyboard and to
 * not require fine pointer control, and a native select gets both for free on every platform,
 * including mobile. The chips are a convenience layer on top, not the only way in.
 *
 * The card is tinted to match its node in the route above — indigo for the sender, violet for
 * the recipient — and echoes that node's initial tile, so it is obvious which end of the route
 * a given control drives.
 */
export function RoleSelector({ label, hint, value, onChange, tone }: RoleSelectorProps) {
  const generatedId = useId();
  const fieldId = `role-select-${generatedId}`;
  const isSet = Boolean(value);
  const isFrom = tone === 'from';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card-lg border-2 bg-surface p-4 shadow-card transition-colors duration-300 ease-smooth sm:p-5',
        isFrom ? 'border-primary/25' : 'border-secondary/25',
      )}
    >
      {/* Tinted cap tying the card to its end of the route. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-1.5',
          isFrom ? 'bg-grad-primary' : 'bg-secondary',
        )}
      />

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'edge-sheen flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-base font-bold leading-none',
            !isSet && 'border border-dashed border-line-strong bg-paper-sunk text-ink-muted',
            isSet && isFrom && 'bg-grad-primary text-surface',
            isSet && !isFrom && 'bg-secondary text-surface',
          )}
        >
          {isSet ? initialsFor(value) : <UserRound className="h-5 w-5" />}
        </span>

        <div className="min-w-0">
          <p className="font-mono text-sm uppercase leading-tight tracking-[0.18em] text-ink-muted">
            {isFrom ? 'Sender' : 'Recipient'}
          </p>
          <p
            className={cn(
              'font-display text-display-sm break-words',
              isFrom ? 'text-primary' : 'text-secondary',
            )}
            aria-hidden="true"
          >
            {label}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Select
          id={fieldId}
          label={label}
          hideLabel
          hint={hint}
          placeholder="Choose a role…"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          options={ROLE_GROUPS.map((group) => ({
            group: group.group,
            options: group.options.map((option) => ({ value: option.label, label: option.label })),
          }))}
        />
      </div>

      <div className="mt-4">
        <p
          id={`${fieldId}-quick`}
          className="font-mono text-sm uppercase tracking-[0.16em] text-ink-muted"
        >
          Quick pick
        </p>
        <div
          role="group"
          aria-labelledby={`${fieldId}-quick`}
          className="mt-2 flex flex-wrap gap-2"
        >
          {QUICK_ROLE_LABELS.map((roleLabel) => (
            <Chip key={roleLabel} selected={value === roleLabel} onSelect={() => onChange(roleLabel)}>
              {roleLabel}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
