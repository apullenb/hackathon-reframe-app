import { z } from 'zod';
import { proseSchema } from './shared';

/**
 * Screenshot extraction (spec §19).
 *
 * Deliberately NOT part of the `ContextSwitchResponse` union: this is a pre-processing step that
 * produces text for the user to correct, not an analysis. Keeping it out of the union means the
 * three mode contracts from spec §17 stay exactly as transcribed.
 */
export const screenshotExtractionSchema = z.object({
  /** The conversation as `Name: message` lines — the form `parseConversation` already handles. */
  transcript: proseSchema,
  /** Distinct speaker labels the model believes it saw, in first-appearance order. */
  speakers: z.array(proseSchema),
  /** How sure the model is that it read the image correctly. Shown to the user. */
  confidence: z.enum(['high', 'medium', 'low']),
  /** Anything the user should check — cut-off text, ambiguous attribution, more than two people. */
  caveats: z.array(proseSchema),
});

export type ScreenshotExtraction = z.infer<typeof screenshotExtractionSchema>;
