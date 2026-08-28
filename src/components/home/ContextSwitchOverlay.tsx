import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { CurrentSituation, Roles } from '@/situation/types';
import { cn } from '@/lib/cn';

/**
 * Context Switch (brief §8.1) — the persistent runtime selector.
 *
 * Two columns: which version of you is active, and who you are communicating with. Changing a
 * role must never discard the facts already gathered, so this only ever dispatches `set_roles`.
 */

const USER_ROLES = [
  { name: 'Husband', example: 'The task you said you would do is still not done.' },
  { name: 'Wife', example: 'You have asked twice and nothing moved.' },
  { name: 'Partner', example: 'The same disagreement keeps resurfacing.' },
  { name: 'Engineer', example: 'The status update is late and you know why.' },
  { name: 'Manager', example: 'Feedback that has to land without flattening someone.' },
  { name: 'Employee', example: 'Pushing back on scope without sounding difficult.' },
  { name: 'Parent', example: 'A conversation that keeps turning into a negotiation.' },
  { name: 'Friend', example: 'Something has been off and neither of you named it.' },
  { name: 'Human currently annoyed', example: 'You do not want a framework. You want to vent first.' },
] as const;

const RECIPIENT_ROLES = [
  'Wife', 'Husband', 'Partner', 'Product manager', 'Manager', 'Direct report',
  'Coworker', 'Teenager', 'Parent', 'Friend', 'Neighbour',
] as const;

const CHANNELS = ['Text message', 'Slack or Teams', 'Email', 'In person', 'Phone call'] as const;

const RELATIONSHIPS = [
  'Close personal relationship', 'Family relationship', 'Cross-functional teammate',
  'Reporting relationship', 'Professional peer', 'Casual relationship',
] as const;

/** Dry, self-aware, and about the system rather than the person (brief §11). */
const RUNTIME_QUIPS: Record<string, string> = {
  Husband: 'Husband runtime loaded. Technical correctness may not be sufficient.',
  Engineer: 'Engineer runtime loaded. Recipient may not require the complete dependency graph.',
  Parent: 'Parent runtime loaded. Teenager response payload may contain “I don’t know”.',
  Manager: 'Manager runtime loaded. Tone carries further than you think from up there.',
};

type ContextSwitchOverlayProps = {
  open: boolean;
  onClose: () => void;
  situation: CurrentSituation;
  onChange: (patch: Partial<Roles>) => void;
  humorAllowed: boolean;
};

export function ContextSwitchOverlay({
  open,
  onClose,
  situation,
  onChange,
  humorAllowed,
}: ContextSwitchOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const quip = humorAllowed ? RUNTIME_QUIPS[situation.roles.user] : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close Context Switch"
        onClick={onClose}
        className="absolute inset-0 bg-surface-ink/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cs-title"
        className="relative flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-card-lg border border-line bg-surface shadow-float"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Context Switch
            </p>
            <h2 id="cs-title" className="mt-1 font-display text-xl font-semibold text-ink">
              Which version of you is active?
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-tap w-tap shrink-0 items-center justify-center rounded-card border border-line text-ink-muted hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close Context Switch</span>
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-y-auto md:grid-cols-2">
          <fieldset className="border-b border-line p-5 md:border-b-0 md:border-r">
            <legend className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              I am
            </legend>
            <div className="mt-3 space-y-2">
              {USER_ROLES.map((role) => {
                const active = situation.roles.user === role.name;
                return (
                  <button
                    key={role.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      onChange({ user: role.name });
                      setRecent((prev) => [role.name, ...prev.filter((r) => r !== role.name)].slice(0, 3));
                    }}
                    className={cn(
                      'flex min-h-tap w-full flex-col items-start gap-0.5 rounded-card border px-3.5 py-2.5 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary-soft'
                        : 'border-line bg-paper-sunk/40 hover:border-primary/45',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('text-sm font-bold', active ? 'text-primary' : 'text-ink')}>
                        {role.name}
                      </span>
                      {recent.includes(role.name) && !active ? (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          recent
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs font-medium leading-relaxed text-ink-muted">
                      {role.example}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-5 p-5">
            <fieldset>
              <legend className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                They are
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {RECIPIENT_ROLES.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    active={situation.roles.recipient === role}
                    onClick={() => onChange({ recipient: role })}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Relationship
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {RELATIONSHIPS.map((rel) => (
                  <Chip
                    key={rel}
                    label={rel}
                    active={situation.roles.relationship === rel}
                    onClick={() => onChange({ relationship: rel })}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Channel
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHANNELS.map((channel) => (
                  <Chip
                    key={channel}
                    label={channel}
                    active={situation.roles.channel === channel}
                    onClick={() => onChange({ channel })}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div className="border-t border-line bg-paper-sunk/50 px-5 py-4">
          <p className="flex flex-wrap items-center gap-2 font-mono text-sm text-ink">
            <span className="rounded-chip bg-primary-soft px-2.5 py-1 font-bold uppercase tracking-wider text-primary">
              {situation.roles.user}
            </span>
            <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="rounded-chip bg-secondary-soft px-2.5 py-1 font-bold uppercase tracking-wider text-secondary">
              {situation.roles.recipient}
            </span>
            <span className="text-ink-muted">
              · {situation.roles.relationship} · {situation.roles.channel}
            </span>
          </p>
          {quip ? <p className="mt-2 text-sm font-medium text-ink-muted">{quip}</p> : null}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-tap items-center rounded-chip border px-3.5 text-sm font-semibold transition-colors',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-line bg-surface text-ink-muted hover:border-primary/45 hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}
