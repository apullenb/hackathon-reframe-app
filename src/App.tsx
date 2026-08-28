import { useCallback, useMemo, useState } from 'react';
import { MessageSquareText, HeartHandshake, Compass, Settings2, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  CommunicationContext,
  ContextSwitchError,
  ContextSwitchMode,
  ContextSwitchResponse,
  ConflictSpeaker,
} from '@/types/contracts';
import { CommunicateView } from '@/components/communicate2';
import { RepairView } from '@/components/repair2';
import { InspectFlow, ScottCounter } from '@/components/inspect2';
import { AiModeIndicator } from '@/components/AiModeIndicator';
import { AiSettingsDrawer } from '@/components/AiSettingsDrawer';
import { BrandHeader } from '@/components/BrandHeader';
import { Button, Select } from '@/components/ui';
import { RoleSelector } from '@/components/context/RoleSelector';
import { RELATIONSHIPS } from '@/data/vocabulary';
import {
  FIXTURES,
  PREPARED_SCENARIOS,
  CONFLICT_ALEX_SAM_SPEAKERS,
  SATURDAY_DINNER_CONVERSATION,
} from '@/fixtures';
import { useAiRouter } from '@/hooks/useAiRouter';
import { runConflictFirstRead } from '@/ai/firstRead';
import { cn } from '@/lib/cn';

/**
 * Three things this app does, in the order people need them.
 *
 * Deliberately flat: one row of three tabs, no rail, no drawer, no tool registry. An earlier
 * version organised twelve developer-named features into five workspaces and became impossible
 * to understand on sight. Everything here is either the translator, conflict help, or a guided
 * set of questions about how you feel.
 */

type TabId = 'communicate' | 'repair' | 'inspect';

const TABS: ReadonlyArray<{
  id: TabId;
  label: string;
  blurb: string;
  icon: LucideIcon;
}> = [
  {
    id: 'communicate',
    label: 'Communicate',
    blurb: 'Say it better, or understand what someone sent you.',
    icon: MessageSquareText,
  },
  {
    id: 'repair',
    label: 'Repair',
    blurb: 'Work out what an argument is actually about.',
    icon: HeartHandshake,
  },
  {
    id: 'inspect',
    label: 'Inspect',
    blurb: 'Debug your feelings.',
    icon: Compass,
  },
];

/**
 * Nothing is pre-selected. Guessing that the user is an engineer talking to a product manager is
 * presumptuous everywhere and plainly wrong in Repair, where the whole point is that the people
 * involved are the user's own.
 */
const DEFAULT_CONTEXT: Partial<CommunicationContext> = {
  humorLevel: 'unfiltered',
};

export function App() {
  const [tab, setTab] = useState<TabId>('communicate');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { router, config, probe, refreshConfig } = useAiRouter();

  const [mode, setMode] = useState<ContextSwitchMode>('say_it_better');
  const [context, setContext] = useState<Partial<CommunicationContext>>(DEFAULT_CONTEXT);
  const [text, setText] = useState('');
  const [result, setResult] = useState<ContextSwitchResponse | null>(null);
  const [error, setError] = useState<ContextSwitchError | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [resultToken, setResultToken] = useState(0);
  const [source, setSource] = useState<'proxy' | 'direct' | 'fixture' | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const rolesChosen = Boolean(context.selfRole && context.otherRole);
  const [editingPeople, setEditingPeople] = useState(false);

  const canRun = Boolean(
    context.selfRole && context.otherRole && context.relationship && context.channel && text.trim(),
  );

  const deliver = useCallback((response: ContextSwitchResponse, src: 'proxy' | 'direct' | 'fixture', prov?: string | null) => {
    setResult(response);
    setSource(src);
    setProvider(prov ?? null);
    setError(null);
    setResultToken((token) => token + 1);
  }, []);

  const runTranslate = useCallback(async () => {
    if (!canRun) return;
    setBusy(true);
    setStage(0);
    setError(null);
    const request =
      mode === 'say_it_better'
        ? ({ mode: 'say_it_better', context: context as CommunicationContext, sourceText: text.trim() } as const)
        : ({ mode: 'decode_it', context: context as CommunicationContext, sourceText: text.trim() } as const);
    const outcome = await router.analyze(request);
    setBusy(false);
    if (outcome.ok) deliver(outcome.response, outcome.source, outcome.provider);
    else setError(outcome.error);
  }, [canRun, router, mode, context, text, deliver]);

  /** Offered when a live call fails — never substituted silently. */
  const useExample = useCallback(() => {
    const key = mode === 'say_it_better' ? 'sayItBetterEngineerPm' : 'decodePmToEngineer';
    deliver(FIXTURES[key] as ContextSwitchResponse, 'fixture');
  }, [mode, deliver]);

  /** Loads the worked example's context and message so the user can see the whole shape. */
  const loadExample = useCallback(() => {
    const scenario = PREPARED_SCENARIOS.find((s) =>
      mode === 'say_it_better' ? s.id === 'engineer_pm_status' : s.id === 'decode_pm_checkin',
    );
    if (!scenario) return;
    setContext(scenario.context);
    setText(scenario.sourceText ?? '');
    setResult(null);
    setError(null);
  }, [mode]);

  const analyzeConflict = useCallback(
    async (conversation: string, speakers: ConflictSpeaker[]) => {
      const outcome = await router.analyze({
        mode: 'conflict_lens' as const,
        context: context as CommunicationContext,
        speakers,
        conversation,
      });
      if (outcome.ok && outcome.response.mode === 'conflict_lens') {
        setSource(outcome.source);
        setProvider(outcome.provider ?? null);
        return { ok: true as const, response: outcome.response };
      }
      return {
        ok: false as const,
        message: outcome.ok ? 'That did not come back in a form we could read.' : outcome.error.userMessage,
      };
    },
    [router, context],
  );

  /**
   * Repair's worked example is the Saturday-dinner exchange, and it deliberately carries no
   * prepared response here: loading it drops the user on the review screen so the normal flow
   * runs from there. A prepared analysis of it exists and is served automatically if no provider
   * answers (see `buildSaturdayDinner`), so this one path behaves the same whether the AI is up
   * or completely down.
   */
  const conflictExample = useMemo(
    () => ({
      conversation: SATURDAY_DINNER_CONVERSATION,
      speakers: CONFLICT_ALEX_SAM_SPEAKERS,
    }),
    [],
  );

  const resetAll = useCallback(() => {
    setText('');
    setResult(null);
    setError(null);
    setSource(null);
    setContext(DEFAULT_CONTEXT);
  }, []);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="grain relative min-h-screen overflow-x-clip bg-paper">
      <a
        href="#main"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-card bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lift"
      >
        Skip to content
      </a>

      <header className="border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              {/*
                `compact` because this header supplies its own tagline below; BrandHeader's
                non-compact tagline ("Translate intent into impact.") would sit next to this one
                and read as two competing straplines.
              */}
              <BrandHeader compact />
              <p className="text-sm font-medium text-ink-muted">
                Troubleshoot communication and debug relationships.
              </p>
            </div>
            {/* flex-wrap: without it this row is 393px intrinsic inside a 358px box at 390px
                wide, so "Start over" overflowed and was silently clipped by the root's
                overflow-x-clip — the control was unreachable on a phone. */}
            <div className="flex flex-wrap items-center gap-2">
              <AiModeIndicator
                activeSource={source}
                activeProvider={provider}
                configuredMode={config.mode}
                errored={Boolean(error)}
              />
              <Button variant="outline" leadingIcon={Settings2} onClick={() => setSettingsOpen(true)}>
                Settings
              </Button>
              <Button variant="ghost" leadingIcon={RotateCcw} onClick={resetAll}>
                Start over
              </Button>
            </div>
          </div>

          <nav aria-label="Sections" className="mt-4">
            <ul className="grid gap-2 sm:grid-cols-3">
              {TABS.map((entry) => {
                const isActive = entry.id === tab;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setTab(entry.id)}
                      className={cn(
                        'flex min-h-tap w-full flex-col items-start gap-0.5 rounded-card border px-4 py-3 text-left transition-colors',
                        isActive
                          ? 'border-primary bg-primary-soft'
                          : 'border-line bg-surface hover:border-primary/45',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <entry.icon
                          className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-ink-muted')}
                          aria-hidden="true"
                        />
                        <span className={cn('font-bold', isActive ? 'text-primary' : 'text-ink')}>
                          {entry.label}
                        </span>
                      </span>
                      <span className="text-sm font-medium leading-snug text-ink-muted">
                        {entry.blurb}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="relative z-10 mx-auto w-full max-w-5xl px-4 py-7 sm:px-6">
        <h1 className="sr-only">{active.label}</h1>

        {tab === 'communicate' ? (
          <CommunicateView
            mode={mode}
            onModeChange={(next) => {
              setMode(next);
              setResult(null);
              setError(null);
            }}
            context={context}
            onContextChange={(patch) => setContext((prev) => ({ ...prev, ...patch }))}
            text={text}
            onTextChange={setText}
            onRun={runTranslate}
            canRun={canRun}
            busy={busy}
            stage={stage}
            onAdvanceStage={() => setStage((s) => s + 1)}
            result={result}
            error={error}
            resultToken={resultToken}
            onUseExample={useExample}
            onLoadExample={loadExample}
          />
        ) : null}

        {tab === 'repair' ? (
          <div className="space-y-6">
            <ConflictPeoplePicker
              context={context}
              onChange={(patch) => {
                setContext((prev) => {
                  const next = { ...prev, ...patch };
                  if (next.selfRole && next.otherRole) setEditingPeople(false);
                  return next;
                });
              }}
              collapsed={rolesChosen && !editingPeople}
              onExpand={() => setEditingPeople(true)}
            />
            {rolesChosen ? (
              <RepairView
                otherPerson={context.otherRole ?? 'the other person'}
                analyze={analyzeConflict}
                firstRead={(conversation, speakers) =>
                  runConflictFirstRead(conversation, speakers, context)
                }
                onLoadExample={() => undefined}
                example={conflictExample}
                context={context}
              />
            ) : (
              <p className="rounded-card border border-line bg-surface p-4 text-sm font-medium leading-relaxed text-ink-muted">
                Pick who the disagreement was between, and we will take it from there.
              </p>
            )}
          </div>
        ) : null}

        {tab === 'inspect' ? (
          <>
            <InspectFlow
              otherPerson={context.otherRole ?? 'the other person'}
              onTakeToTranslator={(draft) => {
                setMode('say_it_better');
                setText(draft);
                setResult(null);
                setError(null);
                setTab('communicate');
              }}
            />
            <ScottCounter />
          </>
        ) : null}
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
        <p className="border-t border-line pt-4 text-sm font-medium leading-relaxed text-ink-muted">
          This helps you communicate. It does not read minds, and it is not therapy, legal, or
          crisis support.
        </p>
      </footer>

      <AiSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        probe={probe}
        configuredMode={config.mode}
        onKeyChange={refreshConfig}
      />
    </div>
  );
}

/**
 * Who the disagreement was between. Deliberately the first thing on the Repair screen and
 * deliberately empty on arrival — the analysis reads very differently for a partner than for a
 * manager, and assuming either would put words in the user's mouth.
 */
function ConflictPeoplePicker({
  context,
  onChange,
  collapsed,
  onExpand,
}: {
  context: Partial<CommunicationContext>;
  onChange: (patch: Partial<CommunicationContext>) => void;
  collapsed: boolean;
  onExpand: () => void;
}) {
  // Once both roles are chosen this collapses to one line. Left expanded, the two role cards
  // fill the viewport and push the actual work below the fold, which reads as "nothing happened".
  if (collapsed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <p className="text-sm font-medium text-ink">
          <span className="text-ink-muted">Between </span>
          <span className="font-bold">{context.selfRole}</span>
          <span className="text-ink-muted"> and </span>
          <span className="font-bold">{context.otherRole}</span>
          {context.relationship ? (
            <span className="text-ink-muted"> · {context.relationship}</span>
          ) : null}
        </p>
        <Button variant="ghost" size="sm" onClick={onExpand}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <section aria-labelledby="people-heading" className="space-y-4">
      <div>
        <h2 id="people-heading" className="font-display text-xl font-semibold text-ink">
          Who was this between?
        </h2>
        <p className="mt-1 text-sm font-medium text-ink-muted">
          It changes what the disagreement is likely to be about.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RoleSelector
          label="I am"
          hint="Your side of it."
          value={context.selfRole}
          onChange={(value) => onChange({ selfRole: value })}
          tone="from"
        />
        <RoleSelector
          label="They are"
          hint="The other person."
          value={context.otherRole}
          onChange={(value) => onChange({ otherRole: value })}
          tone="to"
        />
      </div>
      <div className="max-w-md">
        <Select
          label="Relationship"
          placeholder="Choose a relationship…"
          value={context.relationship ?? ''}
          onChange={(event) => onChange({ relationship: event.target.value })}
          options={RELATIONSHIPS.map((option) => ({ value: option.label, label: option.label }))}
        />
      </div>
    </section>
  );
}
