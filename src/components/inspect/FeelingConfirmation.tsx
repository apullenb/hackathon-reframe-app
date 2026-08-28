/**
 * Confirmation control for one AI-suggested state (brief §8.2 "Confirmation behavior").
 *
 * This component is the honesty guarantee of the State Inspector made visible. A suggestion is a
 * question, never a finding, so it renders four answers and nothing else can promote it:
 *
 *   Yes                → `set_claim_state` → confirmed
 *   No                 → `set_claim_state` → rejected
 *   Close              → opens the wording editor seeded with the suggestion
 *   Use my own words   → opens the wording editor empty
 *
 * "Close" deliberately does NOT confirm. Close-but-not-right is still not the user's word for it,
 * so it routes into the editor and only the user's own wording (`set_claim_wording`) settles it.
 * There is no code path from `suggested` to `confirmed` that does not pass through a button the
 * user pressed.
 */

import { useId, useState } from 'react';
import { Check, CircleDashed, CircleHelp, Pencil, Sparkles, Target, Undo2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Textarea } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { featureById } from '@/features/registry';
import { cn } from '@/lib/cn';
import type { Claim, ConfirmationState } from '@/situation/types';

export type FeelingConfirmationProps = {
  claim: Claim;
  /** Word for what is being confirmed, used in labels and screen-reader text. */
  noun?: string;
  onSetState: (state: ConfirmationState) => void;
  onSetWording: (wording: string) => void;
};

/** Icon + text label for every state — status is never carried by colour alone (brief §17). */
const statePresentation: Record<
  ConfirmationState,
  { label: string; icon: LucideIcon; tone: BadgeTone; edge: string }
> = {
  confirmed: { label: 'Confirmed by you', icon: Check, tone: 'teal', edge: 'border-solid' },
  suggested: {
    label: 'Awaiting your confirmation',
    icon: CircleHelp,
    tone: 'amber',
    edge: 'border-dashed',
  },
  rejected: { label: 'You said no', icon: X, tone: 'slate', edge: 'border-dotted' },
  unknown: { label: 'Not answered', icon: CircleDashed, tone: 'slate', edge: 'border-dotted' },
};

type EditorMode = 'close' | 'own';

const editorCopy: Record<EditorMode, { title: string; hint: string; cta: string }> = {
  close: {
    title: 'Adjust the wording',
    hint: 'Close is not the same as right. Change it until it is the word you would actually use.',
    cta: 'Use this wording',
  },
  own: {
    title: 'Use your own words',
    hint: 'No list required. Write it however it actually sits.',
    cta: 'Use my words',
  },
};

export function FeelingConfirmation({
  claim,
  noun = 'state',
  onSetState,
  onSetWording,
}: FeelingConfirmationProps): JSX.Element {
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [draft, setDraft] = useState('');
  const editorId = useId();

  const presentation = statePresentation[claim.state];
  const StatusIcon = presentation.icon;
  const shown = claim.userWording ?? claim.text;
  const provenance = claim.source
    ? `Suggested by ${featureById(claim.source).name} from the words you typed.`
    : 'You wrote this one.';

  const openEditor = (mode: EditorMode): void => {
    setEditor(mode);
    setDraft(mode === 'close' ? claim.text : '');
  };

  const commitWording = (): void => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    onSetWording(trimmed);
    setEditor(null);
  };

  return (
    <li
      className={cn(
        'rounded-card border bg-surface p-4 shadow-card',
        claim.state === 'confirmed' && 'border-teal/40',
        claim.state === 'suggested' && 'border-line-strong',
        (claim.state === 'rejected' || claim.state === 'unknown') && 'border-line opacity-80',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p
          className={cn(
            'font-display text-lg font-semibold leading-tight tracking-tight text-ink',
            claim.state === 'rejected' && 'line-through decoration-slate decoration-2',
          )}
        >
          {shown}
        </p>
        <Badge tone={presentation.tone} icon={StatusIcon} size="sm" className={presentation.edge}>
          <span className="sr-only">{`Status of this ${noun}: `}</span>
          {presentation.label}
        </Badge>
      </div>

      <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-relaxed text-ink-muted">
        <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {provenance}
          {claim.userWording ? ' Rewritten in your words.' : null}
        </span>
      </p>

      {editor === null && claim.state === 'suggested' ? (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Is "${claim.text}" right?`}>
          <Button variant="primary" leadingIcon={Check} onClick={() => onSetState('confirmed')}>
            Yes
          </Button>
          <Button variant="outline" leadingIcon={X} onClick={() => onSetState('rejected')}>
            No
          </Button>
          <Button variant="outline" leadingIcon={Target} onClick={() => openEditor('close')}>
            Close
          </Button>
          <Button variant="outline" leadingIcon={Pencil} onClick={() => openEditor('own')}>
            Use my own words
          </Button>
        </div>
      ) : null}

      {editor === null && claim.state !== 'suggested' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" leadingIcon={Undo2} onClick={() => onSetState('suggested')}>
            Change this answer
          </Button>
          <Button variant="ghost" leadingIcon={Pencil} onClick={() => openEditor('own')}>
            Reword it
          </Button>
        </div>
      ) : null}

      {editor !== null ? (
        <div className="mt-3 rounded-card border border-line bg-paper-sunk p-3" id={editorId}>
          <Textarea
            label={editorCopy[editor].title}
            hint={editorCopy[editor].hint}
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              leadingIcon={Check}
              disabled={draft.trim().length === 0}
              onClick={commitWording}
            >
              {editorCopy[editor].cta}
            </Button>
            <Button variant="ghost" onClick={() => setEditor(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
