import { describe, expect, it } from 'vitest';
import { looksLikeGeminiKey, resolveApiKey } from './apiKey';

describe('looksLikeGeminiKey', () => {
  it('accepts a well-formed key', () => {
    expect(looksLikeGeminiKey(`AIza${'a'.repeat(35)}`)).toBe(true);
  });

  it('rejects an empty value', () => {
    expect(looksLikeGeminiKey('')).toBe(false);
    expect(looksLikeGeminiKey('   ')).toBe(false);
  });

  it('rejects a key that does not start with AIza', () => {
    expect(looksLikeGeminiKey(`sk-${'a'.repeat(40)}`)).toBe(false);
  });

  it('rejects a key with whitespace inside it', () => {
    expect(looksLikeGeminiKey(`AIza ${'a'.repeat(35)}`)).toBe(false);
    expect(looksLikeGeminiKey(`AIza${'a'.repeat(15)} ${'b'.repeat(15)}`)).toBe(false);
  });

  it('accepts a pasted key with surrounding whitespace', () => {
    // Pasting from a terminal or a password manager often adds a newline.
    expect(looksLikeGeminiKey(`\n  AIza${'a'.repeat(35)}  \n`)).toBe(true);
  });

  it('rejects a truncated key', () => {
    expect(looksLikeGeminiKey('AIzaShort')).toBe(false);
  });
});

describe('resolveApiKey', () => {
  it('prefers the key the visitor supplied', () => {
    expect(resolveApiKey('  AIzaVisitor  ')).toBe('AIzaVisitor');
  });

  it('falls back to the build-time key when there is no runtime key', () => {
    // There is no build-time key in the test environment, so this resolves to
    // an empty string rather than throwing.
    expect(resolveApiKey('')).toBe('');
    expect(resolveApiKey('   ')).toBe('');
  });
});
