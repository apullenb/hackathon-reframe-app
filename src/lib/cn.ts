/**
 * Join conditional class names, resolving background-COLOR conflicts so the last one wins.
 *
 * Why this exists: `cn` used to be a plain string joiner, which meant a caller's `className`
 * did not reliably beat a component's own base class — Tailwind emits color utilities in
 * *alphabetical* order, so `bg-amber-soft` loses to `bg-surface` purely because "amber" sorts
 * before "surface". That produced three separate silent regressions in this codebase: a
 * "still missing" card, two confidence badges, and the "cannot know" card all rendered plain
 * white while their source clearly asked for a tint. Nothing errors; the colour just vanishes.
 *
 * The scope is deliberately narrow. Only background-colour utilities are de-duplicated, and
 * only within the same variant prefix, so `hover:bg-x` never collapses with `bg-y`. Background
 * *image* tokens (gradients, washes, the sheen) are excluded because they set a different CSS
 * property and legitimately coexist with a colour — `bg-surface bg-wash-panel` is intentional.
 *
 * This is not a general-purpose `tailwind-merge`. Other conflicting groups (padding, text
 * colour, border colour) still resolve by source order. Widening it would mean taking on a
 * dependency; keeping it narrow fixes the class of bug that actually occurred here.
 */

/** Tokens under `backgroundImage` in tailwind.config.ts — these are not background colours. */
const BG_IMAGE_TOKENS = new Set([
  'wash-hero',
  'wash-panel',
  'grad-primary',
  'grad-accent',
  'grad-ink',
  'grad-coral',
  'grad-teal',
  'sheen',
]);

/** Non-colour `bg-*` utilities: attachment, position, size, repeat, clip, origin, blend. */
const BG_NON_COLOR =
  /^(clip-|origin-|blend-|gradient-to|none$|fixed$|local$|scroll$|repeat|no-repeat$|center$|top$|bottom$|left$|right$|cover$|contain$|auto$)/;

/**
 * A grouping key for background-colour utilities, or null if the class is not one.
 * The key includes the variant prefix so only like-for-like collapses.
 */
function backgroundColorKey(token: string): string | null {
  const match = token.match(/^((?:[\w[\]&_.>:-]+:)*)(!?)bg-(.+)$/);
  if (!match) return null;
  const [, variants, , value] = match;
  if (value.startsWith('[')) return null; // arbitrary value — leave alone
  if (BG_NON_COLOR.test(value)) return null;
  if (BG_IMAGE_TOKENS.has(value.split('/')[0])) return null;
  return `${variants}bg`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  const tokens = parts.filter(Boolean).join(' ').split(/\s+/).filter(Boolean);

  // Find the final occurrence per background-colour group; drop the earlier ones.
  const lastIndexForKey = new Map<string, number>();
  tokens.forEach((token, index) => {
    const key = backgroundColorKey(token);
    if (key) lastIndexForKey.set(key, index);
  });

  return tokens
    .filter((token, index) => {
      const key = backgroundColorKey(token);
      return !key || lastIndexForKey.get(key) === index;
    })
    .join(' ');
}
