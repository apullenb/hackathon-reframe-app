import type { ContextSwitchMode } from '@/types/contracts';

/**
 * Staged status text (spec §11.1, §25). A bare spinner with no explanation is explicitly
 * disallowed, so every mode names what it is doing at each step.
 */
export const LOADING_STAGES: Record<ContextSwitchMode, readonly string[]> = {
  say_it_better: [
    'Understanding the role pair',
    'Checking for missing facts',
    'Preserving your intent',
    'Shaping the message for the recipient',
  ],
  decode_it: [
    'Reading the situation',
    'Separating facts from assumptions',
    'Marking what cannot be known',
    'Drafting response options',
  ],
  conflict_lens: [
    'Parsing both speakers',
    'Separating stated positions from inferences',
    'Tracing the escalation sequence',
    'Finding the core unresolved problem',
  ],
} as const;

/** How long each stage is shown before advancing. Tuned so the sequence reads, not flickers. */
export const STAGE_DURATION_MS = 620;
