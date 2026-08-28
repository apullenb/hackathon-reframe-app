/**
 * One frame of the Stack Trace (brief §8.4).
 *
 * The badge is the load-bearing part. A frame is either something the user confirmed or something
 * the app inferred, and the difference is stated in words on every frame — not implied by a tint,
 * and not quietly dropped once the trace looks tidy. An inferred frame also says what it was
 * inferred from.
 */

import { useState } from 'react';
import {
  ArrowDownRight,
  CircleCheck,
  CircleDashed,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardBody, Textarea } from '@/components/ui';
import { featureById } from '@/features/registry';
import { cn } from '@/lib/cn';
import type { ToolId } from '@/situation/types';

export type TraceFrameData = {
  id: string;
  /** Frame label, exactly as brief §8.4 names it. */
  label: string;
  icon: LucideIcon;
  /** The content of this stage, or undefined when nothing has been captured yet. */
  value?: string;
  confirmed: boolean;
  /** Where the content came from, in plain language. */
  source: string;
  /** What this stage feeds into. */
  downstream: string;
  inspectTool: ToolId;
  /** Absent when this stage holds no user-owned content that could be edited here. */
  onEdit?: (next: string) => void;
  editLabel?: string;
  /** Why editing is unavailable, shown when `onEdit` is absent. */
  editUnavailable?: string;
  /** The value this frame held when the trace was first captured, when it has since changed. */
  originalValue?: string;
  /** True when an earlier frame was edited after the trace was first captured. */
  recalculated?: boolean;
};

export type TraceFrameProps = {
  frame: TraceFrameData;
  index: number;
  total: number;
  onOpenTool: (tool: ToolId) => void;
  /** Sequential reveal delay in ms. Only applied under `motion-safe`. */
  delayMs: number;
};

export function TraceFrame({ frame, index, total, onOpenTool, delayMs }: TraceFrameProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(frame.value ?? '');

  const FrameIcon = frame.icon;
  const inspectFeature = featureById(frame.inspectTool);
  const empty = !frame.value?.trim();

  const beginEdit = (): void => {
    setDraft(frame.value ?? '');
    setEditing(true);
  };

  const commit = (): void => {
    frame.onEdit?.(draft.trim());
    setEditing(false);
  };

  return (
    <li
      className="motion-safe:animate-reveal-up"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Card tone={frame.confirmed ? 'default' : 'sunk'} elevation="card">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft font-mono text-sm font-bold text-primary"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  {`Frame ${index + 1} of ${total}`}
                </p>
                <h3 className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">
                  <span className="flex items-center gap-2">
                    <FrameIcon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                    {frame.label}
                  </span>
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {frame.recalculated ? (
                <Badge tone="secondary" size="sm" icon={ArrowDownRight}>
                  Downstream of an edit
                </Badge>
              ) : null}
              <Badge
                tone={frame.confirmed ? 'teal' : 'slate'}
                icon={frame.confirmed ? CircleCheck : CircleDashed}
                size="sm"
                className={frame.confirmed ? 'border-solid' : 'border-dashed'}
              >
                <span className="sr-only">This frame is </span>
                {frame.confirmed ? 'Confirmed' : 'Inferred'}
              </Badge>
            </div>
          </div>

          <p
            className={cn(
              'text-base leading-relaxed',
              empty ? 'text-ink-muted' : 'text-ink',
            )}
          >
            {frame.value?.trim() || 'Nothing captured for this stage yet.'}
          </p>

          {frame.originalValue ? (
            <p className="rounded-card border border-line bg-paper-sunk p-3 text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink">Originally: </span>
              {frame.originalValue}
            </p>
          ) : null}

          <dl className="grid gap-2 text-sm leading-relaxed sm:grid-cols-2">
            <div>
              <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Source
              </dt>
              <dd className="text-ink">{frame.source}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Downstream effects
              </dt>
              <dd className="text-ink">{frame.downstream}</dd>
            </div>
          </dl>

          {editing ? (
            <div className="rounded-card border border-line bg-paper-sunk p-3">
              <Textarea
                label={frame.editLabel ?? `Edit ${frame.label}`}
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="primary" leadingIcon={CircleCheck} onClick={commit}>
                  Save this frame
                </Button>
                <Button variant="ghost" leadingIcon={X} onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {frame.onEdit ? (
                <Button variant="outline" leadingIcon={Pencil} onClick={beginEdit}>
                  Edit
                </Button>
              ) : null}
              <Button
                variant="ghost"
                leadingIcon={Search}
                onClick={() => onOpenTool(frame.inspectTool)}
              >
                {`Inspect this frame in ${inspectFeature.name}`}
              </Button>
            </div>
          )}

          {!frame.onEdit && frame.editUnavailable ? (
            <p className="text-sm leading-relaxed text-ink-muted">{frame.editUnavailable}</p>
          ) : null}
        </CardBody>
      </Card>
    </li>
  );
}
