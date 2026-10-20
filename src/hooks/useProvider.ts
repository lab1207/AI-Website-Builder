import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearStoredKey,
  hasBuildTimeKey,
  readCustomBaseUrl,
  readStoredKeys,
  resolveApiKey,
  storeCustomBaseUrl,
  storeKey,
  type KeyMap,
} from '../lib/apiKey';
import {
  DEFAULT_PROVIDER,
  getProvider,
  isProviderId,
  PROVIDERS,
  type ProviderId,
} from '../lib/providers';

const PROVIDER_STORAGE_KEY = 'ai-website-builder:provider:v1';

function readStoredProvider(): ProviderId {
  try {
    const stored = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (stored && isProviderId(stored)) return stored;

    // Nothing chosen yet: fall back to whichever provider already has a key.
    const keys = readStoredKeys();
    const withKey = PROVIDERS.find((provider) => keys[provider.id]);
    if (withKey) return withKey.id;
  } catch {
    // Storage can be blocked.
  }
  return DEFAULT_PROVIDER;
}

/**
 * Holds the provider, the key for that provider, and a custom base URL.
 *
 * Everything lives in this browser. Keys are stored one per provider so a
 * visitor can switch between Gemini and Claude without retyping them, and
 * nothing is ever sent anywhere except the provider they picked.
 */
export function useProvider() {
  const [provider, setProviderState] = useState<ProviderId>(readStoredProvider);
  const [keys, setKeys] = useState<KeyMap>({});
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [buildTimeAvailable] = useState(hasBuildTimeKey);

  useEffect(() => {
    setKeys(readStoredKeys());
    setCustomBaseUrl(readCustomBaseUrl());
  }, []);

  const selectProvider = useCallback((next: ProviderId) => {
    if (!isProviderId(next)) return;
    setProviderState(next);
    try {
      window.localStorage.setItem(PROVIDER_STORAGE_KEY, next);
    } catch {
      // Not important enough to fail on.
    }
  }, []);

  const saveKey = useCallback(
    (target: ProviderId, key: string) => {
      const persisted = storeKey(target, key.trim());
      setKeys(readStoredKeys());
      return { ok: true, persisted };
    },
    [],
  );

  const forgetKey = useCallback((target: ProviderId) => {
    clearStoredKey(target);
    setKeys(readStoredKeys());
  }, []);

  const saveCustomBaseUrl = useCallback((url: string) => {
    storeCustomBaseUrl(url);
    setCustomBaseUrl(url.trim());
  }, []);

  const definition = useMemo(() => getProvider(provider), [provider]);
  const runtimeKey = keys[provider] ?? '';
  // The build-time key only ever applies to Gemini, matching the original env var.
  const hasBuildTimeForProvider = provider === 'gemini' && buildTimeAvailable;

  const apiKey = useMemo(
    () => (runtimeKey ? runtimeKey : hasBuildTimeForProvider ? resolveApiKey(provider, '') : ''),
    [runtimeKey, provider, hasBuildTimeForProvider],
  );

  return {
    /** The provider currently selected. */
    provider,
    /** The provider definition for the current selection. */
    definition,
    selectProvider,
    /** The resolved key to send with a request. */
    apiKey,
    /** Whether a usable key is available for the current provider. */
    hasKey: apiKey.trim().length > 0,
    /** True when this deployment ships with its own Gemini key. */
    buildTimeAvailable: hasBuildTimeForProvider,
    /** The visitor's own key for the current provider, without build-time. */
    runtimeKey,
    /** True when the visitor supplied their own key for this provider. */
    hasUserKey: runtimeKey.length > 0,
    /** Which providers already have a saved key, in picker order. */
    savedProviders: PROVIDERS.filter((entry) => keys[entry.id]).map((entry) => entry.id),
    keys,
    saveKey,
    forgetKey,
    customBaseUrl,
    saveCustomBaseUrl,
  };
}
