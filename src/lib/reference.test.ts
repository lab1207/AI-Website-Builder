import { describe, expect, it } from 'vitest';
import {
  captureScreenshot,
  captureWebsiteReference,
  hostLabel,
  normalizeWebsiteUrl,
  ReferenceError,
} from './reference';

const imageResponse = () =>
  new Response(new Uint8Array(2048), {
    status: 200,
    headers: { 'content-type': 'image/png' },
  });

describe('normalizeWebsiteUrl', () => {
  it('adds https and keeps a clean URL', () => {
    expect(normalizeWebsiteUrl('studio.example.com')).toBe('https://studio.example.com/');
  });

  it('keeps an explicit scheme and drops the hash', () => {
    expect(normalizeWebsiteUrl('http://example.com/page#section')).toBe(
      'http://example.com/page',
    );
  });

  it('rejects non-web protocols and nonsense', () => {
    expect(normalizeWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsiteUrl('not a url')).toBeNull();
    expect(normalizeWebsiteUrl('')).toBeNull();
  });
});

describe('hostLabel', () => {
  it('removes www and the path', () => {
    expect(hostLabel('https://www.example.com/deep/page')).toBe('example.com');
  });
});

describe('captureScreenshot', () => {
  it('falls back from one renderer to the next', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('thum.io')) {
        return new Response('rate limited', { status: 429 });
      }
      return imageResponse();
    }) as typeof fetch;

    const result = await captureScreenshot('https://example.com', { fetchImpl });

    expect(calls.some((url) => url.includes('thum.io'))).toBe(true);
    expect(calls.some((url) => url.includes('microlink'))).toBe(true);
    expect(result.service).toBe('Microlink');
    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(result.size).toBe(2048);
  });

  it('reports both services by name when none can render', async () => {
    const fetchImpl = (async () =>
      new Response('nope', { status: 503, headers: { 'content-type': 'text/plain' } })) as typeof fetch;

    await expect(captureScreenshot('https://example.com', { fetchImpl })).rejects.toThrow(
      /thum\.io and Microlink/,
    );
  });

  it('rejects a tiny image as empty', async () => {
    const fetchImpl = (async () =>
      new Response(new Uint8Array(10), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })) as typeof fetch;

    await expect(captureScreenshot('https://example.com', { fetchImpl })).rejects.toThrow(
      /empty screenshot/,
    );
  });
});

describe('captureWebsiteReference', () => {
  it('returns a screenshot plus page text and a title', async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('r.jina.ai')) {
        return new Response('Title: Example Studio\n\nMarkdown Content:\n# Welcome\nReal copy here.', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        });
      }
      return imageResponse();
    }) as typeof fetch;

    const reference = await captureWebsiteReference('example.com', { fetchImpl });

    expect(reference.url).toBe('https://example.com/');
    expect(reference.title).toBe('Example Studio');
    expect(reference.image.type).toBe('image');
    expect(reference.image.sourceUrl).toBe('https://example.com/');
    expect(reference.pageText?.type).toBe('text');
    expect(reference.pageText?.content).toContain('Real copy here.');
    expect(reference.warnings).toEqual([]);
  });

  it('keeps the screenshot and warns when page text fails', async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('r.jina.ai')) {
        return new Response('blocked', { status: 403 });
      }
      return imageResponse();
    }) as typeof fetch;

    const reference = await captureWebsiteReference('example.com', { fetchImpl });

    expect(reference.pageText).toBeUndefined();
    expect(reference.warnings[0]).toMatch(/page text could not be read/i);
  });

  it('throws a ReferenceError for an invalid address', async () => {
    await expect(captureWebsiteReference('not a url')).rejects.toBeInstanceOf(ReferenceError);
  });

  it('surfaces an abort instead of swallowing it', async () => {
    const controller = new AbortController();
    const fetchImpl = (async () => {
      throw new DOMException('Aborted', 'AbortError');
    }) as typeof fetch;

    controller.abort();

    await expect(
      captureScreenshot('https://example.com', { fetchImpl, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
