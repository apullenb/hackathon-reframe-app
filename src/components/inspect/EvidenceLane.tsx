/**
 * Classification lanes for the Thought Debugger (brief §8.3), and the statement card that moves
 * between them.
 *
 * Two equal input paths, by requirement (brief §17 "Non-drag alternatives for Thought Debugger"):
 *   - pointer users can drag a card onto a lane
 *   - everyone can use the native <select> on each card, which is keyboard-complete on its own
 *
 * The select is not a fallback bolted on afterwards. It is always visible, always present, and
 * moves cards between every lane including back to unsorted — the drag path can do nothing the
 * select cannot.
 *
 * Lane identity is carried by an icon, a text label and a position, never by colour (brief §17).
 */

import { CircleDashed, CircleHelp, GitBranch, HeartPulse, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Select } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Confidence, EvidenceCategory, EvidenceItem } from '@/types/practice';

/**
 * An `EvidenceItem` with an identity, so a card can be tracked while it moves, and with a
 * nullable category so "not classified yet" is a real state rather than a fake one. An item only
 * becomes a full `EvidenceItem` once the user has put it in a lane.
 */
export type LaneItem = Omit<EvidenceItem, 'category'> & {
  id: string;
  /** null while the statement is still unsorted. */
  category: EvidenceCategory | null;
};

export type LaneDefinition = {
  category: EvidenceCategory;
  /** Approved lane name from brief §8.3. */
  label: string;
  icon: LucideIcon;
  tone: BadgeTone;
  /** Container skin. Tokens only — nine themes repaint all of these at runtime. */
  skin: string;
  /** Header ink for this lane's tone. */
  ink: string;
  help: string;
  confidence: Confidence;
};

export const LANES: readonly LaneDefinition[] = [
  {
    category: 'fact',
    label: 'Fact',
    icon: ShieldCheck,
    tone: 'teal',
    skin: 'border-teal/35 bg-teal-soft',
    ink: 'text-teal-ink',
    help: 'Something that was actually said or done, and could be quoted.',
    confidence: 'directly_supported',
  },
  {
    category: 'guess',
    label: 'Assumption',
    icon: CircleDashed,
    tone: 'amber',
    skin: 'border-amber/35 bg-amber-soft',
    ink: 'text-amber-ink',
    help: 'Something you added. It may well be right; it is still yours, not theirs.',
    confidence: 'plausible',
  },
  {
    category: 'feeling',
    label: 'Feeling',
    icon: HeartPulse,
    tone: 'primary',
    skin: 'border-primary/30 bg-primary-soft',
    ink: 'text-primary',
    help: 'Real, and real input. Not independently verified evidence.',
    confidence: 'plausible',
  },
  {
    category: 'unknown',
    label: 'Unknown',
    icon: CircleHelp,
    tone: 'slate',
    skin: 'border-slate/35 bg-slate-soft',
    ink: 'text-slate-ink',
    help: 'Not knowable from what you have. Naming it is the whole job.',
    confidence: 'cannot_determine',
  },
  {
    category: 'alternative',
    label: 'Alternative explanation',
    icon: GitBranch,
    tone: 'secondary',
    skin: 'border-secondary/30 bg-secondary-soft',
    ink: 'text-secondary',
    help: 'A different reading that fits the same facts.',
    confidence: 'plausible',
  },
] as const;

export function laneFor(category: EvidenceCategory): LaneDefinition {
  const found = LANES.find((lane) => lane.category === category);
  if (!found) throw new Error(`Unknown lane: ${category}`);
  return found;
}

const UNSORTED = 'unsorted';

const moveOptions = [
  { value: UNSORTED, label: 'Unsorted' },
  ...LANES.map((lane) => ({ value: lane.category, label: lane.label })),
];

function isCategory(value: string): value is EvidenceCategory {
  return LANES.some((lane) => lane.category === value);
}

/* ── Statement card ──────────────────────────────────────────────────────── */

export type StatementCardProps = {
  item: LaneItem;
  isDragging: boolean;
  onMove: (id: string, category: EvidenceCategory | null) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
};

export function StatementCard({
  item,
  isDragging,
  onMove,
  onDragStart,
  onDragEnd,
}: StatementCardProps): JSX.Element {
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(item.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-card border border-line-strong bg-surface p-3 shadow-card',
        'transition-[opacity,box-shadow] duration-200 ease-smooth',
        isDragging && 'opacity-50 shadow-float',
      )}
    >
      <p className="text-base leading-relaxed text-ink">{item.statement}</p>
      <div className="mt-2.5">
        <Select
          label={`Classify: ${item.statement}`}
          hideLabel
          value={item.category ?? UNSORTED}
          options={moveOptions}
          onChange={(event) => {
            const next = event.target.value;
            onMove(item.id, isCategory(next) ? next : null);
          }}
        />
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">
        Drag it, or use the menu. Both do the same thing.
      </p>
    </li>
  );
}

/* ── Lane ────────────────────────────────────────────────────────────────── */

export type EvidenceLaneProps = {
  lane: LaneDefinition;
  items: LaneItem[];
  draggingId: string | null;
  isDropTarget: boolean;
  onMove: (id: string, category: EvidenceCategory | null) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverLane: (category: EvidenceCategory | null) => void;
};

export function EvidenceLane({
  lane,
  items,
  draggingId,
  isDropTarget,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOverLane,
}: EvidenceLaneProps): JSX.Element {
  const LaneIcon = lane.icon;

  return (
    <section
      aria-label={`${lane.label} lane, ${items.length} ${items.length === 1 ? 'statement' : 'statements'}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragOverLane(lane.category);
      }}
      onDragLeave={() => onDragOverLane(null)}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData('text/plain');
        if (id) onMove(id, lane.category);
        onDragOverLane(null);
      }}
      className={cn(
        'flex flex-col gap-2 rounded-card border p-3',
        'transition-[box-shadow,border-color] duration-200 ease-smooth',
        lane.skin,
        isDropTarget && 'border-primary-ring shadow-glow-primary',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className={cn('flex items-center gap-2 text-base font-semibold tracking-tight', lane.ink)}>
          <LaneIcon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          {lane.label}
        </h4>
        <Badge tone={lane.tone} size="sm">
          <span className="sr-only">Statements in this lane: </span>
          {items.length}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-ink-muted">{lane.help}</p>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <StatementCard
            key={item.id}
            item={item}
            isDragging={draggingId === item.id}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </ul>

      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong p-3 text-sm text-ink-muted">
          Empty. Drop a statement here, or pick this lane from a statement&rsquo;s menu.
        </p>
      ) : null}
    </section>
  );
}
