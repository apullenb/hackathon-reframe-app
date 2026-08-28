import { z } from 'zod';
import type { ContextSwitchMode, ContextSwitchResponse } from '@/types/contracts';
import { sayItBetterResponseSchema } from './sayItBetter';
import { decodeResponseSchema } from './decode';
import { conflictLensResponseSchema } from './conflictLens';

export * from './shared';
export { sayItBetterResponseSchema } from './sayItBetter';
export { decodeResponseSchema } from './decode';
export { conflictLensResponseSchema } from './conflictLens';

/** Discriminated union of every response shape. */
export const contextSwitchResponseSchema = z.discriminatedUnion('mode', [
  // superRefine keeps sayItBetterResponseSchema a ZodEffects, so unwrap for the union.
  sayItBetterResponseSchema.innerType(),
  decodeResponseSchema,
  conflictLensResponseSchema,
]);

const byMode = {
  say_it_better: sayItBetterResponseSchema,
  decode_it: decodeResponseSchema,
  conflict_lens: conflictLensResponseSchema,
} as const;

export function schemaForMode(mode: ContextSwitchMode) {
  return byMode[mode];
}

export type ValidationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; issues: string[] };

/**
 * The single validation gate. Every live response AND every fixture goes through here — a
 * fixture that bypassed validation would hide exactly the bug this catches.
 *
 * Returned issues are `path: message` strings only. Model output is never included, so an
 * issue list is always safe to log or show in a dev panel.
 */
export function validateResponse(
  mode: ContextSwitchMode,
  candidate: unknown,
): ValidationOutcome<ContextSwitchResponse> {
  const result = schemaForMode(mode).safeParse(candidate);
  if (result.success) {
    return { ok: true, value: result.data as ContextSwitchResponse };
  }
  return {
    ok: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    ),
  };
}
