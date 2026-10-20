/**
 * API key storage.
 *
 * Keys a visitor types live in their browser only, one per provider. A Gemini
 * key baked in at build time is supported as a fallback for private self-hosted
 * deployments, but it is never required and never leaves the machine.
 */

import type { ProviderId } from './providers';
import { isProviderId } from './providers';

const STORAGE_KEY = 'ai-website-builder:api-keys:v2';
/** The single-key layout the builder used before providers existed. */
const LEGACY_KEY = 'ai-website-builder:api-key:v1';
const CUSTOM_BASE_KEY = 'ai-website-builder:custom-base-url:v1';

/** A key provided at build time, if the deployer chose to set one. */
declare const __BUILD_TIME_API_KEY__: string;

const BUILD_TIME_KEY = typeof __BUILD_TIME_API_KEY__ === 'string'
  ? __BUILD_TIME_API_KEY__
  : '';

export type KeyMap = Partial<Record<ProviderId, string>>;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Reads the saved keys, migrating an older single-key layout if present. */
export function readStoredKeys(): KeyMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed as KeyMap;
      return {};
    }

    // First run with this version: adopt the old key as the Gemini key.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return {};

    const migrated: KeyMap = { gemini: legacy };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    window.localStorage.removeItem(LEGACY_KEY);
    return migrated;
  } catch {
    // Storage can be blocked in strict privacy modes.
    return {};
  }
}

/** Persists the key map. Returns false if storage was unavailable. */
export function storeKeys(keys: KeyMap): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    return true;
  } catch {
    return false;
  }
}

/** Saves one provider's key, replacing any key already there. */
export function storeKey(provider: ProviderId, key: string): boolean {
  const keys = readStoredKeys();
  if (key.trim()) keys[provider] = key.trim();
  else delete keys[provider];
  return storeKeys(keys);
}

/** Removes one provider's key from this browser. */
export function clearStoredKey(provider: ProviderId): void {
  const keys = readStoredKeys();
  delete keys[provider];
  storeKeys(keys);
}

export function readCustomBaseUrl(): string {
  if (!isBrowser()) return '';
  try {
    return window.localStorage.getItem(CUSTOM_BASE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeCustomBaseUrl(url: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CUSTOM_BASE_KEY, url.trim());
  } catch {
    // Not important enough to fail on.
  }
}

/** Removes every stored key and custom base URL. */
export function clearAllKeys(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.removeItem(CUSTOM_BASE_KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * The key to use for a request: the visitor's own key if they entered one,
 * otherwise the build-time key when the deployer supplied one.
 */
export function resolveApiKey(provider: ProviderId, runtimeKey: string): string {
  const runtime = runtimeKey.trim();
  if (runtime) return runtime;
  // Only Gemini has a build-time hook, because that is the single key the
  // original deployment env var described.
  if (provider === 'gemini') return BUILD_TIME_KEY.trim();
  return '';
}

/** True when a build-time key is bundled into this deployment. */
export function hasBuildTimeKey(): boolean {
  return BUILD_TIME_KEY.length > 0;
}

const KEY_PATTERNS: Partial<Record<ProviderId, RegExp>> = {
  gemini: /^AIza/,
  openai: /^sk-/,
  openrouter: /^sk-or-/,
  anthropic: /^sk-ant-/,
  nvidia: /^nvapi-/,
};

/**
 * A cheap sanity check that catches pasted whitespace, a truncated key, or a
 * key that belongs to a different provider before it is sent anywhere.
 *
 * Unknown providers and custom endpoints accept any value, because there is
 * no shared pattern to check against.
 */
export function looksLikeProviderKey(provider: ProviderId, value: string): boolean {
  if (!isProviderId(provider)) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false;
  if (trimmed.length < 20) return false;

  const pattern = KEY_PATTERNS[provider];
  if (!pattern) return true;
  return pattern.test(trimmed);
}
