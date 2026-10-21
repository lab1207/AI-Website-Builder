import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import ProviderMark from './ProviderMark';
import {
  PROVIDERS,
  getProvider,
  isFallbackModelList,
  listProviderModels,
  type ModelOption,
  type ProviderId,
} from '../lib/providers';

interface ModelPickerProps {
  provider: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  apiKey: string;
  customBaseUrl: string;
  model: string;
  onModelChange: (model: string) => void;
  savedProviders: ProviderId[];
  hasUserKey: boolean;
  onManageProviders: () => void;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * The model switcher.
 *
 * It is deliberately a first-class control rather than a line buried in
 * settings: choose the provider, search the live model list, refresh it, and
 * see whether the list came from the account or from the built-in fallback.
 */
const ModelPicker: React.FC<ModelPickerProps> = ({
  provider,
  onProviderChange,
  apiKey,
  customBaseUrl,
  model,
  onModelChange,
  savedProviders,
  hasUserKey,
  onManageProviders,
  align = 'right',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  const definition = getProvider(provider);
  const selected =
    models.find((option) => option.value === model) ??
    definition.fallbackModels.find((option) => option.value === model);
  const currentLabel = selected?.label ?? model ?? definition.defaultModel;

  const load = async () => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    setLoading(true);
    try {
      const available = await listProviderModels(provider, apiKey, customBaseUrl);
      if (requestRef.current !== request) return;
      setModels(available);
      setUsedFallback(isFallbackModelList(provider, available));
    } finally {
      if (requestRef.current === request) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    const focus = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(focus);
    // The list follows the provider, the key, and the endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider, apiKey, customBaseUrl]);

  // Keep a valid selection when the provider or the live list changes.
  useEffect(() => {
    if (!open || models.length === 0) return;
    if (models.some((option) => option.value === model)) return;
    const preferred =
      models.find((option) => option.value === definition.defaultModel) ?? models[0];
    onModelChange(preferred.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return models;
    return models.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle),
    );
  }, [models, query]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Model: ${currentLabel}. Change model`}
        className={`group inline-flex h-9 max-w-full items-center gap-2 rounded-xl border px-2.5 text-left transition-colors ${
          open
            ? 'border-line-strong bg-surface-3'
            : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
        }`}
      >
        <ProviderMark provider={provider} size={20} />
        <span className="min-w-0">
          <span className="block truncate text-[11.5px] font-semibold leading-tight text-ink">
            {currentLabel.replace(/\s*\(.*?\)\s*$/, '')}
          </span>
          <span className="block truncate text-[8.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {definition.label}
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={12}
          className={`ml-0.5 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a model"
          className={`popover absolute top-full z-50 mt-2 w-[348px] max-w-[calc(100vw-24px)] overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="border-b border-line px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Provider & model
              </p>
              {savedProviders.includes(provider) && (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  key saved
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <ProviderMark provider={provider} size={26} />
              <select
                value={provider}
                onChange={(event) => onProviderChange(event.target.value as ProviderId)}
                aria-label="Provider"
                className="input h-9 cursor-pointer appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat py-0 pr-7 text-[12px] font-semibold"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9185' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                }}
              >
                {PROVIDERS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                    {savedProviders.includes(entry.id) ? ' · key saved' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-b border-line p-2.5">
            <div className="flex items-center gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Icon
                  name="search"
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search models…"
                  aria-label="Search models"
                  className="input h-9 py-0 pl-8 pr-2 text-[12px]"
                />
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="btn btn-icon btn-secondary shrink-0"
                aria-label="Reload the model list"
                title="Reload the model list"
              >
                <Icon
                  name="refresh"
                  size={13}
                  className={loading ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>

          <div
            role="listbox"
            aria-label="Available models"
            className="scroll-thin max-h-[286px] overflow-y-auto p-1.5"
          >
            {loading && (
              <div className="space-y-1 p-1">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-2 rounded-lg px-2 py-2">
                    <span className="shimmer h-3.5 w-3.5 rounded" />
                    <span
                      className="shimmer h-2.5 rounded-full"
                      style={{ width: `${120 + row * 18}px` }}
                    />
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-[12px] font-medium text-ink">No model matches “{query}”</p>
                <p className="mt-1 text-[10.5px] text-ink-faint">
                  Try a shorter search, or reload the list.
                </p>
              </div>
            )}

            {!loading &&
              filtered.map((option) => {
                const active = option.value === model;
                return (
                  <button
                    key={option.value}
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onModelChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`flex w-full items-start justify-between gap-2 rounded-[9px] px-2.5 py-2 text-left transition-colors ${
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-ink hover:bg-surface-2'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium">
                        {option.label}
                      </span>
                      {option.label !== option.value && (
                        <span className="mt-0.5 block truncate font-mono text-[9px] text-ink-faint">
                          {option.value}
                        </span>
                      )}
                    </span>
                    {active && (
                      <span className="mt-0.5 shrink-0 text-accent">
                        <Icon name="check" size={12} strokeWidth={2.2} />
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/60 px-3 py-2">
            <p className="min-w-0 text-[10px] leading-tight text-ink-faint">
              {loading
                ? 'Reading models…'
                : `${models.length} model${models.length === 1 ? '' : 's'} · ${
                    apiKey.trim()
                      ? usedFallback
                        ? 'built-in list (key could not be read)'
                        : 'live from your key'
                      : 'built-in list'
                  }`}
            </p>
            <button
              onClick={() => {
                setOpen(false);
                onManageProviders();
              }}
              className="shrink-0 text-[10.5px] font-semibold text-accent hover:underline"
            >
              {hasUserKey ? 'Manage' : 'Add key'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelPicker;
