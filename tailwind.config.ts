import type { Config } from 'tailwindcss';

/**
 * Tailwind reads every visual value from a CSS custom property. The values themselves live in
 * `src/styles/themes.css` — this file only maps names onto them.
 *
 * Why colours are written as `rgb(var(--token) / <alpha-value>)`: it keeps Tailwind's opacity
 * modifiers working. There are ~165 of them in this codebase (`border-primary/25`,
 * `bg-surface/70`, …). If a token held a hex string instead of an `R G B` triplet, every one of
 * those would silently stop applying.
 *
 * Consequence worth knowing: switching themes is a runtime change, not a rebuild. Nothing here
 * is baked into the CSS at build time except the variable *names*.
 */

/** `rgb(var(--x) / <alpha-value>)`, so `bg-primary/30` still works. */
const themed = (token: string) => `rgb(var(--cs-${token}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: themed('paper'),
        'paper-sunk': themed('paper-sunk'),
        surface: themed('surface'),
        'surface-ink': themed('surface-ink'),
        ink: themed('ink'),
        'ink-muted': themed('ink-muted'),
        line: themed('line'),
        'line-strong': themed('line-strong'),
        primary: {
          DEFAULT: themed('primary'),
          hover: themed('primary-hover'),
          soft: themed('primary-soft'),
          ring: themed('primary-ring'),
        },
        secondary: {
          DEFAULT: themed('secondary'),
          soft: themed('secondary-soft'),
        },
        accent: {
          DEFAULT: themed('accent'),
          soft: themed('accent-soft'),
          ink: themed('accent-ink'),
        },
        coral: {
          DEFAULT: themed('coral'),
          soft: themed('coral-soft'),
          ink: themed('coral-ink'),
        },
        teal: {
          DEFAULT: themed('teal'),
          soft: themed('teal-soft'),
          ink: themed('teal-ink'),
        },
        amber: {
          DEFAULT: themed('amber'),
          soft: themed('amber-soft'),
          ink: themed('amber-ink'),
        },
        slate: {
          DEFAULT: themed('slate'),
          soft: themed('slate-soft'),
          ink: themed('slate-ink'),
        },
      },
      fontFamily: {
        display: ['var(--cs-font-display)'],
        sans: ['var(--cs-font-sans)'],
        mono: ['var(--cs-font-mono)'],
      },
      fontSize: {
        // Display scale, tuned for a large optical size.
        'display-sm': ['1.75rem', { lineHeight: '1.12', letterSpacing: '-0.021em' }],
        'display-md': ['2.375rem', { lineHeight: '1.06', letterSpacing: '-0.024em' }],
        'display-lg': ['3.25rem', { lineHeight: '1.02', letterSpacing: '-0.028em' }],
        'display-xl': ['4.25rem', { lineHeight: '0.98', letterSpacing: '-0.032em' }],
      },
      borderRadius: {
        card: 'var(--cs-radius-card)',
        'card-lg': 'var(--cs-radius-card-lg)',
        chip: '999px',
      },
      // A bare `border` follows the theme, so an outline-heavy theme can set 2.5px globally.
      borderWidth: {
        DEFAULT: 'var(--cs-border-w)',
      },
      boxShadow: {
        card: 'var(--cs-shadow-card)',
        lift: 'var(--cs-shadow-lift)',
        float: 'var(--cs-shadow-float)',
        'glow-primary': 'var(--cs-shadow-glow-primary)',
        'glow-accent': 'var(--cs-shadow-glow-accent)',
        'inner-top': 'var(--cs-shadow-inner-top)',
        focus: '0 0 0 3px rgb(var(--cs-primary-ring) / 0.42)',
      },
      backgroundImage: {
        'wash-hero': 'var(--cs-wash-hero)',
        'wash-panel': 'var(--cs-wash-panel)',
        'grad-primary': 'var(--cs-grad-primary)',
        'grad-accent': 'var(--cs-grad-accent)',
        'grad-ink': 'var(--cs-grad-ink)',
        'grad-coral': 'var(--cs-grad-coral)',
        'grad-teal': 'var(--cs-grad-teal)',
        sheen: 'var(--cs-sheen)',
      },
      spacing: { tap: '44px' },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        /** A pulse travelling along the role route, like a signal through a circuit. */
        'route-travel': {
          '0%': { left: '0%', opacity: '0' },
          '12%': { opacity: '1' },
          '88%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        'route-pulse': {
          '0%,100%': { opacity: '0.4', transform: 'translateX(0)' },
          '50%': { opacity: '1', transform: 'translateX(3px)' },
        },
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '60%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'land-glow': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--cs-primary-ring) / 0)' },
          '40%': { boxShadow: '0 0 0 10px rgb(var(--cs-primary-ring) / 0.2)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--cs-primary-ring) / 0)' },
        },
        'skeleton-sweep': {
          '0%': { backgroundPosition: '-160% 0' },
          '100%': { backgroundPosition: '260% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'sheen-sweep': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        /**
         * A bubble rising and popping. `--rise` and `--drift` are set per bubble so one keyframe
         * drives a whole burst with varied paths instead of needing a keyframe each.
         */
        'bubble-rise': {
          '0%': { transform: 'translate3d(0, 0, 0) scale(0.35)', opacity: '0' },
          '15%': { opacity: '1' },
          '65%': { opacity: '0.95' },
          '100%': {
            transform:
              'translate3d(var(--bubble-drift, 0px), var(--bubble-rise, -140px), 0) scale(1)',
            opacity: '0',
          },
        },
      },
      animation: {
        'route-travel': 'route-travel 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
        'route-pulse': 'route-pulse 1.1s ease-in-out infinite',
        'reveal-up': 'reveal-up 460ms cubic-bezier(0.22,1,0.36,1) both',
        'pop-in': 'pop-in 380ms cubic-bezier(0.34,1.56,0.64,1) both',
        'land-glow': 'land-glow 1100ms ease-out 1',
        'skeleton-sweep': 'skeleton-sweep 1.4s linear infinite',
        float: 'float 5s ease-in-out infinite',
        'sheen-sweep': 'sheen-sweep 2.4s ease-in-out infinite',
        'bubble-rise': 'bubble-rise 1250ms cubic-bezier(0.22, 0.8, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
