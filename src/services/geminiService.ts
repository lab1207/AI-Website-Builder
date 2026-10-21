import type { Chat, Content, GenerateContentResponse, Part } from '@google/genai';
import { Message, Attachment, RunSettings } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../lib/generation';

/*
 * The Gemini SDK is large. It is imported on demand so the builder loads
 * fast and only pays for the SDK when a generation actually starts.
 */
let genaiModule: typeof import('@google/genai') | null = null;

async function loadGenAI() {
  if (!genaiModule) {
    genaiModule = await import('@google/genai');
  }
  return genaiModule;
}

let currentChatSession: Chat | null = null;
let currentModel: string | null = null;
let currentApiKey: string | null = null;

export interface ModelOption {
  value: string;
  label: string;
}

/**
 * Curated fallback list, used when the live model list cannot be fetched.
 *
 * These are the current stable endpoints. Note that `gemini-3-pro-preview` was
 * shut down in March 2026 and `gemini-2.5-flash` is now limited to accounts
 * that used it before, so neither is a sensible default any more.
 */
export const FALLBACK_MODELS: ModelOption[] = [
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Recommended)' },
  { value: 'gemini-4-argon', label: 'Gemini 4 Argon (Best reasoning)' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Fastest)' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Legacy)' },
];

export const DEFAULT_MODEL = 'gemini-3.8-flash';

/** Prefixes for models that cannot produce text or images for a web page. */
const NON_TEXT_MODEL = /(image|tts|transcribe|live|embedding|robotics|omni|veo|lyria|research|antigravity)/i;

/**
 * Lists the models the supplied key can actually use.
 *
 * Reading the live list means the picker only ever offers models this account
 * has access to, and it stops offering endpoints that have been retired.
 */
export const getAvailableModels = async (apiKey = ''): Promise<ModelOption[]> => {
  if (!apiKey) return FALLBACK_MODELS;

  try {
    const { GoogleGenAI } = await loadGenAI();
    const ai = new GoogleGenAI({ apiKey });
    const models: ModelOption[] = [];

    // models.list() returns a pager, so it has to be walked.
    for await (const model of await ai.models.list()) {
      const name = model.name?.replace(/^models\//, '') ?? '';
      if (!name) continue;
      if (NON_TEXT_MODEL.test(name)) continue;
      if (!canGenerateContent(model)) continue;

      models.push({ value: name, label: formatModelLabel(name) });
    }

    if (models.length === 0) return FALLBACK_MODELS;

    // Put the recommended default first, then keep the rest alphabetical.
    const preferred = models.find((model) => model.value === DEFAULT_MODEL);
    const rest = models
      .filter((model) => model.value !== DEFAULT_MODEL)
      .sort((a, b) => a.label.localeCompare(b.label));

    return preferred ? [preferred, ...rest] : rest;
  } catch (error) {
    console.warn('Could not list models, using the built-in list.', error);
    return FALLBACK_MODELS;
  }
};

/**
 * True when a model can produce text.
 *
 * The SDK renamed the capability list from `supportedGenerationMethods` to
 * `supportedActions`, and the exact values differ between model families, so
 * this checks both and treats an absent list as "usable" rather than hiding a
 * model that works.
 */
function canGenerateContent(model: { supportedActions?: string[]; supportedGenerationMethods?: string[] }): boolean {
  const actions = model.supportedActions ?? model.supportedGenerationMethods;
  if (!actions || actions.length === 0) return true;
  return actions.some((action) => action.toLowerCase().includes('generatecontent'));
}

/** Turns a raw model id into something readable. */
function formatModelLabel(name: string): string {
  const known: Record<string, string> = {
    'gemini-3.8-flash': 'Gemini 3.8 Flash (Recommended)',
    'gemini-4-argon': 'Gemini 4 Argon (Best reasoning)',
    'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite (Fastest)',
    'gemini-3.1-pro-preview': 'Gemini 3.1 Pro (Preview)',
    'gemini-2.5-flash': 'Gemini 2.5 Flash (Legacy)',
  };
  if (known[name]) return known[name];

  return name
    .replace(/^gemini-/, 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export const resetChat = () => {
  currentChatSession = null;
  currentModel = null;
  currentApiKey = null;
};

// Helper to convert internal Message to Gemini SDK Content
const mapMessageToContent = (msg: Message): Content => {
  const parts: Part[] = [{ text: msg.content }];
  if (msg.attachments && msg.attachments.length > 0) {
    msg.attachments.forEach(att => {
      // Basic check to ensure valid base64
      const base64Data = att.content.includes('base64,') 
        ? att.content.split('base64,')[1] 
        : att.content;
        
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: base64Data
        }
      });
    });
  }
  return {
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: parts
  };
};

export const sendMessageToGemini = async (
  message: string,
  attachments: Attachment[] = [],
  history: Message[] = [],
  onChunk: (text: string) => void,
  systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION,
  isThinking: boolean = false,
  runSettings?: RunSettings,
  abortSignal?: AbortSignal,
  apiKey: string = ''
): Promise<string> => {
  
  // 1. Determine the appropriate model
  // Use user selected model, default to 2.5 Flash if missing
  const targetModel = runSettings?.model || DEFAULT_MODEL;
  
  // 2. Configure the chat session
  // We recreate the session if the model, the key, or the session changes
  if (!currentChatSession || currentModel !== targetModel || currentApiKey !== apiKey) {
    if (!apiKey) {
        throw new Error(
          "No API key. Add your Gemini API key in Settings, or set VITE_GEMINI_API_KEY when you build.",
        );
    }

    const { GoogleGenAI } = await loadGenAI();
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Convert history to SDK format
    const sdkHistory = history.map(mapMessageToContent);

    const config: any = {
      systemInstruction: systemInstruction,
      temperature: runSettings?.temperature ?? 0.7,
      topP: runSettings?.topP,
      topK: runSettings?.topK,
      maxOutputTokens: runSettings?.maxOutputTokens,
    };

    // Apply Thinking Config if enabled (Required for Thinking Mode)
    if (isThinking && (targetModel.includes('pro') || targetModel.includes('flash') || targetModel.includes('lite'))) {
      const isPro = targetModel.includes('pro');
      // Pro max budget 32768, Flash max budget 24576
      const budget = isPro ? 32768 : 24576;

      config.thinkingConfig = { thinkingBudget: budget };
      // IMPORTANT: When thinking is enabled, maxOutputTokens should generally be unset 
      // or set very carefully to allow space for the response after thinking.
      // The SDK recommendation is to usually avoid setting it if not required.
      delete config.maxOutputTokens; 
    }

    currentChatSession = ai.chats.create({
      model: targetModel,
      config: config,
      history: sdkHistory
    });
    
    currentModel = targetModel;
    currentApiKey = apiKey;
  }

  let fullResponse = "";

  try {
    // 3. Prepare the current message content
    const parts: Part[] = [];
    if (message) parts.push({ text: message });
    
    attachments.forEach(att => {
      const base64Data = att.content.includes('base64,') 
        ? att.content.split('base64,')[1] 
        : att.content;
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: base64Data
        }
      });
    });

    // 4. Send the message
    const result = await currentChatSession.sendMessageStream({ 
      message: parts 
    });
    
    for await (const chunk of result) {
      if (abortSignal?.aborted) {
        break;
      }
      const text = (chunk as GenerateContentResponse).text;
      if (text) {
        fullResponse += text;
        onChunk(fullResponse);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }

  return fullResponse;
};
