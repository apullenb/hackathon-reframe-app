/**
 * The Current Situation — one shared state object every tool reads and enriches.
 *
 * Transcribed from the UI brief §9. The rules in §9 are the important part and are enforced by
 * the reducer, not by convention:
 *   - raw user input survives moving between tools
 *   - a suggestion NEVER silently becomes confirmed; only an explicit user action promotes it
 *   - every suggestion records which tool produced it
 *   - nothing is persisted beyond the session
 */

export type ToolId =
  | 'context_switch'
  | 'state_inspector'
  | 'thought_debugger'
  | 'stack_trace'
  | 'message_compiler'
  | 'signal_decoder'
  | 'conflict_trace'
  | 'breakpoint'
  | 'unit_tests'
  | 'patch'
  | 'health_check'
  | 'postmortem';

export type WorkspaceId = 'home' | 'inspect' | 'communicate' | 'understand' | 'repair' | 'patterns';

export type ConfirmationState = 'confirmed' | 'suggested' | 'rejected' | 'unknown';

/** Every suggestion carries its provenance, so the UI can always say where a claim came from. */
export type Claim = {
  id: string;
  text: string;
  state: ConfirmationState;
  /** Which tool produced this. Absent when the user typed it themselves. */
  source?: ToolId;
  /** The user's own wording, when they chose "use my own words". */
  userWording?: string;
};

export type TraceStatus = 'complete' | 'active' | 'recommended' | 'available' | 'skipped';

export type TestStatus = 'pass' | 'warning' | 'fail' | 'na';

export type TestResult = {
  id: string;
  label: string;
  status: TestStatus;
  explanation: string;
  /** Exact substring of the draft this test refers to, for highlight-on-select. */
  evidence?: string;
};

export type ConversationTurn = {
  speaker: string;
  text: string;
  timestamp?: string;
};

export type HumorLevel = 'off' | 'light' | 'balanced' | 'spicy';

export type Roles = {
  user: string;
  recipient: string;
  relationship: string;
  channel: string;
};

export type CurrentSituation = {
  id: string;
  title: string;
  createdAt: string;
  activeTool: ToolId;
  activeWorkspace: WorkspaceId;
  roles: Roles;
  goal?: string;
  originalEvent?: string;
  rawOutgoingMessage?: string;
  incomingMessage?: string;
  conversation?: ConversationTurn[];
  facts: Claim[];
  assumptions: Claim[];
  feelings: Claim[];
  bodySignals: string[];
  actionUrge?: string;
  intensity?: 1 | 2 | 3 | 4 | 5;
  desiredOutcome?: string;
  compiledDraft?: string;
  alternativeDrafts: string[];
  testResults: TestResult[];
  trace: Array<{ tool: ToolId; status: TraceStatus }>;
  safety: {
    humorAllowed: boolean;
    seriousMode: boolean;
    reason?: string;
  };
  humorLevel: HumorLevel;
  /** Set when a prepared scenario is loaded, so the UI can say so honestly. */
  scenarioId?: string;
};
