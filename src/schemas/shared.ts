import { z } from 'zod';

/** Non-empty, trimmed prose. Rejects the whitespace-only strings models sometimes emit. */
export const proseSchema = z.string().trim().min(1);

export const supportLevelSchema = z.enum(['strongly_supported', 'plausible', 'speculative']);

export const interpretationSchema = z.object({
  text: proseSchema,
  support: supportLevelSchema,
  evidence: proseSchema.optional(),
});

export const safetyCategorySchema = z.enum([
  'none',
  'high_stakes_professional',
  'threat_or_intimidation',
  'possible_abuse_or_coercion',
  'self_harm_or_immediate_danger',
  'illegal_or_deceptive_request',
]);

export const safetyResultSchema = z.object({
  category: safetyCategorySchema,
  userMessage: proseSchema.optional(),
  allowStandardOutput: z.boolean(),
});

export const followUpQuestionSchema = z.object({
  id: proseSchema,
  question: proseSchema,
  reason: proseSchema,
  required: z.boolean(),
  options: z.array(z.object({ id: proseSchema, label: proseSchema })).optional(),
});

export const communicationContextSchema = z.object({
  selfRole: proseSchema,
  otherRole: proseSchema,
  relationship: proseSchema,
  channel: proseSchema,
  desiredOutcome: proseSchema.optional(),
  desiredTone: proseSchema.optional(),
  urgency: z.enum(['low', 'normal', 'high']).optional(),
  relationshipTemperature: z.enum(['calm', 'tense', 'escalating']).optional(),
  lengthPreference: z.enum(['short', 'medium', 'detailed']).optional(),
  humorLevel: z.enum(['off', 'subtle', 'unfiltered']).optional(),
  reduceJargon: z.boolean().optional(),
});
