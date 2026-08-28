import { Activity, ArrowRight, Inbox, PenLine, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CurrentSituation, ToolId } from '@/situation/types';
import { FEATURES } from '@/features/registry';
import { cn } from '@/lib/cn';

/**
 * The opening screen (brief §7). It asks what needs debugging rather than requiring the user to
 * already know which of twelve tools they want — the four entry cards are jobs, not features.
 */

type EntryCard = {
  title: string;
  body: string;
  action: string;
  tool: ToolId;
  icon: LucideIcon;
  tone: 'primary' | 'accent' | 'slate' | 'coral';
};

/** Copy is from brief §7.2 and is approved — do not paraphrase. */
const ENTRY_CARDS: readonly EntryCard[] = [
  {
    title: 'Something happening inside me',
    body: 'I am reacting strongly, making assumptions, or do not know what I am feeling.',
    action: 'Inspect my state',
    tool: 'state_inspector',
    icon: Activity,
    tone: 'primary',
  },
  {
    title: 'Something I need to communicate',
    body: 'I know what I mean. Another human may not survive the current wording.',
    action: 'Compile my message',
    tool: 'message_compiler',
    icon: PenLine,
    tone: 'accent',
  },
  {
    title: 'Something someone sent me',
    body: 'I need to separate the signal from what my brain added to it.',
    action: 'Decode the signal',
    tool: 'signal_decoder',
    icon: Inbox,
    tone: 'slate',
  },
  {
    title: 'Something already went wrong',
    body: 'I sent it, we argued, or the same failure keeps returning.',
    action: 'Start recovery',
    tool: 'patch',
    icon: Wrench,
    tone: 'coral',
  },
] as const;

const TONES = {
  primary: 'border-primary/35 hover:border-primary/70',
  accent: 'border-accent/35 hover:border-accent/70',
  slate: 'border-slate/35 hover:border-slate/70',
  coral: 'border-coral/35 hover:border-coral/70',
} as const;

const TILE = {
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-accent-ink',
  slate: 'bg-slate-soft text-slate-ink',
  coral: 'bg-coral-soft text-coral-ink',
} as const;

/** Role chips from brief §7.3. "Human currently annoyed" is deliberate and stays. */
export const ROLE_CHIPS = [
  'Husband', 'Wife', 'Partner', 'Engineer', 'Manager',
  'Employee', 'Parent', 'Friend', 'Human currently annoyed',
] as const;

export type ScenarioSummary = {
  id: string;
  title: string;
  proves: string;
};

type HomeScreenProps = {
  situation: CurrentSituation;
  onOpenTool: (tool: ToolId) => void;
  onSetUserRole: (role: string) => void;
  scenarios: readonly ScenarioSummary[];
  onLoadScenario: (id: string) => void;
};

export function HomeScreen({
  situation,
  onOpenTool,
  onSetUserRole,
  scenarios,
  onLoadScenario,
}: HomeScreenProps) {
  return (
    <div className="space-y-10">
      <section className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-3rem] -z-10 h-[calc(100%+6rem)] w-screen -translate-x-1/2 bg-wash-hero"
        />
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Human observability console
        </p>
        <h1 className="mt-3 font-display text-display-md font-semibold tracking-tight text-ink sm:text-display-lg">
          What needs debugging?
        </h1>
        <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-ink-muted">
          Start with the situation, the message, or the reaction. You do not need to know what you
          are feeling yet.
        </p>
      </section>

      <section aria-labelledby="entry-heading">
        <h2 id="entry-heading" className="sr-only">
          Where do you want to start?
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {ENTRY_CARDS.map((card, index) => (
            <button
              key={card.tool}
              type="button"
              onClick={() => onOpenTool(card.tool)}
              style={{ animationDelay: `${index * 70}ms` }}
              className={cn(
                'group flex min-h-tap flex-col items-start gap-3 rounded-card-lg border bg-surface p-5 text-left shadow-card transition-all duration-200 ease-spring',
                'hover:-translate-y-0.5 hover:shadow-lift motion-safe:animate-reveal-up',
                TONES[card.tone],
              )}
            >
              <span
                aria-hidden="true"
                className={cn('flex h-10 w-10 items-center justify-center rounded-[12px]', TILE[card.tone])}
              >
                <card.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="font-display text-xl font-semibold text-ink">{card.title}</span>
              <span className="text-sm font-medium leading-relaxed text-ink-muted">{card.body}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-primary">
                {card.action}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 ease-spring motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="role-heading">
        <h2 id="role-heading" className="font-display text-xl font-semibold text-ink">
          Which version of you is currently having this problem?
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ROLE_CHIPS.map((role) => {
            const active = situation.roles.user === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => onSetUserRole(role)}
                aria-pressed={active}
                className={cn(
                  'inline-flex min-h-tap items-center rounded-chip border px-4 text-sm font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-line bg-surface text-ink-muted hover:border-primary/45 hover:text-ink',
                )}
              >
                {role}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="scenarios-heading">
        <h2 id="scenarios-heading" className="font-display text-xl font-semibold text-ink">
          Prepared scenarios
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onLoadScenario(scenario.id)}
              className="flex min-h-tap flex-col items-start gap-2 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lift"
            >
              <span className="rounded-chip border border-primary/30 bg-primary-soft px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                Example
              </span>
              <span className="font-display text-base font-semibold text-ink">{scenario.title}</span>
              <span className="text-sm font-medium leading-relaxed text-ink-muted">
                {scenario.proves}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="font-display text-base font-semibold text-ink">
          All tools
        </h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => onOpenTool(feature.id)}
              title={feature.summary}
              className="inline-flex min-h-tap shrink-0 items-center gap-2 rounded-chip border border-line bg-surface px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:border-primary/45 hover:text-ink"
            >
              <feature.icon className="h-4 w-4" aria-hidden="true" />
              {feature.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
