import React, { useEffect, useId, useState } from 'react';
import { RunSettings } from '../types';
import { getAvailableModels, ModelOption } from '../services/geminiService';
import { looksLikeGeminiKey } from '../lib/apiKey';
import {
  PROJECT_TYPES,
  ProjectType,
  STYLING_OPTIONS,
  Styling,
} from '../lib/projectTypes';

interface SettingsPanelProps {
  settings: RunSettings;
  setSettings: (settings: RunSettings) => void;
  projectType: ProjectType;
  onProjectTypeChange: (type: ProjectType) => void;
  styling: Styling;
  onStylingChange: (styling: Styling) => void;
  apiKey: string;
  buildTimeAvailable: boolean;
  hasUserKey: boolean;
  onSaveKey: (key: string) => { ok: boolean; persisted: boolean };
  onForgetKey: () => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  setSettings,
  projectType,
  onProjectTypeChange,
  styling,
  onStylingChange,
  apiKey,
  buildTimeAvailable,
  hasUserKey,
  onSaveKey,
  onForgetKey,
  onClose,
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
      className="animate-fade-in flex h-full w-[min(360px,92vw)] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface"
      aria-label="Settings"
    >
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
        <h2 className="text-[13.5px] font-semibold text-ink">Settings</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Close settings"
        >
          <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-6 p-4">
        <section className="space-y-2">
          <label htmlFor={keyId} className="text-[12px] font-semibold text-ink">
            API key
          </label>

          {hasUserKey ? (
            <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
              <p className="flex items-center gap-2 text-[12px] text-ink-muted">
                <i className="fa-solid fa-circle-check text-success text-[11px]" aria-hidden="true" />
                Your key is saved in this browser.
              </p>
              <button
                onClick={handleForgetKey}
                className="text-[12px] text-danger transition-colors hover:underline"
              >
                Remove key from this browser
              </button>
            </div>
          ) : (
            <>
              {buildTimeAvailable && (
                <p className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 text-[12px] text-ink-muted">
                  <i className="fa-solid fa-circle-check text-success text-[11px]" aria-hidden="true" />
                  This deployment ships with its own key. Add yours to override it.
                </p>
              )}
              <input
                id={keyId}
                type="password"
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
              />
              <button
                onClick={handleSaveKey}
                className="w-full rounded-xl bg-accent py-2 text-[12.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
              >
                Save key
              </button>
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Stored in this browser only, and sent to Google with your requests. Get a free key
                at aistudio.google.com/app/apikey.
              </p>
            </>
          )}

          {keyStatus && (
            <p
              role="status"
              className={`text-[11px] ${keyStatus.tone === 'ok' ? 'text-success' : 'text-ink-muted'}`}
            >
              {keyStatus.text}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <label htmlFor={modelId} className="text-[12px] font-semibold text-ink">
            Model
          </label>
          <select
            id={modelId}
            value={settings.model}
            onChange={(event) => handleChange('model', event.target.value)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none focus:border-line-strong"
          >
            {loadingModels && <option>Loading models…</option>}
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-relaxed text-ink-faint">
            Read from your key, so you only see what your account can use.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold text-ink">Project type</h3>
          <div className="space-y-1.5">
            {PROJECT_TYPES.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-colors ${
                  projectType === option.value
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-surface-2 hover:border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="project-type"
                  value={option.value}
                  checked={projectType === option.value}
                  onChange={() => onProjectTypeChange(option.value)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-ink">{option.label}</span>
                  <span className="block text-[11px] leading-snug text-ink-faint">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold text-ink">Styling</h3>
          <div className="flex gap-1.5 rounded-xl border border-line bg-surface-2 p-1">
            {STYLING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onStylingChange(option.value)}
                className={`flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  styling === option.value
                    ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-line pt-5">
          <h3 className="text-[12px] font-semibold text-ink">Model controls</h3>

          {(
            [
              ['temperature', 'Temperature', 0, 2, 0.1],
              ['topK', 'Top K', 1, 100, 1],
              ['topP', 'Top P', 0, 1, 0.01],
              ['maxOutputTokens', 'Max output tokens', 1, 32768, 100],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={`${keyId}-${key}`} className="text-[11.5px] text-ink-muted">
                  {label}
                </label>
                <input
                  id={`${keyId}-${key}`}
                  type="number"
                  value={settings[key] ?? 0}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(event) =>
                    handleChange(key, Number(event.target.value))
                  }
                  className="w-16 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-right text-[11.5px] tabular-nums text-ink-faint outline-none transition-colors hover:border-line focus:border-line focus:bg-surface"
                />
              </div>
              <input
                type="range"
                aria-label={label}
                min={min}
                max={max}
                step={step}
                value={settings[key] ?? 0}
                onChange={(event) => handleChange(key, Number(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-[var(--accent)]"
              />
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
};

export default SettingsPanel;
