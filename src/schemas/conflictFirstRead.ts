import { z } from 'zod';
import { proseSchema } from './shared';

/**
 * A deliberately small first pass over a conflict.
 *
 * The full analysis is the largest response the app produces and takes several seconds. This
 * asks for only the two things a person wants first — what each side seems to be saying, and what
 * it is probably actually about — so something true and useful is on screen while the rest
 * finishes. It is a preview, never a replacement: the full result supersedes it.
 */
export const conflictFirstReadSchema = z.object({
  neutralSummary: proseSchema,
  sides: z
    .array(z.object({ who: proseSchema, seemsToBeSaying: proseSchema }))
    .length(2),
  likelyAbout: proseSchema,
});

export type ConflictFirstRead = z.infer<typeof conflictFirstReadSchema>;
