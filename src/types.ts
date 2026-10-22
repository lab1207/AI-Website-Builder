export interface Attachment {
  type: 'image' | 'text';
  /**
   * Images hold a data URL. Text references hold the file's plain contents.
   * Keeping the two apart means a screenshot never has to be base64-decoded
   * just to show its filename.
   */
  content: string;
  mimeType: string;
  /** Original filename, shown in the composer and the build log. */
  name?: string;
  /** Size in bytes, when known. */
  size?: number;
  /** Where a captured reference came from, for link attachments. */
  sourceUrl?: string;
}

export type BuildStepState = 'pending' | 'active' | 'done' | 'error' | 'stopped';

export interface BuildStep {
  id: string;
  label: string;
  detail?: string;
  state: BuildStepState;
  at: number;
}

export type MessageStatus = 'streaming' | 'done' | 'error' | 'stopped';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  latency?: number; // Time in milliseconds
  /** The visible, step-by-step build trail. */
  steps?: BuildStep[];
  status?: MessageStatus;
  /** A provider/network failure, shown apart from any partial content. */
  error?: string;
  /** A non-fatal result the user should know about, such as no files written. */
  warning?: string;
  /** Up to three next-step questions offered by the model. */
  followUps?: string[];
}

export interface QueuedPrompt {
  id: string;
  text: string;
  attachments: Attachment[];
  annotations: Array<{ x: number; y: number }>;
  device: DeviceType;
  createdAt: number;
}

/** A starting point handed from the landing page to the studio. */
export interface StudioSeed {
  prompt?: string;
  link?: string;
  attachments?: Attachment[];
  /** Bumps when the same kind of seed is sent again. */
  id?: string;
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
