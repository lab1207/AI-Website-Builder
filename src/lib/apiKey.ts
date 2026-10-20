/**
 * API key storage.
 *
 * The key a visitor types lives in their browser only. A key baked in at
 * build time is supported as a fallback for private self-hosted deployments,
 * but it is never required and never leaves the machine.
 */

const STORAGE_KEY = 'ai-website-builder:api-key:v1';

/** A key provided at build time, if the deployer chose to set one. */
declare const __BUILD_TIME_API_KEY__: string;

const BUILD_TIME_KEY = typeof __BUILD_TIME_API_KEY__ === 'string'
  ? __BUILD_TIME_API_KEY__
  : '';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Reads the visitor's key from local storage, if one was saved. */
export function readStoredKey(): string {
  if (!isBrowser()) return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    // Storage can be blocked in strict privacy modes.
    return '';
  }
}

/** Persists the visitor's key. Returns false if storage was unavailable. */
export function storeKey(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
    return true;
  } catch {
    return false;
  }
}

/** Removes the saved key from this browser. */
export function clearStoredKey(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * The key to use for a request: the visitor's own key if they entered one,
 * otherwise the build-time key when the deployer supplied one.
 */
export function resolveApiKey(runtimeKey: string): string {
  const runtime = runtimeKey.trim();
  if (runtime) return runtime;
  return BUILD_TIME_KEY.trim();
}

/** True when a build-time key is bundled into this deployment. */
export function hasBuildTimeKey(): boolean {
  return BUILD_TIME_KEY.length > 0;
}

/**
 * A Gemini API key is expected to look like `AIza...`. This is a cheap sanity
 * check that catches pasted whitespace, wrong quotes, or a truncated key
 * before it is sent to the API.
 */
export function looksLikeGeminiKey(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false;
  return trimmed.startsWith('AIza') && trimmed.length >= 30;
}
