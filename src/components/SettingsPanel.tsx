import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RunSettings } from '../types';
import {
  PROVIDERS,
  getProvider,
  isFallbackModelList,
  listProviderModels,
  testProviderConnection,
  type ConnectionTestResult,
  type ModelOption,
  type ProviderId,
} from '../lib/providers';
import ProviderMark from './ProviderMark';
import { looksLikeProviderKey } from '../lib/apiKey';
import {
  PROJECT_TYPES,
  ProjectType,
  SITE_MODE_OPTIONS,
  STYLING_OPTIONS,
  SiteMode,
  Styling,
} from '../lib/projectTypes';
import Icon, { type IconName } from './Icon';

interface SettingsPanelProps {
  settings: RunSettings;
  setSettings: (settings: RunSettings) => void;
  projectType: ProjectType;
  onProjectTypeChange: (type: ProjectType) => void;
  styling: Styling;
  onStylingChange: (styling: Styling) => void;
  siteMode: SiteMode;
  onSiteModeChange: (mode: SiteMode) => void;
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
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
  isThinking: boolean;
  onThinkingChange: (value: boolean) => void;
  onClose: () => void;
}

const PROJECT_ICONS: Record<ProjectType, IconName> = {
  vanilla: 'code',
  react: 'layers',
  vue: 'package',
  next: 'zap',
};

const SectionTitle: React.FC<{ icon: IconName; title: string; hint?: string }> = ({
  icon,
  title,
  hint,
}) => (
  <div className="flex items-center gap-2">
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-ink-muted">
      <Icon name={icon} size={12} />
    </span>
    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink">{title}</h3>
    {hint && <span className="ml-auto text-[9.5px] font-medium text-ink-faint">{hint}</span>}
  </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  setSettings,
  projectType,
  onProjectTypeChange,
  styling,
  onStylingChange,
  siteMode,
  onSiteModeChange,
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
  systemInstruction,
  onSystemInstructionChange,
  isThinking,
  onThinkingChange,
  onClose,
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [usedFallback, setUsedFallback] = useState(true);
  const [keyDraft, setKeyDraft] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [modelQuery, setModelQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const testAbortRef = useRef<AbortController | null>(null);
  const id = useId();

  const definition = getProvider(provider);

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const available = await listProviderModels(provider, apiKey, customBaseUrl);
      setModels(available);
      setUsedFallback(isFallbackModelList(provider, available));
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingModels(true);
    listProviderModels(provider, apiKey, customBaseUrl)
      .then((available) => {
        if (cancelled) return;
        setModels(available);
        setUsedFallback(isFallbackModelList(provider, available));
      })
      .finally(() => {
        if (!cancelled) setLoadingModels(false);
      });
    return () => {
      cancelled = true;
    };
    // The list follows the key, provider, and endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, apiKey, customBaseUrl]);

  useEffect(() => {
    setKeyDraft('');
    setKeyStatus(null);
    setShowKeyInput(false);
  }, [provider]);

  // Keep a valid model selected when the live list changes.
  useEffect(() => {
    if (models.length === 0) return;
    if (models.some((model) => model.value === settings.model)) return;
    const preferred =
      models.find((model) => model.value === definition.defaultModel) ?? models[0];
    setSettings({ ...settings, model: preferred.value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  const filteredModels = useMemo(() => {
    const needle = modelQuery.trim().toLowerCase();
    if (!needle) return models;
    return models.filter(
      (model) =>
        model.label.toLowerCase().includes(needle) ||
        model.value.toLowerCase().includes(needle),
    );
  }, [models, modelQuery]);

  const handleChange = <Key extends keyof RunSettings>(key: Key, value: RunSettings[Key]) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveKey = () => {
    const trimmed = keyDraft.trim();

    if (!trimmed) {
      setKeyStatus({ tone: 'warn', text: 'Paste a key first, or remove the saved one.' });
      return;
    }

    if (!looksLikeProviderKey(provider, trimmed)) {
      setKeyStatus({
        tone: 'warn',
        text: `That doesn’t look like a ${definition.label} key. Check it and try again.`,
      });
      return;
    }

    const result = onSaveKey(provider, trimmed);
    setKeyDraft('');
    setShowKeyInput(false);
    setKeyStatus({
      tone: 'ok',
      text: result.persisted
        ? `Saved. Only ${definition.label} receives this key.`
        : 'Key set for this session. Storage is blocked, so it will be gone after a reload.',
    });
    // Reload immediately with the new key.
    window.setTimeout(loadModels, 40);
  };

  useEffect(() => {
    setTestResult(null);
  }, [provider, settings.model, apiKey, customBaseUrl]);

  useEffect(
    () => () => {
      testAbortRef.current?.abort();
    },
    [],
  );

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        ok: false,
        message: `Add a ${definition.label} key first, then test it.`,
        latency: 0,
        model: settings.model,
      });
      return;
    }

    testAbortRef.current?.abort();
    const controller = new AbortController();
    testAbortRef.current = controller;
    setTesting(true);
    setTestResult(null);
    const result = await testProviderConnection({
      provider,
      apiKey,
      model: settings.model,
      customBaseUrl,
      signal: controller.signal,
    });
    if (testAbortRef.current === controller) {
      setTestResult(result);
      setTesting(false);
      if (result.ok) {
        setKeyStatus({ tone: 'ok', text: 'The key works and the model can generate text.' });
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface" aria-label="Settings">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon name="sliders" size={15} />
        </span>
        <div>
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]">Settings</h2>
          <p className="text-[10px] text-ink-faint">Provider, project, and generation</p>
        </div>
        <button
          onClick={onClose}
          className="btn btn-icon btn-sm btn-ghost ml-auto"
          aria-label="Close settings"
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3.5">
        {/* Provider ------------------------------------------------------ */}
        <section className="rounded-2xl border border-line bg-surface p-3.5">
          <SectionTitle icon="key" title="Provider & key" />
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-muted">
            {definition.hint}{' '}
            {definition.docsUrl && (
              <a
                href={definition.docsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-0.5 font-semibold text-accent hover:underline"
              >
                Get a key
                <Icon name="external" size={9} />
              </a>
            )}
          </p>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {PROVIDERS.map((option) => {
              const saved = savedProviders.includes(option.id);
              const active = provider === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onProviderChange(option.id)}
                  aria-pressed={active}
                  className={`relative flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                    active
                      ? 'border-accent/40 bg-accent-soft text-accent'
                      : 'border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <ProviderMark provider={option.id} size={18} />
                  <span className="truncate">{option.label.replace('Anthropic ', '')}</span>
                  {saved && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-success" />}
                </button>
              );
            })}
          </div>

          {definition.customBaseUrl && (
            <div className="mt-3">
              <label
                htmlFor={`${id}-base`}
                className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-faint"
              >
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
                className="input mt-1"
              />
              <p className="mt-1 text-[9.5px] leading-relaxed text-ink-faint">
                The API root, not the full chat path.
              </p>
            </div>
          )}

          <div className="mt-3">
            {hasUserKey && !showKeyInput ? (
              <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/[0.06] px-2.5 py-2">
                <Icon name="check-circle" size={13} className="shrink-0 text-success" />
                <p className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-ink">
                  {definition.label} key saved in this browser
                </p>
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="shrink-0 text-[10px] font-semibold text-accent hover:underline"
                >
                  Replace
                </button>
                <button
                  onClick={() => {
                    onForgetKey(provider);
                    setKeyStatus({ tone: 'warn', text: 'Key removed from this browser.' });
                  }}
                  className="shrink-0 text-[10px] font-semibold text-ink-faint hover:text-danger"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {buildTimeAvailable && !hasUserKey && (
                  <p className="flex items-start gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[10px] leading-relaxed text-ink-muted">
                    <Icon name="check-circle" size={11} className="mt-0.5 shrink-0 text-success" />
                    This deployment has a built-in key. Add yours to override it.
                  </p>
                )}
                <label htmlFor={`${id}-key`} className="sr-only">
                  {definition.label} API key
                </label>
                <div className="flex gap-1.5">
                  <input
                    id={`${id}-key`}
                    type="password"
                    value={keyDraft}
                    onChange={(event) => setKeyDraft(event.target.value)}
                    placeholder={definition.keyPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="input min-w-0 flex-1"
                  />
                  <button onClick={handleSaveKey} className="btn btn-sm btn-primary shrink-0">
                    <Icon name="key" size={11} />
                    Save
                  </button>
                </div>
                <p className="text-[9.5px] leading-relaxed text-ink-faint">
                  Stored in this browser only and sent straight to {definition.label}. Never
                  committed to the repository.
                </p>
              </div>
            )}

            {keyStatus && (
              <p
                role="status"
                className={`mt-1.5 text-[10px] leading-relaxed ${
                  keyStatus.tone === 'ok' ? 'text-success' : 'text-ink-muted'
                }`}
              >
                {keyStatus.text}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => void handleTestConnection()}
                disabled={testing || !apiKey.trim()}
                data-loading={testing ? 'true' : 'false'}
                className="btn btn-sm btn-secondary"
                title="Send one tiny request to verify the key, model, and endpoint"
              >
                <Icon
                  name={testing ? 'refresh' : 'zap'}
                  size={11}
                  className={testing ? 'animate-spin' : ''}
                />
                {testing ? 'Testing…' : 'Test connection'}
              </button>
              <span className="text-[9px] leading-relaxed text-ink-faint">
                A real 1-token request — not just a model list.
              </span>
            </div>

            {testResult && (
              <div
                role="status"
                className={`mt-2 flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[10.5px] leading-relaxed ${
                  testResult.ok
                    ? 'border-success/25 bg-success/[0.06] text-ink'
                    : 'border-danger/25 bg-danger/[0.06] text-danger'
                }`}
              >
                <Icon
                  name={testResult.ok ? 'check-circle' : 'alert'}
                  size={12}
                  className={`mt-0.5 shrink-0 ${testResult.ok ? 'text-success' : 'text-danger'}`}
                />
                <div className="min-w-0">
                  <p>{testResult.message}</p>
                  {testResult.ok && (
                    <p className="mt-0.5 font-mono text-[9px] text-ink-faint">
                      {testResult.latency}ms · {testResult.model}
                      {testResult.sample ? ` · “${testResult.sample}”` : ''}
                    </p>
                  )}
                  {!testResult.ok && testResult.latency > 0 && (
                    <p className="mt-0.5 font-mono text-[9px] text-danger/70">
                      {testResult.latency}ms · {testResult.model}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Model --------------------------------------------------------- */}
        <section className="rounded-2xl border border-line bg-surface p-3.5">
          <SectionTitle
            icon="sparkles"
            title="Model"
            hint={
              !apiKey.trim()
                ? 'built-in list'
                : usedFallback
                  ? 'built-in models'
                  : 'from your key'
            }
          />

          <div className="mt-2.5 flex gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="search"
                value={modelQuery}
                onChange={(event) => setModelQuery(event.target.value)}
                placeholder="Search models…"
                aria-label="Search models"
                className="input h-9 py-0 pl-8 pr-2"
              />
            </div>
            <button
              onClick={loadModels}
              disabled={loadingModels}
              className="btn btn-sm btn-secondary shrink-0"
              title="Load the models available to this key"
            >
              <Icon name="refresh" size={11} className={loadingModels ? 'animate-spin' : ''} />
              Load
            </button>
          </div>

          <div
            role="listbox"
            aria-label="Available models"
            className="scroll-thin mt-2 max-h-[218px] min-h-[74px] overflow-y-auto rounded-xl border border-line bg-surface-2 p-1"
          >
            {loadingModels ? (
              <div className="space-y-1 p-1">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-center gap-2 rounded-lg px-2 py-2">
                    <span className="shimmer h-3 w-3 rounded" />
                    <span
                      className="shimmer h-2.5 rounded-full"
                      style={{ width: `${120 + row * 22}px` }}
                    />
                  </div>
                ))}
              </div>
            ) : filteredModels.length === 0 ? (
              <p className="px-3 py-4 text-center text-[11px] text-ink-faint">
                No model matches “{modelQuery}”.
              </p>
            ) : (
              filteredModels.map((model) => {
                const active = settings.model === model.value;
                return (
                  <button
                    key={model.value}
                    role="option"
                    aria-selected={active}
                    onClick={() => handleChange('model', model.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                      active ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-3'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-medium">
                        {model.label}
                      </span>
                      {model.label !== model.value && (
                        <span className="block truncate font-mono text-[8.5px] text-ink-faint">
                          {model.value}
                        </span>
                      )}
                    </span>
                    {active && <Icon name="check" size={11} strokeWidth={2.2} className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <p className="mt-1.5 flex items-center justify-between gap-2 text-[9.5px] text-ink-faint">
            <span>
              {models.length} model{models.length === 1 ? '' : 's'} ·{' '}
              {apiKey.trim()
                ? usedFallback
                  ? 'built-in list — key was not readable'
                  : 'live from your key'
                : 'add a key to load every model'}
            </span>
            {!apiKey.trim() && (
              <button
                onClick={() => {
                  const field = document.getElementById(`${id}-key`);
                  field?.focus();
                }}
                className="shrink-0 font-semibold text-accent hover:underline"
              >
                Add key
              </button>
            )}
          </p>

          <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-accent">
              <Icon name="bulb" size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold text-ink">Thinking mode</p>
              <p className="mt-0.5 text-[9px] leading-relaxed text-ink-faint">
                Lets a supported model plan before it writes. On by default; a complex page can
                take longer, but the first draft is usually more coherent.
              </p>
            </div>
            <button
              onClick={() => onThinkingChange(!isThinking)}
              role="switch"
              aria-checked={isThinking}
              aria-label="Thinking mode"
              className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
                isThinking
                  ? 'border-accent/40 bg-accent'
                  : 'border-line-strong bg-surface-3'
              }`}
            >
              <span
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all ${
                  isThinking ? 'left-[18px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Project ------------------------------------------------------- */}
        <section className="rounded-2xl border border-line bg-surface p-3.5">
          <SectionTitle icon="layers" title="Project" />

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {PROJECT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => onProjectTypeChange(type.value)}
                aria-pressed={projectType === type.value}
                className={`flex items-start gap-2 rounded-xl border p-2 text-left transition-colors ${
                  projectType === type.value
                    ? 'border-accent/40 bg-accent-soft'
                    : 'border-line bg-surface-2 hover:border-line-strong'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                    projectType === type.value
                      ? 'bg-accent/15 text-accent'
                      : 'bg-surface text-ink-faint'
                  }`}
                >
                  <Icon name={PROJECT_ICONS[type.value]} size={12} />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[11px] font-semibold ${
                      projectType === type.value ? 'text-accent' : 'text-ink'
                    }`}
                  >
                    {type.label}
                  </span>
                  <span className="mt-0.5 block text-[9px] leading-snug text-ink-faint">
                    {type.previewable ? 'No build step' : 'Live preview + scaffold'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
              Site structure
            </span>
            <div className="mt-1 flex gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
              {SITE_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSiteModeChange(option.value)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[10.5px] font-semibold transition-colors ${
                    siteMode === option.value
                      ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                      : 'text-ink-faint hover:text-ink'
                  }`}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[9.5px] leading-relaxed text-ink-faint">
              {SITE_MODE_OPTIONS.find((option) => option.value === siteMode)?.description} The
              preview gains page tabs as soon as a second page exists.
            </p>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                Styling
              </span>
              {projectType === 'vanilla' && (
                <span className="text-[9px] text-ink-faint">Tailwind needs a framework</span>
              )}
            </div>
            <div className="mt-1 flex gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
              {STYLING_OPTIONS.map((option) => {
                const disabled = option.value === 'tailwind' && projectType === 'vanilla';
                return (
                  <button
                    key={option.value}
                    onClick={() => onStylingChange(option.value)}
                    disabled={disabled}
                    title={disabled ? 'Tailwind is available for React, Vue, and Next.js projects.' : option.hint}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[10.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      styling === option.value
                        ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                        : 'text-ink-faint hover:text-ink'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[9.5px] leading-relaxed text-ink-faint">
              {styling === 'tailwind' && projectType !== 'vanilla'
                ? 'The export includes Tailwind v4 and the Vite plugin, already wired up.'
                : 'Readable CSS with custom properties. Works everywhere.'}
            </p>
          </div>
        </section>

        {/* Custom instructions ------------------------------------------ */}
        <section className="rounded-2xl border border-line bg-surface">
          <details open={Boolean(systemInstruction.trim())}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-ink-muted">
                <Icon name="sliders" size={12} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
                Extra instructions
              </span>
              <span className="ml-auto text-[9.5px] text-ink-faint">
                {systemInstruction.trim() ? 'Active' : 'Optional'}
              </span>
              <Icon name="chevron-down" size={11} className="text-ink-faint" />
            </summary>
            <div className="border-t border-line px-3.5 py-3">
              <label htmlFor={`${id}-system`} className="sr-only">
                Extra instructions added to every request
              </label>
              <textarea
                id={`${id}-system`}
                value={systemInstruction}
                onChange={(event) => onSystemInstructionChange(event.target.value)}
                placeholder="Use only system fonts. Keep the palette warm and neutral. Always include a contact section."
                className="scroll-thin h-24 w-full resize-none rounded-xl border border-line bg-surface-2 p-2.5 text-[11.5px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-accent/40"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[9.5px] leading-relaxed text-ink-faint">
                  Added to every request, after the built-in design and fidelity rules.
                </p>
                {systemInstruction.trim() && (
                  <button
                    onClick={() => onSystemInstructionChange('')}
                    className="shrink-0 text-[10px] font-semibold text-ink-faint hover:text-danger"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </details>
        </section>

        {/* Advanced ------------------------------------------------------ */}
        <section className="rounded-2xl border border-line bg-surface">
          <button
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
            className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-ink-muted">
              <Icon name="sliders" size={12} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
              Model controls
            </span>
            <span className="ml-auto text-[9.5px] text-ink-faint">
              {advancedOpen ? 'Hide' : 'Temperature, tokens'}
            </span>
            <Icon
              name="chevron-down"
              size={11}
              className={`text-ink-faint transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {advancedOpen && (
            <div className="space-y-3 border-t border-line px-3.5 py-3">
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
                    <label htmlFor={`${id}-${key}`} className="text-[10.5px] text-ink-muted">
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
                      className="w-16 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-right text-[10.5px] tabular-nums text-ink-faint outline-none transition-colors hover:border-line focus:border-line focus:bg-surface"
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
            </div>
          )}
        </section>

        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5">
          <Icon name="shield" size={12} className="mt-0.5 shrink-0 text-success" />
          <p className="text-[9.5px] leading-relaxed text-ink-faint">
            There is no backend. Keys live in this browser’s storage, requests go straight to the
            provider, and the preview runs in a sandbox it cannot escape.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
