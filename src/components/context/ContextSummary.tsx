import { Receipt } from 'lucide-react';
import type { CommunicationContext, ContextSwitchMode } from '@/types/contracts';
import { Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { routeFor } from './routeFor';
import { RoleRoute } from './RoleRoute';

type ContextSummaryProps = {
  mode: ContextSwitchMode | null;
  context: Partial<CommunicationContext>;
};

type Facet = { field: string; value: string | undefined; tone: BadgeTone };

/**
 * The pinned context summary that sits directly above the message field (spec §13.2), so the
 * user can see exactly what context the model will receive before they write anything.
 *
 * Presented as a receipt: a mono header, the compact route, a perforated rule, then one badge
 * per supplied facet. Each badge names its field as well as its value, so the list is readable
 * without decoding the tint. The counter only counts fields the current mode actually offers —
 * Conflict Lens has no outcome or tone control, so counting them would make the receipt lie.
 */
export function ContextSummary({ mode, context }: ContextSummaryProps) {
  const route = routeFor(mode, context);
  const facets = facetsFor(mode, context);
  const supplied = facets.filter((facet): facet is Facet & { value: string } =>
    Boolean(facet.value),
  );

  const roleCount = (route.from ? 1 : 0) + (route.to ? 1 : 0);
  const total = facets.length + 2;

  return (
    <div className="overflow-hidden rounded-card-lg border border-primary/20 bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-primary-soft/70 px-4 py-3">
        <p className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.14em] text-primary">
          <Receipt className="h-4 w-4 shrink-0" aria-hidden="true" />
          Context the model will receive
        </p>
        <p className="font-mono text-sm tabular-nums text-ink-muted">
          {supplied.length + roleCount} / {total} set
        </p>
      </div>

      <div className="px-4 py-4">
        <RoleRoute from={route.from} to={route.to} size="sm" />

        <div aria-hidden="true" className="my-4 border-t border-dashed border-line-strong" />

        {supplied.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {supplied.map((facet) => (
              <li key={facet.field}>
                <Badge tone={facet.tone}>
                  <span className="font-mono font-normal uppercase tracking-[0.1em]">
                    {facet.field}
                  </span>
                  <span aria-hidden="true" className="px-1.5">
                    ·
                  </span>
                  <span className="font-semibold">{facet.value}</span>
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-medium leading-relaxed text-ink-muted">
            Add relationship and channel to sharpen the result.
          </p>
        )}
      </div>
    </div>
  );
}

/** Only the facets the given mode exposes a control for. Mirrors ContextBuilder. */
function facetsFor(mode: ContextSwitchMode | null, context: Partial<CommunicationContext>): Facet[] {
  const base: Facet[] = [
    { field: 'Relationship', value: context.relationship, tone: 'slate' },
    { field: 'Channel', value: context.channel, tone: 'slate' },
  ];
  if (mode === 'conflict_lens') return base;

  base.push({ field: 'Outcome', value: context.desiredOutcome, tone: 'primary' });
  if (mode === 'decode_it') return base;

  base.push({ field: 'Tone', value: context.desiredTone, tone: 'secondary' });
  return base;
}
