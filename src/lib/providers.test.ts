import { describe, expect, it } from 'vitest';
import {
  PROVIDERS,
  baseUrlFor,
  getProvider,
  isProviderId,
  ProviderError,
} from './providers';

describe('provider catalogue', () => {
  it('exposes the providers a visitor can pick', () => {
    const ids = PROVIDERS.map((provider) => provider.id);
    for (const id of ['gemini', 'openai', 'openrouter', 'nvidia', 'anthropic', 'custom']) {
      expect(ids).toContain(id);
    }
  });

  it('gives every provider a label, a default model, and a protocol', () => {
    for (const provider of PROVIDERS) {
      expect(provider.label.length).toBeGreaterThan(0);
      expect(provider.defaultModel.length).toBeGreaterThan(0);
      expect(['gemini', 'openai', 'anthropic']).toContain(provider.protocol);
      expect(provider.fallbackModels.length).toBeGreaterThan(0);
    }
  });

  it('offers the recommended model as a default for every provider', () => {
    for (const provider of PROVIDERS) {
      const offered = provider.fallbackModels.map((model) => model.value);
      expect(offered).toContain(provider.defaultModel);
    }
  });

  it('marks Gemini and Claude as their own protocol', () => {
    expect(getProvider('gemini').protocol).toBe('gemini');
    expect(getProvider('anthropic').protocol).toBe('anthropic');
  });

  it('groups the OpenAI-compatible providers under the openai protocol', () => {
    expect(getProvider('openai').protocol).toBe('openai');
    expect(getProvider('openrouter').protocol).toBe('openai');
    expect(getProvider('nvidia').protocol).toBe('openai');
    expect(getProvider('custom').protocol).toBe('openai');
  });
});

describe('isProviderId', () => {
  it('accepts a known id', () => {
    expect(isProviderId('gemini')).toBe(true);
    expect(isProviderId('anthropic')).toBe(true);
  });

  it('rejects an unknown id', () => {
    expect(isProviderId('gemni')).toBe(false);
    expect(isProviderId('')).toBe(false);
    // Anything a browser might hand back from storage is untrusted.
    expect(isProviderId('constructor')).toBe(false);
  });
});

describe('getProvider', () => {
  it('returns the definition for a known provider', () => {
    expect(getProvider('openai').label).toBe('OpenAI');
  });

  it('falls back to Gemini for an unknown provider', () => {
    // A corrupted storage value should never crash the settings panel.
    expect(getProvider('nonsense' as never).id).toBe('gemini');
  });
});

describe('baseUrlFor', () => {
  it('points OpenAI-compatible providers at their own host', () => {
    expect(baseUrlFor('openai')).toBe('https://api.openai.com/v1');
    expect(baseUrlFor('openrouter')).toBe('https://openrouter.ai/api/v1');
    expect(baseUrlFor('nvidia')).toBe('https://integrate.api.nvidia.com/v1');
    expect(baseUrlFor('anthropic')).toBe('https://api.anthropic.com');
  });

  it('uses the custom URL when one is supplied', () => {
    expect(baseUrlFor('custom', 'https://llm.example.com/v1')).toBe(
      'https://llm.example.com/v1',
    );
  });

  it('strips trailing slashes from a custom URL', () => {
    expect(baseUrlFor('custom', 'https://llm.example.com/v1/')).toBe(
      'https://llm.example.com/v1',
    );
  });

  it('falls back to the OpenAI endpoint for a bare custom provider', () => {
    expect(baseUrlFor('custom', '')).toBe('https://api.openai.com/v1');
  });

  it('has no base URL for Gemini, which goes through its own SDK', () => {
    expect(baseUrlFor('gemini')).toBe('');
  });
});

describe('ProviderError', () => {
  it('carries the HTTP status so the UI can explain the failure', () => {
    const error = new ProviderError('Rate limit reached.', 429);
    expect(error.message).toBe('Rate limit reached.');
    expect(error.status).toBe(429);
    expect(error.name).toBe('ProviderError');
  });
});
