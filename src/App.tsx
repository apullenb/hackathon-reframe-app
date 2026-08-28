import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { ContextSwitchResponse, ContextSwitchMode } from '@/types/contracts';
import type { ToolId } from '@/situation/types';
import { createSituation, situationReducer, hasUnsavedUserContent } from '@/situation/reducer';
import { featureById } from '@/features/registry';
import { ConsoleShell } from '@/components/shell';
import { HomeScreen, CommandPalette, ContextSwitchOverlay } from '@/components/home';
import type { PaletteCommand, ScenarioSummary } from '@/components/home';
import { StateInspector, ThoughtDebugger, StackTrace, BreakpointOverlay } from '@/components/inspect';
import { AiModeIndicator } from '@/components/AiModeIndicator';
import { AiSettingsDrawer } from '@/components/AiSettingsDrawer';
import { SayItBetterResult } from '@/components/sayItBetter';
import { DecodeResult } from '@/components/decode';
import { ConflictLensResult } from '@/components/conflict';
import { TranslationLoadingState } from '@/components/TranslationLoadingState';
import { ErrorFallback, ResultReadyBubbles } from '@/components/shared';
import { Button } from '@/components/ui';
import { FIXTURES, CONFLICT_ALEX_SAM_SPEAKERS } from '@/fixtures';
import { useAiRouter } from '@/hooks/useAiRouter';
import type { ContextSwitchError } from '@/types/contracts';
import { SCENARIOS, scenarioById } from '@/features/scenarios';

/**
 * The console application.
 *
 * One `CurrentSituation` drives every tool (brief §2.3). The three analysis tools that already
 * existed — Message Compiler, Signal Decoder, Conflict Trace — keep their verified result views
 * and are fed from that situation, rather than being rebuilt.
 */

/** Which analysis mode backs each of the three AI-driven tools. */
const TOOL_TO_MODE: Partial<Record<ToolId, ContextSwitchMode>> = {
  message_compiler: 'say_it_better',
  signal_decoder: 'decode_it',
  conflict_trace: 'conflict_lens',
};

export function App() {
  const [situation, dispatch] = useReducer(situationReducer, undefined, () => createSituation());
  const { router, config, probe, refreshConfig } = useAiRouter();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [contextSwitchOpen, setContextSwitchOpen] = useState(false);
  const [breakpointOpen, setBreakpointOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  const [result, setResult] = useState<ContextSwitchResponse | null>(null);
  const [resultSource, setResultSource] = useState<'proxy' | 'direct' | 'fixture' | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<ContextSwitchError | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [resultToken, setResultToken] = useState(0);

  const openTool = useCallback((tool: ToolId) => {
    const feature = featureById(tool);
    if (tool === 'context_switch') { setContextSwitchOpen(true); return; }
    if (tool === 'breakpoint') { setBreakpointOpen(true); return; }
    setResult(null);
    setError(null);
    dispatch({ type: 'open_tool', tool, workspace: feature.workspace });
  }, []);

  /* ── Global shortcuts: ⌘K palette, and the presentation scenario keys (brief §10.7) ── */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === '1') loadScenario('husband');
      else if (event.key === '2') loadScenario('engineer');
      else if (event.key === '3') loadScenario('conflict');
      else if (event.key.toLowerCase() === 'b') setBreakpointOpen(true);
      else if (event.key.toLowerCase() === 'r') handleReset();
      else if (event.key.toLowerCase() === 'p') setPresentationMode((on) => !on);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadScenario = useCallback((id: string) => {
    const scenario = scenarioById(id);
    if (!scenario) return;
    setResult(null);
    setError(null);
    setResultSource(null);
    dispatch({ type: 'load_scenario', situation: scenario.build() });
  }, []);

  const handleReset = useCallback(() => {
    // Brief §9: reset is immediate, but confirm when it would destroy the user's own content.
    if (hasUnsavedUserContent(situation)) {
      const ok = window.confirm('Reset clears the current situation, including what you typed. Continue?');
      if (!ok) return;
    }
    setResult(null);
    setError(null);
    setResultSource(null);
    dispatch({ type: 'reset' });
  }, [situation]);

  /* ── Running one of the three analysis tools ─────────────────────────── */
  const runAnalysis = useCallback(async () => {
    const mode = TOOL_TO_MODE[situation.activeTool];
    if (!mode) return;
    setBusy(true);
    setStage(0);
    setError(null);

    const context = {
      selfRole: situation.roles.user,
      otherRole: situation.roles.recipient,
      relationship: situation.roles.relationship,
      channel: situation.roles.channel,
      desiredOutcome: situation.desiredOutcome,
      humorLevel: situation.safety.seriousMode ? ('off' as const) : ('unfiltered' as const),
    };

    const request =
      mode === 'conflict_lens'
        ? {
            mode,
            context,
            speakers: CONFLICT_ALEX_SAM_SPEAKERS,
            conversation:
              situation.conversation?.map((t) => `${t.speaker}: ${t.text}`).join('\n') ?? '',
            scenarioId: situation.scenarioId,
          }
        : {
            mode,
            context,
            sourceText:
              (mode === 'decode_it' ? situation.incomingMessage : situation.rawOutgoingMessage) ?? '',
            scenarioId: situation.scenarioId,
          };

    const outcome = await router.analyze(request);
    setBusy(false);
    if (outcome.ok) {
      setResult(outcome.response);
      setResultSource(outcome.source);
      setProvider(outcome.provider ?? null);
      setResultToken((t) => t + 1);
      dispatch({ type: 'mark_tool', tool: situation.activeTool, status: 'complete' });
      if (outcome.response.mode === 'say_it_better' && outcome.response.sendableMessage) {
        dispatch({ type: 'set_draft', draft: outcome.response.sendableMessage });
      }
    } else {
      setError(outcome.error);
    }
  }, [router, situation]);

  /** Offer the built-in example when a live call fails — never substitute it silently. */
  const useSavedExample = useCallback(() => {
    const mode = TOOL_TO_MODE[situation.activeTool];
    if (!mode) return;
    const key =
      mode === 'say_it_better' ? 'sayItBetterEngineerPm'
      : mode === 'decode_it' ? 'decodePmToEngineer' : 'conflictAlexSam';
    const response = FIXTURES[key] as ContextSwitchResponse;
    setResult(response);
    setResultSource('fixture');
    setProvider(null);
    setError(null);
    setResultToken((t) => t + 1);
    if (response.mode === 'say_it_better' && response.sendableMessage) {
      dispatch({ type: 'set_draft', draft: response.sendableMessage });
    }
  }, [situation.activeTool]);

  const scenarioSummaries = useMemo<ScenarioSummary[]>(
    () => SCENARIOS.map((s) => ({ id: s.id, title: s.title, proves: s.proves })),
    [],
  );

  const paletteExtras = useMemo<PaletteCommand[]>(
    () => [
      ...SCENARIOS.map((s) => ({
        id: `scenario-${s.id}`,
        label: `Load example: ${s.title}`,
        keywords: ['scenario', 'example', s.id],
        run: () => loadScenario(s.id),
      })),
      { id: 'presentation', label: 'Toggle Presentation Mode', keywords: ['present', 'demo', 'stage'], run: () => setPresentationMode((on) => !on) },
      { id: 'reset', label: 'Reset current situation', keywords: ['clear', 'start over'], run: handleReset },
      { id: 'settings', label: 'Open AI settings', keywords: ['provider', 'key', 'model'], run: () => setSettingsOpen(true) },
    ],
    [loadScenario, handleReset],
  );

  const aiStatus = (
    <AiModeIndicator
      activeSource={resultSource}
      activeProvider={provider}
      configuredMode={config.mode}
      errored={Boolean(error)}
    />
  );

  return (
    <ConsoleShell
      situation={situation}
      dispatch={dispatch}
      aiStatus={aiStatus}
      onOpenContextSwitch={() => setContextSwitchOpen(true)}
      onOpenCommandPalette={() => setPaletteOpen(true)}
      onReset={handleReset}
      presentationMode={presentationMode}
    >
      <ToolSurface
        situation={situation}
        dispatch={dispatch}
        openTool={openTool}
        scenarios={scenarioSummaries}
        loadScenario={loadScenario}
        busy={busy}
        stage={stage}
        onAdvanceStage={() => setStage((s) => s + 1)}
        result={result}
        error={error}
        resultToken={resultToken}
        runAnalysis={runAnalysis}
        useSavedExample={useSavedExample}
      />

      <ContextSwitchOverlay
        open={contextSwitchOpen}
        onClose={() => setContextSwitchOpen(false)}
        situation={situation}
        onChange={(patch) => dispatch({ type: 'set_roles', patch })}
        humorAllowed={situation.safety.humorAllowed && situation.humorLevel !== 'off'}
      />
      <BreakpointOverlay
        open={breakpointOpen}
        onClose={() => setBreakpointOpen(false)}
        situation={situation}
        dispatch={dispatch}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenTool={openTool}
        extraCommands={paletteExtras}
      />
      <AiSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        probe={probe}
        configuredMode={config.mode}
        onKeyChange={refreshConfig}
      />
    </ConsoleShell>
  );
}

type ToolSurfaceProps = {
  situation: ReturnType<typeof createSituation>;
  dispatch: React.Dispatch<Parameters<typeof situationReducer>[1]>;
  openTool: (tool: ToolId) => void;
  scenarios: ScenarioSummary[];
  loadScenario: (id: string) => void;
  busy: boolean;
  stage: number;
  onAdvanceStage: () => void;
  result: ContextSwitchResponse | null;
  error: ContextSwitchError | null;
  resultToken: number;
  runAnalysis: () => void;
  useSavedExample: () => void;
};

function ToolSurface(props: ToolSurfaceProps) {
  const { situation, dispatch, openTool, busy, result, error } = props;

  if (situation.activeWorkspace === 'home') {
    return (
      <HomeScreen
        situation={situation}
        onOpenTool={openTool}
        onSetUserRole={(role) => dispatch({ type: 'set_roles', patch: { user: role } })}
        scenarios={props.scenarios}
        onLoadScenario={props.loadScenario}
      />
    );
  }

  switch (situation.activeTool) {
    case 'state_inspector':
      return <StateInspector situation={situation} dispatch={dispatch} />;
    case 'thought_debugger':
      return <ThoughtDebugger situation={situation} dispatch={dispatch} />;
    case 'stack_trace':
      return <StackTrace situation={situation} dispatch={dispatch} onOpenTool={openTool} />;
    default:
      break;
  }

  const mode = TOOL_TO_MODE[situation.activeTool];
  if (!mode) {
    return (
      <p className="text-sm font-medium text-ink-muted">
        {featureById(situation.activeTool).summary}
      </p>
    );
  }

  if (busy) {
    return (
      <TranslationLoadingState
        mode={mode}
        context={{ selfRole: situation.roles.user, otherRole: situation.roles.recipient }}
        stage={props.stage}
        onAdvanceStage={props.onAdvanceStage}
      />
    );
  }

  if (error) {
    return (
      <ErrorFallback
        error={error}
        onRetry={props.runAnalysis}
        onUseFixture={props.useSavedExample}
      />
    );
  }

  if (result) {
    return (
      <div className="relative">
        <ResultReadyBubbles trigger={props.resultToken} />
        {result.mode === 'say_it_better' ? (
          <SayItBetterResult
            response={result}
            humorLevel={situation.humorLevel === 'off' ? 'off' : 'unfiltered'}
            onRegenerate={props.runAnalysis}
            onEditContext={() => openTool('context_switch')}
          />
        ) : result.mode === 'decode_it' ? (
          <DecodeResult
            response={result}
            senderRole={situation.roles.recipient}
            recipientRole={situation.roles.user}
            onRegenerate={props.runAnalysis}
            onEditContext={() => openTool('context_switch')}
          />
        ) : (
          <ConflictLensResult
            response={result}
            speakers={CONFLICT_ALEX_SAM_SPEAKERS}
            onRegenerate={props.runAnalysis}
            onEditContext={() => openTool('context_switch')}
          />
        )}
      </div>
    );
  }

  const feature = featureById(situation.activeTool);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-sm font-semibold text-ink">{feature.name}</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ink-muted">
          {feature.summary}
        </p>
      </div>
      <Button onClick={props.runAnalysis}>Run {feature.name}</Button>
    </div>
  );
}
