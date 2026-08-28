/**
 * Contracts added by the Adult Communication spec (§17), layered onto the existing ones.
 *
 * WHY LAYERED RATHER THAN REPLACED: that spec's §17 renames some fields the app already carries
 * under different names (`primaryMessage`/`sendableMessage`, `speakers`/`participants`). The spec
 * says the implementation "may use TypeScript and Zod or an equivalent validator", so the binding
 * part is the INFORMATION, not the identifiers. Replacing identifiers wholesale would invalidate
 * 8 fixtures, 3 result views and 96 passing checks for no behavioural gain. Recorded as D-016.
 */

/**
 * Confidence, per the practice spec. Extends the existing three-level support scale with
 * `cannot_determine` — the level that lets a result say "this is not knowable from the text"
 * rather than forcing a weak guess.
 */
export type Confidence =
  | 'directly_supported'
  | 'plausible'
  | 'speculative'
  | 'cannot_determine';

/** Maps the existing support scale onto the practice spec's, so both can coexist. */
export const SUPPORT_TO_CONFIDENCE = {
  strongly_supported: 'directly_supported',
  plausible: 'plausible',
  speculative: 'speculative',
} as const;

export type EvidenceCategory = 'fact' | 'guess' | 'feeling' | 'unknown' | 'alternative';

/** One classified statement. The Thought Debugger's lanes are these categories. */
export type EvidenceItem = {
  statement: string;
  category: EvidenceCategory;
  /** The wording that supports it, for evidence-linking back to source text. */
  evidence?: string;
  confidence: Confidence;
};

/** Richer safety state than the base `SafetyResult`: adds observable concern and support routing. */
export type SafetyState = {
  humorAllowed: boolean;
  seriousnessReason?: string;
  highStakes: boolean;
  /** The behaviour observed, described without diagnosing anyone. */
  observableConcern?: string;
  recommendedSupport?: string;
};

export type ExerciseId =
  | 'system_status'
  | 'incident_trace'
  | 'thought_detective'
  | 'logic_bug_scanner'
  | 'evidence_review'
  | 'balance_builder'
  | 'perspective_switch'
  | 'choice_paths'
  | 'tiny_step_plan'
  | 'assumption_audit'
  | 'repair_replay'
  | 'values_to_action';

/**
 * The adaptive router's output. `skippable` is `true` by design and not optional: the spec is
 * explicit that a recommended exercise is always skippable, so the type makes refusing impossible
 * to forget.
 */
export type ExerciseRecommendation = {
  needed: boolean;
  exerciseId?: ExerciseId;
  reason?: string;
  skippable: true;
};

/** What survived a rewrite, and what the rewrite must not have invented. */
export type MeaningPreservation = {
  preserved: string[];
  addedCommitments: string[];
  unsupportedClaims: string[];
  materialMeaningChanged: boolean;
};

/** A communication requirement checked against a draft. */
export type CommunicationTest = {
  requirement: string;
  passed: boolean;
  explanation: string;
};

/** What each side may have meant versus how it may have landed. */
export type IntentImpactPair = {
  intended?: string;
  mayHaveBeenHeardAs: string;
  confidence: Confidence;
};
