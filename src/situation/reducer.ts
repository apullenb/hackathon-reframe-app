import type {
  Claim,
  ConfirmationState,
  CurrentSituation,
  HumorLevel,
  Roles,
  TestResult,
  ToolId,
  TraceStatus,
  WorkspaceId,
} from './types';

/**
 * The Current Situation reducer — one store every tool reads and enriches (brief §2.3, §9).
 *
 * The state rules in brief §9 are enforced here rather than left to convention, because they are
 * the product's honesty guarantees:
 *   - raw user input is never cleared by a tool change
 *   - a suggestion is only ever promoted to `confirmed` by an explicit user action
 *   - every suggestion records the tool that produced it
 *   - reset is immediate, but the caller must confirm when unsaved user content exists
 */

let claimSeq = 0;
/** Stable ids without Math.random, so a fixture-driven demo renders identically every run. */
function nextClaimId(prefix: string): string {
  claimSeq += 1;
  return `${prefix}-${claimSeq}`;
}

export const DEFAULT_ROLES: Roles = {
  user: 'Engineer',
  recipient: 'Product manager',
  relationship: 'Cross-functional teammate',
  channel: 'Slack or Teams',
};

export const ALL_TOOLS: ToolId[] = [
  'context_switch',
  'state_inspector',
  'thought_debugger',
  'stack_trace',
  'message_compiler',
  'signal_decoder',
  'conflict_trace',
  'breakpoint',
  'unit_tests',
  'patch',
  'health_check',
  'postmortem',
];

export function createSituation(overrides: Partial<CurrentSituation> = {}): CurrentSituation {
  return {
    id: 'situation-1',
    title: 'Untitled situation',
    createdAt: new Date().toISOString(),
    activeTool: 'context_switch',
    activeWorkspace: 'home',
    roles: { ...DEFAULT_ROLES },
    facts: [],
    assumptions: [],
    feelings: [],
    bodySignals: [],
    alternativeDrafts: [],
    testResults: [],
    trace: [],
    safety: { humorAllowed: true, seriousMode: false },
    humorLevel: 'balanced',
    ...overrides,
  };
}

export type SituationAction =
  | { type: 'set_roles'; patch: Partial<Roles> }
  | { type: 'set_humor'; level: HumorLevel }
  | { type: 'open_tool'; tool: ToolId; workspace?: WorkspaceId }
  | { type: 'open_workspace'; workspace: WorkspaceId }
  | { type: 'set_text'; patch: Partial<Pick<CurrentSituation,
      'originalEvent' | 'rawOutgoingMessage' | 'incomingMessage' | 'goal' | 'desiredOutcome' | 'title'>> }
  | { type: 'set_conversation'; conversation: CurrentSituation['conversation'] }
  | { type: 'suggest_claims'; kind: ClaimKind; texts: string[]; source: ToolId }
  | { type: 'set_claim_state'; kind: ClaimKind; id: string; state: ConfirmationState }
  | { type: 'set_claim_wording'; kind: ClaimKind; id: string; wording: string }
  | { type: 'add_user_claim'; kind: ClaimKind; text: string }
  | { type: 'set_body_signals'; signals: string[] }
  | { type: 'set_action_urge'; urge?: string }
  | { type: 'set_intensity'; intensity?: CurrentSituation['intensity'] }
  | { type: 'set_draft'; draft: string; alternatives?: string[] }
  | { type: 'set_tests'; results: TestResult[] }
  | { type: 'mark_tool'; tool: ToolId; status: TraceStatus }
  | { type: 'set_safety'; safety: Partial<CurrentSituation['safety']> }
  | { type: 'load_scenario'; situation: CurrentSituation }
  | { type: 'reset' };

export type ClaimKind = 'facts' | 'assumptions' | 'feelings';

export function situationReducer(
  state: CurrentSituation,
  action: SituationAction,
): CurrentSituation {
  switch (action.type) {
    case 'set_roles':
      // Role changes never discard content (brief §22 "Cohesion").
      return { ...state, roles: { ...state.roles, ...action.patch } };

    case 'set_humor':
      // Serious mode outranks the humor control: it is a safety state, not a preference.
      return state.safety.seriousMode ? state : { ...state, humorLevel: action.level };

    case 'open_tool':
      return {
        ...state,
        activeTool: action.tool,
        activeWorkspace: action.workspace ?? state.activeWorkspace,
        trace: withTrace(state.trace, action.tool, 'active'),
      };

    case 'open_workspace':
      return { ...state, activeWorkspace: action.workspace };

    case 'set_text':
      return { ...state, ...action.patch };

    case 'set_conversation':
      return { ...state, conversation: action.conversation };

    case 'suggest_claims': {
      // Suggestions arrive as `suggested` and carry their producing tool. They never enter as
      // `confirmed` — only `set_claim_state` from a user action can do that.
      const existing = state[action.kind];
      const seen = new Set(existing.map((claim) => claim.text.toLowerCase()));
      const added: Claim[] = action.texts
        .filter((text) => !seen.has(text.toLowerCase()))
        .map((text) => ({
          id: nextClaimId(action.kind),
          text,
          state: 'suggested' as const,
          source: action.source,
        }));
      return { ...state, [action.kind]: [...existing, ...added] };
    }

    case 'set_claim_state':
      return {
        ...state,
        [action.kind]: state[action.kind].map((claim) =>
          claim.id === action.id ? { ...claim, state: action.state } : claim,
        ),
      };

    case 'set_claim_wording':
      return {
        ...state,
        [action.kind]: state[action.kind].map((claim) =>
          claim.id === action.id
            ? { ...claim, userWording: action.wording, state: 'confirmed' as const }
            : claim,
        ),
      };

    case 'add_user_claim':
      // Typed by the user, so it is confirmed and has no tool source.
      return {
        ...state,
        [action.kind]: [
          ...state[action.kind],
          { id: nextClaimId(action.kind), text: action.text, state: 'confirmed' as const },
        ],
      };

    case 'set_body_signals':
      return { ...state, bodySignals: action.signals };

    case 'set_action_urge':
      return { ...state, actionUrge: action.urge };

    case 'set_intensity':
      return { ...state, intensity: action.intensity };

    case 'set_draft':
      return {
        ...state,
        compiledDraft: action.draft,
        alternativeDrafts: action.alternatives ?? state.alternativeDrafts,
      };

    case 'set_tests':
      return { ...state, testResults: action.results };

    case 'mark_tool':
      return { ...state, trace: withTrace(state.trace, action.tool, action.status) };

    case 'set_safety': {
      const safety = { ...state.safety, ...action.safety };
      // Entering serious mode removes humor outright rather than relying on each surface to
      // remember (brief §0.10, §16).
      return {
        ...state,
        safety,
        humorLevel: safety.seriousMode ? 'off' : state.humorLevel,
      };
    }

    case 'load_scenario':
      return action.situation;

    case 'reset':
      return createSituation();

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/** Record a tool's status, promoting a previously active tool to complete. */
function withTrace(
  trace: CurrentSituation['trace'],
  tool: ToolId,
  status: TraceStatus,
): CurrentSituation['trace'] {
  const promoted = trace.map((entry) =>
    entry.status === 'active' && entry.tool !== tool
      ? { ...entry, status: 'complete' as const }
      : entry,
  );
  const index = promoted.findIndex((entry) => entry.tool === tool);
  if (index === -1) return [...promoted, { tool, status }];
  const next = [...promoted];
  next[index] = { tool, status };
  return next;
}

/* ── Derived helpers ─────────────────────────────────────────────────────── */

export function confirmedOnly(claims: Claim[]): Claim[] {
  return claims.filter((claim) => claim.state === 'confirmed');
}

/** True when the user has typed or pasted something a reset would destroy (brief §9). */
export function hasUnsavedUserContent(state: CurrentSituation): boolean {
  return Boolean(
    state.originalEvent?.trim() ||
      state.rawOutgoingMessage?.trim() ||
      state.incomingMessage?.trim() ||
      state.compiledDraft?.trim() ||
      state.conversation?.length ||
      [...state.facts, ...state.assumptions, ...state.feelings].some(
        (claim) => claim.state === 'confirmed',
      ),
  );
}
