import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ListChecks, Radio } from 'lucide-react';
import type { ContextSwitchMode, ContextSwitchResponse } from '@/types/contracts';
import { AppShell } from '@/components/AppShell';
import { DemoControls, FlagshipScenarioHint } from '@/components/DemoControls';
import { DirectionSwitch, ModeSelector } from '@/components/ModeSelector';
import { MessageComposer } from '@/components/MessageComposer';
import { TranslationLoadingState } from '@/components/TranslationLoadingState';
import { AiSettingsDrawer } from '@/components/AiSettingsDrawer';
import { ContextBuilder } from '@/components/context/ContextBuilder';
import { ContextSummary } from '@/components/context/ContextSummary';
import { Badge, Button } from '@/components/ui';
import { ErrorFallback, ResultReadyBubbles } from '@/components/shared';
import { SmartFollowUp, SayItBetterResult } from '@/components/sayItBetter';
import { DecodeResult } from '@/components/decode';
import {
  ConflictLensResult,
  ScreenshotUpload,
  SpeakerConfirmation,
  parseConversation,
  speakersFromParse,
} from '@/components/conflict';
import {
  FIXTURES,
  PREPARED_SCENARIOS,
  sayItBetterFollowUp,
  type PreparedScenario,
} from '@/fixtures';
import { aiError, clearUserKey } from '@/ai';
import {
  INITIAL_STATE,
  canSubmit,
  requiredFollowUpsAnswered,
  sessionReducer,
} from '@/state/sessionState';
import { useAiRouter } from '@/hooks/useAiRouter';
import { buildRequest } from '@/hooks/buildRequest';

export function App() {
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_STATE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Which upstream provider served the result on screen, and which ones failed first. Kept
  // outside the reducer because it describes the transport, not the user's draft.
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  /** Increments once per delivered result, so the bubble burst plays once per result. */
  const [resultToken, setResultToken] = useState(0);
  const [failedOver, setFailedOver] = useState<readonly string[]>([]);
  const { router, config, probe, refreshConfig } = useAiRouter();
  const abortRef = useRef<AbortController | null>(null);

  const scenario = useMemo(
    () => PREPARED_SCENARIOS.find((entry) => entry.id === state.scenarioId) ?? null,
    [state.scenarioId],
  );

  /** Say It Better and Decode It share one screen, separated only by the direction switch. */
  const isMessageMode = state.mode === 'say_it_better' || state.mode === 'decode_it';

  /**
   * The tab row's message entry reports itself selected for *both* directions, so a click on it
   * can arrive with the mode that is already active. `select_mode` means "start something new"
   * and would throw away a finished result, so an already-active tab instead just returns to the
   * context step — which is what clicking the tab you are already on should do.
   */
  const handleSelectFlow = useCallback(
    (mode: ContextSwitchMode) => {
      if (mode === state.mode) {
        if (state.step !== 'build_context') dispatch({ type: 'edit_again' });
        return;
      }
      dispatch({ type: 'select_mode', mode });
    },
    [state.mode, state.step],
  );

  /* ── Requesting ────────────────────────────────────────────────────────── */

  const runRequest = useCallback(async () => {
    const request = buildRequest(state);
    if (!request) return;

    // Honest pre-flight (D-009): a fixture is a prepared answer to a prepared question. If
    // fixtures are the only available client and this is the user's own text, say so instead
    // of handing back the engineer's status update as if it were their translation.
    const fixtureOnly = probe ? probe.preferredSource === 'fixture' : config.mode === 'fixture';
    if (fixtureOnly && !state.scenarioId) {
      dispatch({ type: 'start_request' });
      dispatch({
        type: 'request_error',
        error: aiError('no_client_available', {
          userMessage:
            'Translating your own words needs a live connection, which is not configured right now. Your message has been kept exactly as you wrote it. Add a key in Settings, or pick one of the built-in examples.',
          fixtureAvailable: false,
        }),
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'start_request' });
    const result = await router.analyze(request, { signal: controller.signal });

    if (controller.signal.aborted) return;
    if (result.ok) {
      setActiveProvider(result.provider ?? null);
      setResultToken((token) => token + 1);
      setFailedOver(result.failedOver ? [...result.failedOver] : []);
      dispatch({ type: 'request_success', response: result.response, source: result.source });
    } else {
      dispatch({ type: 'request_error', error: result.error });
    }
  }, [state, router, probe, config.mode]);

  /**
   * Continue from the context/composer step.
   *
   * For the prepared engineer scenario the three follow-up answers are already supplied, so the
   * step is a review rather than an interrogation (spec §7: do not ask when the answers are
   * seeded) — every choice arrives pre-selected and Finish is immediately enabled. The step is
   * still shown, because spec §29's demo beat depends on it.
   */
  const handleContinue = useCallback(() => {
    if (state.mode === 'say_it_better' && !state.followUpResolved) {
      const questions = followUpQuestionsFor(scenario);
      if (questions.length > 0) {
        dispatch({ type: 'ask_follow_up', questions });
        return;
      }
    }
    void runRequest();
  }, [state.mode, state.followUpResolved, scenario, runRequest]);

  const handleFinishFollowUp = useCallback(() => {
    dispatch({ type: 'finish_follow_up' });
    void runRequest();
  }, [runRequest]);

  /* ── Demo controls ─────────────────────────────────────────────────────── */

  const handleLoadScenario = useCallback((scenarioId: string) => {
    const found = PREPARED_SCENARIOS.find((entry) => entry.id === scenarioId);
    if (!found) return;
    dispatch({
      type: 'load_scenario',
      scenarioId: found.id,
      mode: found.mode,
      context: found.context,
      inputs: {
        sourceText: found.sourceText ?? '',
        conversation: found.conversation ?? '',
        speakers: found.speakers ?? [],
      },
      followUpAnswers: found.seededFollowUpAnswers,
    });
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    // Reset Demo also clears any user-supplied key (CLAUDE.md).
    clearUserKey();
    refreshConfig();
    dispatch({ type: 'reset_demo' });
  }, [refreshConfig]);

  const handleUseFixture = useCallback(() => {
    if (!scenario) return;
    const response = FIXTURES[scenario.fixtureKey] as ContextSwitchResponse;
    setActiveProvider(null);
    setResultToken((token) => token + 1);
    dispatch({ type: 'request_success', response, source: 'fixture' });
  }, [scenario]);

  /* ── Conflict Lens speaker parsing ─────────────────────────────────────── */

  const parse = useMemo(
    () =>
      state.mode === 'conflict_lens'
        ? parseConversation(state.inputs.conversation)
        : null,
    [state.mode, state.inputs.conversation],
  );

  const userSpeakerLabel =
    state.inputs.speakers.find((speaker) => speaker.isUser)?.label ?? null;

  const handleSelectUserSpeaker = useCallback(
    (label: string) => {
      if (!parse) return;
      dispatch({
        type: 'set_inputs',
        patch: {
          speakers: speakersFromParse(parse, label, {
            self: state.context.selfRole ?? 'Participant',
            other: state.context.otherRole ?? 'Participant',
          }),
        },
      });
    },
    [parse, state.context.selfRole, state.context.otherRole],
  );

  /* ── Render ────────────────────────────────────────────────────────────── */

  const toolbar = (
    <DemoControls
      scenarioId={state.scenarioId}
      onLoadScenario={handleLoadScenario}
      onReset={handleReset}
      activeSource={state.resultSource}
      activeProvider={activeProvider}
      failedOver={failedOver}
      configuredMode={config.mode}
      errored={state.step === 'error'}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  return (
    <AppShell
      toolbar={toolbar}
      compactHeader={Boolean(state.mode) && state.step !== 'mode_select'}
    >
      {state.step === 'mode_select' || !state.mode ? (
        <LandingScreen
          // Always a fresh start: the landing cards are an entry point, not a tab.
          onSelectMode={(mode) => dispatch({ type: 'select_mode', mode })}
          onLoadFlagship={() => handleLoadScenario('engineer_pm_status')}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              leadingIcon={ArrowLeft}
              onClick={() => dispatch({ type: 'back_to_modes' })}
            >
              All modes
            </Button>
            <ModeSelector selected={state.mode} onSelect={handleSelectFlow} variant="tabs" />
          </div>

          {scenario ? (
            <div className="flex flex-wrap items-center gap-2 rounded-card border border-accent/40 bg-accent-soft px-4 py-3">
              <Badge tone="accent" size="sm">
                Example
              </Badge>
              <p className="text-sm font-semibold text-accent-ink">{scenario.label}</p>
            </div>
          ) : null}

          {state.step === 'follow_up' ? (
            <SmartFollowUp
              questions={state.followUpQuestions}
              answers={state.followUpAnswers}
              onAnswer={(questionId, answer) =>
                dispatch({ type: 'answer_follow_up', questionId, answer })
              }
              onFinish={handleFinishFollowUp}
              onBack={() => dispatch({ type: 'skip_follow_up' })}
              canFinish={requiredFollowUpsAnswered(state)}
            />
          ) : null}

          {state.step === 'loading' ? (
            <TranslationLoadingState
              mode={state.mode}
              context={state.context}
              stage={state.loadingStage}
              onAdvanceStage={() => dispatch({ type: 'advance_stage' })}
            />
          ) : null}

          {state.step === 'error' && state.error ? (
            <div className="space-y-4">
              <ErrorFallback
                error={state.error}
                onRetry={() => void runRequest()}
                onUseFixture={
                  state.error.fixtureAvailable && scenario ? handleUseFixture : undefined
                }
              />
              <Button
                variant="outline"
                leadingIcon={ArrowLeft}
                onClick={() => dispatch({ type: 'edit_again' })}
              >
                Back to my message
              </Button>
            </div>
          ) : null}

          {state.step === 'result' && state.result ? (
            <div className="relative">
              {/* Marks the moment the analysis is ready. Self-removing, aria-hidden, and it
                  renders nothing at all under prefers-reduced-motion. */}
              <ResultReadyBubbles trigger={resultToken} />
              <ResultView
                response={state.result}
                humorLevel={state.context.humorLevel}
                selfRole={state.context.selfRole}
                otherRole={state.context.otherRole}
                speakers={state.inputs.speakers}
                onRegenerate={() => void runRequest()}
                onEditContext={() => dispatch({ type: 'edit_again' })}
              />
            </div>
          ) : null}

          {state.step === 'build_context' ? (
            <div className="space-y-6">
              {/* The direction switch leads the context step: it decides what every control
                  below it means, so it cannot sit further down the page. */}
              {isMessageMode && state.mode ? (
                <DirectionSwitch mode={state.mode} onChange={handleSelectFlow} />
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <ContextBuilder
                  mode={state.mode}
                  context={state.context}
                  onChange={(patch) => dispatch({ type: 'set_context', patch })}
                />

                <div className="space-y-4">
                  <ContextSummary mode={state.mode} context={state.context} />

                  {state.mode === 'conflict_lens' ? (
                    <>
                      <ScreenshotUpload
                        onTranscript={(transcript) =>
                          dispatch({ type: 'set_inputs', patch: { conversation: transcript } })
                        }
                        disabled={state.step !== 'build_context'}
                      />
                      <MessageComposer
                        label="Paste the conversation"
                        hint="One line per message, in Name: message form."
                        placeholder={'Alex: I asked you twice…\nSam: I said I would do it.'}
                        value={state.inputs.conversation}
                        onChange={(value) =>
                          dispatch({ type: 'set_inputs', patch: { conversation: value } })
                        }
                        rows={8}
                      />
                      {parse && state.inputs.conversation.trim() ? (
                        <SpeakerConfirmation
                          parse={parse}
                          userLabel={userSpeakerLabel}
                          onSelectUser={handleSelectUserSpeaker}
                        />
                      ) : null}
                    </>
                  ) : (
                    <MessageComposer
                      label={
                        state.mode === 'decode_it'
                          ? 'The message you received'
                          : 'What you actually want to say'
                      }
                      hint={
                        state.mode === 'decode_it'
                          ? 'Paste it exactly as it arrived.'
                          : 'Be blunt. The honest version is the useful input.'
                      }
                      placeholder={
                        state.mode === 'decode_it'
                          ? 'Just checking in. Do we have an update on this yet?'
                          : "I haven't really worked on it much because…"
                      }
                      value={state.inputs.sourceText}
                      onChange={(value) =>
                        dispatch({ type: 'set_inputs', patch: { sourceText: value } })
                      }
                    />
                  )}

                  {state.followUpResolved && state.mode === 'say_it_better' ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-teal-ink">
                      <ListChecks className="h-4 w-4" aria-hidden="true" />
                      {Object.keys(state.followUpAnswers).length} follow-up answers supplied
                    </p>
                  ) : null}

                  <Button
                    size="lg"
                    fullWidth
                    trailingIcon={ArrowRight}
                    disabled={!canSubmit(state)}
                    onClick={handleContinue}
                  >
                    {state.mode === 'say_it_better' ? 'Translate' : 'Analyze'}
                  </Button>
                  {!canSubmit(state) ? (
                    <p className="text-sm font-medium text-ink-muted">
                      Choose both roles, a relationship, and a channel, then add your message.
                      {state.mode === 'conflict_lens'
                        ? ' Conflict Lens also needs two confirmed speakers.'
                        : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <AiSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        probe={probe}
        configuredMode={config.mode}
        onKeyChange={refreshConfig}
      />
    </AppShell>
  );
}

/** Follow-up questions known ahead of the request. Only the seeded scenario has them. */
function followUpQuestionsFor(scenario: PreparedScenario | null) {
  if (scenario?.id === 'engineer_pm_status') return sayItBetterFollowUp.followUpQuestions;
  return [];
}

/**
 * The three things that make this more than a rewriter. Deliberately NOT the mode descriptions
 * again — those are already on the cards above, and repeating them wasted the one panel that
 * could explain why the product works.
 */
const DIFFERENTIATORS = [
  {
    title: 'Context, not adjectives',
    body:
      'Your role, their role, the relationship, the channel, and what you actually want all go into the request. The same sentence becomes a different message for a PM on Slack than for an executive over email.',
  },
  {
    title: 'It will not invent facts',
    body:
      'If an honest rewrite would need progress, an approval, or a date you never gave, it asks you for the fact instead of quietly writing one in.',
  },
  {
    title: 'Evidence, separated from guessing',
    body:
      'Every inference is labelled strongly supported, plausible, or speculative — and what cannot be known from a message gets its own section instead of being dropped.',
  },
] as const;

function LandingScreen({
  onSelectMode,
  onLoadFlagship,
}: {
  onSelectMode: (mode: ContextSwitchMode) => void;
  onLoadFlagship: () => void;
}) {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero. The wash sits behind the type rather than in a box, so the page feels open. */}
      <section className="relative pb-4 pt-6 sm:pt-10">
        {/* Full-bleed ambient wash. w-screen + centering makes it span the viewport rather
            than stopping at the content column, where it read as a hard-edged box. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-4.5rem] -z-10 h-[calc(100%+9rem)] w-screen -translate-x-1/2 bg-wash-hero"
        />
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-chip border border-primary/25 bg-surface/80 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.13em] text-primary shadow-card">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            Communication translator
          </span>

          <h1 className="mt-6 font-display text-display-md font-semibold text-ink sm:text-display-lg">
            You know what you meant.
            <br />
            <span className="text-gradient">They heard something else.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-ink-muted">
            Context Switch translates between roles, relationships, and expectations — not just
            words. It does not claim to read minds. It separates what was said, what may have
            been meant, what was inferred, and what still needs to be asked.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <FlagshipScenarioHint onLoad={onLoadFlagship} />
            <a
              href="#modes"
              className="inline-flex min-h-tap items-center gap-2 rounded-chip border border-line-strong bg-surface px-5 py-3 text-[0.95rem] font-bold text-ink shadow-card transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-lift"
            >
              Choose a mode
            </a>
          </div>
        </div>
      </section>

      <section id="modes" aria-labelledby="modes-heading" className="scroll-mt-28">
        <h2
          id="modes-heading"
          className="font-display text-display-sm font-semibold tracking-tight text-ink"
        >
          What do you need to do?
        </h2>
        <p className="mt-2 max-w-2xl text-[0.95rem] font-medium leading-relaxed text-ink-muted">
          Two jobs, one shared idea: the words are only half of a message.
        </p>
        <div className="mt-6">
          <ModeSelector selected={null} onSelect={onSelectMode} />
        </div>
      </section>

      <section aria-labelledby="different-heading">
        <h2
          id="different-heading"
          className="font-display text-display-sm font-semibold tracking-tight text-ink"
        >
          Why it works
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {DIFFERENTIATORS.map((item, index) => (
            <li
              key={item.title}
              style={{ animationDelay: `${index * 80}ms` }}
              className="relative rounded-card border border-line bg-surface/80 p-5 shadow-card motion-safe:animate-reveal-up"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-chip bg-accent-soft font-mono text-sm font-bold text-accent-ink"
              >
                {index + 1}
              </span>
              <h3 className="mt-3.5 font-display text-xl font-semibold leading-snug text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ResultView({
  response,
  humorLevel,
  selfRole,
  otherRole,
  speakers,
  onRegenerate,
  onEditContext,
}: {
  response: ContextSwitchResponse;
  humorLevel: 'off' | 'subtle' | 'unfiltered' | undefined;
  selfRole: string | undefined;
  otherRole: string | undefined;
  speakers: Parameters<typeof ConflictLensResult>[0]['speakers'];
  onRegenerate: () => void;
  onEditContext: () => void;
}) {
  switch (response.mode) {
    case 'say_it_better':
      return (
        <SayItBetterResult
          response={response}
          humorLevel={humorLevel}
          onRegenerate={onRegenerate}
          onEditContext={onEditContext}
        />
      );
    case 'decode_it':
      return (
        <DecodeResult
          response={response}
          senderRole={otherRole}
          recipientRole={selfRole}
          onRegenerate={onRegenerate}
          onEditContext={onEditContext}
        />
      );
    case 'conflict_lens':
      return (
        <ConflictLensResult
          response={response}
          speakers={speakers}
          onRegenerate={onRegenerate}
          onEditContext={onEditContext}
        />
      );
    default: {
      const exhaustive: never = response;
      return exhaustive;
    }
  }
}
