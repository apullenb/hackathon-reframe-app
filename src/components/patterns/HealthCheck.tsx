/**
 * Health Check — brief §8.11.
 *
 * A dashboard over `patternData.ts`: counts of observable choices across fourteen anonymized demo
 * situations. Selecting a row opens the situations underneath the number, so no figure on this
 * screen is unfalsifiable — every count can be expanded into the things it counted.
 *
 * PRODUCT SAFETY, not styling (brief §8.11): this screen must never render a relationship health
 * score, a mental-health score, a red/yellow/green rating of a person, an attachment-style claim,
 * or a personality claim. The prohibition is stated on screen as well as here, because a
 * dashboard is exactly the surface a user would expect to be scoring them. Counts and
 * observational copy only.
 *
 * Charts are hand-rolled SVG. No charting dependency, and every fill is `currentColor` so the
 * nine runtime themes recolour them along with everything else.
 */

import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronRight, ScrollText, ShieldOff, TrendingUp, Bandage } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CurrentSituation, ToolId } from '@/situation/types';
import type { SituationAction } from '@/situation/reducer';
import {
  MESSAGES_IMPROVED,
  PATTERN_SECTIONS,
  SITUATION_SAMPLE_SIZE,
  situationsFor,
} from './patternData';
import type { PatternRow, PatternSection } from './patternData';

export type ToolProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
};

/** Tone rotation per section. Decorative only — never a rating, and always paired with a count. */
const SECTION_TONE: Record<string, 'primary' | 'teal' | 'amber' | 'slate'> = {
  roles: 'primary',
  urges: 'amber',
  logic: 'slate',
  topics: 'primary',
  repairs: 'teal',
  tools: 'primary',
};

const BAR_COLOR: Record<'primary' | 'teal' | 'amber' | 'slate', string> = {
  primary: 'text-primary',
  teal: 'text-teal',
  amber: 'text-amber',
  slate: 'text-slate',
};

/** A single horizontal bar. `percent` is already normalised against the section maximum. */
function Bar({ percent, colorClass }: { percent: number; colorClass: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="block h-2.5 w-full overflow-hidden rounded-chip bg-paper-sunk shadow-inner-top"
    >
      <svg
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className={cn('block h-full w-full', colorClass)}
      >
        <rect
          x="0"
          y="0"
          height="10"
          rx="5"
          width={Math.max(percent, 3)}
          fill="currentColor"
          className="motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
        />
      </svg>
    </span>
  );
}

/** Trend for "messages improved before sending". Bars plus a connecting line, both hand-drawn. */
function ImprovedTrend({ series }: { series: readonly { label: string; value: number }[] }): JSX.Element {
  const max = Math.max(...series.map((point) => point.value), 1);
  const step = 100 / series.length;
  const points = series
    .map((point, index) => {
      const x = step * index + step / 2;
      const y = 46 - (point.value / max) * 38;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox="0 0 100 52"
        preserveAspectRatio="none"
        className="h-28 w-full text-primary"
        role="img"
        aria-label={series.map((point) => `${point.label}: ${point.value}`).join(', ')}
      >
        {series.map((point, index) => {
          const height = (point.value / max) * 38;
          return (
            <rect
              key={point.label}
              x={step * index + step * 0.22}
              y={46 - height}
              width={step * 0.56}
              height={Math.max(height, 1)}
              rx="1.2"
              fill="currentColor"
              opacity="0.28"
            />
          );
        })}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {series.map((point, index) => (
          <circle
            key={`dot-${point.label}`}
            cx={step * index + step / 2}
            cy={46 - (point.value / max) * 38}
            r="1.3"
            fill="currentColor"
          />
        ))}
      </svg>
      <figcaption className="flex justify-between font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
        {series.map((point) => (
          <span key={`label-${point.label}`}>{point.label}</span>
        ))}
      </figcaption>
    </figure>
  );
}

function SectionCard({
  section,
  selectedRowId,
  onSelectRow,
}: {
  section: PatternSection;
  selectedRowId: string | null;
  onSelectRow: (row: PatternRow) => void;
}): JSX.Element {
  const tone = SECTION_TONE[section.id] ?? 'primary';
  const max = Math.max(...section.rows.map((row) => row.count), 1);

  return (
    <Card className="flex flex-col">
      <CardHeader eyebrow={section.eyebrow} title={section.title} />
      <CardBody className="flex flex-col gap-1">
        <p className="mb-1 text-sm leading-relaxed text-ink-muted">{section.caption}</p>
        {section.rows.map((row) => {
          const isOpen = selectedRowId === row.id;
          const situations = isOpen ? situationsFor(row) : [];
          return (
            <div key={row.id} className="border-b border-line/70 last:border-b-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => onSelectRow(row)}
                className={cn(
                  'group flex min-h-tap w-full flex-col gap-1.5 rounded-xl px-2 py-2.5 text-left',
                  'transition-colors duration-200 hover:bg-primary-soft/60',
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-semibold tracking-tight text-ink">{row.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold tabular-nums text-ink-muted">
                      {row.count}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        'h-4 w-4 text-ink-muted transition-transform duration-200',
                        isOpen && 'rotate-90',
                      )}
                    />
                  </span>
                </span>
                <Bar percent={(row.count / max) * 100} colorClass={BAR_COLOR[tone]} />
              </button>

              {isOpen ? (
                <div className="mb-2 flex flex-col gap-2 px-2 motion-safe:animate-reveal-up">
                  <p className="text-sm leading-relaxed text-ink">{row.observation}</p>
                  <ul className="flex flex-col gap-2">
                    {situations.map((demo) => (
                      <li
                        key={demo.id}
                        className="rounded-card border border-line bg-paper-sunk px-3 py-2.5"
                      >
                        <p className="text-sm font-semibold tracking-tight text-ink">{demo.title}</p>
                        <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                          {demo.context}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{demo.note}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                    anonymized demo situations · nothing here is stored
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

export function HealthCheck({
  situation,
  dispatch,
  onOpenTool,
}: ToolProps & { onOpenTool: (t: ToolId) => void }): JSX.Element {
  const [selectedRowId, setSelectedRowId] = useState<string | null>('urge-defend');

  useEffect(() => {
    dispatch({ type: 'mark_tool', tool: 'health_check', status: 'complete' });
  }, [dispatch]);

  const humorAllowed =
    situation.safety.humorAllowed && !situation.safety.seriousMode && situation.humorLevel !== 'off';

  const totalObservations = useMemo(
    () =>
      PATTERN_SECTIONS.reduce(
        (sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + row.count, 0),
        0,
      ),
    [],
  );

  return (
    <section className="flex flex-col gap-5" aria-labelledby="health-check-heading">
      <Card tone="primary">
        <CardBody className="flex flex-col gap-3">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            patterns · health_check
          </p>
          <h2
            id="health-check-heading"
            className="font-display text-display-sm font-semibold tracking-tight text-ink"
          >
            What keeps showing up
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-ink">
            Counts across {SITUATION_SAMPLE_SIZE} anonymized demo situations — {totalObservations}{' '}
            recorded observations. These are things you selected or drafted, not conclusions about
            you. Open any row to see the situations behind the number.
          </p>
          {humorAllowed ? (
            <p className="text-sm italic leading-relaxed text-ink-muted">
              Recurring issue detected. The previous patch did not reach all environments.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* The prohibition is a product rule, so it is stated to the user, not just to the codebase. */}
      <Card tone="teal">
        <CardBody className="flex flex-wrap items-start gap-3">
          <ShieldOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-ink" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold tracking-tight text-ink">
              This screen does not score anyone.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              No relationship health score, no mental-health score, no red/yellow/green rating of a
              person, no attachment style, no personality claims. Counts of observable choices, and
              nothing else. A pattern is information, not a verdict.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          eyebrow="drafts.revised"
          title="Messages improved before sending"
          icon={TrendingUp}
          actions={
            <Badge tone="teal" icon={Activity}>
              {MESSAGES_IMPROVED.total} of {MESSAGES_IMPROVED.sent}
            </Badge>
          }
        />
        <CardBody className="flex flex-col gap-3">
          <ImprovedTrend series={MESSAGES_IMPROVED.series} />
          <p className="text-sm leading-relaxed text-ink">{MESSAGES_IMPROVED.observation}</p>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {PATTERN_SECTIONS.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            selectedRowId={selectedRowId}
            onSelectRow={(row) => setSelectedRowId((current) => (current === row.id ? null : row.id))}
          />
        ))}
      </div>

      <Card tone="sunk">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-ink-muted">
            A pattern is a place to practice, not a diagnosis. Pick the one that cost you the most
            this month.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" leadingIcon={ScrollText} onClick={() => onOpenTool('postmortem')}>
              Review one situation
            </Button>
            <Button variant="outline" leadingIcon={Bandage} onClick={() => onOpenTool('patch')}>
              Repair a recent one
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
