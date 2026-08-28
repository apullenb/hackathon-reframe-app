/**
 * Prompt registry. One template per mode (spec §18) — there is deliberately no single
 * "do everything" prompt.
 */

import type { ContextSwitchRequest } from '@/types/contracts';
import { buildSayItBetterPrompt } from './sayItBetter';
import { buildDecodePrompt } from './decode';
import { buildConflictLensPrompt } from './conflictLens';

export interface PromptPair {
  system: string;
  user: string;
}

export { buildSayItBetterPrompt } from './sayItBetter';
export { buildDecodePrompt } from './decode';
export { buildConflictLensPrompt } from './conflictLens';
export * from './shared';

/** Renders the prompt pair for any request. The client layer never builds prompt text itself. */
export function buildPrompt(request: ContextSwitchRequest): PromptPair {
  switch (request.mode) {
    case 'say_it_better':
      return buildSayItBetterPrompt(request);
    case 'decode_it':
      return buildDecodePrompt(request);
    case 'conflict_lens':
      return buildConflictLensPrompt(request);
  }
}

/**
 * Second-attempt prompt used when the first response failed the Zod gate (spec §25).
 *
 * The issue strings come from validateResponse() and contain only `path: message` pairs — no
 * model output, no user content — so they are safe to send back and safe to log.
 */
export function buildRepairPrompt(original: PromptPair, issues: string[]): PromptPair {
  return {
    system: original.system,
    user: `${original.user}

YOUR PREVIOUS RESPONSE FAILED VALIDATION
It did not match the required JSON shape. The validator reported these issues:
${issues.map((issue) => `- ${issue}`).join('\n')}

Return the corrected JSON object only. Same task, same content where it was already correct. Fix exactly those fields, keep every required field present and non-empty, respect the enum values and the array-length requirements above, and emit no prose and no code fence.`,
  };
}

export { buildScreenshotExtractionPrompt } from './screenshot';
