/**
 * Data contracts — spec §17, transcribed exactly as written.
 *
 * These are the compile-time shapes. The runtime gate is src/schemas/, which is deliberately
 * STRICTER in places (see schemas/sayItBetter.ts). Both live model responses and fixtures pass
 * through the same schemas; nothing reaches the UI unvalidated.
 */

export type ContextSwitchMode = 'say_it_better' | 'decode_it' | 'conflict_lens';

export type CommunicationContext = {
  selfRole: string;
  otherRole: string;
  relationship: string;
  channel: string;
  desiredOutcome?: string;
  desiredTone?: string;
  urgency?: 'low' | 'normal' | 'high';
  relationshipTemperature?: 'calm' | 'tense' | 'escalating';
  lengthPreference?: 'short' | 'medium' | 'detailed';
  humorLevel?: 'off' | 'subtle' | 'unfiltered';
  reduceJargon?: boolean;
};

export type FollowUpQuestion = {
  id: string;
  question: string;
  reason: string;
  required: boolean;
  options?: Array<{ id: string; label: string }>;
};

export type SafetyCategory =
  | 'none'
  | 'high_stakes_professional'
  | 'threat_or_intimidation'
  | 'possible_abuse_or_coercion'
  | 'self_harm_or_immediate_danger'
  | 'illegal_or_deceptive_request';

export type SafetyResult = {
  category: SafetyCategory;
  userMessage?: string;
  allowStandardOutput: boolean;
};

export type SupportLevel = 'strongly_supported' | 'plausible' | 'speculative';

export type Interpretation = {
  text: string;
  support: SupportLevel;
  evidence?: string;
};

/* ── Say It Better ───────────────────────────────────────────────────────── */

export type SayItBetterRequest = {
  mode: 'say_it_better';
  context: CommunicationContext;
  sourceText: string;
  followUpAnswers?: Record<string, string>;
};

export type SayItBetterResponse = {
  mode: 'say_it_better';
  needsFollowUp: boolean;
  followUpQuestions: FollowUpQuestion[];
  unfilteredTranslation?: string;
  sendableMessage?: string;
  alternatives?: Array<{
    id: string;
    label: string;
    tone: string;
    message: string;
  }>;
  howItMayLand?: Array<{
    label: string;
    sentiment: 'positive' | 'neutral' | 'caution';
  }>;
  changesMade?: string[];
  missingInformation?: string[];
  honestyCheck?: {
    passed: boolean;
    concerns: string[];
  };
  safety?: SafetyResult;
};

/* ── Decode It ───────────────────────────────────────────────────────────── */

export type DecodeRequest = {
  mode: 'decode_it';
  context: CommunicationContext;
  sourceText: string;
  precedingContext?: string;
};

export type DecodeResponse = {
  mode: 'decode_it';
  literalMeaning: string;
  likelyPurpose: Interpretation[];
  knownFacts: string[];
  interpretations: Interpretation[];
  unknowns: string[];
  toneCues: Array<{ cue: string; observation: string }>;
  usefulResponseShouldInclude: string[];
  clarificationQuestion: string;
  responseOptions: Array<{
    id: string;
    label: string;
    message: string;
  }>;
  safety?: SafetyResult;
};

/* ── Conflict Lens ───────────────────────────────────────────────────────── */

export type ConflictSpeaker = {
  id: string;
  label: string;
  role: string;
  isUser: boolean;
};

export type ConflictLensRequest = {
  mode: 'conflict_lens';
  context: CommunicationContext;
  speakers: ConflictSpeaker[];
  conversation: string;
};

export type ConflictLensResponse = {
  mode: 'conflict_lens';
  neutralSummary: string;
  participants: Array<{
    speakerId: string;
    statedPosition: string[];
    possibleConcerns: Interpretation[];
    whatTheyMayBeTryingToSay: string;
    whatTheOtherPersonMayHear: string;
  }>;
  sharedFacts: string[];
  disputedOrUnclear: string[];
  unansweredQuestions: string[];
  escalationPoints: Array<{
    excerpt: string;
    observation: string;
    effect: string;
  }>;
  coreProblem: string;
  sharedGoal?: string;
  resolutionOptions: Array<{
    title: string;
    description: string;
    tradeoff?: string;
  }>;
  suggestedConversationStructure: string[];
  repairMessage: string;
  falseEquivalenceWarning?: string;
  safety?: SafetyResult;
};

/* ── Unions and transport ────────────────────────────────────────────────── */

export type ContextSwitchRequest = SayItBetterRequest | DecodeRequest | ConflictLensRequest;

export type ContextSwitchResponse = SayItBetterResponse | DecodeResponse | ConflictLensResponse;

/** Which client actually produced the result on screen (spec §10.1 demo indicator). */
export type AiSource = 'proxy' | 'direct' | 'fixture';

export type AiMode = 'live' | 'fixture' | 'auto';

export type ContextSwitchErrorKind =
  | 'timeout'
  | 'network'
  | 'schema_invalid'
  | 'no_client_available'
  | 'provider_error'
  | 'aborted';

/**
 * The only shape the UI ever sees for a failure. Raw model output is never rendered
 * (spec §25).
 */
export type ContextSwitchError = {
  kind: ContextSwitchErrorKind;
  /** Copy written for the user, already safe to display. */
  userMessage: string;
  /** True when a prepared-scenario fixture can be offered as a substitute. */
  fixtureAvailable: boolean;
  /** Non-sensitive detail for the demo indicator. Never contains message content or keys. */
  detail?: string;
};
