import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatPanel from './components/ChatPanel';
import DashboardHome from './components/DashboardHome';
import HistoryPanel from './components/HistoryPanel';
import LandingPage from './components/LandingPage';
import ModelPicker from './components/ModelPicker';
import PreviewPane from './components/PreviewPane';
import PublishPanel from './components/PublishPanel';
import SettingsPanel from './components/SettingsPanel';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toast, { type ToastState, type ToastTone } from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import Icon from './components/Icon';
import { DEFAULT_SYSTEM_INSTRUCTION, parseFollowUps, parseGeneratedFiles } from './lib/generation';
import {
  Message,
  ViewMode,
  Attachment,
  FileMap,
  RunSettings,
  DeviceType,
  BuildStep,
  QueuedPrompt,
  StudioSeed,
} from './types';
import { useProvider } from './hooks/useProvider';
import { sendChat, getProvider } from './lib/providers';
import type { ProviderId } from './lib/providers';
import {
  ProjectType,
  SiteMode,
  Styling,
  projectTypeInstruction,
  scaffoldFor,
  PROJECT_TYPES,
} from './lib/projectTypes';
import {
  VersionSnapshot,
  clearHistory,
  readHistory,
  writeHistory,
} from './lib/versionHistory';

/* --------------------------------------------------------------------------
 * Storage
 * ------------------------------------------------------------------------ */

const STORAGE_THEME = 'ai-website-builder:theme:v1';
const STORAGE_PROJECT = 'ai-website-builder:project-name:v1';
const STORAGE_WORKSPACE = 'ai-website-builder:workspace:v1';
const STORAGE_VISITED = 'ai-website-builder:visited:v1';

type PanelName = 'settings' | 'history' | 'publish';

interface WorkspaceState {
  files: FileMap;
  projectName: string;
  projectType: ProjectType;
  styling: Styling;
  siteMode: SiteMode;
  customDomain: string;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

/** Load the Gemini module only when its in-memory chat session needs clearing. */
function resetChatSession() {
  void import('./services/geminiService').then(({ resetChat }) => resetChat());
}

function readStoredTheme(): 'light' | 'dark' {
  try {
    const stored = window.localStorage.getItem(STORAGE_THEME);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be blocked.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readVisited(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_VISITED) === '1';
  } catch {
    return false;
  }
}

const PROJECT_TYPE_VALUES: ProjectType[] = ['vanilla', 'react', 'vue', 'next'];

/**
 * Restores the working files, not the conversation. The conversation is
 * rebuilt from the files as one assistant message, which also means the model
 * gets the current code as context on the very next request.
 */
function readWorkspace(): WorkspaceState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_WORKSPACE);
    const fallbackName = window.localStorage.getItem(STORAGE_PROJECT) ?? 'Untitled project';

    if (!raw) {
      return {
        files: {},
        projectName: fallbackName,
        projectType: 'vanilla',
        styling: 'vanilla',
        siteMode: 'single',
        customDomain: '',
      };
    }

    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    const files =
      parsed.files && typeof parsed.files === 'object' && !Array.isArray(parsed.files)
        ? (parsed.files as FileMap)
        : {};
    const projectType = PROJECT_TYPE_VALUES.includes(parsed.projectType as ProjectType)
      ? (parsed.projectType as ProjectType)
      : 'vanilla';

    return {
      files,
      projectName:
        typeof parsed.projectName === 'string' && parsed.projectName.trim()
          ? parsed.projectName
          : fallbackName,
      projectType,
      styling:
        parsed.styling === 'tailwind' && projectType !== 'vanilla' ? 'tailwind' : 'vanilla',
      siteMode: parsed.siteMode === 'multi' ? 'multi' : 'single',
      customDomain: typeof parsed.customDomain === 'string' ? parsed.customDomain : '',
    };
  } catch {
    return null;
  }
}

function writeWorkspace(state: WorkspaceState) {
  try {
    window.localStorage.setItem(STORAGE_WORKSPACE, JSON.stringify(state));
  } catch {
    // A very large project can exceed the quota. The session keeps working.
  }
}

function filesAsContext(files: FileMap): string {
  return Object.entries(files)
    .map(([name, content]) => `__FILE: ${name}__\n${content}`)
    .join('\n\n');
}

function versionLabel(prompt: string): string {
  const clean = prompt
    .replace(/\n\n\[CONTEXT:[\s\S]*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return 'Generated';
  return clean.length > 64 ? `${clean.slice(0, 61)}…` : clean;
}

/**
 * Sending only a screenshot or only a file is a valid way to start. The model
 * gets an explicit instruction instead of an empty user message.
 */
function promptForAttachments(attachments: Attachment[]): string {
  const images = attachments.filter((attachment) => attachment.type === 'image');
  const texts = attachments.filter((attachment) => attachment.type === 'text');
  const captured = texts.find((attachment) => attachment.sourceUrl);

  if (captured && images.length > 0) {
    return `Rebuild ${captured.sourceUrl} as a working website. Match the attached screenshot exactly for layout, type, colour, imagery, and spacing, and use the captured page text for real headings, navigation, and copy. Make every section and interaction work.`;
  }
  if (images.length > 0 && texts.length > 0) {
    return 'Rebuild the website supplied in the attached screenshot and source files. Match the visual reference exactly, and use the actual markup, content, and styles in the files instead of inventing replacements.';
  }
  if (images.length > 0) {
    return images.length === 1
      ? 'Rebuild this website to match the attached screenshot exactly, including every visible section, the type scale, colours, spacing, imagery, and responsive behaviour.'
      : 'Rebuild this website to match the attached screenshots exactly. Treat them as views of the same site at different widths or pages, and preserve every section and state.';
  }
  if (texts.length > 0) {
    return 'Use the attached files as the source of truth for this website. Rebuild it faithfully as complete, working files, keeping the real content, structure, and visual language. If the files are an existing project, keep the parts that already work and improve the rest.';
  }
  return 'Build a distinctive, complete website from this brief.';
}

function briefLabel(prompt: string, attachments: Attachment[]): string {
  const clean = prompt
    .replace(/\n\n\[CONTEXT:[\s\S]*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean) return clean.length > 92 ? `${clean.slice(0, 89)}…` : clean;
  if (attachments.length === 1) return attachments[0].name ?? 'One reference';
  if (attachments.length > 1) return `${attachments.length} references`;
  return 'Starting point';
}

function initialBuildSteps(
  prompt: string,
  attachments: Attachment[],
  providerLabel: string,
  model: string,
): BuildStep[] {
  const now = Date.now();
  return [
    {
      id: 'brief',
      label: 'Brief received',
      detail: briefLabel(prompt, attachments),
      state: 'done',
      at: now,
    },
    {
      id: 'connect',
      label: `Connecting to ${providerLabel}`,
      detail: model,
      state: 'active',
      at: now,
    },
    { id: 'stream', label: 'Writing the site', state: 'pending', at: now },
    { id: 'files', label: 'Assembling files and preview', state: 'pending', at: now },
    { id: 'finish', label: 'Checking the result', state: 'pending', at: now },
  ];
}

/* --------------------------------------------------------------------------
 * App
 * ------------------------------------------------------------------------ */

const App: React.FC = () => {
  const initialWorkspace = useMemo(readWorkspace, []);
  const restoredFileCount = initialWorkspace ? Object.keys(initialWorkspace.files).length : 0;

  const [showLanding, setShowLanding] = useState(
    () => !readVisited() && restoredFileCount === 0,
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(readStoredTheme);

  const [messages, setMessages] = useState<Message[]>(() => {
    if (!initialWorkspace || Object.keys(initialWorkspace.files).length === 0) return [];
    return [
      {
        id: generateId(),
        role: 'assistant',
        content: `Restored ${Object.keys(initialWorkspace.files).length} files from your last session.\n\n${filesAsContext(
          initialWorkspace.files,
        )}`,
        timestamp: Date.now(),
        latency: 0,
      },
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queuedPrompts, setQueuedPrompts] = useState<QueuedPrompt[]>([]);
  const [queuePaused, setQueuePaused] = useState(false);
  const [seed, setSeed] = useState<StudioSeed | null>(null);
  const [currentFiles, setCurrentFiles] = useState<FileMap>(initialWorkspace?.files ?? {});
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [isThinking, setIsThinking] = useState(true);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [pendingAnnotations, setPendingAnnotations] = useState<Array<{ x: number; y: number }>>([]);
  const [previewDevice, setPreviewDevice] = useState<DeviceType>('desktop');

  const [projectName, setProjectName] = useState(
    initialWorkspace?.projectName ?? 'Untitled project',
  );
  const [projectType, setProjectType] = useState<ProjectType>(
    initialWorkspace?.projectType ?? 'vanilla',
  );
  const [styling, setStyling] = useState<Styling>(initialWorkspace?.styling ?? 'vanilla');
  const [siteMode, setSiteMode] = useState<SiteMode>(initialWorkspace?.siteMode ?? 'single');
  const [customDomain, setCustomDomain] = useState(initialWorkspace?.customDomain ?? '');

  const [showHome, setShowHome] = useState(
    () =>
      !initialWorkspace || Object.keys(initialWorkspace.files).length === 0,
  );
  const [panel, setPanel] = useState<'none' | PanelName>('none');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmHistory, setConfirmHistory] = useState(false);

  const [runSettings, setRunSettings] = useState<RunSettings>({
    model: getProvider('gemini').defaultModel,
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  });

  const [versions, setVersions] = useState<VersionSnapshot[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAssistantRef = useRef<string | null>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const {
    provider,
    definition: providerDefinition,
    selectProvider,
    apiKey,
    hasKey,
    buildTimeAvailable,
    hasUserKey,
    saveKey,
    forgetKey,
    customBaseUrl,
    saveCustomBaseUrl,
    savedProviders,
  } = useProvider();

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  /* Chrome ---------------------------------------------------------------- */

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', theme === 'dark' ? '#0d0b0a' : '#f5f2ec');
    try {
      window.localStorage.setItem(STORAGE_THEME, theme);
    } catch {
      // Not important enough to fail on.
    }
  }, [theme]);

  useEffect(() => {
    document.title = showLanding
      ? 'AI Website Builder — Describe it. Watch it become a real website.'
      : `${projectName || 'Untitled project'} · AI Website Builder`;
    try {
      window.localStorage.setItem(STORAGE_PROJECT, projectName);
    } catch {
      // Not important enough to fail on.
    }
  }, [projectName, showLanding]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panel !== 'none') setPanel('none');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panel]);

  // Persist the working files and project choices, debounced so streaming
  // chunks do not write to storage dozens of times a second.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeWorkspace({
        files: currentFiles,
        projectName,
        projectType,
        styling,
        siteMode,
        customDomain,
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [currentFiles, projectName, projectType, styling, siteMode, customDomain]);

  useEffect(() => {
    setVersions(readHistory());
  }, []);

  // A provider change means the old model id is meaningless there.
  useEffect(() => {
    setRunSettings((previous) =>
      previous.model === providerDefinition.defaultModel
        ? previous
        : { ...previous, model: providerDefinition.defaultModel },
    );
  }, [providerDefinition.defaultModel]);

  /* Versions -------------------------------------------------------------- */

  const pushVersion = useCallback((files: FileMap, label: string, prompt?: string) => {
    if (Object.keys(files).length === 0) return;
    setVersions((current) => {
      const snapshot: VersionSnapshot = {
        id: generateId(),
        label,
        prompt,
        files: { ...files },
        createdAt: Date.now(),
      };
      const next = [snapshot, ...current].slice(0, 30);
      writeHistory(next);
      return next;
    });
  }, []);

  /* Sending --------------------------------------------------------------- */

  const handleSendMessage = useCallback(
    async (
      attachments: Attachment[] = [],
      overrideInput?: string,
      options: {
        annotations?: Array<{ x: number; y: number }>;
        device?: DeviceType;
        fromQueue?: boolean;
      } = {},
    ) => {
      const fromQueue = options.fromQueue === true;
      const annotations = options.annotations ?? pendingAnnotations;
      const device = options.device ?? previewDevice;

      if (provider !== 'custom' && !hasKey) {
        setPanel('settings');
        if (fromQueue) setQueuePaused(true);
        notify(`Add a ${providerDefinition.label} key to start building.`, 'info');
        return;
      }

      let textToSend = (overrideInput ?? input).trimEnd();

      if (!textToSend && attachments.length === 0 && annotations.length === 0) return;

      // While a build is running, a new message is queued rather than rejected.
      if (isLoading && !fromQueue) {
        const queued: QueuedPrompt = {
          id: generateId(),
          text: textToSend,
          attachments,
          annotations: [...annotations],
          device,
          createdAt: Date.now(),
        };
        setQueuedPrompts((previous) => [...previous, queued]);
        setQueuePaused(false);
        if (overrideInput === undefined) {
          setInput('');
          setPendingAnnotations([]);
          setIsAnnotating(false);
        }
        notify('Added to the queue. It starts when the current build finishes.', 'success');
        return;
      }

      if (isLoading && fromQueue) return;

      if (!textToSend) {
        textToSend = attachments.length
          ? promptForAttachments(attachments)
          : 'Improve the areas marked in the preview with one specific, tasteful change. Do not redesign the whole page.';
      }

      setQueuePaused(false);

      const context: string[] = [];
      for (const annotation of annotations) {
        context.push(
          `[CONTEXT: User clicked ${Math.round(annotation.x)}% across and ${Math.round(
            annotation.y,
          )}% down the preview. Pay special attention to that region.]`,
        );
      }
      context.push(`[CONTEXT: The preview is being viewed in ${device.toUpperCase()} mode.]`);
      textToSend = `${textToSend}\n\n${context.join('\n')}`.trim();

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: textToSend,
        timestamp: Date.now(),
        attachments,
      };

      setMessages((previous) => [...previous, userMessage]);
      setShowHome(false);
      if (!fromQueue && overrideInput === undefined) {
        setInput('');
        setPendingAnnotations([]);
        setIsAnnotating(false);
      }
      setIsLoading(true);

      const assistantMessageId = generateId();
      activeAssistantRef.current = assistantMessageId;
      const startTime = Date.now();

      setMessages((previous) => [
        ...previous,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: startTime,
          status: 'streaming',
          steps: initialBuildSteps(
            textToSend,
            attachments,
            providerDefinition.label,
            runSettings.model,
          ),
        },
      ]);

      abortControllerRef.current = new AbortController();

      const instruction = [
        DEFAULT_SYSTEM_INSTRUCTION,
        projectTypeInstruction(projectType, styling, siteMode),
        systemInstruction.trim() ? `EXTRA INSTRUCTIONS:\n${systemInstruction.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const updateStep = (
        stepId: string,
        state: BuildStep['state'],
        detail?: string,
      ) => {
        setMessages((previous) =>
          previous.map((message) => {
            if (message.id !== assistantMessageId) return message;
            return {
              ...message,
              steps: (message.steps ?? []).map((step) =>
                step.id === stepId
                  ? {
                      ...step,
                      state,
                      ...(detail === undefined ? {} : { detail }),
                      at: state === 'active' ? Date.now() : step.at,
                    }
                  : step,
              ),
            };
          }),
        );
      };

      const finishSteps = (
        finalFiles: FileMap,
        latency: number,
        failed = false,
      ) => {
        const count = Object.keys(finalFiles).length;
        setMessages((previous) =>
          previous.map((message) => {
            if (message.id !== assistantMessageId) return message;
            return {
              ...message,
              steps: (message.steps ?? []).map((step) => {
                if (step.id === 'stream') {
                  return { ...step, state: failed && step.state === 'active' ? 'error' : 'done' };
                }
                if (step.id === 'files') {
                  return {
                    ...step,
                    state: failed && step.state === 'active' ? 'error' : 'done',
                    detail:
                      count > 0
                        ? `${count} file${count === 1 ? '' : 's'} ready, preview synced`
                        : 'No files in this reply',
                  };
                }
                if (step.id === 'finish') {
                  return {
                    ...step,
                    state: failed && step.state === 'active' ? 'error' : 'done',
                    detail: failed
                      ? undefined
                      : count > 0
                        ? `Done in ${(latency / 1000).toFixed(1)}s`
                        : 'Answered without changing files',
                  };
                }
                if (step.state === 'active' || step.state === 'pending') {
                  return { ...step, state: failed ? 'stopped' : 'done' };
                }
                return step;
              }),
            };
          }),
        );
      };

      try {
        let accumulatedText = '';
        let lastFileCount = 0;
        let lastPaint = 0;

        await sendChat({
          provider,
          apiKey,
          model: runSettings.model,
          systemInstruction: instruction,
          messages: [
            ...messages.map((message) => ({
              role: message.role,
              content: message.content,
              attachments: message.attachments,
            })),
            { role: 'user', content: textToSend, attachments },
          ],
          isThinking,
          runSettings,
          signal: abortControllerRef.current.signal,
          customBaseUrl,
          onStage: (stage) => {
            if (stage === 'sending') updateStep('connect', 'active');
            if (stage === 'connected') {
              updateStep('connect', 'done');
              updateStep('stream', 'active', 'Connected. Waiting for the first token…');
            }
            if (stage === 'done') {
              updateStep('stream', 'done');
              updateStep('files', 'active', 'Reading the generated files…');
            }
          },
          onChunk: (chunk) => {
            accumulatedText = chunk;
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: accumulatedText }
                  : message,
              ),
            );

            const files = parseGeneratedFiles(accumulatedText);
            const fileCount = Object.keys(files).length;
            if (fileCount > 0) {
              setCurrentFiles(files);
              if (fileCount !== lastFileCount) {
                updateStep('files', 'active', `${fileCount} file${fileCount === 1 ? '' : 's'} detected…`);
                lastFileCount = fileCount;
              }
            }

            const now = Date.now();
            if (now - lastPaint > 500) {
              lastPaint = now;
              updateStep(
                'stream',
                'active',
                `Receiving code · ${Math.max(1, Math.round(accumulatedText.length / 1024))} KB`,
              );
            }
          },
        });

        const latency = Date.now() - startTime;
        const files = parseGeneratedFiles(accumulatedText);
        const fileCount = Object.keys(files).length;
        const followUps = parseFollowUps(accumulatedText);
        const warning =
          fileCount === 0
            ? 'No files were written in this reply. If you expected a website, ask for it directly or check the model and token limit in Settings.'
            : undefined;

        if (fileCount > 0) {
          pushVersion(files, versionLabel(textToSend), textToSend);
          setCurrentFiles(files);
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: accumulatedText,
                  latency,
                  status: 'done',
                  followUps,
                  warning,
                }
              : message,
          ),
        );
        finishSteps(files, latency);
      } catch (error) {
        const failure = error as Error;
        const latency = Date.now() - startTime;
        const aborted = failure.name === 'AbortError';

        if (aborted) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content:
                      message.content ||
                      'Stopped before the model finished. The partial result, if any, is above.',
                    latency,
                    status: 'stopped',
                    steps: (message.steps ?? []).map((step) =>
                      step.state === 'active'
                        ? { ...step, state: 'stopped' }
                        : step.state === 'pending'
                          ? { ...step, state: 'stopped' }
                          : step,
                    ),
                  }
                : message,
            ),
          );
        } else {
          const detail = failure.message?.trim();
          const message = detail
            ? detail
            : `Could not reach ${providerDefinition.label}. Check your key and your connection.`;
          setMessages((previous) =>
            previous.map((item) =>
              item.id === assistantMessageId
                ? {
                    ...item,
                    latency,
                    status: 'error',
                    error: message,
                    steps: (item.steps ?? []).map((step) =>
                      step.state === 'active'
                        ? { ...step, state: 'error', detail: message }
                        : step,
                    ),
                  }
                : item,
            ),
          );
          setQueuePaused(true);
          notify('Build failed. The exact reason is in the build log.', 'error');
        }
      } finally {
        setIsLoading(false);
        activeAssistantRef.current = null;
        abortControllerRef.current = null;
      }
    },
    [
      apiKey,
      customBaseUrl,
      hasKey,
      input,
      isThinking,
      isLoading,
      messages,
      pendingAnnotations,
      previewDevice,
      projectType,
      provider,
      providerDefinition.label,
      pushVersion,
      runSettings,
      siteMode,
      styling,
      systemInstruction,
      notify,
    ],
  );

  /*
   * The queue drains one prompt at a time after a successful build. It stays
   * paused after an error or a manual stop, so a failing provider cannot be
   * hammered with every queued request in a silent loop.
   */
  useEffect(() => {
    if (isLoading || queuePaused || queuedPrompts.length === 0) return;
    if (provider !== 'custom' && !hasKey) {
      setQueuePaused(true);
      return;
    }

    const [next, ...rest] = queuedPrompts;
    setQueuedPrompts(rest);
    void handleSendMessage(next.attachments, next.text, {
      annotations: next.annotations,
      device: next.device,
      fromQueue: true,
    });
  }, [hasKey, handleSendMessage, isLoading, provider, queuePaused, queuedPrompts]);

  const handleStop = () => {
    const activeId = activeAssistantRef.current;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);

    if (activeId) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === activeId
            ? {
                ...message,
                content:
                  message.content ||
                  'Stopped before the model answered. Nothing was written to the preview.',
                status: 'stopped',
                steps: (message.steps ?? []).map((step) =>
                  step.state === 'active' || step.state === 'pending'
                    ? { ...step, state: 'stopped' }
                    : step,
                ),
              }
            : message,
        ),
      );
    }

    if (queuedPrompts.length > 0) {
      setQueuePaused(true);
      notify(
        `Build stopped. ${queuedPrompts.length} queued message${
          queuedPrompts.length === 1 ? ' stays' : 's stay'
        } paused — resume when you are ready.`,
        'info',
      );
    } else {
      notify('Build stopped.', 'info');
    }
  };

  const removeQueuedPrompt = (id: string) => {
    setQueuedPrompts((previous) => previous.filter((prompt) => prompt.id !== id));
  };

  const clearQueue = () => {
    const count = queuedPrompts.length;
    setQueuedPrompts([]);
    setQueuePaused(false);
    if (count > 0) notify('Queue cleared.', 'success');
  };

  const resumeQueue = () => {
    if (provider !== 'custom' && !hasKey) {
      setPanel('settings');
      notify(`Add a ${providerDefinition.label} key before resuming.`, 'info');
      return;
    }
    setQueuePaused(false);
    notify('Queue resumed.', 'success');
  };

  /* New project ----------------------------------------------------------- */

  const performNewProject = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setCurrentFiles({});
    setInput('');
    setQueuedPrompts([]);
    setQueuePaused(false);
    setSeed(null);
    setPendingAnnotations([]);
    setIsAnnotating(false);
    setIsLoading(false);
    setShowHome(true);
    setPanel('none');
    setMobileNavOpen(false);
    setViewMode(ViewMode.SPLIT);
    setProjectName('Untitled project');
    setCustomDomain('');
    resetChatSession();
    setConfirmNew(false);
    notify('A blank canvas. Describe what you want to build.', 'success');
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('#composer-input')?.focus();
    }, 80);
  }, [notify]);

  const requestNewProject = useCallback(() => {
    if (messages.length === 0 && Object.keys(currentFiles).length === 0) {
      performNewProject();
      return;
    }
    setMobileNavOpen(false);
    setConfirmNew(true);
  }, [currentFiles, messages.length, performNewProject]);

  const handleRestoreVersion = (version: VersionSnapshot) => {
    if (Object.keys(currentFiles).length > 0) {
      pushVersion(currentFiles, 'Before restore');
    }
    setCurrentFiles({ ...version.files });
    setMessages((previous) => [
      ...previous,
      {
        id: generateId(),
        role: 'assistant',
        content: `Restored “${version.label}” from ${new Date(
          version.createdAt,
        ).toLocaleString()}.\n\n${filesAsContext(version.files)}`,
        timestamp: Date.now(),
      },
    ]);
    setShowHome(false);
    notify('Version restored. Your conversation is still here.', 'success');
  };

  const handleClearHistory = () => {
    clearHistory();
    setVersions([]);
    setConfirmHistory(false);
    notify('Version history cleared.', 'success');
  };

  /* Import ---------------------------------------------------------------- */

  const detectImportedDetails = (files: FileMap) => {
    const packageFile = files['package.json'];
    if (!packageFile) return { type: 'vanilla' as ProjectType, styling: 'vanilla' as Styling };

    try {
      const parsed = JSON.parse(packageFile) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const dependencies = { ...parsed.dependencies, ...parsed.devDependencies };
      const type: ProjectType = dependencies.next
        ? 'next'
        : dependencies.vue
          ? 'vue'
          : dependencies.react
            ? 'react'
            : 'vanilla';
      const styling: Styling =
        type !== 'vanilla' && dependencies.tailwindcss ? 'tailwind' : 'vanilla';
      return { type, styling };
    } catch {
      return { type: 'vanilla' as ProjectType, styling: 'vanilla' as Styling };
    }
  };

  const handleProjectFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const newFiles: FileMap = {};

    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const { default: JSZip } = await import('jszip');
        const zip = await JSZip.loadAsync(file);
        const entries = Object.values(zip.files).filter(
          (entry) =>
            !entry.dir &&
            !entry.name.startsWith('__MACOSX') &&
            !entry.name.includes('/.DS_Store') &&
            entry.name !== '.DS_Store',
        );

        // Archives are usually zipped from a folder. Strip that one shared
        // root so index.html ends up where the preview expects it.
        const paths = entries.map((entry) => entry.name);
        const roots = new Set(paths.map((path) => path.split('/')[0]));
        const sharedRoot =
          roots.size === 1 && paths.every((path) => path.includes('/'))
            ? `${[...roots][0]}/`
            : '';

        for (const entry of entries) {
          const name = sharedRoot ? entry.name.slice(sharedRoot.length) : entry.name;
          if (!name) continue;
          newFiles[name] = await entry.async('string');
        }
      } else if (file.name.toLowerCase().endsWith('.html')) {
        newFiles['index.html'] = await file.text();
      }

      if (Object.keys(newFiles).length === 0) {
        notify('That file had nothing to import.', 'error');
        return;
      }

      const detected = detectImportedDetails(newFiles);
      const importedCount = Object.keys(newFiles).length;

      setCurrentFiles(newFiles);
      setProjectType(detected.type);
      setStyling(detected.styling);
      if (!projectName.trim() || projectName === 'Untitled project') {
        setProjectName(file.name.replace(/\.(zip|html)$/i, '').replace(/[-_]+/g, ' '));
      }
      pushVersion(newFiles, `Imported ${importedCount} files`);
      setMessages((previous) => [
        ...previous,
        {
          id: generateId(),
          role: 'user',
          content: `I imported a project called “${file.name}” (${importedCount} files). Use these files as the current state.`,
          timestamp: Date.now(),
        },
        {
          id: generateId(),
          role: 'assistant',
          content: `Imported ${importedCount} files: ${Object.keys(newFiles)
            .slice(0, 12)
            .join(', ')}${importedCount > 12 ? '…' : ''}.\n\n${filesAsContext(newFiles)}`,
          timestamp: Date.now(),
          latency: 0,
        },
      ]);
      setShowHome(false);
      setViewMode(ViewMode.SPLIT);
      notify(`Imported ${importedCount} files.`, 'success');
    } catch {
      notify('Could not read that project file.', 'error');
    } finally {
      if (projectInputRef.current) projectInputRef.current.value = '';
    }
  };

  /* Preview helpers ------------------------------------------------------- */

  const handleAutoFix = () => {
    void handleSendMessage(
      [],
      'Review the current code for syntax errors, broken links, missing accessibility attributes, and responsive layout problems. Fix them. Keep the existing design and structure.',
    );
  };

  const handleExplain = () => {
    void handleSendMessage(
      [],
      'Explain the current code. Cover what each file does, how the pieces fit together, and anything a newcomer should be careful about. Do not rewrite the code.',
    );
  };

  const handleGenerateFrameworkPreview = () => {
    void handleSendMessage(
      [],
      'Add a self-contained preview.html at the project root that faithfully shows the current design using plain HTML, CSS, and JavaScript. Do not change any other file. It must not import React, Vue, Next.js, Tailwind, or any external script.',
    );
  };

  const handleFigmaImport = (images: Array<{ name: string; dataUrl: string }>) => {
    const attachments: Attachment[] = images.map((image) => ({
      type: 'image',
      content: image.dataUrl,
      mimeType: 'image/png',
    }));

    setInput(
      `Build a website that matches ${images.length === 1 ? 'this Figma design' : 'these Figma designs'} closely.`,
    );
    setMessages((previous) => [
      ...previous,
      {
        id: generateId(),
        role: 'user',
        content: `Attached ${images.length} Figma frame${
          images.length === 1 ? '' : 's'
        }: ${images.map((image) => image.name).join(', ')}. I will describe the build next.`,
        timestamp: Date.now(),
        attachments,
      },
    ]);
    setShowHome(false);
    setPanel('none');
    notify('Frames attached. Describe how to build them.', 'success');
  };

  /* Navigation ------------------------------------------------------------ */

  const enterStudio = (nextSeed?: StudioSeed) => {
    setShowLanding(false);
    setPanel('none');
    setMobileNavOpen(false);
    try {
      window.localStorage.setItem(STORAGE_VISITED, '1');
    } catch {
      // Still usable for this session.
    }

    if (nextSeed) {
      setSeed({ ...nextSeed, id: nextSeed.id ?? generateId() });
      if (nextSeed.prompt) setInput(nextSeed.prompt);
      setShowHome(true);
      setViewMode(ViewMode.SPLIT);
      window.setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>('#composer-input')?.focus();
      }, 90);
      return;
    }

    if (Object.keys(currentFiles).length === 0 && messages.length === 0) setShowHome(true);
  };

  const openLanding = () => {
    setPanel('none');
    setMobileNavOpen(false);
    setShowLanding(true);
  };

  const goHome = () => {
    setShowHome(true);
    setPanel('none');
    setMobileNavOpen(false);
  };

  const togglePanel = (next: PanelName) => {
    setPanel((current) => (current === next ? 'none' : next));
    setMobileNavOpen(false);
  };

  const handleProjectTypeChange = (type: ProjectType) => {
    setProjectType(type);
    if (type === 'vanilla' && styling === 'tailwind') setStyling('vanilla');
  };

  const handleProviderChange = (next: ProviderId) => {
    selectProvider(next);
  };

  const handleUseTemplate = (
    prompt: string,
    options?: { projectType?: ProjectType; siteMode?: SiteMode },
  ) => {
    setInput(prompt);
    if (options?.projectType) {
      setProjectType(options.projectType);
      if (options.projectType === 'vanilla' && styling === 'tailwind') setStyling('vanilla');
    }
    if (options?.siteMode) setSiteMode(options.siteMode);
    window.setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#composer-input');
      textarea?.focus();
      textarea?.setSelectionRange(prompt.length, prompt.length);
    }, 80);
  };

  const handleCustomDomainChange = (domain: string) => {
    setCustomDomain(domain);
    if (domain) notify(`${domain} saved. A CNAME is included in exports.`, 'success');
  };

  /* Derived --------------------------------------------------------------- */

  const exportFiles = useMemo(() => {
    const files: FileMap = { ...scaffoldFor(projectType, styling), ...currentFiles };
    if (customDomain) files['CNAME'] = `${customDomain}\n`;
    return files;
  }, [projectType, styling, currentFiles, customDomain]);

  const hasFiles = Object.keys(currentFiles).length > 0;
  const projectTypeOption =
    PROJECT_TYPES.find((option) => option.value === projectType) ?? PROJECT_TYPES[0];
  const needsBuild = !projectTypeOption.previewable && hasFiles;
  const isDashboard = showHome || messages.length === 0;
  const showChat = viewMode !== ViewMode.PREVIEW;
  const showPreview = viewMode !== ViewMode.CHAT;

  const modelPicker = (
    <ModelPicker
      provider={provider}
      onProviderChange={handleProviderChange}
      apiKey={apiKey}
      customBaseUrl={customBaseUrl}
      model={runSettings.model}
      onModelChange={(model) => setRunSettings((previous) => ({ ...previous, model }))}
      savedProviders={savedProviders}
      hasUserKey={hasUserKey}
      onManageProviders={() => setPanel('settings')}
      align="right"
    />
  );

  const chatWidth =
    viewMode === ViewMode.CHAT
      ? 'flex h-full w-full min-w-0 flex-col'
      : viewMode === ViewMode.SPLIT
        ? 'flex h-full w-full min-w-0 flex-col border-r border-line lg:w-[390px] xl:w-[440px]'
        : 'hidden';

  const previewWidth =
    viewMode === ViewMode.PREVIEW
      ? 'flex h-full min-w-0 flex-1 flex-col'
      : viewMode === ViewMode.SPLIT
        ? 'hidden h-full min-w-0 flex-1 flex-col lg:flex'
        : 'hidden';

  const sheetWidth =
    panel === 'history'
      ? 'sm:max-w-[720px]'
      : panel === 'publish'
        ? 'sm:max-w-[520px]'
        : 'sm:max-w-[480px]';

  /* Render ---------------------------------------------------------------- */

  if (showLanding) {
    return (
      <LandingPage
        theme={theme}
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        onEnter={enterStudio}
        returning={readVisited() || hasFiles || messages.length > 0}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-canvas font-sans text-ink">
      <Sidebar
        activePanel={panel}
        onHome={goHome}
        onNewProject={requestNewProject}
        onOpenPanel={togglePanel}
        onOpenLanding={openLanding}
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        theme={theme}
        hasFiles={hasFiles}
        isHome={isDashboard}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          projectName={projectName}
          onProjectNameChange={setProjectName}
          isGenerating={isLoading}
          onStop={handleStop}
          hasFiles={hasFiles}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          modelPicker={modelPicker}
          onPublish={() => togglePanel('publish')}
          isPublishing={isPublishing}
          showViews={!isDashboard}
        />

        <main className="relative flex min-h-0 flex-1">
          {isDashboard ? (
            <DashboardHome
              projectName={projectName}
              hasWork={hasFiles}
              input={input}
              setInput={setInput}
              onSend={(attachments, text) => void handleSendMessage(attachments, text)}
              isLoading={isLoading}
              onStop={handleStop}
              versions={versions}
              onOpenHistory={() => togglePanel('history')}
              onContinue={() => {
                setShowHome(false);
                setViewMode(ViewMode.SPLIT);
              }}
              onOpenSettings={() => togglePanel('settings')}
              projectType={projectType}
              styling={styling}
              siteMode={siteMode}
              onSiteModeChange={setSiteMode}
              onUseTemplate={handleUseTemplate}
              hasKey={hasKey}
              modelPicker={modelPicker}
              onImportProject={() => projectInputRef.current?.click()}
              initialLink={seed?.link}
              initialAttachments={seed?.attachments}
              onInitialLinkConsumed={() =>
                setSeed((previous) =>
                  previous ? { ...previous, link: undefined } : previous,
                )
              }
              onInitialAttachmentsConsumed={() =>
                setSeed((previous) =>
                  previous ? { ...previous, attachments: undefined } : previous,
                )
              }
            />
          ) : (
            <>
              {showChat && (
                <section className={chatWidth} aria-label="Build log">
                  <ChatPanel
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    onSend={(attachments, text) => void handleSendMessage(attachments, text)}
                    isLoading={isLoading}
                    onStop={handleStop}
                    isAnnotating={isAnnotating}
                    setIsAnnotating={setIsAnnotating}
                    pendingAnnotations={pendingAnnotations}
                    onRemoveAnnotation={(index) =>
                      setPendingAnnotations((previous) => previous.filter((_, i) => i !== index))
                    }
                    queuedPrompts={queuedPrompts}
                    queuePaused={queuePaused}
                    onRemoveQueued={removeQueuedPrompt}
                    onClearQueue={clearQueue}
                    onResumeQueue={resumeQueue}
                    onClear={requestNewProject}
                    onImportProject={() => projectInputRef.current?.click()}
                  />
                </section>
              )}

              {showPreview && (
                <section className={previewWidth} aria-label="Preview">
                  <PreviewPane
                    files={currentFiles}
                    isGenerating={isLoading}
                    onAutoFix={handleAutoFix}
                    onExplain={handleExplain}
                    onGenerateFrameworkPreview={handleGenerateFrameworkPreview}
                    isAnnotating={isAnnotating}
                    onAnnotateSelect={(x, y) => {
                      setPendingAnnotations((previous) => [...previous, { x, y }]);
                      setIsAnnotating(false);
                      notify('Point added. Describe the change you want there.', 'info');
                    }}
                    onFileUpdate={setCurrentFiles}
                    needsBuild={needsBuild}
                    projectLabel={projectTypeOption.label}
                    exportFiles={exportFiles}
                    previewDevice={previewDevice}
                    onDeviceChange={setPreviewDevice}
                  />
                </section>
              )}
            </>
          )}
        </main>

        {!isDashboard && (
          <nav
            className="flex h-12 shrink-0 items-center border-t border-line bg-surface/85 px-2 backdrop-blur lg:hidden"
            aria-label="Workspace view"
          >
            <button
              onClick={() => setViewMode(ViewMode.CHAT)}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                viewMode !== ViewMode.PREVIEW ? 'bg-surface-3 text-ink' : 'text-ink-faint'
              }`}
            >
              <Icon name="message" size={13} />
              Chat
            </button>
            <button
              onClick={() => setViewMode(ViewMode.PREVIEW)}
              disabled={!hasFiles}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                viewMode === ViewMode.PREVIEW ? 'bg-surface-3 text-ink' : 'text-ink-faint'
              }`}
            >
              <Icon name="eye" size={13} />
              Preview
            </button>
            <button
              onClick={() => togglePanel('history')}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold text-ink-faint transition-colors hover:text-ink"
            >
              <Icon name="clock" size={13} />
              History
            </button>
            <button
              onClick={() => togglePanel('settings')}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold text-ink-faint transition-colors hover:text-ink"
            >
              <Icon name="sliders" size={13} />
              Settings
            </button>
          </nav>
        )}
      </div>

      {/* Panels are sheets, not columns: the canvas keeps its width. */}
      {panel !== 'none' && (
        <div className="fixed inset-0 z-[60]">
          <button
            className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setPanel('none')}
            aria-label="Close panel"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={
              panel === 'settings'
                ? 'Settings'
                : panel === 'history'
                  ? 'Version history'
                  : 'Publish and export'
            }
            className={`sheet-panel absolute right-0 top-0 flex h-full w-full flex-col shadow-2xl ${sheetWidth}`}
          >
            {panel === 'settings' && (
              <SettingsPanel
                settings={runSettings}
                setSettings={setRunSettings}
                projectType={projectType}
                onProjectTypeChange={handleProjectTypeChange}
                styling={styling}
                onStylingChange={setStyling}
                siteMode={siteMode}
                onSiteModeChange={setSiteMode}
                provider={provider}
                onProviderChange={handleProviderChange}
                apiKey={apiKey}
                customBaseUrl={customBaseUrl}
                onSaveCustomBaseUrl={saveCustomBaseUrl}
                buildTimeAvailable={buildTimeAvailable}
                hasUserKey={hasUserKey}
                savedProviders={savedProviders}
                onSaveKey={saveKey}
                onForgetKey={forgetKey}
                systemInstruction={systemInstruction}
                onSystemInstructionChange={setSystemInstruction}
                isThinking={isThinking}
                onThinkingChange={setIsThinking}
                onClose={() => setPanel('none')}
              />
            )}

            {panel === 'history' && (
              <HistoryPanel
                versions={versions}
                currentFiles={currentFiles}
                onRestore={handleRestoreVersion}
                onClear={() => setConfirmHistory(true)}
                onClose={() => setPanel('none')}
              />
            )}

            {panel === 'publish' && (
              <PublishPanel
                files={exportFiles}
                projectName={projectName}
                customDomain={customDomain}
                onCustomDomainChange={handleCustomDomainChange}
                onBusyChange={setIsPublishing}
                onClose={() => {
                  setPanel('none');
                  setIsPublishing(false);
                }}
                onFigmaImport={handleFigmaImport}
              />
            )}
          </aside>
        </div>
      )}

      <input
        type="file"
        ref={projectInputRef}
        className="hidden"
        accept=".zip,.html"
        onChange={(event) => void handleProjectFileChange(event)}
      />

      <ConfirmDialog
        open={confirmNew}
        title="Start a new project?"
        body="Your current files will leave the canvas. Every saved version stays in history, so you can restore this build later."
        confirmLabel="New project"
        onConfirm={performNewProject}
        onCancel={() => setConfirmNew(false)}
      />

      <ConfirmDialog
        open={confirmHistory}
        title="Clear every saved version?"
        body="Snapshots live only in this browser. Clearing them cannot be undone, and the current files on the canvas are not affected."
        confirmLabel="Clear history"
        tone="danger"
        onConfirm={handleClearHistory}
        onCancel={() => setConfirmHistory(false)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default App;
