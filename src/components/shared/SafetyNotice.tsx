import { AlertTriangle, LifeBuoy, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SafetyCategory, SafetyResult } from '@/types/contracts';

/** Standing disclosure required by spec §20 — kept at readable size, never buried. */
const STANDING_LINE =
  'This is communication assistance, not legal, HR, medical, or crisis advice.';

type NoticeStyle = {
  tone: 'amber' | 'coral';
  icon: LucideIcon;
  heading: string;
  /** Used only when the model did not supply safety.userMessage. */
  fallbackMessage: string;
};

const styles: Record<Exclude<SafetyCategory, 'none'>, NoticeStyle> = {
  high_stakes_professional: {
    tone: 'amber',
    icon: Scale,
    heading: 'High-stakes professional message',
    fallbackMessage:
      'This situation may carry formal consequences. Reframe can help organize your wording, but it cannot tell you your rights or your employer’s policies.',
  },
  threat_or_intimidation: {
    tone: 'coral',
    icon: AlertTriangle,
    heading: 'Possible threat or intimidation',
    fallbackMessage:
      'This conversation contains language that reads as threatening. Please consider looping in a trusted person or the appropriate official channel before responding.',
  },
  possible_abuse_or_coercion: {
    tone: 'coral',
    icon: AlertTriangle,
    heading: 'This may not be an ordinary disagreement',
    fallbackMessage:
      'Some of this wording goes beyond a normal disagreement. If you feel pressured or unsafe, talking to someone you trust or a professional matters more than getting the wording right.',
  },
  self_harm_or_immediate_danger: {
    tone: 'coral',
    icon: LifeBuoy,
    heading: 'Please reach a person who can help',
    fallbackMessage:
      'This may involve someone’s immediate safety. Please contact emergency services or a crisis line in your area rather than handling this over message alone.',
  },
  illegal_or_deceptive_request: {
    tone: 'coral',
    icon: AlertTriangle,
    heading: 'Reframe cannot help with this',
    fallbackMessage:
      'This request appears to involve deception or illegal activity, which is outside what Reframe will help write.',
  },
};

/**
 * Serious, not shouty: a saturated spine down the leading edge, a solid tinted card, and the
 * standing disclosure in its own footer band rather than as fine print under the body.
 */
type NoticeChrome = { shell: string; rail: string; tile: string; footer: string };

const chrome: Record<'amber' | 'coral', NoticeChrome> = {
  amber: {
    shell: 'border-amber/45 bg-amber-soft',
    rail: 'bg-amber',
    tile: 'border-amber/35 bg-surface/80 text-amber-ink',
    footer: 'border-amber/35',
  },
  coral: {
    shell: 'border-coral/50 bg-coral-soft',
    rail: 'bg-grad-coral',
    tile: 'border-coral/35 bg-surface/80 text-coral-ink',
    footer: 'border-coral/35',
  },
};

function NoticeShell({
  tone,
  icon: Icon,
  heading,
  label,
  className,
  children,
  footer,
}: {
  tone: 'amber' | 'coral';
  icon: LucideIcon;
  heading: string;
  label: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): JSX.Element {
  const skin = chrome[tone];

  return (
    <section
      role="note"
      aria-label={label}
      className={cn(
        'relative isolate overflow-hidden rounded-card border shadow-lift',
        skin.shell,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute inset-y-0 left-0 w-2', skin.rail)}
      />

      <div className="flex items-start gap-4 py-5 pl-7 pr-5">
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-inner-top',
            skin.tile,
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 space-y-2">
          <h2 className="font-display text-xl font-semibold leading-tight tracking-tight text-ink">
            {heading}
          </h2>
          {children}
        </div>
      </div>

      {footer ? (
        <div className={cn('border-t py-3 pl-7 pr-5', skin.footer)}>{footer}</div>
      ) : null}
    </section>
  );
}

export function SafetyNotice({
  safety,
  className,
}: {
  safety: SafetyResult;
  className?: string;
}): JSX.Element | null {
  if (safety.category === 'none') return null;

  const style = styles[safety.category];

  return (
    <NoticeShell
      tone={style.tone}
      icon={style.icon}
      heading={style.heading}
      label={style.heading}
      className={className}
      footer={
        <div className="space-y-1.5">
          <p className="text-sm font-semibold leading-relaxed text-ink">{STANDING_LINE}</p>
          {!safety.allowStandardOutput ? (
            <p className="text-sm font-semibold leading-relaxed text-ink-muted">
              The usual rewrite and tone options are held back here on purpose.
            </p>
          ) : null}
        </div>
      }
    >
      <p className="text-base leading-relaxed text-ink">
        {safety.userMessage ?? style.fallbackMessage}
      </p>
    </NoticeShell>
  );
}

/** Standalone banner for Conflict Lens's falseEquivalenceWarning — rendered ABOVE the analysis. */
export function FalseEquivalenceNotice({
  warning,
  className,
}: {
  warning: string;
  className?: string;
}): JSX.Element {
  return (
    <NoticeShell
      tone="amber"
      icon={Scale}
      heading="Before you read this as an even split"
      label="Balance note"
      className={className}
    >
      <p className="text-base leading-relaxed text-ink">{warning}</p>
    </NoticeShell>
  );
}
