export interface Attachment {
  type: 'image';
  content: string; // Base64
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  latency?: number; // Time in milliseconds
}

export type FileMap = Record<string, string>;

export interface GeneratedCode {
  language: string;
  code: string;
  timestamp: number;
}

export enum ViewMode {
  CHAT = 'CHAT',
  PREVIEW = 'PREVIEW',
  SPLIT = 'SPLIT'
}

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface RunSettings {
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}