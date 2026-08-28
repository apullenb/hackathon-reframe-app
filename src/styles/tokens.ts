/**
 * Non-visual design constants.
 *
 * Colours, typefaces, radii, shadows, and gradients are NOT here — they live in
 * `src/styles/themes.css` as CSS custom properties, because they change per theme. This file
 * holds only values that are the same whatever the theme looks like.
 */

/**
 * Support-level presentation. Never colour alone: each level carries a distinct icon and a text
 * label, and `ConfidenceBadge` additionally varies the border style. Wording lives here so it is
 * written once.
 */
export const supportLevels = {
  strongly_supported: { label: 'Strongly supported', icon: 'CheckCircle2' },
  plausible: { label: 'Plausible', icon: 'CircleDashed' },
  speculative: { label: 'Speculative', icon: 'HelpCircle' },
} as const;
