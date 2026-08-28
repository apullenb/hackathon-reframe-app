import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * A brief bubble burst marking the moment a result is ready.
 *
 * Why it is allowed to be decorative: it fires at a state change the user is waiting for, so it
 * carries information ("this is done") even though it is playful. Spec §14 draws the line at
 * motion that slows the demo, so this is deliberately short and cannot delay anything — it is
 * `pointer-events-none`, sits behind content, and unmounts itself.
 *
 * Three guarantees:
 *   1. Nothing renders at all under `prefers-reduced-motion: reduce`. Checked in JS rather than
 *      relying on the global CSS block, which would only shorten the animation to nothing and
 *      leave the elements in the tree for no reason.
 *   2. `aria-hidden` — the result already announces itself through the live region, and a burst of
 *      empty spans is noise to a screen reader.
 *   3. It self-removes after the burst, so there is no lingering stack of absolutely positioned
 *      elements over the result.
 */

/**
 * Fixed bubble paths. Deliberately not random: a stable burst is reproducible in a screenshot
 * test and looks composed rather than scattered.
 * `left` is a percentage, `size` px, `drift`/`rise` px, `delay` ms.
 */
const BUBBLES = [
  { left: 8, size: 10, drift: 14, rise: -132, delay: 0, tone: 'primary' },
  { left: 19, size: 18, drift: -10, rise: -168, delay: 90, tone: 'accent' },
  { left: 31, size: 7, drift: 8, rise: -112, delay: 40, tone: 'teal' },
  { left: 43, size: 22, drift: 16, rise: -186, delay: 150, tone: 'primary' },
  { left: 54, size: 12, drift: -14, rise: -144, delay: 60, tone: 'secondary' },
  { left: 66, size: 9, drift: 10, rise: -120, delay: 200, tone: 'accent' },
  { left: 77, size: 16, drift: -8, rise: -160, delay: 110, tone: 'teal' },
  { left: 88, size: 11, drift: 12, rise: -138, delay: 30, tone: 'primary' },
  { left: 95, size: 8, drift: -12, rise: -108, delay: 170, tone: 'secondary' },
] as const;

const TONE_CLASSES: Record<string, string> = {
  primary: 'bg-primary/25 ring-primary/30',
  secondary: 'bg-secondary/25 ring-secondary/30',
  accent: 'bg-accent/40 ring-accent-ink/20',
  teal: 'bg-teal/25 ring-teal/30',
};

/** Longest delay plus the animation duration, with a little slack. */
const TEARDOWN_MS = 1600;

type ResultReadyBubblesProps = {
  /**
   * Changing this value replays the burst. Pass something that changes once per result — a
   * counter, or the result's identity — rather than a boolean, so a re-render cannot retrigger it.
   */
  trigger: number | string;
  className?: string;
};

export function ResultReadyBubbles({ trigger, className }: ResultReadyBubblesProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Respect the user's motion preference by not rendering anything at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), TEARDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [trigger]);

  if (!playing) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-0 block h-0 overflow-visible',
        className,
      )}
    >
      {BUBBLES.map((bubble, index) => (
        <span
          key={`${String(trigger)}-${index}`}
          className={cn(
            'absolute bottom-0 block rounded-full ring-1 backdrop-blur-[1px]',
            TONE_CLASSES[bubble.tone] ?? TONE_CLASSES.primary,
            'motion-safe:animate-bubble-rise',
          )}
          style={{
            left: `${bubble.left}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            animationDelay: `${bubble.delay}ms`,
            // Consumed by the bubble-rise keyframe so one keyframe drives varied paths.
            ['--bubble-drift' as string]: `${bubble.drift}px`,
            ['--bubble-rise' as string]: `${bubble.rise}px`,
          }}
        />
      ))}
    </span>
  );
}
