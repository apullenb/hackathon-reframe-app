/**
 * Speaker confirmation — spec §11.3 step 4, the gate before any analysis runs.
 *
 * Two jobs: show the user exactly how their paste was read, and find out which speaker they
 * are. Both matter because every downstream panel is attributed by speaker; a silent
 * misattribution would put one person's words in the other person's column for the whole map.
 *
 * Presented as a considered confirmation step rather than a form: the parse is read back as a
 * transcript grouped by turn, and the "which one are you" choice is a pair of large,
 * keyboard-reachable cards.
 */

import { AlertTriangle, Check, Info, MessageSquare } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ParseResult } from './parseConversation';

type SpeakerConfirmationProps = {
  parse: ParseResult;
  /** Which parsed speaker label is the user. */
  userLabel: string | null;
  onSelectUser: (label: string) => void;
};

type ProblemCopy = { heading: string; body: string };

/** Non-blaming, and always says what to change rather than what went wrong (spec §15). */
const problemCopy: Record<Exclude<ParseResult['problem'], 'none'>, ProblemCopy> = {
  no_speakers: {
    heading: 'No speaker labels found',
    body:
      'Conflict Lens reads lines in the form "Name: message". Add a name and a colon at the start of each line — any names work, including nicknames — and the map will follow them.',
  },
  too_many_speakers: {
    heading: 'More than two speakers found',
    body:
      'Conflict Lens maps two-person conversations. Trim the paste to the two people involved, or relabel the lines so each one belongs to one of the two.',
  },
};

type SpeakerGroup = { label: string; texts: string[] };

/** Group consecutive lines by speaker so the paste reads back the way it was written. */
function groupByTurn(parse: ParseResult): SpeakerGroup[] {
  const groups: SpeakerGroup[] = [];

  for (const line of parse.lines) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.label === line.speakerLabel) {
      last.texts.push(line.text);
      continue;
    }
    groups.push({ label: line.speakerLabel, texts: [line.text] });
  }

  return groups;
}

/** First character of the label — a neutral glyph when a line carried no label at all. */
function monogram(label: string): string {
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1).toUpperCase() : '·';
}

/** Two readable, equal-weight skins so turns are easy to tell apart while scanning. */
const turnSkins = [
  { shell: 'border-primary/25 bg-primary-soft', chip: 'bg-grad-primary text-surface' },
  { shell: 'border-line-strong bg-paper-sunk', chip: 'bg-surface-ink text-paper' },
] as const;

export function SpeakerConfirmation({
  parse,
  userLabel,
  onSelectUser,
}: SpeakerConfirmationProps): JSX.Element {
  const groups = groupByTurn(parse);
  const problem = parse.problem === 'none' ? null : problemCopy[parse.problem];
  const canChoose = parse.speakerLabels.length > 0;

  const skinFor = (label: string): (typeof turnSkins)[number] => {
    const index = parse.speakerLabels.indexOf(label);
    return turnSkins[index >= 0 ? index % turnSkins.length : turnSkins.length - 1];
  };

  return (
    <section aria-labelledby="speaker-confirmation-heading" className="space-y-4">
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Before anything is analyzed
        </p>
        <h2
          id="speaker-confirmation-heading"
          className="mt-1 font-display text-2xl leading-tight text-ink"
        >
          Check how this was read
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
          Every panel that follows is attributed by speaker, so this is worth ten seconds.
        </p>
      </div>

      {problem !== null ? (
        <div
          role="note"
          aria-label={problem.heading}
          className="rounded-card-lg border-2 border-amber bg-amber-soft p-5 shadow-card"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-amber-ink" />
            <div className="min-w-0 space-y-2">
              <h3 className="font-display text-lg leading-snug text-ink">{problem.heading}</h3>
              <p className="min-w-0 break-words text-base leading-relaxed text-ink">
                {problem.body}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {parse.unattributedCount > 0 ? (
        <div
          role="note"
          aria-label="Lines without a speaker label"
          className="rounded-card border border-primary/30 bg-primary-soft p-4"
        >
          <div className="flex items-start gap-3">
            <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="min-w-0 text-base leading-relaxed text-ink">
              {parse.unattributedCount === 1
                ? '1 line had no "Name:" prefix, so it was attributed to the speaker above it.'
                : `${parse.unattributedCount} lines had no "Name:" prefix, so each was attributed to the speaker above it.`}{' '}
              If that is not where they belong, add the labels and paste again.
            </p>
          </div>
        </div>
      ) : null}

      <Card elevation="card" className="overflow-hidden">
        <div aria-hidden="true" className="h-1.5 w-full bg-grad-ink" />
        <CardHeader
          eyebrow="As parsed"
          title={
            canChoose
              ? `${parse.speakerLabels.join(' and ')} — ${parse.lines.length} ${parse.lines.length === 1 ? 'line' : 'lines'}`
              : `${parse.lines.length} ${parse.lines.length === 1 ? 'line' : 'lines'}, no speakers`
          }
          icon={MessageSquare}
        />
        <CardBody className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-base leading-relaxed text-ink-muted">
              Nothing to show yet — paste a conversation above.
            </p>
          ) : (
            <ol className="space-y-3">
              {groups.map((group, index) => {
                const skin = skinFor(group.label);

                return (
                  <li
                    key={`${group.label}-${index}`}
                    className={cn(
                      'flex min-w-0 items-start gap-3 rounded-card border px-4 py-3.5',
                      skin.shell,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-chip font-display text-lg leading-none',
                        skin.chip,
                      )}
                    >
                      {monogram(group.label)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold uppercase tracking-wide text-ink-muted">
                        {group.label.length > 0 ? group.label : 'No label'}
                      </p>
                      <div className="mt-1 space-y-1">
                        {group.texts.map((text, textIndex) => (
                          <p
                            key={textIndex}
                            className="min-w-0 whitespace-pre-wrap break-words text-base leading-relaxed text-ink"
                          >
                            {text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardBody>
      </Card>

      {canChoose ? (
        <fieldset className="rounded-card-lg border border-line bg-surface p-5 shadow-card sm:p-6">
          <legend className="px-1 font-display text-xl leading-tight text-ink">
            Which one are you?
          </legend>
          <p className="mt-1 max-w-2xl text-base leading-relaxed text-ink-muted">
            This only decides whose side of the map is labeled as yours. Both sides get the same
            treatment either way.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {parse.speakerLabels.map((label) => {
              const selected = userLabel !== null && label === userLabel;

              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectUser(label)}
                  className={cn(
                    'flex min-h-[72px] min-w-0 items-center gap-3 rounded-card-lg border-2 px-4 py-3.5 text-left',
                    'transition-colors duration-150 ease-smooth',
                    selected
                      ? 'border-primary bg-primary text-surface shadow-lift'
                      : 'border-line-strong bg-surface text-ink hover:border-primary hover:bg-primary-soft',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card font-display text-xl leading-none',
                      selected ? 'bg-surface/20 text-surface' : 'bg-paper-sunk text-ink',
                    )}
                  >
                    {monogram(label)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block min-w-0 break-words text-lg font-semibold leading-snug">
                      {label}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block text-sm font-semibold',
                        selected ? 'text-primary-soft' : 'text-ink-muted',
                      )}
                    >
                      {selected ? "That's me" : 'Choose to mark as you'}
                    </span>
                  </span>
                  {selected ? (
                    <Check aria-hidden="true" className="h-6 w-6 shrink-0 text-surface" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </section>
  );
}
