import { useEffect, useRef, useState } from 'react';
import { Check, Cloud, KeyRound, Palette, ShieldAlert, X } from 'lucide-react';
import type { AiMode } from '@/types/contracts';
import { Button, Card, CardBody } from '@/components/ui';
import {
  DIRECT_MODE_PRIVACY_NOTICE,
  clearUserKey,
  hasUserKey,
  setUserKey,
  type AiProbeResult,
} from '@/ai';
import { THEMES, applyTheme, storedTheme, type ThemeId } from '@/styles/applyTheme';
import { cn } from '@/lib/cn';

type AiSettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  probe: AiProbeResult | null;
  configuredMode: AiMode;
  /** Called after the stored key changes so the router config can be rebuilt. */
  onKeyChange: () => void;
};

/**
 * The bring-your-own-key drawer.
 *
 * Only reachable when the dev proxy is unusable. When the proxy is available the drawer says so
 * and never asks for a key — a key in the browser is strictly worse, so we don't invite it.
 *
 * The key is typed into a password field, handed straight to `setUserKey`, and never held in
 * this component's state after submit. It is never logged and never leaves the key store.
 */
export function AiSettingsDrawer({
  open,
  onClose,
  probe,
  configuredMode,
  onKeyChange,
}: AiSettingsDrawerProps) {
  const [theme, setTheme] = useState<ThemeId>(() => storedTheme() ?? 'editorial');
  const [draftKey, setDraftKey] = useState('');
  const [stored, setStored] = useState(() => hasUserKey());
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const proxyLive = probe?.proxyAvailable ?? false;

  const handleSave = () => {
    const trimmed = draftKey.trim();
    if (!trimmed) return;
    setUserKey(trimmed);
    setDraftKey('');
    setStored(true);
    onKeyChange();
  };

  const handleClear = () => {
    clearUserKey();
    setDraftKey('');
    setStored(false);
    onKeyChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close AI settings"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-paper shadow-lift"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="ai-settings-title" className="text-lg font-extrabold text-ink">
              AI settings
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              Configured mode: <span className="font-mono font-bold">{configuredMode}</span>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card border border-line bg-surface"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close AI settings</span>
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Card tone={proxyLive ? 'teal' : 'sunk'}>
            <CardBody>
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <Cloud className="h-4 w-4" aria-hidden="true" />
                Local dev route
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
                {proxyLive
                  ? 'Reachable, with a key configured. Live requests go through the Vite dev server, so the key stays in the Node process and never reaches this browser. This is the preferred path and no key is needed here.'
                  : 'Not available. Either the dev server is not running, or no ANTHROPIC_API_KEY is set in .env. The built-in examples still work with no configuration at all.'}
              </p>
            </CardBody>
          </Card>

          {proxyLive ? null : (
            <Card tone="default">
              <CardBody>
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Use your own Anthropic key
                </p>

                <p className="mt-2 flex items-start gap-2 rounded-card border border-amber/40 bg-amber-soft p-3 text-sm font-semibold leading-relaxed text-amber-ink">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{DIRECT_MODE_PRIVACY_NOTICE}</span>
                </p>

                <label
                  htmlFor="byok-input"
                  className="mt-4 block text-sm font-bold text-ink"
                >
                  Anthropic API key
                </label>
                <input
                  id="byok-input"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={draftKey}
                  onChange={(event) => setDraftKey(event.target.value)}
                  placeholder={stored ? 'A key is stored for this tab' : 'sk-ant-…'}
                  aria-describedby="byok-help"
                  className="mt-1.5 min-h-tap w-full rounded-card border border-line-strong bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted/80"
                />
                <p id="byok-help" className="mt-2 text-sm font-medium text-ink-muted">
                  Held in memory and <span className="font-mono">sessionStorage</span> for this
                  tab only — never <span className="font-mono">localStorage</span>, never logged,
                  never committed. Closing the tab or pressing Start over clears it.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={handleSave} disabled={!draftKey.trim()}>
                    Save key for this tab
                  </Button>
                  {stored ? (
                    <Button variant="outline" onClick={handleClear}>
                      Clear stored key
                    </Button>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          )}

          <Card tone="default">
            <CardBody>
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <Palette className="h-4 w-4" aria-hidden="true" />
                Appearance
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
                Every colour, typeface, corner radius, and shadow in the app comes from one theme
                file. Switching here changes all of them at once.
              </p>

              <fieldset className="mt-3">
                <legend className="sr-only">Theme</legend>
                <div className="space-y-2">
                  {THEMES.map((option) => {
                    const selected = option.id === theme;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          'flex min-h-tap cursor-pointer items-start gap-3 rounded-card border px-3.5 py-3 transition-colors',
                          selected
                            ? 'border-primary bg-primary-soft'
                            : 'border-line bg-surface hover:border-primary/40',
                        )}
                      >
                        <input
                          type="radio"
                          name="cs-theme"
                          value={option.id}
                          checked={selected}
                          onChange={() => {
                            setTheme(option.id);
                            applyTheme(option.id);
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-ink">{option.label}</span>
                            {selected ? (
                              <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            ) : null}
                            {option.contrastAudited ? null : (
                              <span className="rounded-chip border border-amber/40 bg-amber-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-ink">
                                Draft
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-sm font-medium leading-relaxed text-ink-muted">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <p className="mt-3 text-sm font-medium leading-relaxed text-ink-muted">
                {`${THEMES.filter((t) => t.contrastAudited).length} of ${THEMES.length} themes have passed a contrast audit.`}{' '}
                The ones marked Draft have not — usable for comparing directions, not finished.
              </p>
            </CardBody>
          </Card>

          <Card tone="sunk">
            <CardBody>
              <p className="text-sm font-bold text-ink">Preference order</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-medium leading-relaxed text-ink-muted">
                <li>Local dev route — key stays on the server</li>
                <li>Your own key — only if the route is unreachable and you supplied one</li>
                <li>Built-in examples — always available, no network</li>
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
