import { RotateCcw, Settings2, Sparkles } from 'lucide-react';
import type { AiMode, AiSource } from '@/types/contracts';
import { Select } from '@/components/ui';
import { PREPARED_SCENARIOS } from '@/fixtures';
import { AiModeIndicator } from './AiModeIndicator';

type ToolbarProps = {
  scenarioId: string | null;
  onLoadScenario: (scenarioId: string) => void;
  onReset: () => void;
  activeSource: AiSource | null;
  /** Which upstream provider produced the on-screen result, when the transport reported one. */
  activeProvider?: string | null;
  failedOver?: readonly string[];
  configuredMode: AiMode;
  errored?: boolean;
  onOpenSettings: () => void;
};

/**
 * The header toolbar: an example picker, settings, start over, and the status pill.
 *
 * Deliberately compact. These are utilities, not the product — they sit at the edge of the
 * header rather than occupying a band across the top of the page.
 */
export function DemoControls({
  scenarioId,
  onLoadScenario,
  onReset,
  activeSource,
  activeProvider,
  failedOver,
  configuredMode,
  errored,
  onOpenSettings,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[13.5rem] flex-1 sm:flex-none">
        <Select
          label="Examples"
          hideLabel
          placeholder="Try an example…"
          value={scenarioId ?? ''}
          onChange={(event) => {
            if (event.target.value) onLoadScenario(event.target.value);
          }}
          // A native select changes value on mouse-wheel while focused, and this one sits in a
          // sticky header — scrolling the page over it used to silently swap the loaded
          // example. Suppress the wheel only while it actually has focus.
          onWheel={(event) => {
            if (document.activeElement === event.currentTarget) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          options={PREPARED_SCENARIOS.map((scenario) => ({
            value: scenario.id,
            label: scenario.label,
          }))}
        />
      </div>

      <AiModeIndicator
        activeSource={activeSource}
        activeProvider={activeProvider}
        failedOver={failedOver}
        configuredMode={configuredMode}
        errored={errored}
      />

      <IconAction icon={Settings2} label="Settings" onClick={onOpenSettings} />
      <IconAction icon={RotateCcw} label="Start over" onClick={onReset} />
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Settings2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex h-tap w-tap items-center justify-center rounded-chip border border-line bg-surface text-ink-muted shadow-card transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-lift"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** The hero call to action that loads the flagship example. */
export function FlagshipScenarioHint({ onLoad }: { onLoad: () => void }) {
  return (
    <button
      type="button"
      onClick={onLoad}
      className="group inline-flex min-h-tap items-center gap-2.5 rounded-chip bg-ink px-5 py-3 text-[1.0125rem] font-bold text-paper shadow-lift transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-float"
    >
      <Sparkles
        className="h-[18px] w-[18px] text-accent transition-transform duration-300 ease-spring motion-safe:group-hover:rotate-12"
        aria-hidden="true"
      />
      Try it: an engineer telling a PM the truth
    </button>
  );
}
