import type {
  AiSource,
  CommunicationContext,
  ConflictSpeaker,
  ContextSwitchError,
  ContextSwitchMode,
  ContextSwitchResponse,
  FollowUpQuestion,
} from '@/types/contracts';

/**
 * Session state — spec §21. React state only. UI preferences may go to `sessionStorage`;
 * pasted message content never does, and nothing goes to `localStorage`.
 */

export type FlowStep =
  | 'mode_select'
  | 'build_context'
  | 'follow_up'
  | 'loading'
  | 'result'
  | 'error';

/** Everything the user can type or paste. Kept separate so an error can preserve it verbatim. */
export type DraftInputs = {
  /** Say It Better / Decode It: the raw message or honest intent. */
  sourceText: string;
  /** Decode It: optional preceding context. */
  precedingContext: string;
  /** Conflict Lens: the pasted two-speaker conversation. */
  conversation: string;
  /** Conflict Lens: parsed speakers, confirmed by the user before analysis. */
  speakers: ConflictSpeaker[];
};

export type SessionState = {
  mode: ContextSwitchMode | null;
  step: FlowStep;
  /** Partial while the user builds it; validated into a full context before a request. */
  context: Partial<CommunicationContext>;
  inputs: DraftInputs;
  followUpQuestions: FollowUpQuestion[];
  followUpAnswers: Record<string, string>;
  /** True once the user has passed through the follow-up step for the current draft. */
  followUpResolved: boolean;
  result: ContextSwitchResponse | null;
  /** Which client actually produced the result on screen (spec §10.1 indicator). */
  resultSource: AiSource | null;
  error: ContextSwitchError | null;
  /** Non-null when the current draft came from the Prepared Scenario picker. */
  scenarioId: string | null;
  /** Index into LOADING_STAGES for the active mode. */
  loadingStage: number;
};

export const EMPTY_INPUTS: DraftInputs = {
  sourceText: '',
  precedingContext: '',
  conversation: '',
  speakers: [],
};

export const INITIAL_STATE: SessionState = {
  mode: null,
  step: 'mode_select',
  context: {},
  inputs: EMPTY_INPUTS,
  followUpQuestions: [],
  followUpAnswers: {},
  followUpResolved: false,
  result: null,
  resultSource: null,
  error: null,
  scenarioId: null,
  loadingStage: 0,
};

export type SessionAction =
  | { type: 'select_mode'; mode: ContextSwitchMode }
  | { type: 'back_to_modes' }
  | { type: 'set_context'; patch: Partial<CommunicationContext> }
  | { type: 'set_inputs'; patch: Partial<DraftInputs> }
  | {
      type: 'load_scenario';
      scenarioId: string;
      mode: ContextSwitchMode;
      context: CommunicationContext;
      inputs: Partial<DraftInputs>;
      followUpAnswers?: Record<string, string>;
    }
  | { type: 'ask_follow_up'; questions: FollowUpQuestion[] }
  | { type: 'answer_follow_up'; questionId: string; answer: string }
  | { type: 'finish_follow_up' }
  | { type: 'skip_follow_up' }
  | { type: 'start_request' }
  | { type: 'advance_stage' }
  | { type: 'request_success'; response: ContextSwitchResponse; source: AiSource }
  | { type: 'request_error'; error: ContextSwitchError }
  | { type: 'edit_again' }
  | { type: 'reset_demo' };

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'select_mode':
      // Switching modes clears a stale result but keeps the role pair — the demo switches
      // direction between Say It Better and Decode It and re-picking roles would be friction.
      return {
        ...state,
        mode: action.mode,
        step: 'build_context',
        result: null,
        resultSource: null,
        error: null,
        followUpQuestions: [],
        followUpAnswers: {},
        followUpResolved: false,
        scenarioId: null,
      };

    case 'back_to_modes':
      return { ...state, step: 'mode_select' };

    case 'set_context':
      return { ...state, context: { ...state.context, ...action.patch } };

    case 'set_inputs':
      // Editing the draft invalidates any follow-up answers gathered for the previous draft.
      return {
        ...state,
        inputs: { ...state.inputs, ...action.patch },
        followUpResolved: false,
      };

    case 'load_scenario':
      return {
        ...INITIAL_STATE,
        mode: action.mode,
        step: 'build_context',
        context: action.context,
        inputs: { ...EMPTY_INPUTS, ...action.inputs },
        followUpAnswers: action.followUpAnswers ?? {},
        // Deliberately FALSE even when answers are seeded (fixes F-004).
        //
        // Spec §7 says not to *ask* when a prepared scenario's answers are already seeded, and
        // we don't: the questions render with their answers pre-selected, so nothing is being
        // asked and no fact can be invented. But the step still has to be reachable, because
        // spec §29's demo beat is "answer quick follow-ups" — skipping straight to the result
        // removes the moment that shows the Honesty Guard gathering facts instead of guessing.
        followUpResolved: false,
        scenarioId: action.scenarioId,
      };

    case 'ask_follow_up':
      return {
        ...state,
        step: 'follow_up',
        followUpQuestions: action.questions,
        followUpResolved: false,
      };

    case 'answer_follow_up':
      return {
        ...state,
        followUpAnswers: { ...state.followUpAnswers, [action.questionId]: action.answer },
      };

    case 'finish_follow_up':
    case 'skip_follow_up':
      return { ...state, followUpResolved: true, step: 'build_context' };

    case 'start_request':
      return { ...state, step: 'loading', loadingStage: 0, error: null };

    case 'advance_stage':
      return { ...state, loadingStage: state.loadingStage + 1 };

    case 'request_success': {
      // A Say It Better response may come back asking for facts instead of answering.
      const asksForFacts =
        action.response.mode === 'say_it_better' &&
        action.response.needsFollowUp &&
        action.response.followUpQuestions.length > 0;
      if (asksForFacts && action.response.mode === 'say_it_better') {
        return {
          ...state,
          step: 'follow_up',
          followUpQuestions: action.response.followUpQuestions,
          followUpResolved: false,
          resultSource: action.source,
          error: null,
        };
      }
      return {
        ...state,
        step: 'result',
        result: action.response,
        resultSource: action.source,
        error: null,
      };
    }

    case 'request_error':
      // Inputs are deliberately untouched: spec §16 requires preserving the user's inputs.
      return { ...state, step: 'error', error: action.error };

    case 'edit_again':
      return { ...state, step: 'build_context', error: null };

    case 'reset_demo':
      return INITIAL_STATE;

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/* ── Derived helpers ─────────────────────────────────────────────────────── */

/** The four context fields every mode requires (spec §5). */
export function hasRequiredContext(context: Partial<CommunicationContext>): boolean {
  return Boolean(context.selfRole && context.otherRole && context.relationship && context.channel);
}

/** Whether the mode's message input is populated enough to continue. */
export function hasRequiredInput(mode: ContextSwitchMode | null, inputs: DraftInputs): boolean {
  if (mode === 'conflict_lens') return inputs.conversation.trim().length > 0;
  return inputs.sourceText.trim().length > 0;
}

/** Continue is disabled until required context AND a message exist (spec §13.3). */
export function canSubmit(state: SessionState): boolean {
  if (!state.mode) return false;
  if (!hasRequiredContext(state.context)) return false;
  if (!hasRequiredInput(state.mode, state.inputs)) return false;
  if (state.mode === 'conflict_lens' && state.inputs.speakers.length !== 2) return false;
  return true;
}

/** Every required follow-up question has an answer. Optional ones may be skipped (spec §7). */
export function requiredFollowUpsAnswered(state: SessionState): boolean {
  return state.followUpQuestions
    .filter((question) => question.required)
    .every((question) => Boolean(state.followUpAnswers[question.id]?.trim()));
}

/**
 * Assemble the validated context for a request. Returns null when incomplete, so a caller
 * cannot accidentally send a half-built context to the model.
 */
export function toCommunicationContext(
  context: Partial<CommunicationContext>,
): CommunicationContext | null {
  if (!hasRequiredContext(context)) return null;
  return {
    ...context,
    selfRole: context.selfRole as string,
    otherRole: context.otherRole as string,
    relationship: context.relationship as string,
    channel: context.channel as string,
  };
}
