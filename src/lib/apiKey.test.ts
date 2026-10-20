import { describe, expect, it } from 'vitest';
import { resolveApiKey, looksLikeProviderKey } from './apiKey';

describe('looksLikeProviderKey', () => {
  it('accepts a well-formed key for each provider', () => {
    expect(looksLikeProviderKey('gemini', `AIza${'a'.repeat(35)}`)).toBe(true);
    expect(looksLikeProviderKey('openai', `sk-${'a'.repeat(40)}`)).toBe(true);
    expect(looksLikeProviderKey('openrouter', `sk-or-${'a'.repeat(40)}`)).toBe(true);
    expect(looksLikeProviderKey('anthropic', `sk-ant-${'a'.repeat(40)}`)).toBe(true);
    expect(looksLikeProviderKey('nvidia', `nvapi-${'a'.repeat(40)}`)).toBe(true);
  });

  it('accepts any key for a custom endpoint', () => {
    expect(looksLikeProviderKey('custom', 'some-other-format-key-12345')).toBe(true);
  });

  it('rejects an empty value', () => {
    expect(looksLikeProviderKey('gemini', '')).toBe(false);
    expect(looksLikeProviderKey('gemini', '   ')).toBe(false);
  });

  it('rejects a key that went to the wrong provider', () => {
    // A Gemini key must not be accepted as an OpenAI key.
    expect(looksLikeProviderKey('openai', `AIza${'a'.repeat(35)}`)).toBe(false);
    expect(looksLikeProviderKey('anthropic', `sk-${'a'.repeat(40)}`)).toBe(false);
    expect(looksLikeProviderKey('gemini', `sk-${'a'.repeat(40)}`)).toBe(false);
  });

  it('rejects a key with whitespace inside it', () => {
    expect(looksLikeProviderKey('gemini', `AIza ${'a'.repeat(35)}`)).toBe(false);
    expect(looksLikeProviderKey('gemini', `AIza${'a'.repeat(15)} ${'b'.repeat(15)}`)).toBe(false);
  });

  it('accepts a pasted key with surrounding whitespace', () => {
    // Pasting from a terminal or a password manager often adds a newline.
    expect(looksLikeProviderKey('gemini', `\n  AIza${'a'.repeat(35)}  \n`)).toBe(true);
  });

  it('rejects a truncated key', () => {
    expect(looksLikeProviderKey('gemini', 'AIzaShort')).toBe(false);
  });

  it('rejects an unknown provider id', () => {
    expect(looksLikeProviderKey('nope' as never, 'AIzaTokenThatIsLongEnoughToPass')).toBe(false);
  });
});

describe('resolveApiKey', () => {
  it('prefers the key the visitor supplied', () => {
    expect(resolveApiKey('gemini', '  AIzaVisitor  ')).toBe('AIzaVisitor');
  });

  it('falls back to the build-time key when there is no runtime key', () => {
    // There is no build-time key in the test environment, so this resolves to
    // an empty string rather than throwing.
    expect(resolveApiKey('gemini', '')).toBe('');
    expect(resolveApiKey('gemini', '   ')).toBe('');
  });

  it('never uses the build-time key for another provider', () => {
    // Only Gemini has a build-time hook, because that is the single env var
    // the original deployment described. Other providers must stay empty.
    expect(resolveApiKey('openai', '')).toBe('');
    expect(resolveApiKey('anthropic', '')).toBe('');
  });
});
