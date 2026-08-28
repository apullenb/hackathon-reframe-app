import { z } from 'zod';
import { interpretationSchema, proseSchema, safetyResultSchema } from './shared';

/**
 * Conflict Lens response schema.
 *
 * `participants[].speakerId` must match an id from the request's `speakers[]` — the response
 * carries no names, so the UI joins on this id (spec §17 gap, recorded as D-005). Exactly two
 * participants for this build; multi-speaker support is P1.
 */
export const conflictLensResponseSchema = z.object({
  mode: z.literal('conflict_lens'),
  neutralSummary: proseSchema,
  participants: z
    .array(
      z.object({
        speakerId: proseSchema,
        statedPosition: z.array(proseSchema).min(1),
        possibleConcerns: z.array(interpretationSchema).min(1),
        whatTheyMayBeTryingToSay: proseSchema,
        whatTheOtherPersonMayHear: proseSchema,
      }),
    )
    .length(2),
  sharedFacts: z.array(proseSchema),
  disputedOrUnclear: z.array(proseSchema),
  unansweredQuestions: z.array(proseSchema),
  escalationPoints: z.array(
    z.object({ excerpt: proseSchema, observation: proseSchema, effect: proseSchema }),
  ),
  coreProblem: proseSchema,
  sharedGoal: proseSchema.optional(),
  resolutionOptions: z
    .array(
      z.object({
        title: proseSchema,
        description: proseSchema,
        tradeoff: proseSchema.optional(),
      }),
    )
    .min(2)
    .max(4),
  suggestedConversationStructure: z.array(proseSchema).min(1),
  repairMessage: proseSchema,
  falseEquivalenceWarning: proseSchema.optional(),
  safety: safetyResultSchema.optional(),
});

export type ConflictLensResponseParsed = z.infer<typeof conflictLensResponseSchema>;
