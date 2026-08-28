import { z } from 'zod';
import { interpretationSchema, proseSchema, safetyResultSchema } from './shared';

/**
 * Decode It response schema.
 *
 * `knownFacts` and `unknowns` are P0 elements in their own right (spec §10.1) — the whole point
 * of the mode is the evidence/inference/unknown split, so `unknowns` is required to be
 * non-empty. A decode that claims nothing is unknowable has failed the product rule.
 */
export const decodeResponseSchema = z.object({
  mode: z.literal('decode_it'),
  literalMeaning: proseSchema,
  likelyPurpose: z.array(interpretationSchema).min(1),
  knownFacts: z.array(proseSchema).min(1),
  interpretations: z.array(interpretationSchema).min(1),
  unknowns: z.array(proseSchema).min(1),
  toneCues: z.array(z.object({ cue: proseSchema, observation: proseSchema })),
  usefulResponseShouldInclude: z.array(proseSchema).min(1),
  clarificationQuestion: proseSchema,
  responseOptions: z
    .array(z.object({ id: proseSchema, label: proseSchema, message: proseSchema }))
    .length(3),
  safety: safetyResultSchema.optional(),
});

export type DecodeResponseParsed = z.infer<typeof decodeResponseSchema>;
