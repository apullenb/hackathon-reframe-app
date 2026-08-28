import type { CommunicationContext, ConflictSpeaker } from '@/types/contracts';
import { conflictFirstReadSchema, type ConflictFirstRead } from '@/schemas/conflictFirstRead';
import { extractJsonObject } from './ProxyAiClient';
import { PROXY_ENDPOINT } from './types';

/**
 * A fast, best-effort first pass, run alongside the full conflict analysis.
 *
 * Best-effort is the important part: this never throws, never blocks, and never shows an error.
 * If it fails or is slow, the user simply sees the normal wait — nothing is worse than it was.
 * It exists purely so the screen has something honest on it within a second or two.
 */
export async function runConflictFirstRead(
  conversation: string,
  speakers: ConflictSpeaker[],
  context: Partial<CommunicationContext>,
  signal?: AbortSignal,
): Promise<ConflictFirstRead | null> {
  const names = speakers.map((s) => s.label).join(' and ') || 'the two people';

  const system = `You read a disagreement and report only what is visible in it. Two rules override everything else:
1. Never take a side, never say who is right, never diagnose anyone.
2. Describe what each person SEEMS to be saying, in their own terms. Do not claim to know motives.

Return ONLY this JSON object, no prose and no code fence:

{
  "neutralSummary": "one or two sentences on what happened, taking no side",
  "sides": [
    { "who": "name", "seemsToBeSaying": "one sentence in their terms" },
    { "who": "name", "seemsToBeSaying": "one sentence in their terms" }
  ],
  "likelyAbout": "one sentence on what the disagreement appears to actually be about, beneath the surface topic"
}

Exactly two entries in "sides". Keep every field short.`;

  const user = `The people are ${names}. Their relationship: ${context.relationship ?? 'not stated'}.

Conversation or description:
${conversation}

Return the JSON object described above and nothing else.`;

  try {
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      // Small ceiling keeps this genuinely fast — it is a preview, not the analysis.
      body: JSON.stringify({ system, user, maxTokens: 500 }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { text?: unknown };
    if (typeof payload.text !== 'string') return null;
    const raw = extractJsonObject(payload.text);
    if (!raw) return null;
    const parsed = conflictFirstReadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // Includes abort. Silence is correct: the full analysis is still running.
    return null;
  }
}
