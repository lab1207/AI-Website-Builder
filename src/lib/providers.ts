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

/** Strips a data URL down to the parts the wire formats want. */
function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.*)$/s);
  if (match) return { mimeType: match[1], data: match[2] };
  // A bare base64 string, or a URL that is not inline data.
  return { mimeType: 'image/png', data: dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl };
}

function humaniseStatus(status: number): string {
  const known: Record<number, string> = {
    401: 'The API key was rejected.',
    403: 'This key does not have access to that model.',
    404: 'That model was not found on this account.',
    413: 'The request was too large.',
    429: 'Rate limit reached. Wait a moment and try again.',
    500: 'The provider had a server error.',
    503: 'The provider is unavailable right now.',
  };
  return known[status] ?? `Request failed (${status}).`;
}

/**
 * Reads a Server-Sent Events response and calls back with the text so far.
 *
 * Every provider here streams the same way: a framed `data:` line per chunk
 * and a terminal `data: [DONE]`. What varies is where the text hides inside
 * the JSON, so a small extractor is passed in.
 */
async function readSseStream(
  response: Response,
  extract: (payload: unknown) => string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!response.body) throw new ProviderError('The response had no body.', response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const buffer = { value: '' };
  let full = '';
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    if (signal?.aborted) break;

    buffer.value += decoder.decode(value, { stream: true });
    const lines = buffer.value.split('\n');
    buffer.value = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const text = extract(JSON.parse(payload));
        if (text) {
          full += text;
          onChunk(full);
        }
      } catch {
        // A malformed frame is a provider quirk, not worth failing the run.
      }
    }
  }

  return full;
}

/** Sends the request to any OpenAI-compatible chat endpoint. */
async function sendOpenAiCompatible(request: ChatRequest): Promise<string> {
  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: request.systemInstruction },
  ];

  for (const message of request.messages) {
    if (message.attachments && message.attachments.length > 0) {
      const parts: Array<Record<string, unknown>> = [
        ...message.attachments.map((attachment) => ({
          type: 'image_url',
          image_url: { url: attachment.content.startsWith('data:') ? attachment.content : `data:${attachment.mimeType};base64,${attachment.content}` },
        })),
      ];
      if (message.content.trim()) parts.unshift({ type: 'text', text: message.content });
      messages.push({ role: message.role, content: parts });
      continue;
    }
    messages.push({ role: message.role, content: message.content });
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

  const response = await fetch(`${baseUrlFor(request.provider, request.customBaseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!response.ok) {
    throw new ProviderError(humaniseStatus(response.status), response.status);
  }

  return readSseStream(
    response,
    (payload) => {
      const chunk = payload as { choices?: Array<{ delta?: { content?: string } }> };
      return chunk.choices?.[0]?.delta?.content ?? '';
    },
    request.onChunk,
    request.signal,
  );
}

/** Sends the request to the Anthropic messages API. */
async function sendAnthropic(request: ChatRequest): Promise<string> {
  const messages: Array<Record<string, unknown>> = [];

  for (const message of request.messages) {
    const parts: Array<Record<string, unknown>> = [];
    if (message.content.trim()) parts.push({ type: 'text', text: message.content });

    for (const attachment of message.attachments ?? []) {
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

  const response = await fetch(`${baseUrlFor(request.provider, request.customBaseUrl)}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': request.apiKey,
      'anthropic-version': '2023-06-01',
      // Required for a browser origin to call the API directly.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!response.ok) {
    throw new ProviderError(humaniseStatus(response.status), response.status);
  }

  return readSseStream(
    response,
    (payload) => {
      const event = payload as { type?: string; delta?: { type?: string; text?: string } };
      if (event.type !== 'content_block_delta') return '';
      return event.delta?.text ?? '';
    },
    request.onChunk,
    request.signal,
  );
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
    const { sendMessageToGemini } = await import('../services/geminiService');
    const turns = request.messages.filter((message) => message.role === 'user');
    const last = turns.at(-1);

    return sendMessageToGemini(
      last?.content ?? '',
      (last?.attachments ?? []) as Attachment[],
      request.messages.slice(0, -1) as never,
      request.onChunk,
      request.systemInstruction,
      request.isThinking ?? false,
      request.runSettings,
      request.signal,
      request.apiKey,
    );
  }

  if (definition.protocol === 'anthropic') {
    return sendAnthropic(request);
  }

  return sendOpenAiCompatible(request);
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
