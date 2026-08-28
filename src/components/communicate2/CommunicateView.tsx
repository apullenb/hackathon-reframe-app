import { ArrowRight, Inbox, PenLine } from 'lucide-react';
import type { CommunicationContext, ContextSwitchMode, ContextSwitchResponse, ContextSwitchError } from '@/types/contracts';
import { ContextBuilder } from '@/components/context/ContextBuilder';
import { MessageComposer } from '@/components/MessageComposer';
import { ScreenshotUpload } from '@/components/conflict';
import { SayItBetterResult } from '@/components/sayItBetter';
import { DecodeResult } from '@/components/decode';
import { TranslationLoadingState } from '@/components/TranslationLoadingState';
import { ErrorFallback, ResultReadyBubbles } from '@/components/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Communicate — the translator, and the front door of the product.
 *
 * One screen, two directions. Writing something turns a blunt draft into a sendable message;
 * receiving something explains what a message says versus what you might be adding to it. Both
 * directions share the same context controls, because the role pair is what makes either useful.
 */

export type CommunicateViewProps = {
  mode: ContextSwitchMode;
  onModeChange: (mode: ContextSwitchMode) => void;
  context: Partial<CommunicationContext>;
  onContextChange: (patch: Partial<CommunicationContext>) => void;
  text: string;
  onTextChange: (text: string) => void;
  onRun: () => void;
  canRun: boolean;
  busy: boolean;
  stage: number;
  onAdvanceStage: () => void;
  result: ContextSwitchResponse | null;
  error: ContextSwitchError | null;
  resultToken: number;
  onUseExample: () => void;
  onLoadExample: () => void;
};

const DIRECTIONS = [
  {
    mode: 'say_it_better' as const,
    label: "I'm writing something",
    hint: 'Turn what you actually mean into something they can hear.',
    icon: PenLine,
  },
  {
    mode: 'decode_it' as const,
    label: 'I received something',
    hint: 'See what it says, and what you might be adding to it.',
    icon: Inbox,
  },
];

export function CommunicateView(props: CommunicateViewProps) {
  const { mode, result, error, busy } = props;
  const writing = mode === 'say_it_better';

  if (busy) {
    return (
      <TranslationLoadingState
        mode={mode}
        context={props.context}
        stage={props.stage}
        onAdvanceStage={props.onAdvanceStage}
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorFallback error={error} onRetry={props.onRun} onUseFixture={props.onUseExample} />
      </div>
    );
  }

  if (result) {
    return (
      <div className="relative space-y-6">
        <ResultReadyBubbles trigger={props.resultToken} />
        {result.mode === 'say_it_better' ? (
          <SayItBetterResult
            response={result}
            humorLevel={props.context.humorLevel}
            onRegenerate={props.onRun}
            onEditContext={() => props.onTextChange(props.text)}
          />
        ) : result.mode === 'decode_it' ? (
          <DecodeResult
            response={result}
            senderRole={props.context.otherRole}
            recipientRole={props.context.selfRole}
            onRegenerate={props.onRun}
            onEditContext={() => props.onTextChange(props.text)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="sr-only">Which direction is this message going?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {DIRECTIONS.map((direction) => {
            const active = mode === direction.mode;
            return (
              <label
                key={direction.mode}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-card border-2 p-4 transition-colors',
                  active
                    ? 'border-primary bg-primary-soft'
                    : 'border-line bg-surface hover:border-primary/45',
                )}
              >
                <input
                  type="radio"
                  name="direction"
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  checked={active}
                  onChange={() => props.onModeChange(direction.mode)}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <direction.icon
                      className={cn('h-4 w-4', active ? 'text-primary' : 'text-ink-muted')}
                      aria-hidden="true"
                    />
                    <span className={cn('font-bold', active ? 'text-primary' : 'text-ink')}>
                      {direction.label}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm font-medium leading-relaxed text-ink-muted">
                    {direction.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 lg:grid-cols-2">
        <ContextBuilder
          mode={mode}
          context={props.context}
          onChange={props.onContextChange}
        />

        <div className="space-y-4">
          {!writing ? (
            <ScreenshotUpload onTranscript={props.onTextChange} />
          ) : null}

          <MessageComposer
            label={writing ? 'What you actually want to say' : 'The message you received'}
            hint={
              writing
                ? 'Be blunt. The honest version is the useful input.'
                : 'Paste it exactly as it arrived, or upload a screenshot above.'
            }
            placeholder={
              writing
                ? "I haven't really worked on it because…"
                : 'Just checking in. Do we have an update on this yet?'
            }
            value={props.text}
            onChange={props.onTextChange}
            rows={7}
          />

          <Button size="lg" fullWidth trailingIcon={ArrowRight} disabled={!props.canRun} onClick={props.onRun}>
            {writing ? 'Translate it' : 'Explain it'}
          </Button>

          {!props.canRun ? (
            <p className="text-sm font-medium text-ink-muted">
              Choose both roles, a relationship and a channel, then add the message.
            </p>
          ) : null}

          <button
            type="button"
            onClick={props.onLoadExample}
            className="min-h-tap text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
          >
            Or see a worked example
          </button>
        </div>
      </div>
    </div>
  );
}
