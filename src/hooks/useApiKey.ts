import { useCallback, useEffect, useState } from 'react';
import {
  clearStoredKey,
  hasBuildTimeKey,
  readStoredKey,
  resolveApiKey,
  storeKey,
} from '../lib/apiKey';

/**
 * Holds the API key for this browser session.
 *
 * The visitor's key is kept in local storage so a reload does not lose it,
 * and is never transmitted anywhere except to Google's API.
 */
export function useApiKey() {
  const [runtimeKey, setRuntimeKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [buildTimeAvailable] = useState(hasBuildTimeKey);

  useEffect(() => {
    const stored = readStoredKey();
    if (stored) {
      setRuntimeKey(stored);
      setHasKey(true);
    } else {
      setHasKey(hasBuildTimeKey());
    }
  }, []);

  const saveKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      clearStoredKey();
      setRuntimeKey('');
      setHasKey(hasBuildTimeKey());
      return { ok: true, persisted: false };
    }
    const persisted = storeKey(trimmed);
    setRuntimeKey(trimmed);
    setHasKey(true);
    return { ok: true, persisted };
  }, []);

  const forgetKey = useCallback(() => {
    clearStoredKey();
    setRuntimeKey('');
    setHasKey(hasBuildTimeKey());
  }, []);

  return {
    /** The key to send with a request. */
    apiKey: resolveApiKey(runtimeKey),
    /** Whether a usable key is available. */
    hasKey,
    /** True when this deployment ships with a build-time key. */
    buildTimeAvailable,
    /** True when the visitor supplied their own key. */
    hasUserKey: runtimeKey.length > 0,
    saveKey,
    forgetKey,
  };
}
