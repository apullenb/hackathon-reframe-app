import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ButtonSize, ButtonVariant } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export type CopyButtonProps = {
  value: string;
  /** button label, default 'Copy' */
  label?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const RESET_MS = 2000;
const FAILURE_MESSAGE = 'Copy failed — select and copy manually';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copy confirmation is announced accessibly (spec §24) and visible (spec §10.1).
 * The copied value is user message content and is never logged.
 */
export function CopyButton({
  value,
  label = 'Copy',
  size = 'md',
  variant = 'outline',
  fullWidth = false,
}: CopyButtonProps): JSX.Element {
  const [state, setState] = useState<CopyState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const scheduleReset = useCallback(() => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setState('idle');
    }, RESET_MS);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      // Intentionally no logging: the payload is user message content.
      setState('failed');
    }
    scheduleReset();
  }, [scheduleReset, value]);

  const copied = state === 'copied';

  return (
    <span className={fullWidth ? 'block w-full' : 'inline-flex flex-col items-start'}>
      <Button
        /*
         * Success drops to the unfilled shape on purpose: whatever the resting variant, the
         * confirmed state is one consistent teal moment with a chartreuse flash around it.
         */
        variant={copied ? 'outline' : variant}
        size={size}
        fullWidth={fullWidth}
        leadingIcon={copied ? Check : Copy}
        onClick={() => {
          void handleCopy();
        }}
        className={cn(
          copied &&
            '!border-teal !bg-teal-soft !text-teal-ink !shadow-glow-accent motion-safe:animate-pop-in',
          state === 'failed' && '!border-coral !bg-coral-soft !text-coral-ink',
        )}
      >
        {copied ? 'Copied' : label}
      </Button>

      {state === 'failed' ? (
        <span className="mt-1.5 block text-sm font-semibold text-coral-ink">{FAILURE_MESSAGE}</span>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : state === 'failed' ? FAILURE_MESSAGE : ''}
      </span>
    </span>
  );
}
