import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatPanel from './components/ChatPanel';
import PreviewPane from './components/PreviewPane';
import SettingsPanel from './components/SettingsPanel';
import HistoryPanel from './components/HistoryPanel';
import PublishPanel from './components/PublishPanel';
import AppHeader from './components/AppHeader';
import {
  parseGeneratedFiles,
  DEFAULT_SYSTEM_INSTRUCTION,
  resetChat,
} from './services/geminiService';
import { Message, ViewMode, Attachment, FileMap, RunSettings, DeviceType } from './types';
import { useProvider } from './hooks/useProvider';
import { sendChat, getProvider } from './lib/providers';
import {
  ProjectType,
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


const generateId = () => Math.random().toString(36).substring(2, 15);

const STORAGE_THEME = 'ai-website-builder:theme:v1';
const STORAGE_PROJECT = 'ai-website-builder:project-name:v1';

function readStoredTheme(): 'light' | 'dark' {
  try {
    const stored = window.localStorage.getItem(STORAGE_THEME);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be blocked.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredProjectName(): string {
  try {
    return window.localStorage.getItem(STORAGE_PROJECT) ?? 'Untitled project';
  } catch {
    return 'Untitled project';
  }
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<FileMap>({});
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const [isAnnotating, setIsAnnotating] = useState(false);
  const [pendingAnnotations, setPendingAnnotations] = useState<Array<{ x: number; y: number }>>([]);

  const [previewDevice, setPreviewDevice] = useState<DeviceType>('desktop');

  const [theme, setTheme] = useState<'light' | 'dark'>(readStoredTheme);
  const [projectName, setProjectName] = useState<string>(readStoredProjectName);
  const [projectType, setProjectType] = useState<ProjectType>('vanilla');
  const [styling, setStyling] = useState<Styling>('vanilla');

  const [panel, setPanel] = useState<'none' | 'settings' | 'history' | 'publish'>('none');
  const [isPublishing, setIsPublishing] = useState(false);

  const [runSettings, setRunSettings] = useState<RunSettings>({
    model: getProvider('gemini').defaultModel,
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  });

  const [versions, setVersions] = useState<VersionSnapshot[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_THEME, theme);
    } catch {
      // Not important enough to fail on.
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PROJECT, projectName);
    } catch {
      // Not important enough to fail on.
    }
  }, [projectName]);

  useEffect(() => {
    setVersions(readHistory());
  }, []);

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

  const handleSendMessage = useCallback(
    async (attachments: Attachment[] = [], overrideInput?: string) => {
      let textToSend = overrideInput || input;

      let contextData = '';

      if (!overrideInput && pendingAnnotations.length > 0) {
        contextData += pendingAnnotations
          .map(
            (annotation) =>
              `[CONTEXT: User clicked at screen coordinates ${annotation.x}% horizontal, ${annotation.y}% vertical]`,
          )
          .join('\n');
      }

      contextData += `\n[CONTEXT: User is currently viewing the app in ${previewDevice.toUpperCase()} mode.]`;

      if (contextData) {
        textToSend = `${textToSend}\n\n${contextData}`;
      }

      if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: textToSend,
        timestamp: Date.now(),
        attachments,
      };

      setMessages((previous) => [...previous, userMessage]);
      if (!overrideInput) {
        setInput('');
        setPendingAnnotations([]);
      }
      setIsLoading(true);

      const assistantMessageId = generateId();
      const startTime = Date.now();

      setMessages((previous) => [
        ...previous,
        { id: assistantMessageId, role: 'assistant', content: '', timestamp: startTime },
      ]);

      abortControllerRef.current = new AbortController();

      const instruction = [
        DEFAULT_SYSTEM_INSTRUCTION,
        projectTypeInstruction(projectType, styling),
        systemInstruction.trim() ? `EXTRA INSTRUCTIONS:\n${systemInstruction.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      try {
        let accumulatedText = '';

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
            if (Object.keys(files).length > 0) {
              setCurrentFiles(files);
            }
          },
        });

        const latency = Date.now() - startTime;
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessageId ? { ...message, latency } : message,
          ),
        );

        const files = parseGeneratedFiles(accumulatedText);
        if (Object.keys(files).length > 0) {
          pushVersion(files, 'Generated', textToSend);
        }
      } catch (error) {
        const failure = error as Error;
        if (failure.name !== 'AbortError') {
          const message =
            failure.message && failure.message.toLowerCase().includes('api key')
              ? `Error: ${failure.message}`
              : 'Error: Could not reach the Gemini API. Check your key and your connection.';

          setMessages((previous) => [
            ...previous,
            { id: generateId(), role: 'assistant', content: message, timestamp: Date.now() },
          ]);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      input,
      isLoading,
      messages,
      systemInstruction,
      isThinking,
      runSettings,
      pendingAnnotations,
      previewDevice,
      projectType,
      styling,
      apiKey,
      provider,
      customBaseUrl,
      pushVersion,
    ],
  );

  const handleStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentFiles({});
    resetChat();
    setPendingAnnotations([]);
    abortControllerRef.current?.abort();
  };

  const handleProjectFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const newFiles: FileMap = {};

    try {
      if (file.name.endsWith('.zip')) {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        const loaded = await zip.loadAsync(file);

        for (const filename of Object.keys(loaded.files)) {
          if (!loaded.files[filename].dir && !filename.startsWith('__MACOSX')) {
            newFiles[filename] = await loaded.files[filename].async('string');
          }
        }
      } else if (file.name.endsWith('.html')) {
        const content = await file.text();
        newFiles[file.name] = content;
        if (file.name !== 'index.html' && !newFiles['index.html']) {
          newFiles['index.html'] = content;
        }
      }

      if (Object.keys(newFiles).length > 0) {
        setCurrentFiles(newFiles);
        pushVersion(newFiles, 'Imported');

        let contextMessage = '';
        for (const [name, content] of Object.entries(newFiles)) {
          contextMessage += `__FILE: ${name}__\n${content}\n\n`;
        }

        setMessages((previous) => [
          ...previous,
          {
            id: generateId(),
            role: 'user',
            content: `I have imported the project files (${Object.keys(newFiles).join(', ')}). Use this as the current state.`,
            timestamp: Date.now(),
          },
          {
            id: generateId(),
            role: 'assistant',
            content: contextMessage,
            timestamp: Date.now(),
            latency: 0,
          },
        ]);
      }
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Error: Could not read that project file.',
          timestamp: Date.now(),
        },
      ]);
    }

    if (projectInputRef.current) projectInputRef.current.value = '';
  };

  const handleAutoFix = () => {
    handleSendMessage(
      [],
      'Review the current code for any syntax errors, broken links, missing accessibility attributes, or responsive layout problems, and fix them. Keep the existing design and structure.',
    );
  };

  const handleExplain = () => {
    handleSendMessage(
      [],
      'Explain the current code. Cover what each file does, how the pieces fit together, and anything a newcomer should be careful about. Do not rewrite the code.',
    );
  };

  const handleRestoreVersion = (version: VersionSnapshot) => {
    setCurrentFiles({ ...version.files });
    setMessages((previous) => [
      ...previous,
      {
        id: generateId(),
        role: 'assistant',
        content: `Restored the version from ${new Date(version.createdAt).toLocaleString()}.`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleClearHistory = () => {
    clearHistory();
    setVersions([]);
  };

  const handleFigmaImport = (images: Array<{ name: string; dataUrl: string }>) => {
    const attachments: Attachment[] = images.map((image) => ({
      type: 'image',
      content: image.dataUrl,
      mimeType: 'image/png',
    }));

    setInput(
      `Build a website that matches these Figma designs${images.length === 1 ? '' : 's'} exactly.`,
    );
    setMessages((previous) => [
      ...previous,
      {
        id: generateId(),
        role: 'user',
        content: `Imported ${images.length} Figma frame${images.length === 1 ? '' : 's'}: ${images
          .map((image) => image.name)
          .join(', ')}. They are attached to the next message.`,
        timestamp: Date.now(),
        attachments,
      },
    ]);
    setPanel('none');
  };

  // Framework projects need their scaffold files so the export is a project
  // you can actually run, not just the files the model wrote.
  const exportFiles = useMemo(
    () => ({ ...scaffoldFor(projectType), ...currentFiles }),
    [projectType, currentFiles],
  );

  const hasFiles = Object.keys(currentFiles).length > 0;
  const projectTypeOption =
    PROJECT_TYPES.find((option) => option.value === projectType) ?? PROJECT_TYPES[0];
  const needsBuild = !projectTypeOption.previewable && hasFiles;
  const showChat = viewMode !== ViewMode.PREVIEW;
  const showPreview = viewMode !== ViewMode.CHAT;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas font-sans text-ink">
      <AppHeader
        projectName={projectName}
        onProjectNameChange={setProjectName}
        isGenerating={isLoading}
        hasFiles={hasFiles}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => setPanel(panel === 'settings' ? 'none' : 'settings')}
        onOpenHistory={() => setPanel(panel === 'history' ? 'none' : 'history')}
        onOpenPublish={() => setPanel(panel === 'publish' ? 'none' : 'publish')}
        historyCount={versions.length}
        isPublishing={isPublishing}
      />

      {!hasKey && (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-4 border-b border-accent/20 bg-accent-soft px-4 py-2 text-[12.5px] text-ink"
        >
          <span className="flex min-w-0 items-center gap-2">
            <i className="fa-solid fa-key text-accent" aria-hidden="true" />
            <span className="truncate">
              Add your {providerDefinition.label} API key to start building. It stays in this
            browser.
            </span>
          </span>
          <button
            onClick={() => setPanel('settings')}
            className="shrink-0 rounded-lg bg-accent px-3 py-1 text-[11.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Add key
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {showChat && (
          <div
            className={`flex h-full min-w-0 flex-col border-r border-line transition-[width] duration-300 ${
              viewMode === ViewMode.SPLIT
                ? 'w-full md:w-[400px] xl:w-[440px]'
                : 'w-full'
            }`}
          >
            <ChatPanel
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={(attachments) => handleSendMessage(attachments)}
              isLoading={isLoading}
              onStop={handleStop}
              isAnnotating={isAnnotating}
              setIsAnnotating={setIsAnnotating}
              pendingAnnotations={pendingAnnotations}
              onRemoveAnnotation={(index) =>
                setPendingAnnotations((previous) => previous.filter((_, i) => i !== index))
              }
              systemInstruction={systemInstruction}
              setSystemInstruction={setSystemInstruction}
              isThinking={isThinking}
              setIsThinking={setIsThinking}
              onClear={handleClearChat}
            />
          </div>
        )}

        {showPreview && (
          <div className="flex h-full min-w-0 flex-1 flex-col">
            <PreviewPane
              files={currentFiles}
              isGenerating={isLoading}
              onAutoFix={handleAutoFix}
              onExplain={handleExplain}
              isAnnotating={isAnnotating}
              onAnnotateSelect={(x, y) => {
                setPendingAnnotations((previous) => [...previous, { x, y }]);
                setIsAnnotating(false);
              }}
              onFileUpdate={setCurrentFiles}
              needsBuild={needsBuild}
              projectLabel={projectTypeOption.label}
              exportFiles={exportFiles}
              previewDevice={previewDevice}
              onDeviceChange={setPreviewDevice}
            />
          </div>
        )}

        {panel === 'settings' && (
          <SettingsPanel
            settings={runSettings}
            setSettings={setRunSettings}
            projectType={projectType}
            onProjectTypeChange={setProjectType}
            styling={styling}
            onStylingChange={setStyling}
            provider={provider}
            onProviderChange={selectProvider}
            apiKey={apiKey}
            customBaseUrl={customBaseUrl}
            onSaveCustomBaseUrl={saveCustomBaseUrl}
            buildTimeAvailable={buildTimeAvailable}
            hasUserKey={hasUserKey}
            savedProviders={savedProviders}
            onSaveKey={saveKey}
            onForgetKey={forgetKey}
            onClose={() => setPanel('none')}
          />
        )}

        {panel === 'history' && (
          <HistoryPanel
            versions={versions}
            currentFiles={currentFiles}
            onRestore={handleRestoreVersion}
            onClear={handleClearHistory}
            onClose={() => setPanel('none')}
          />
        )}

        {panel === 'publish' && (
          <PublishPanel
            files={exportFiles}
            projectName={projectName}
            onBusyChange={setIsPublishing}
            onClose={() => {
              setPanel('none');
              setIsPublishing(false);
            }}
            onFigmaImport={handleFigmaImport}
          />
        )}
      </div>

      <input
        type="file"
        ref={projectInputRef}
        className="hidden"
        accept=".zip,.html"
        onChange={handleProjectFileChange}
      />
      <input type="file" ref={fileInputRef} className="hidden" />

      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-line bg-surface px-3 py-1.5 md:hidden">
        <button
          onClick={() => setViewMode(ViewMode.CHAT)}
          className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
            viewMode === ViewMode.CHAT ? 'bg-surface-3 text-ink' : 'text-ink-muted'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setViewMode(ViewMode.PREVIEW)}
          className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
            viewMode === ViewMode.PREVIEW ? 'bg-surface-3 text-ink' : 'text-ink-muted'
          }`}
        >
          Preview
        </button>
      </div>
    </div>
  );
};

export default App;
