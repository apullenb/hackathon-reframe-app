import type { PromptPair } from './index';

/**
 * Transcription only — no analysis, no interpretation.
 *
 * The extraction step must not start doing Conflict Lens's job. Its single output is text the
 * user can read, correct, and confirm before any analysis happens (spec §19 steps 4–6). It is
 * also instructed to admit when it cannot read something rather than filling the gap, which is
 * the same honesty rule the rest of the product runs on.
 */
export function buildScreenshotExtractionPrompt(): PromptPair {
  const system = `You transcribe conversation screenshots. You do not interpret them.

Rules:
1. Transcribe only what is legibly visible. Never guess at text you cannot read, and never invent
   a message, a name, or a line that is not in the image.
2. Output the conversation as one line per message in the form "Name: message", in the order the
   messages appear, oldest first.
3. If a sender's name is not shown, use a stable neutral label such as "Left" and "Right" (for a
   chat bubble layout) or "Speaker 1" and "Speaker 2". Do not invent a real-sounding name.
4. Omit interface furniture: timestamps, read receipts, reaction counts, typing indicators,
   battery and signal icons, "Delivered", and date separators.
5. If part of a message is cut off at the edge of the image, transcribe what is visible and record
   a caveat. Do not complete the sentence yourself.
6. Do not analyse, summarise, judge, or take a side. Transcription only.
7. Set confidence honestly: "high" only when the whole conversation is clearly legible; "low" when
   significant parts are unclear.
8. Record a caveat if you see more than two distinct speakers, since the next step handles
   two-person conversations.

Return ONLY this JSON object, with no prose and no code fence:

{
  "transcript": "Alex: I asked you twice if you could take care of the kitchen.\\nSam: I said I would do it.",
  "speakers": ["Alex", "Sam"],
  "confidence": "high",
  "caveats": []
}`;

  const user = `Transcribe the conversation in this image as "Name: message" lines, oldest first.
Return the JSON object described above and nothing else.`;

  return { system, user };
}
