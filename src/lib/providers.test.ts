import { describe, expect, it } from 'vitest';
import {
  PROVIDERS,
  baseUrlFor,
  getProvider,
  isFallbackModelList,
  isProviderId,
  providerErrorFromResponse,
  testProviderConnection,
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

describe('isFallbackModelList', () => {
  it('recognises a copied fallback list by value, not by array identity', () => {
    const fallback = getProvider('gemini').fallbackModels;
    const copy = fallback.map((model) => ({ ...model }));
    expect(isFallbackModelList('gemini', copy)).toBe(true);
  });

  it('treats a key-specific list as live', () => {
    expect(
      isFallbackModelList('openai', [
        { value: 'gpt-5.2', label: 'GPT-5.2' },
        { value: 'gpt-5.2-mini', label: 'gpt-5.2-mini' },
      ]),
    ).toBe(false);
  });
});

describe('providerErrorFromResponse', () => {
  it('keeps the status and the provider detail', async () => {
    const response = new Response(JSON.stringify({ error: { message: 'No credits remaining' } }), {
      status: 402,
    });
    const error = await providerErrorFromResponse(response);

    expect(error.status).toBe(402);
    expect(error.message).toContain('out of credits');
    expect(error.message).toContain('No credits remaining');
  });

  it('mentions Retry-After on a rate limit', async () => {
    const response = new Response('slow down', {
      status: 429,
      headers: { 'retry-after': '12' },
    });
    const error = await providerErrorFromResponse(response);

    expect(error.message).toContain('Rate limit');
    expect(error.message).toContain('12 seconds');
  });

  it('strips HTML from a gateway error page', async () => {
    const response = new Response('<html><body><h1>Bad gateway</h1></body></html>', {
      status: 502,
    });
    const error = await providerErrorFromResponse(response);

    expect(error.message).not.toContain('<');
    expect(error.message).toContain('Bad gateway');
  });
});

describe('testProviderConnection', () => {
  it('returns ok when an OpenAI-compatible model answers', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), {
        status: 200,
      })) as typeof fetch;

    const result = await testProviderConnection({
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-5.2',
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(result.sample).toBe('OK');
    expect(result.model).toBe('gpt-5.2');
  });

  it('returns a readable failure for a rejected key', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
        status: 401,
      })) as typeof fetch;

    const result = await testProviderConnection({
      provider: 'openrouter',
      apiKey: 'bad-key',
      model: 'some-model',
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('API key was rejected');
    expect(result.message).toContain('Invalid API key');
  });

  it('fails when the endpoint returns no text', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), {
        status: 200,
      })) as typeof fetch;

    const result = await testProviderConnection({
      provider: 'nvidia',
      apiKey: 'nvapi-test',
      model: 'some-model',
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/returned no text/i);
  });

  it('reads an Anthropic content array', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ content: [{ type: 'text', text: 'OK' }] }), {
        status: 200,
      })) as typeof fetch;

    const result = await testProviderConnection({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-6',
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(result.sample).toBe('OK');
  });

  it('does not call the network without a key', async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const result = await testProviderConnection({
      provider: 'openai',
      apiKey: '  ',
      model: 'gpt-5.2',
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });
});
