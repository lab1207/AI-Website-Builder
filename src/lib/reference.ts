import type { Attachment } from '../types';

/*
 * Source capture without a backend.
 *
 * A browser cannot screenshot another origin itself. Two small public services
 * do that one job: image.thum.io (or Microlink as a fallback) renders the page
 * to a PNG, and r.jina.ai returns a readable text snapshot. Both allow browser
 * CORS. The visitor is told which services see the URL, and a failure is always
 * shown with the reason — never replaced by a silent retry loop.
 */

const SCREENSHOT_TIMEOUT_MS = 55_000;
const TEXT_TIMEOUT_MS = 25_000;
const MAX_PAGE_TEXT = 24_000;

export interface WebsiteReference {
  url: string;
  title: string;
  image: Attachment;
  pageText?: Attachment;
  warnings: string[];
  screenshotService: string;
}

export class ReferenceError extends Error {
  constructor(
    message: string,
    readonly service?: string,
  ) {
    super(message);
    this.name = 'ReferenceError';
  }
}

export function normalizeWebsiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function hostLabel(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./, '');
  } catch {
    return input;
  }
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new ReferenceError(
        `The source took longer than ${Math.round(timeoutMs / 1000)} seconds to respond.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new ReferenceError('The screenshot could not be read.'));
      reader.readAsDataURL(blob);
    });
  }

  // Node and non-DOM workers. Kept in one place so tests can exercise the
  // actual conversion path rather than a stub.
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
}

async function readImageResponse(
  response: Response,
  service: string,
): Promise<{ dataUrl: string; size: number }> {
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.startsWith('image/')) {
    throw new ReferenceError(`${service} did not return a screenshot.`, service);
  }
  const blob = await response.blob();
  if (blob.size < 1_000) {
    throw new ReferenceError(`${service} returned an empty screenshot.`, service);
  }
  return { dataUrl: await blobToDataUrl(blob), size: blob.size };
}

export async function captureScreenshot(
  url: string,
  options: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<{ dataUrl: string; size: number; service: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? SCREENSHOT_TIMEOUT_MS;
  const attempted: string[] = [];
  let lastDetail = '';

  const renderers: Array<{ name: string; url: string }> = [
    {
      name: 'thum.io',
      url: `https://image.thum.io/get/width/1440/crop/1400/wait/2/noanimate/${url}`,
    },
    {
      name: 'Microlink',
      url: `https://api.microlink.io/?url=${encodeURIComponent(
        url,
      )}&screenshot&embed=screenshot.url&viewport.width=1440&viewport.height=1000&waitFor=1200`,
    },
  ];

  for (const renderer of renderers) {
    attempted.push(renderer.name);
    try {
      const response = await fetchWithTimeout(
        fetchImpl,
        renderer.url,
        { method: 'GET', mode: 'cors', cache: 'no-store' },
        timeoutMs,
        options.signal,
      );
      const image = await readImageResponse(response, renderer.name);
      return { ...image, service: renderer.name };
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      if (error instanceof ReferenceError && error.message) lastDetail = error.message;
      // Try the next renderer, then report both attempts.
    }
  }

  throw new ReferenceError(
    `Could not capture a screenshot of ${hostLabel(url)}. ${attempted.join(
      ' and ',
    )} were unreachable or rate-limited.${
      lastDetail ? ` ${lastDetail}` : ''
    } Try again, upload a screenshot, or paste the page HTML instead.`,
    'screenshot',
  );
}

export async function fetchPageText(
  url: string,
  options: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<{ text: string; title: string } | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      `https://r.jina.ai/${url}`,
      {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: { Accept: 'text/plain' },
      },
      options.timeoutMs ?? TEXT_TIMEOUT_MS,
      options.signal,
    );
    if (!response.ok) return null;
    const raw = (await response.text()).trim();
    if (!raw) return null;

    const titleMatch = raw.match(/^Title:\s*(.+)$/m);
    const contentIndex = raw.indexOf('Markdown Content:');
    const body = contentIndex === -1 ? raw : raw.slice(contentIndex + 'Markdown Content:'.length);
    const text = body.trim().slice(0, MAX_PAGE_TEXT);
    if (!text) return null;
    return { text, title: titleMatch?.[1]?.trim() ?? '' };
  } catch {
    return null;
  }
}

/**
 * Captures a live page as a screenshot plus a text snapshot.
 *
 * The screenshot is required because visual fidelity is the point. Page text is
 * optional: some sites block readers, and a screenshot alone is still enough to
 * rebuild the design.
 */
export async function captureWebsiteReference(
  input: string,
  options: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    screenshotTimeoutMs?: number;
    textTimeoutMs?: number;
  } = {},
): Promise<WebsiteReference> {
  const url = normalizeWebsiteUrl(input);
  if (!url) {
    throw new ReferenceError(
      'Enter a full website address, such as https://studio.example.com.',
      'url',
    );
  }

  const [shotResult, textResult] = await Promise.allSettled([
    captureScreenshot(url, {
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      timeoutMs: options.screenshotTimeoutMs,
    }),
    fetchPageText(url, {
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      timeoutMs: options.textTimeoutMs,
    }),
  ]);

  if (shotResult.status === 'rejected') {
    const error = shotResult.reason as Error;
    if (error.name === 'AbortError') throw error;
    throw error instanceof ReferenceError
      ? error
      : new ReferenceError(error.message || 'The screenshot failed.', 'screenshot');
  }

  const page = textResult.status === 'fulfilled' ? textResult.value : null;
  const title = page?.title || hostLabel(url);
  const warnings: string[] = [];

  const image: Attachment = {
    type: 'image',
    content: shotResult.value.dataUrl,
    mimeType: 'image/png',
    name: `${hostLabel(url)}.png`,
    size: shotResult.value.size,
    sourceUrl: url,
  };

  let pageText: Attachment | undefined;
  if (page) {
    const date = new Date().toISOString().slice(0, 10);
    pageText = {
      type: 'text',
      mimeType: 'text/markdown',
      name: `${hostLabel(url)}-page.md`,
      sourceUrl: url,
      size: new Blob([page.text]).size,
      content: `# Captured website reference

- URL: ${url}
- Page title: ${title}
- Captured: ${date}
- The attached screenshot is the visual source of truth.
- Rebuild the visible structure, palette, typography, imagery, and copy below.

${page.text}`,
    };
  } else {
    warnings.push(
      'The page text could not be read. The screenshot is still attached, so build from its visible content.',
    );
  }

  return {
    url,
    title,
    image,
    pageText,
    warnings,
    screenshotService: shotResult.value.service,
  };
}
