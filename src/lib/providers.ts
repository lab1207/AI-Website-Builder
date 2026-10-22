import type { Attachment as AppAttachment, RunSettings } from '../types';

/** kept for the local message shape */
export type Attachment = AppAttachment;

/*
 * Multi-provider support.
 *
 * Every provider here speaks a plain HTTP API, so the builder can call it
 * straight from the browser without a server in between. Two wire formats
 * matter: the OpenAI-compatible `/chat/completions` shape (used by OpenAI,
 * OpenRouter, NVIDIA and anything compatible) and Anthropic's `/v1/messages`.
 * Gemini keeps using its own SDK because that is what it ships.
 */

export type ProviderId =
  | 'gemini'
  | 'openai'
  | 'openrouter'
  | 'nvidia'
  | 'anthropic'
  | 'custom';

export interface ModelOption {
  value: string;
  label: string;
}

export interface Provider {
  id: ProviderId;
  label: string;
  /** One line explaining where the key comes from. */
  hint: string;
  /** Placeholder text for the key input. */
  keyPlaceholder: string;
  /** Whether a custom base URL can be set for this provider. */
  customBaseUrl: boolean;
  /** Shown models when the live list cannot be read. */
  fallbackModels: ModelOption[];
  /** The model selected when this provider is first chosen. */
  defaultModel: string;
  /** The wire format the chat endpoint speaks. */
  protocol: 'gemini' | 'openai' | 'anthropic';
  /** Docs link shown in the settings panel. */
  docsUrl: string;
}

const GEMINI_MODELS: ModelOption[] = [
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Recommended)' },
  { value: 'gemini-4-argon', label: 'Gemini 4 Argon (Best reasoning)' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Fastest)' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Legacy)' },
];

export const PROVIDERS: Provider[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    hint: 'Free tier available. Keys start with AIza.',
    keyPlaceholder: 'AIza...',
    customBaseUrl: false,
    protocol: 'gemini',
    fallbackModels: GEMINI_MODELS,
    defaultModel: 'gemini-3.8-flash',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    hint: 'Uses your platform.openai.com credits.',
    keyPlaceholder: 'sk-...',
    customBaseUrl: false,
    protocol: 'openai',
    fallbackModels: [
      { value: 'gpt-5.2', label: 'GPT-5.2' },
      { value: 'gpt-5.1', label: 'GPT-5.1' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4o', label: 'GPT-4o' },
    ],
    defaultModel: 'gpt-5.2',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    hint: 'One key for every model. Keys start with sk-or-.',
    keyPlaceholder: 'sk-or-...',
    customBaseUrl: false,
    protocol: 'openai',
    fallbackModels: [
      { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
      { value: 'anthropic/claude-opus-4.1', label: 'Claude Opus 4.1' },
      { value: 'openai/gpt-5.2', label: 'GPT-5.2' },
      { value: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
    ],
    defaultModel: 'anthropic/claude-sonnet-4.5',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    hint: 'Free credits with an NVIDIA developer account.',
    keyPlaceholder: 'nvapi-...',
    customBaseUrl: false,
    protocol: 'openai',
    fallbackModels: [
      { value: 'deepseek-ai/deepseek-v3.2', label: 'DeepSeek V3.2' },
      { value: 'qwen/qwen3-coder-480b-a35b-instruct', label: 'Qwen3 Coder 480B' },
      { value: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
    ],
    defaultModel: 'deepseek-ai/deepseek-v3.2',
    docsUrl: 'https://build.nvidia.com/settings/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    hint: 'Claude Code style keys. Starts with sk-ant-.',
    keyPlaceholder: 'sk-ant-...',
    customBaseUrl: false,
    protocol: 'anthropic',
    fallbackModels: [
      { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Recommended)' },
      { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],
    defaultModel: 'claude-sonnet-4-5-20250929',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'custom',
    label: 'OpenAI-compatible',
    hint: 'Any endpoint that speaks /chat/completions. Paste the base URL.',
    keyPlaceholder: 'your key',
    customBaseUrl: true,
    protocol: 'openai',
    fallbackModels: [
      { value: 'gpt-4o', label: 'Default model' },
    ],
    defaultModel: 'gpt-4o',
    docsUrl: '',
  },
];

export const DEFAULT_PROVIDER: ProviderId = 'gemini';

const PROVIDER_INDEX: Record<ProviderId, Provider> = PROVIDERS.reduce(
  (index, provider) => {
    index[provider.id] = provider;
    return index;
  },
  {} as Record<ProviderId, Provider>,
);

export function getProvider(id: ProviderId): Provider {
  return PROVIDER_INDEX[id] ?? PROVIDER_INDEX.gemini;
}

export function isProviderId(value: string): value is ProviderId {
  return PROVIDERS.some((provider) => provider.id === value);
}

/** The base URL the provider's API lives at. */
export function baseUrlFor(id: ProviderId, customBaseUrl = ''): string {
  switch (id) {
    case 'nvidia':
      return 'https://integrate.api.nvidia.com/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'custom':
      return customBaseUrl.replace(/\/+$/, '') || 'https://api.openai.com/v1';
    case 'gemini':
    default:
      return '';
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export type ProviderStage = 'sending' | 'connected' | 'streaming' | 'done';

export interface ChatRequest {
  provider: ProviderId;
  apiKey: string;
  model: string;
  systemInstruction: string;
  messages: ChatMessage[];
  isThinking?: boolean;
  runSettings?: RunSettings;
  signal?: AbortSignal;
  customBaseUrl?: string;
  /** Called with the full accumulated text after each chunk. */
  onChunk: (text: string) => void;
  /** Reports real connection progress to the build log. */
  onStage?: (stage: ProviderStage) => void;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latency: number;
  model: string;
  sample?: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

const REQUEST_TIMEOUT_MS = 60_000;
const STREAM_IDLE_TIMEOUT_MS = 90_000;

/** Wraps fetch with a visible timeout instead of an endless spinner. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
  timeoutMs = REQUEST_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
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
      throw new ProviderError(
        `The provider did not respond within ${Math.round(
          timeoutMs / 1000,
        )} seconds. Check your connection, then try again.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function attachmentText(message: ChatMessage): string {
  const textFiles = (message.attachments ?? []).filter(
    (attachment) => attachment.type === 'text',
  );
  if (textFiles.length === 0) return message.content;
  const blocks = textFiles.map(
    (attachment) =>
      `<attached_file name="${(attachment.name ?? 'reference').replace(
        /"/g,
        "'",
      )}">\n${attachment.content}\n</attached_file>`,
  );
  return [message.content, ...blocks].filter((part) => part.trim()).join('\n\n');
}

/** Strips a data URL down to the parts the wire formats want. */
function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.*)$/s);
  if (match) return { mimeType: match[1], data: match[2] };
  // A bare base64 string, or a URL that is not inline data.
  return { mimeType: 'image/png', data: dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl };
}

function humaniseStatus(status: number): string {
  const known: Record<number, string> = {
    400: 'The provider rejected the request. Check the model name and settings.',
    401: 'The API key was rejected. Check it in Settings.',
    402: 'The provider says this account is out of credits. Top up the account or switch providers.',
    403: 'This key does not have access to that model.',
    404: 'That model or endpoint was not found on this account.',
    408: 'The provider timed out before answering. Try again.',
    413: 'The request was too large. Remove a reference file or use a smaller screenshot.',
    422: 'The provider could not process that request. Try a different model.',
    429: 'Rate limit reached. Wait a moment, then try again.',
    500: 'The provider had a server error.',
    502: 'The provider gateway returned a bad response.',
    503: 'The provider is unavailable right now.',
    504: 'The provider gateway timed out. Try again.',
  };
  return known[status] ?? `The provider request failed (HTTP ${status}).`;
}

/** Pulls the useful sentence out of an error body without leaking HTML. */
function errorDetail(raw: string): string {
  if (!raw.trim()) return '';
  try {
    const parsed = JSON.parse(raw) as {
      error?: string | { message?: string; code?: string };
      message?: string;
      detail?: string;
    };
    const nested = typeof parsed.error === 'object' ? parsed.error?.message : parsed.error;
    const detail = nested || parsed.message || parsed.detail || '';
    if (detail) return String(detail).replace(/\s+/g, ' ').trim().slice(0, 320);
  } catch {
    // Not JSON; strip markup below.
  }
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);
}

/** Builds an explicit, user-readable error from a failed HTTP response. */
export async function providerErrorFromResponse(response: Response): Promise<ProviderError> {
  let detail = '';
  try {
    detail = errorDetail(await response.text());
  } catch {
    // The body may already be consumed or blocked.
  }
  const base = humaniseStatus(response.status);
  const retryAfter = response.headers.get('retry-after');
  const retry =
    response.status === 429 && retryAfter
      ? ` Try again in about ${retryAfter} seconds.`
      : '';
  const message = detail && !base.toLowerCase().includes(detail.toLowerCase())
    ? `${base}${retry} ${detail}`
    : `${base}${retry}`;
  return new ProviderError(message.trim(), response.status);
}

function streamErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const event = payload as {
    error?: string | { message?: string; code?: string };
    type?: string;
    message?: string;
  };
  if (event.error) {
    if (typeof event.error === 'string') return event.error;
    return event.error.message || event.error.code || 'The provider streamed an error.';
  }
  if (event.type === 'error' && event.message) return event.message;
  return null;
}

interface StreamOutcome {
  text: string;
  finishReason: string;
}

/**
 * Reads a Server-Sent Events response and calls back with the text so far.
 *
 * Every provider here streams the same way: a framed `data:` line per chunk
 * and a terminal `data: [DONE]`. What varies is where the text hides inside
 * the JSON, so a small extractor is passed in.
 *
 * This is deliberately not a silent loop: provider error frames, empty
 * responses, cut-off responses, idle streams, and aborts all become explicit
 * errors the UI can show.
 */
async function readSseStream(
  response: Response,
  extract: (payload: unknown) => string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<StreamOutcome> {
  if (!response.body) throw new ProviderError('The response had no body.', response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const buffer = { value: '' };
  let full = '';
  let finishReason = '';
  let sawEvent = false;

  const readWithIdleTimeout = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const idle = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        // Settle the pending read before the error propagates, so releasing
        // the reader lock in the caller does not throw over the real reason.
        void reader.cancel().catch(() => undefined);
        reject(
          new ProviderError(
            `The provider stopped sending data for ${Math.round(
              STREAM_IDLE_TIMEOUT_MS / 1000,
            )} seconds. The build was stopped instead of waiting forever.`,
          ),
        );
      }, STREAM_IDLE_TIMEOUT_MS);
    });
    try {
      return await Promise.race([reader.read(), idle]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { value, done } = await readWithIdleTimeout();
      if (done) break;

      buffer.value += decoder.decode(value, { stream: true });
      const lines = buffer.value.split('\n');
      buffer.value = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payloadText = trimmed.slice(5).trim();
        if (!payloadText || payloadText === '[DONE]') continue;

        let payload: unknown;
        try {
          payload = JSON.parse(payloadText);
        } catch {
          // A malformed keep-alive frame is not worth failing the whole run.
          continue;
        }

        const streamError = streamErrorMessage(payload);
        if (streamError) throw new ProviderError(streamError);

        const event = payload as {
          choices?: Array<{ finish_reason?: string }>;
          delta?: { stop_reason?: string };
          type?: string;
        };
        const reason =
          event.choices?.[0]?.finish_reason ??
          (event.type === 'message_delta' ? event.delta?.stop_reason : undefined);
        if (reason) finishReason = reason;

        const text = extract(payload);
        if (text) {
          sawEvent = true;
          full += text;
          onChunk(full);
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A cancelled read can still be settling; the parse result is unaffected.
    }
  }

  if (!full.trim()) {
    throw new ProviderError(
      'The model finished without returning any text. This usually means the model or endpoint does not support chat completions. Choose another model and try again.',
      response.status,
    );
  }

  if (finishReason === 'length' || finishReason === 'max_tokens') {
    throw new ProviderError(
      'The response hit the output limit before it finished. Increase “Max output tokens” in Settings, or ask for the site in smaller steps.',
      response.status,
    );
  }

  if (finishReason === 'content_filter' || finishReason === 'refusal') {
    throw new ProviderError(
      'The model stopped because its safety filter rejected part of the request. Rephrase the prompt or use another provider.',
      response.status,
    );
  }

  if (!sawEvent) {
    throw new ProviderError('The provider stream ended before any content arrived.', response.status);
  }

  return { text: full, finishReason };
}

/** Sends the request to any OpenAI-compatible chat endpoint. */
async function sendOpenAiCompatible(request: ChatRequest): Promise<string> {
  request.onStage?.('sending');
  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: request.systemInstruction },
  ];

  for (const message of request.messages) {
    const text = attachmentText(message);
    const images = (message.attachments ?? []).filter(
      (attachment) => attachment.type === 'image',
    );
    if (images.length > 0) {
      const parts: Array<Record<string, unknown>> = images.map((attachment) => ({
        type: 'image_url',
        image_url: {
          url: attachment.content.startsWith('data:')
            ? attachment.content
            : `data:${attachment.mimeType};base64,${attachment.content}`,
        },
      }));
      if (text.trim()) parts.unshift({ type: 'text', text });
      messages.push({ role: message.role, content: parts });
      continue;
    }
    messages.push({ role: message.role, content: text });
  }

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    stream: true,
  };

  const settings = request.runSettings;
  if (settings) {
    if (typeof settings.temperature === 'number') body.temperature = settings.temperature;
    if (typeof settings.topP === 'number') body.top_p = settings.topP;
    if (typeof settings.maxOutputTokens === 'number') body.max_tokens = settings.maxOutputTokens;
  }

  const response = await fetchWithTimeout(
    `${baseUrlFor(request.provider, request.customBaseUrl)}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey}`,
        ...(request.provider === 'openrouter'
          ? {
              'HTTP-Referer':
                typeof window !== 'undefined'
                  ? window.location.origin
                  : 'https://github.com/lab1207/AI-Website-Builder',
              'X-Title': 'AI Website Builder',
            }
          : {}),
      },
      body: JSON.stringify(body),
    },
    request.signal,
  );

  if (!response.ok) throw await providerErrorFromResponse(response);
  request.onStage?.('connected');

  const outcome = await readSseStream(
    response,
    (payload) => {
      const chunk = payload as {
        choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
      };
      return (
        chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? ''
      );
    },
    (text) => {
      request.onStage?.('streaming');
      request.onChunk(text);
    },
    request.signal,
  );

  request.onStage?.('done');
  return outcome.text;
}

/** Sends the request to the Anthropic messages API. */
async function sendAnthropic(request: ChatRequest): Promise<string> {
  request.onStage?.('sending');
  const messages: Array<Record<string, unknown>> = [];

  for (const message of request.messages) {
    const parts: Array<Record<string, unknown>> = [];
    const text = attachmentText(message);
    if (text.trim()) parts.push({ type: 'text', text });

    for (const attachment of (message.attachments ?? []).filter(
      (item) => item.type === 'image',
    )) {
      const { mimeType, data } = splitDataUrl(attachment.content);
      parts.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data },
      });
    }

    if (parts.length > 0) messages.push({ role: message.role, content: parts });
  }

  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: request.runSettings?.maxOutputTokens ?? 8192,
    stream: true,
    system: request.systemInstruction,
    messages,
  };

  if (typeof request.runSettings?.temperature === 'number') {
    body.temperature = request.runSettings.temperature;
  }
  if (typeof request.runSettings?.topP === 'number') {
    body.top_p = request.runSettings.topP;
  }

  const response = await fetchWithTimeout(
    `${baseUrlFor(request.provider, request.customBaseUrl)}/v1/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.apiKey,
        'anthropic-version': '2023-06-01',
        // Required for a browser origin to call the API directly.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    },
    request.signal,
  );

  if (!response.ok) throw await providerErrorFromResponse(response);
  request.onStage?.('connected');

  const outcome = await readSseStream(
    response,
    (payload) => {
      const event = payload as { type?: string; delta?: { type?: string; text?: string } };
      if (event.type !== 'content_block_delta') return '';
      return event.delta?.text ?? '';
    },
    (text) => {
      request.onStage?.('streaming');
      request.onChunk(text);
    },
    request.signal,
  );

  request.onStage?.('done');
  return outcome.text;
}

/**
 * Sends one turn of a conversation and streams the reply.
 *
 * This is the single entry point the UI calls. Gemini keeps its SDK because
 * that is what Google ships; everything else goes over the wire formats above.
 */
export async function sendChat(request: ChatRequest): Promise<string> {
  const definition = getProvider(request.provider);

  if (!request.apiKey.trim()) {
    throw new ProviderError(
      `No API key for ${definition.label}. Add one in Settings to start building.`,
    );
  }
  if (definition.protocol === 'gemini') {
    request.onStage?.('sending');
    const { sendMessageToGemini } = await import('../services/geminiService');
    const turns = request.messages.filter((message) => message.role === 'user');
    const last = turns.at(-1);

    let streamed = false;
    const text = await sendMessageToGemini(
      last?.content ?? '',
      (last?.attachments ?? []) as Attachment[],
      request.messages.slice(0, -1) as never,
      (value) => {
        if (!streamed) {
          streamed = true;
          request.onStage?.('streaming');
        }
        request.onChunk(value);
      },
      request.systemInstruction,
      request.isThinking ?? false,
      request.runSettings,
      request.signal,
      request.apiKey,
    );
    request.onStage?.('done');
    if (!text.trim()) {
      throw new ProviderError(
        'Gemini finished without returning any text. Try another model or prompt.',
      );
    }
    return text;
  }

  if (definition.protocol === 'anthropic') {
    return sendAnthropic(request);
  }

  return sendOpenAiCompatible(request);
}

/**
 * Sends one tiny, non-streaming request to prove the key, model, and endpoint
 * can actually generate text. A successful model list is not enough: a key can
 * list models while having no credits, or a model can be retired for chat.
 */
export async function testProviderConnection(options: {
  provider: ProviderId;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<ConnectionTestResult> {
  const definition = getProvider(options.provider);
  const started = Date.now();
  const key = options.apiKey.trim();

  if (!key) {
    return {
      ok: false,
      message: `Add a ${definition.label} key first.`,
      latency: 0,
      model: options.model,
    };
  }

  try {
    if (definition.protocol === 'gemini') {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: key });
      const result = await ai.models.generateContent({
        model: options.model,
        contents: 'Reply with exactly: OK',
        config: { maxOutputTokens: 12, temperature: 0 },
      });
      const sample = (result.text ?? '').trim();
      if (!sample) throw new Error('Gemini connected but returned an empty reply.');
      return {
        ok: true,
        message: `${definition.label} is connected and can generate text.`,
        latency: Date.now() - started,
        model: options.model,
        sample: sample.slice(0, 80),
      };
    }

    const base = baseUrlFor(options.provider, options.customBaseUrl);
    const fetchImpl = options.fetchImpl ?? fetch;
    const anthropic = definition.protocol === 'anthropic';
    const response = await fetchWithTimeout(
      anthropic ? `${base}/v1/messages` : `${base}/chat/completions`,
      {
        method: 'POST',
        headers: anthropic
          ? {
              'Content-Type': 'application/json',
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            }
          : {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key}`,
            },
        body: JSON.stringify(
          anthropic
            ? {
                model: options.model,
                max_tokens: 12,
                temperature: 0,
                messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
              }
            : {
                model: options.model,
                max_tokens: 12,
                temperature: 0,
                stream: false,
                messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
              },
        ),
      },
      options.signal,
      45_000,
      fetchImpl,
    );

    if (!response.ok) {
      const error = await providerErrorFromResponse(response);
      return {
        ok: false,
        message: error.message,
        latency: Date.now() - started,
        model: options.model,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      content?: Array<{ type?: string; text?: string }>;
    };
    const sample = (
      anthropic
        ? (payload.content ?? [])
            .filter((part) => part.type === 'text')
            .map((part) => part.text ?? '')
            .join('')
        : payload.choices?.[0]?.message?.content ?? ''
    ).trim();

    if (!sample) {
      return {
        ok: false,
        message: 'The endpoint answered, but returned no text. Check that this is a chat model.',
        latency: Date.now() - started,
        model: options.model,
      };
    }

    return {
      ok: true,
      message: `${definition.label} is connected and can generate text.`,
      latency: Date.now() - started,
      model: options.model,
      sample: sample.slice(0, 80),
    };
  } catch (error) {
    const failure = error as Error;
    return {
      ok: false,
      message:
        failure.name === 'AbortError'
          ? 'The connection test was stopped.'
          : failure.message || `Could not reach ${definition.label}.`,
      latency: Date.now() - started,
      model: options.model,
    };
  }
}

/**
 * Lists the models a key can use.
 *
 * Providers that expose a model list get it live, so the picker only offers
 * what the account can actually call. The others fall back to a curated list.
 */
export async function listProviderModels(
  provider: ProviderId,
  apiKey: string,
  customBaseUrl = '',
): Promise<ModelOption[]> {
  const definition = getProvider(provider);

  if (provider === 'gemini') {
    // Gemini has its own SDK path with a bigger, curated list.
    const { getAvailableModels } = await import('../services/geminiService');
    return getAvailableModels(apiKey);
  }

  if (provider === 'anthropic') {
    if (!apiKey) return definition.fallbackModels;
    try {
      const response = await fetch(`${baseUrlFor(provider, customBaseUrl)}/v1/models?limit=100`, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });
      if (!response.ok) return definition.fallbackModels;
      const payload = (await response.json()) as {
        data?: Array<{ id: string; display_name?: string }>;
      };
      const models = (payload.data ?? []).map((model) => ({
        value: model.id,
        label: model.display_name || model.id,
      }));
      if (models.length === 0) return definition.fallbackModels;
      const preferred = models.find((model) => model.value === definition.defaultModel);
      const rest = models
        .filter((model) => model.value !== definition.defaultModel)
        .sort((a, b) => a.label.localeCompare(b.label));
      return preferred ? [preferred, ...rest] : rest;
    } catch {
      return definition.fallbackModels;
    }
  }

  // OpenAI-compatible: read GET /models.
  if (!apiKey) return definition.fallbackModels;
  try {
    const response = await fetch(`${baseUrlFor(provider, customBaseUrl)}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return definition.fallbackModels;
    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    const models = (payload.data ?? []).map((model) => ({
      value: model.id,
      label: model.id,
    }));
    if (models.length === 0) return definition.fallbackModels;
    const preferred = models.find((model) => model.value === definition.defaultModel);
    const rest = models
      .filter((model) => model.value !== definition.defaultModel)
      .sort((a, b) => a.label.localeCompare(b.label));
    return preferred ? [preferred, ...rest] : rest;
  } catch {
    return definition.fallbackModels;
  }
}

/**
 * True when the list came back as the curated fallback rather than from the
 * visitor's key. Providers return their own fallback array (or the Gemini
 * service's copy), so this compares the values instead of object identity.
 */
export function isFallbackModelList(provider: ProviderId, models: ModelOption[]): boolean {
  const fallback = getProvider(provider).fallbackModels;
  return (
    models.length === fallback.length &&
    models.every((model, index) => model.value === fallback[index].value)
  );
}
