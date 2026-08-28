/**
 * Context vocabulary — spec §6, transcribed.
 *
 * Every option is `{ id, label }`: `id` is a stable snake_case key (safe for React keys,
 * fixtures, and analytics-free state), `label` is the human string the spec writes and the
 * string that gets sent to the model. The model request carries LABELS, not ids — a
 * `CommunicationContext` field like `selfRole` is prose in the contract (see
 * `src/schemas/shared.ts`), so the UI resolves an id to its label before building a request.
 *
 * The four enum-valued groups (urgency, relationship temperature, length, humor) pin their
 * `id` to the literal unions in `src/types/contracts.ts` via `satisfies`, so a typo or a
 * drifted union is a compile error rather than a runtime validation failure.
 */

import type { CommunicationContext } from '@/types/contracts';

/* ── Base shapes ─────────────────────────────────────────────────────────── */

export type VocabularyOption = {
  readonly id: string;
  readonly label: string;
};

/** An option whose id is constrained to a literal union from the contract. */
export type EnumOption<TId extends string> = {
  readonly id: TId;
  readonly label: string;
};

export type RoleOption = VocabularyOption;

/** Resolves to `never` only when every member of `TUnion` has an option. */
type AssertNever<T extends never> = T;

/* ── Roles ───────────────────────────────────────────────────────────────── */

export const WORK_ROLES = [
  { id: 'engineer', label: 'Engineer' },
  { id: 'product_manager', label: 'Product manager' },
  { id: 'designer', label: 'Designer' },
  { id: 'manager', label: 'Manager' },
  { id: 'direct_report', label: 'Direct report' },
  { id: 'coworker', label: 'Coworker' },
  { id: 'executive', label: 'Executive' },
  { id: 'client', label: 'Client' },
  { id: 'customer', label: 'Customer' },
  { id: 'hr_representative', label: 'HR representative' },
] as const satisfies readonly RoleOption[];

export const PERSONAL_ROLES = [
  { id: 'spouse_partner', label: 'Spouse/partner' },
  { id: 'friend', label: 'Friend' },
  { id: 'parent', label: 'Parent' },
  { id: 'teenager', label: 'Teenager' },
  { id: 'adult_child', label: 'Adult child' },
  { id: 'roommate', label: 'Roommate' },
  { id: 'neighbor', label: 'Neighbor' },
  { id: 'teacher', label: 'Teacher' },
] as const satisfies readonly RoleOption[];

/**
 * Free-form role. A user-supplied custom label is P1 (spec §10.2); the option exists now so
 * the select is complete and the P1 change is additive.
 */
export const OTHER_ROLE = { id: 'other', label: 'Other' } as const satisfies RoleOption;

export const ROLE_GROUPS: Array<{ group: string; options: RoleOption[] }> = [
  { group: 'Work', options: [...WORK_ROLES] },
  { group: 'Personal', options: [...PERSONAL_ROLES] },
  { group: 'Other', options: [OTHER_ROLE] },
];

/** Flat list in group order — the lookup source for {@link labelForRole}. */
export const ALL_ROLES: readonly RoleOption[] = [
  ...WORK_ROLES,
  ...PERSONAL_ROLES,
  OTHER_ROLE,
];

export type WorkRoleId = (typeof WORK_ROLES)[number]['id'];
export type PersonalRoleId = (typeof PERSONAL_ROLES)[number]['id'];
export type RoleId = WorkRoleId | PersonalRoleId | typeof OTHER_ROLE.id;

/**
 * Human label for a role id. Falls back to the id itself so an unknown or custom role (P1)
 * degrades to something displayable instead of blanking the field.
 */
export function labelForRole(id: string): string {
  return ALL_ROLES.find((role) => role.id === id)?.label ?? id;
}

/* ── Relationship types ──────────────────────────────────────────────────── */

export const RELATIONSHIPS = [
  { id: 'professional_peer', label: 'Professional peer' },
  { id: 'reporting_relationship', label: 'Reporting relationship' },
  { id: 'cross_functional_teammate', label: 'Cross-functional teammate' },
  { id: 'client_service_relationship', label: 'Client/service relationship' },
  { id: 'close_personal_relationship', label: 'Close personal relationship' },
  { id: 'family_relationship', label: 'Family relationship' },
  { id: 'casual_relationship', label: 'Casual relationship' },
  { id: 'community_relationship', label: 'Community relationship' },
] as const satisfies readonly VocabularyOption[];

export type RelationshipId = (typeof RELATIONSHIPS)[number]['id'];

/* ── Channels ────────────────────────────────────────────────────────────── */

export const CHANNELS = [
  { id: 'slack_or_teams', label: 'Slack or Teams' },
  { id: 'email', label: 'Email' },
  { id: 'text_message', label: 'Text message' },
  { id: 'performance_review', label: 'Performance review' },
  { id: 'meeting_follow_up', label: 'Meeting follow-up' },
  { id: 'in_person_conversation_preparation', label: 'In-person conversation preparation' },
] as const satisfies readonly VocabularyOption[];

export type ChannelId = (typeof CHANNELS)[number]['id'];

/* ── Desired outcomes ────────────────────────────────────────────────────── */

export const DESIRED_OUTCOMES = [
  { id: 'give_a_status_update', label: 'Give a status update' },
  { id: 'ask_for_clarification', label: 'Ask for clarification' },
  { id: 'ask_for_help', label: 'Ask for help' },
  { id: 'disagree', label: 'Disagree' },
  { id: 'say_no', label: 'Say no' },
  { id: 'set_a_boundary', label: 'Set a boundary' },
  { id: 'apologize', label: 'Apologize' },
  { id: 'repair_a_misunderstanding', label: 'Repair a misunderstanding' },
  { id: 'request_accountability', label: 'Request accountability' },
  { id: 'de_escalate', label: 'De-escalate' },
  { id: 'give_feedback', label: 'Give feedback' },
  { id: 'respond_to_criticism', label: 'Respond to criticism' },
] as const satisfies readonly VocabularyOption[];

export type DesiredOutcomeId = (typeof DESIRED_OUTCOMES)[number]['id'];

/* ── Tone choices ────────────────────────────────────────────────────────── */

export const TONES = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'warm_and_collaborative', label: 'Warm and collaborative' },
  { id: 'concise_and_direct', label: 'Concise and direct' },
  { id: 'diplomatic', label: 'Diplomatic' },
  { id: 'firm_but_respectful', label: 'Firm but respectful' },
  { id: 'accountable', label: 'Accountable' },
  { id: 'casual', label: 'Casual' },
  { id: 'executive_ready', label: 'Executive-ready' },
] as const satisfies readonly VocabularyOption[];

export type ToneId = (typeof TONES)[number]['id'];

/* ── Optional controls ───────────────────────────────────────────────────── */

/** `'low' | 'normal' | 'high'` */
export type UrgencyId = CommunicationContext['urgency'] & string;
/** `'calm' | 'tense' | 'escalating'` */
export type RelationshipTemperatureId = CommunicationContext['relationshipTemperature'] & string;
/** `'short' | 'medium' | 'detailed'` */
export type LengthPreferenceId = CommunicationContext['lengthPreference'] & string;
/** `'off' | 'subtle' | 'unfiltered'` */
export type HumorLevelId = CommunicationContext['humorLevel'] & string;

export const URGENCY_LEVELS = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
] as const satisfies readonly EnumOption<UrgencyId>[];

export const RELATIONSHIP_TEMPERATURES = [
  { id: 'calm', label: 'Calm' },
  { id: 'tense', label: 'Tense' },
  { id: 'escalating', label: 'Already escalating' },
] as const satisfies readonly EnumOption<RelationshipTemperatureId>[];

export const LENGTH_PREFERENCES = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'detailed', label: 'Detailed' },
] as const satisfies readonly EnumOption<LengthPreferenceId>[];

export const HUMOR_LEVELS = [
  { id: 'off', label: 'Off' },
  { id: 'subtle', label: 'Subtle' },
  { id: 'unfiltered', label: 'Fully unfiltered internal translation' },
] as const satisfies readonly EnumOption<HumorLevelId>[];

/**
 * Corporate jargon — spec §6 offers three settings (allow / reduce / remove) but the contract
 * carries a single `reduceJargon?: boolean`. `reduceJargon` on each option is the boolean the
 * request actually sends, so the three-way control stays faithful to the spec's wording
 * without inventing a contract field.
 */
export const JARGON_LEVELS = [
  { id: 'allow', label: 'Allow', reduceJargon: false },
  { id: 'reduce', label: 'Reduce', reduceJargon: true },
  { id: 'remove', label: 'Remove', reduceJargon: true },
] as const satisfies readonly (VocabularyOption & { readonly reduceJargon: boolean })[];

export type JargonLevelId = (typeof JARGON_LEVELS)[number]['id'];

/* ── Compile-time completeness checks ────────────────────────────────────── */

/** Each of these is `never` only while its option list covers the whole contract union. */
export type UrgencyCoverage = AssertNever<
  Exclude<UrgencyId, (typeof URGENCY_LEVELS)[number]['id']>
>;
export type RelationshipTemperatureCoverage = AssertNever<
  Exclude<RelationshipTemperatureId, (typeof RELATIONSHIP_TEMPERATURES)[number]['id']>
>;
export type LengthPreferenceCoverage = AssertNever<
  Exclude<LengthPreferenceId, (typeof LENGTH_PREFERENCES)[number]['id']>
>;
export type HumorLevelCoverage = AssertNever<
  Exclude<HumorLevelId, (typeof HUMOR_LEVELS)[number]['id']>
>;
