import { z } from 'zod';
import {
  followUpQuestionSchema,
  proseSchema,
  safetyResultSchema,
} from './shared';

/**
 * Say It Better response schema.
 *
 * DELIBERATELY STRICTER THAN THE TYPE (spec §17 gap, recorded as D-004): every result field is
 * optional in the contract, so `{mode, needsFollowUp: false, followUpQuestions: []}` satisfies
 * the type and renders an empty result screen. The refinements below make the two states
 * mutually exclusive and complete:
 *   needsFollowUp === true  → at least one question, and no sendable message yet
 *   needsFollowUp === false → a sendable message is required
 */
export const sayItBetterResponseSchema = z
  .object({
    mode: z.literal('say_it_better'),
    needsFollowUp: z.boolean(),
    followUpQuestions: z.array(followUpQuestionSchema),
    unfilteredTranslation: proseSchema.optional(),
    sendableMessage: proseSchema.optional(),
    alternatives: z
      .array(
        z.object({
          id: proseSchema,
          label: proseSchema,
          tone: proseSchema,
          message: proseSchema,
        }),
      )
      .optional(),
    howItMayLand: z
      .array(
        z.object({
          label: proseSchema,
          sentiment: z.enum(['positive', 'neutral', 'caution']),
        }),
      )
      .optional(),
    changesMade: z.array(proseSchema).optional(),
    missingInformation: z.array(proseSchema).optional(),
    honestyCheck: z
      .object({ passed: z.boolean(), concerns: z.array(proseSchema) })
      .optional(),
    safety: safetyResultSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.needsFollowUp) {
      if (value.followUpQuestions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['followUpQuestions'],
          message: 'needsFollowUp is true but no questions were returned.',
        });
      }
      return;
    }
    if (!value.sendableMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sendableMessage'],
        message: 'needsFollowUp is false, so a sendableMessage is required.',
      });
    }
  });

export type SayItBetterResponseParsed = z.infer<typeof sayItBetterResponseSchema>;
