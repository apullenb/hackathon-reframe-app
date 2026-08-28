/**
 * Theme switching.
 *
 * A theme is two things: a block of CSS custom properties in `themes.css`, and the webfonts it
 * needs. Setting `data-theme` on `<html>` swaps the properties; this module also swaps the font
 * `<link>` so a theme's typefaces arrive with it rather than needing a manual edit to index.html.
 *
 * To add a theme: add its block to `themes.css`, then add an entry to `THEMES` below.
 */

export type ThemeId =
  | 'console'
  | 'editorial'
  | 'fieldnotes'
  | 'swiss'
  | 'blueprint'
  | 'sunrise'
  | 'cobalt'
  | 'sage'
  | 'prism';

export type ThemeDefinition = {
  id: ThemeId;
  /** Shown in Settings. */
  label: string;
  /** One line on what the theme is going for. */
  description: string;
  /** `family=` segments for the Google Fonts css2 endpoint. */
  fontFamilies: readonly string[];
  /**
   * Whether this theme's colours have been contrast-audited. Only honest values here — an
   * unaudited theme is a draft, and the UI says so.
   */
  contrastAudited: boolean;
};

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: 'console',
    label: 'Console',
    description: 'Human Observability Console. Dark, precise, evidence-first.',
    fontFamilies: [
      'Space+Grotesk:wght@400..700',
      'Inter:wght@400..800',
      'JetBrains+Mono:wght@400..700',
    ],
    contrastAudited: true,
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Warm paper, display serif, indigo to violet.',
    fontFamilies: [
      'Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400..900,0..100,0..1;1,9..144,400..900,0..100,0..1',
      'Inter:wght@400..800',
      'JetBrains+Mono:wght@400..700',
    ],
    contrastAudited: true,
  },
  {
    id: 'fieldnotes',
    label: 'Field Notes',
    description: 'Analytical. One superfamily, navy on cool paper.',
    fontFamilies: [
      'IBM+Plex+Serif:wght@400;500;600;700',
      'IBM+Plex+Sans:wght@400;500;600;700',
      'IBM+Plex+Mono:wght@400;500;600',
    ],
    contrastAudited: true,
  },
  {
    id: 'swiss',
    label: 'Swiss',
    description: 'International style. Near-black on white, one hot red.',
    fontFamilies: ['Archivo:wght@400..700', 'Inter:wght@400..800', 'IBM+Plex+Mono:wght@400;500;600'],
    contrastAudited: true,
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Technical drafting. Monospace headlines on blue-white.',
    fontFamilies: ['IBM+Plex+Mono:wght@400;500;600;700', 'IBM+Plex+Sans:wght@400;500;600;700'],
    contrastAudited: true,
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    description: 'Warm and friendly. Peach ground, coral to amber, soft edges.',
    fontFamilies: ['Outfit:wght@400..700', 'DM+Sans:wght@400..700', 'IBM+Plex+Mono:wght@400;500;600'],
    contrastAudited: true,
  },
  {
    id: 'cobalt',
    label: 'Cobalt',
    description: 'Crisp cool near-white, deep cobalt blue, geometric grotesque.',
    fontFamilies: ['Space+Grotesk:wght@400..700', 'Inter:wght@400..800', 'JetBrains+Mono:wght@400..700'],
    contrastAudited: true,
  },
  {
    id: 'sage',
    label: 'Sage',
    description: 'Soft warm off-white, muted forest green with a clay secondary.',
    fontFamilies: ['Manrope:wght@400..800', 'IBM+Plex+Mono:wght@400;500;600'],
    contrastAudited: true,
  },
  {
    id: 'prism',
    label: 'Prism',
    description: 'Near-white and near-black, with one violet-to-cyan gradient.',
    fontFamilies: ['Plus+Jakarta+Sans:wght@400..800', 'IBM+Plex+Mono:wght@400;500;600'],
    contrastAudited: true,
  },
] as const;

export const DEFAULT_THEME: ThemeId = 'editorial';

const STORAGE_KEY = 'context-switch:theme';
const FONT_LINK_ID = 'cs-theme-fonts';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function themeById(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/**
 * Build the Google Fonts URL for a theme.
 *
 * Every declared variation axis needs a value in EVERY tuple. An incomplete tuple makes Google
 * return an HTML error page instead of CSS, which kills the whole stylesheet — including any
 * other families in the same request. That bug cost real time on this build; the family strings
 * in `THEMES` are written out in full for exactly that reason.
 */
export function fontUrlFor(id: ThemeId): string {
  const families = themeById(id)
    .fontFamilies.map((family) => `family=${family}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Read the stored preference. Theme is a UI preference, so sessionStorage is appropriate. */
export function storedTheme(): ThemeId | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return isThemeId(raw) ? raw : null;
  } catch {
    // Private-mode or blocked storage: fall back to the default rather than failing to boot.
    return null;
  }
}

/**
 * Apply a theme: stamp `data-theme`, ensure its fonts are loaded, and remember the choice.
 * Safe to call before React mounts.
 */
export function applyTheme(id: ThemeId): void {
  const theme = themeById(id);
  document.documentElement.setAttribute('data-theme', theme.id);

  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  const href = fontUrlFor(theme.id);
  if (link.href !== href) link.href = href;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, theme.id);
  } catch {
    // Not fatal — the theme still applies for this page view.
  }
}

/** Call once at startup. */
export function initTheme(): ThemeId {
  const id = storedTheme() ?? DEFAULT_THEME;
  applyTheme(id);
  return id;
}
