import React, { useEffect, useId, useState } from 'react';
import { RunSettings } from '../types';
import { getAvailableModels, ModelOption } from '../services/geminiService';
import { looksLikeGeminiKey } from '../lib/apiKey';

interface RunSettingsProps {
  settings: RunSettings;
  setSettings: (settings: RunSettings) => void;
  isOpen: boolean;
  onClose: () => void;
  /** The key currently in use, resolved from storage or the build. */
  apiKey: string;
  /** True when this deployment ships with a build-time key. */
  buildTimeAvailable: boolean;
  /** True when the visitor supplied their own key. */
  hasUserKey: boolean;
  onSaveKey: (key: string) => { ok: boolean; persisted: boolean };
  onForgetKey: () => void;
}

const RunSettingsPanel: React.FC<RunSettingsProps> = ({
  settings,
  setSettings,
  isOpen,
  onClose,
  apiKey,
  buildTimeAvailable,
  hasUserKey,
  onSaveKey,
  onForgetKey,
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [keyDraft, setKeyDraft] = useState('');
  const [keyStatus, setKeyStatus] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(
    null,
  );
  const keyId = useId();
  const modelId = useId();

  useEffect(() => {
    let cancelled = false;

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const available = await getAvailableModels(apiKey);
        if (!cancelled) setModels(available);
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    };

    fetchModels();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  if (!isOpen) return null;

  const handleChange = (key: keyof RunSettings, value: unknown) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveKey = () => {
    const trimmed = keyDraft.trim();

    if (!trimmed) {
      onForgetKey();
      setKeyDraft('');
      setKeyStatus({ tone: 'warn', text: 'Key removed from this browser.' });
      return;
    }

    if (!looksLikeGeminiKey(trimmed)) {
      setKeyStatus({
        tone: 'warn',
        text: 'That does not look like a Gemini key. It should start with AIza and have no spaces.',
      });
      return;
    }

    const result = onSaveKey(trimmed);
    setKeyDraft('');
    setKeyStatus({
      tone: 'ok',
      text: result.persisted
        ? 'Key saved in this browser. It is sent only to Google.'
        : 'Key set for this session. Storage is blocked, so it will be gone on reload.',
    });
  };

  const handleForgetKey = () => {
    onForgetKey();
    setKeyDraft('');
    setKeyStatus({ tone: 'warn', text: 'Key removed from this browser.' });
  };

  return (
    <aside
      className="w-80 h-full bg-surface-2 border-l border-line flex flex-col overflow-y-auto z-30 shrink-0"
      aria-label="Run settings"
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-line shrink-0 sticky top-0 bg-surface-2 z-10">
        <h2 className="text-sm font-medium text-ink">Run settings</h2>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink p-1 rounded transition-colors"
          aria-label="Close run settings"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <section className="space-y-2">
          <label htmlFor={modelId} className="text-xs font-medium text-ink">
            Model
          </label>
          <div className="relative">
            {loadingModels ? (
              <div
                className="w-full h-8 bg-canvas border border-line rounded animate-pulse"
                aria-hidden="true"
              />
            ) : (
              <>
                <select
                  id={modelId}
                  value={settings.model}
                  onChange={(event) => handleChange('model', event.target.value)}
                  className="w-full bg-canvas border border-line rounded px-3 py-2 text-xs text-ink appearance-none focus:border-accent focus:outline-none"
                >
                  {models.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <div
                  className="absolute right-3 top-2.5 pointer-events-none text-ink-muted"
                  aria-hidden="true"
                >
                  <i className="fa-solid fa-chevron-down text-[10px]" />
                </div>
              </>
            )}
          </div>
          <p className="text-[10px] text-ink-faint">
            Models are read from your key, so you only see what your account can use.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor={`${keyId}-temp`} className="text-xs font-medium text-ink">
              Temperature
            </label>
            <input
              id={`${keyId}-temp`}
              type="number"
              value={settings.temperature}
              onChange={(event) => handleChange('temperature', Number(event.target.value))}
              step="0.1"
              min="0"
              max="2"
              className="w-12 bg-transparent text-right text-xs text-ink-muted focus:text-ink focus:outline-none"
            />
          </div>
          <input
            type="range"
            aria-label="Temperature"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(event) => handleChange('temperature', Number(event.target.value))}
            className="w-full h-1 bg-line rounded-lg appearance-none cursor-pointer accent-accent"
          />
          <p className="text-[10px] text-ink-muted">
            Controls randomness. Higher values mean more creativity.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor={`${keyId}-topk`} className="text-xs font-medium text-ink">
              Top K
            </label>
            <input
              id={`${keyId}-topk`}
              type="number"
              value={settings.topK ?? 40}
              onChange={(event) => handleChange('topK', Number(event.target.value))}
              step="1"
              min="1"
              max="100"
              className="w-12 bg-transparent text-right text-xs text-ink-muted focus:text-ink focus:outline-none"
            />
          </div>
          <input
            type="range"
            aria-label="Top K"
            min="1"
            max="100"
            step="1"
            value={settings.topK ?? 40}
            onChange={(event) => handleChange('topK', Number(event.target.value))}
            className="w-full h-1 bg-line rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </section>

        <section className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor={`${keyId}-topp`} className="text-xs font-medium text-ink">
              Top P
            </label>
            <input
              id={`${keyId}-topp`}
              type="number"
              value={settings.topP ?? 0.95}
              onChange={(event) => handleChange('topP', Number(event.target.value))}
              step="0.01"
              min="0"
              max="1"
              className="w-12 bg-transparent text-right text-xs text-ink-muted focus:text-ink focus:outline-none"
            />
          </div>
          <input
            type="range"
            aria-label="Top P"
            min="0"
            max="1"
            step="0.01"
            value={settings.topP ?? 0.95}
            onChange={(event) => handleChange('topP', Number(event.target.value))}
            className="w-full h-1 bg-line rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </section>

        <section className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor={`${keyId}-tokens`} className="text-xs font-medium text-ink">
              Max Output Tokens
            </label>
            <input
              id={`${keyId}-tokens`}
              type="number"
              value={settings.maxOutputTokens ?? 8192}
              onChange={(event) => handleChange('maxOutputTokens', Number(event.target.value))}
              step="100"
              min="1"
              max="32768"
              className="w-16 bg-transparent text-right text-xs text-ink-muted focus:text-ink focus:outline-none"
            />
          </div>
          <input
            type="range"
            aria-label="Max output tokens"
            min="1"
            max="32768"
            step="100"
            value={settings.maxOutputTokens ?? 8192}
            onChange={(event) => handleChange('maxOutputTokens', Number(event.target.value))}
            className="w-full h-1 bg-line rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </section>

        <section className="space-y-3 pt-4 border-t border-line">
          <h3 className="text-xs font-medium text-ink">API key</h3>

          {hasUserKey ? (
            <div className="rounded border border-line bg-canvas p-3 space-y-2">
              <p className="text-[11px] text-ink-muted flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-success text-[10px]" aria-hidden="true" />
                Your key is saved in this browser.
              </p>
              <button
                onClick={handleForgetKey}
                className="text-[11px] text-danger hover:underline transition-colors"
              >
                Remove key from this browser
              </button>
            </div>
          ) : buildTimeAvailable ? (
            <div className="rounded border border-line bg-canvas p-3">
              <p className="text-[11px] text-ink-muted flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-success text-[10px]" aria-hidden="true" />
                This deployment ships with its own key. You can add your own to override it.
              </p>
            </div>
          ) : null}

          {!hasUserKey && (
            <>
              <label htmlFor={keyId} className="text-[11px] text-ink-muted block">
                Paste your Gemini API key to start generating.
              </label>
              <input
                id={keyId}
                type="password"
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-canvas border border-line rounded px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
              <button
                onClick={handleSaveKey}
                className="w-full rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2 transition-colors"
              >
                Save key
              </button>
              <p className="text-[10px] text-ink-faint">
                Stored in this browser only and sent to Google with your requests. Get a free key
                at aistudio.google.com/app/apikey.
              </p>
            </>
          )}

          {keyStatus && (
            <p
              role="status"
              className={`text-[10px] ${keyStatus.tone === 'ok' ? 'text-success' : 'text-ink-muted'}`}
            >
              {keyStatus.text}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
};

export default RunSettingsPanel;
