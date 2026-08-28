/**
 * Conflict Lens speaker parsing (spec §11.3 step 4).
 *
 * The user pastes a `Name: message` transcript. This module reads it, then the UI CONFIRMS the
 * result with the user before anything is analyzed — a wrong speaker assignment would put the
 * wrong words in the wrong person's mouth for the whole conflict map, so it is never guessed
 * silently.
 *
 * Deliberately tolerant: leading/trailing whitespace, the same speaker on consecutive lines,
 * continuation lines with no prefix, curly quotes, and em dashes all parse. Deliberately
 * suspicious of prose colons — "I said: whatever" must not become a speaker named "I said".
 *
 * More than two distinct speakers is reported, not resolved: multi-speaker mapping is P1
 * (spec §10.2), and spec §7 says ask rather than guess.
 */

import type { ConflictSpeaker } from '@/types/contracts';

export type ParsedLine = {
  speakerLabel: string;
  text: string;
  /** Position in the parsed sequence, ignoring blank lines. 0-based. */
  lineIndex: number;
};

export type ParseResult = {
  lines: ParsedLine[];
  /** Distinct speakers in first-appearance order, in their first-seen spelling. */
  speakerLabels: string[];
  /** Lines that had no "Name:" prefix and were attributed to the previous speaker. */
  unattributedCount: number;
  /** More than two distinct speakers, or none found. */
  problem: 'none' | 'no_speakers' | 'too_many_speakers';
};

/** A speaker label is a short prefix. Anything longer is prose that happens to contain a colon. */
const MAX_LABEL_LENGTH = 24;
/** "Alex", "Sam", "My manager" — a label is not a sentence, so it is not many words either. */
const MAX_LABEL_WORDS = 3;

/** Halfwidth and fullwidth colons both count as a speaker separator. */
const COLON_PATTERN = /[:：]/g;

/** Punctuation that means the prefix is prose, not a name. Curly quotes included. */
const PROSE_PUNCTUATION = /[!?;,"“”„‚'‘’(){}[\]—–]/u;

/** "Dr.", "Mr.", "Ms." — an abbreviation dot is allowed; a sentence-ending dot is not. */
const ABBREVIATION = /\p{Lu}\p{L}{0,3}\./gu;

/** Non-breaking and other exotic spaces, normalized so trimming and word splits behave. */
const EXOTIC_SPACE = /[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g;

function normalizeSpaces(value: string): string {
  return value.replace(EXOTIC_SPACE, ' ');
}

/**
 * Does this prefix look like someone's name rather than the start of a sentence?
 *
 * Single words are accepted broadly ("Alex", "Sam", "me"). Multi-word prefixes must read like a
 * name or title — every word capitalized — which is what rejects "I said" and "One thing".
 */
function isPlausibleLabel(label: string): boolean {
  if (label.length === 0 || label.length > MAX_LABEL_LENGTH) return false;
  if (PROSE_PUNCTUATION.test(label)) return false;
  // A dot survives only as an abbreviation dot.
  if (label.replace(ABBREVIATION, '').includes('.')) return false;
  if (!/[\p{L}\p{N}]/u.test(label)) return false;

  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_LABEL_WORDS) return false;
  if (words.length === 1) return true;

  return words.every((word) => /^[\p{Lu}\p{N}]/u.test(word));
}

type LabeledLine = { label: string; text: string };

/**
 * Split "Name: message" at the FIRST colon whose prefix is a plausible label, so that a colon
 * inside the message itself ("Alex: I said: whatever") does not move the split point.
 */
function splitLabeledLine(line: string): LabeledLine | null {
  COLON_PATTERN.lastIndex = 0;
  let match = COLON_PATTERN.exec(line);

  while (match !== null) {
    const label = line.slice(0, match.index).trim();
    if (isPlausibleLabel(label)) {
      return { label, text: line.slice(match.index + match[0].length).trim() };
    }
    match = COLON_PATTERN.exec(line);
  }

  return null;
}

export function parseConversation(raw: string): ParseResult {
  const lines: ParsedLine[] = [];
  const labelByKey = new Map<string, string>();
  /** Lines seen before any speaker label appeared; attributed to the first speaker found. */
  const orphanTexts: string[] = [];

  let currentLabel: string | null = null;
  let unattributedCount = 0;

  for (const rawLine of normalizeSpaces(raw).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const labeled = splitLabeledLine(line);

    if (labeled !== null) {
      const key = labeled.label.toLocaleLowerCase();
      if (!labelByKey.has(key)) labelByKey.set(key, labeled.label);
      // Reuse the first-seen spelling so "alex" and "Alex" are one speaker.
      const label = labelByKey.get(key) ?? labeled.label;
      currentLabel = label;

      // Anything before the first labeled line belongs to that speaker as far as we can tell.
      for (const orphan of orphanTexts) {
        lines.push({ speakerLabel: label, text: orphan, lineIndex: lines.length });
        unattributedCount += 1;
      }
      orphanTexts.length = 0;

      // "Alex:" with nothing after it sets the speaker without contributing a line.
      if (labeled.text.length > 0) {
        lines.push({ speakerLabel: label, text: labeled.text, lineIndex: lines.length });
      }
      continue;
    }

    if (currentLabel === null) {
      orphanTexts.push(line);
      continue;
    }

    // Continuation of the previous speaker's turn.
    lines.push({ speakerLabel: currentLabel, text: line, lineIndex: lines.length });
    unattributedCount += 1;
  }

  // Never a speaker to attribute them to: keep the text visible, label it as unknown.
  for (const orphan of orphanTexts) {
    lines.push({ speakerLabel: '', text: orphan, lineIndex: lines.length });
    unattributedCount += 1;
  }

  const speakerLabels = [...labelByKey.values()];
  const problem: ParseResult['problem'] =
    speakerLabels.length === 0
      ? 'no_speakers'
      : speakerLabels.length > 2
        ? 'too_many_speakers'
        : 'none';

  return { lines, speakerLabels, unattributedCount, problem };
}

function slugify(label: string, fallbackIndex: number): string {
  const slug = label
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? slug : `speaker-${fallbackIndex + 1}`;
}

/**
 * Build the request's `speakers[]` — the join table the response's `speakerId`s point at
 * (see src/schemas/conflictLens.ts). Ids are unique even if two labels slug identically.
 */
export function speakersFromParse(
  parse: ParseResult,
  userLabel: string | null,
  roles: { self: string; other: string },
): ConflictSpeaker[] {
  const userKey = userLabel === null ? null : userLabel.toLocaleLowerCase();
  const usedIds = new Set<string>();

  return parse.speakerLabels.map((label, index) => {
    const base = slugify(label, index);
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const isUser = userKey !== null && label.toLocaleLowerCase() === userKey;

    return { id, label, role: isUser ? roles.self : roles.other, isUser };
  });
}
