import React, { useEffect, useId, useState } from 'react';
import { RunSettings } from '../types';
import {
  ModelOption,
  PROVIDERS,
  getProvider,
  listProviderModels,
} from '../lib/providers';
import type { ProviderId } from '../lib/providers';
import { looksLikeProviderKey } from '../lib/apiKey';
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
  provider: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  apiKey: string;
  customBaseUrl: string;
  onSaveCustomBaseUrl: (url: string) => void;
  buildTimeAvailable: boolean;
  hasUserKey: boolean;
  savedProviders: ProviderId[];
  onSaveKey: (provider: ProviderId, key: string) => { ok: boolean; persisted: boolean };
  onForgetKey: (provider: ProviderId) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  setSettings,
  projectType,
  onProjectTypeChange,
  styling,
  onStylingChange,
  provider,
  onProviderChange,
  apiKey,
  customBaseUrl,
  onSaveCustomBaseUrl,
  buildTimeAvailable,
  hasUserKey,
  savedProviders,
  onSaveKey,
  onForgetKey,
  onClose,
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [keyDraft, setKeyDraft] = useState('');
  const [keyStatus, setKeyStatus] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [modelQuery, setModelQuery] = useState('');
  const id = useId();

  const definition = getProvider(provider);

  const filteredModels = modelQuery.trim()
    ? models.filter((model) =>
        model.label.toLowerCase().includes(modelQuery.trim().toLowerCase()) ||
        model.value.toLowerCase().includes(modelQuery.trim().toLowerCase()),
      )
    : models;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingModels(true);
      try {
        const available = await listProviderModels(provider, apiKey, customBaseUrl);
        if (!cancelled) setModels(available);
      } catch {
        if (!cancelled) setModels(definition.fallbackModels);
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // Models follow the key, the provider, and the endpoint.
  }, [provider, apiKey, customBaseUrl, definition.fallbackModels]);

  const handleChange = (key: keyof RunSettings, value: unknown) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveKey = () => {
    const trimmed = keyDraft.trim();

    if (!trimmed) {
      onForgetKey(provider);
      setKeyDraft('');
      setKeyStatus({ tone: 'warn', text: 'Key removed from this browser.' });
      return;
    }

    if (!looksLikeProviderKey(provider, trimmed)) {
      setKeyStatus({
        tone: 'warn',
        text: `That does not look like a ${definition.label} key. Check it and paste it again.`,
      });
      return;
    }

    const result = onSaveKey(provider, trimmed);
    setKeyDraft('');
    setKeyStatus({
      tone: 'ok',
      text: result.persisted
        ? `Key saved for ${definition.label}. It is sent only to ${definition.label}.`
        : 'Key set for this session. Storage is blocked, so it will be gone on reload.',
    });
  };

  // When the chosen provider changes, make sure the selected model is offered.
  useEffect(() => {
    if (models.length === 0) return;
    const exists = models.some((model) => model.value === settings.model);
    if (!exists) {
      const preferred = models.find((model) => model.value === definition.defaultModel) ?? models[0];
      handleChange('model', preferred.value);
    }
    // Only react to the model list changing, not to every settings edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  return (
    <aside
      className="animate-fade-in flex h-full w-[min(360px,92vw)] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface"
      aria-label="Settings"
    >
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
        <h2 className="text-[13.5px] font-semibold text-ink">Settings</h2>
        <button
          onClick={onClose}
          className="btn btn-icon btn-ghost"
          aria-label="Close settings"
        >
          <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-6 p-4">
        <section className="space-y-2.5">
          <h3 className="text-[12px] font-semibold text-ink">Provider</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {PROVIDERS.map((option) => {
              const saved = savedProviders.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => onProviderChange(option.id)}
                  aria-pressed={provider === option.id}
                  className={`relative flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[12px] font-medium transition-colors ${
                    provider === option.id
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {option.label}
                  {saved && (
                    <span
                      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-success"
                      aria-label="key saved"
                      title="Key saved"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-ink-faint">
            {definition.hint}
            {definition.docsUrl && (
              <>
                {' '}
                <a
                  href={definition.docsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent underline"
                >
                  Get a key
                </a>
              </>
            )}
          </p>
        </section>

        {definition.customBaseUrl && (
          <section className="space-y-1.5">
            <label htmlFor={`${id}-base`} className="text-[12px] font-semibold text-ink">
              Base URL
            </label>
            <input
              id={`${id}-base`}
              type="url"
              value={customBaseUrl}
              onChange={(event) => onSaveCustomBaseUrl(event.target.value)}
              placeholder="https://your-endpoint.example/v1"
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
            />
            <p className="text-[11px] leading-relaxed text-ink-faint">
              The API root, not the full chat path. For example
              <code className="mx-1 rounded bg-surface-2 px-1 py-0.5 font-mono text-[10.5px]">
                https://api.example.com/v1
              </code>
            </p>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold text-ink">API key</h3>

          {hasUserKey ? (
            <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
              <p className="flex items-center gap-2 text-[12px] text-ink-muted">
                <i className="fa-solid fa-circle-check text-success text-[11px]" aria-hidden="true" />
                {definition.label} key saved in this browser
              </p>
              <button
                onClick={() => onForgetKey(provider)}
                className="btn btn-sm btn-danger"
              >
                Remove key
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
              <label htmlFor={`${id}-key`} className="sr-only">
                {definition.label} API key
              </label>
              <input
                id={`${id}-key`}
                type="password"
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                placeholder={definition.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
              />
              <button onClick={handleSaveKey} className="btn btn-md btn-primary w-full">
                Save key
              </button>
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Stored in this browser only, and sent to {definition.label} with your requests.
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
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-ink">Model</h3>
            <button
              onClick={() => {
                setLoadingModels(true);
                listProviderModels(provider, apiKey, customBaseUrl)
                  .then((available) => setModels(available))
                  .catch(() => setModels(definition.fallbackModels))
                  .finally(() => setLoadingModels(false));
              }}
              className="btn btn-sm btn-ghost"
              aria-label="Reload the model list"
              title="Reload the model list"
            >
              <i
                className={`fa-solid fa-rotate-right text-[11px] ${loadingModels ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {loadingModels ? 'Loading…' : 'Reload'}
            </button>
          </div>

          <div className="relative">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-faint"
              aria-hidden="true"
            />
            <input
              type="search"
              value={modelQuery}
              onChange={(event) => setModelQuery(event.target.value)}
              placeholder="Search models…"
              aria-label="Search models"
              className="w-full rounded-xl border border-line bg-surface-2 py-2 pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
            />
          </div>

          <div
            role="listbox"
            aria-label="Available models"
            className="scroll-thin max-h-52 overflow-y-auto rounded-xl border border-line bg-surface-2 p-1"
          >
            {loadingModels && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-ink-faint">
                <i className="fa-solid fa-spinner fa-spin text-[11px]" aria-hidden="true" />
                Loading models…
              </div>
            )}
            {!loadingModels && filteredModels.length === 0 && (
              <div className="px-3 py-2.5 text-[12px] text-ink-faint">
                No models match "{modelQuery}".
              </div>
            )}
            {!loadingModels &&
              filteredModels.map((model) => (
                <button
                  key={model.value}
                  role="option"
                  aria-selected={settings.model === model.value}
                  onClick={() => handleChange('model', model.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors ${
                    settings.model === model.value
                      ? 'bg-accent-soft text-accent'
                      : 'text-ink hover:bg-surface-3'
                  }`}
                >
                  <span className="truncate">{model.label}</span>
                  {settings.model === model.value && (
                    <i className="fa-solid fa-check text-[10px]" aria-hidden="true" />
                  )}
                </button>
              ))}
          </div>

          <p className="text-[11px] leading-relaxed text-ink-faint">
            Read from your key, so you only see what this account can use. Type
            to filter, or click reload to fetch again.
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
                <label htmlFor={`${id}-${key}`} className="text-[11.5px] text-ink-muted">
                  {label}
                </label>
                <input
                  id={`${id}-${key}`}
                  type="number"
                  value={settings[key] ?? 0}
                  min={min}
                  max={max}
                  step={step}
                  onChange={(event) => handleChange(key, Number(event.target.value))}
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
