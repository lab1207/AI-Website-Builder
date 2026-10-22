import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Message, Attachment, BuildStep, QueuedPrompt } from '../types';
import Composer from './Composer';
import Icon from './Icon';
import { LogoMark } from './Logo';
import { listGeneratedFiles, parseFollowUps, preFileText } from '../lib/generation';

interface ChatPanelProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSend: (attachments: Attachment[], overrideInput?: string) => void;
  isLoading: boolean;
  onStop: () => void;
  isAnnotating: boolean;
  setIsAnnotating: (value: boolean) => void;
  pendingAnnotations: Array<{ x: number; y: number }>;
  onRemoveAnnotation: (index: number) => void;
  queuedPrompts: QueuedPrompt[];
  queuePaused: boolean;
  onRemoveQueued: (id: string) => void;
  onClearQueue: () => void;
  onResumeQueue: () => void;
  onClear: () => void;
  onImportProject?: () => void;
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StepGlyph({ state }: { state: BuildStep['state'] }) {
  if (state === 'active') {
    return (
      <span className="flex h-4 w-4 items-center justify-center">
        <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
      </span>
    );
  }
  if (state === 'done') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/12 text-success">
        <Icon name="check" size={9} strokeWidth={2.6} />
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger/12 text-danger">
        <Icon name="alert" size={9} strokeWidth={2.4} />
      </span>
    );
  }
  if (state === 'stopped') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-3 text-ink-faint">
        <Icon name="stop" size={7} strokeWidth={2.4} />
      </span>
    );
  }
  return (
    <span className="flex h-4 w-4 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full border border-line-strong" />
    </span>
  );
}

const BuildTimeline: React.FC<{ message: Message; now: number }> = ({ message, now }) => {
  const steps = message.steps ?? [];
  if (steps.length === 0) return null;

  const elapsed =
    message.status === 'streaming'
      ? now - message.timestamp
      : message.latency && message.latency > 0
        ? message.latency
        : 0;

  const status =
    message.status === 'streaming'
      ? { label: 'Building', tone: 'text-accent bg-accent-soft border-accent/25' }
      : message.status === 'error'
        ? { label: 'Failed', tone: 'text-danger bg-danger/[0.07] border-danger/25' }
        : message.status === 'stopped'
          ? { label: 'Stopped', tone: 'text-ink-muted bg-surface-2 border-line' }
          : { label: 'Complete', tone: 'text-success bg-success/10 border-success/20' };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 border-b border-line/70 px-2.5 py-1.5">
        <Icon name="sparkles" size={10} className="text-accent" />
        <span className="text-[9.5px] font-bold uppercase tracking-[0.09em] text-ink-faint">
          Build trail
        </span>
        <span
          aria-live="polite"
          className={`ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[8.5px] font-semibold ${status.tone}`}
        >
          {message.status === 'streaming' && (
            <span className="h-1 w-1 animate-pulse-soft rounded-full bg-current" />
          )}
          {status.label}
        </span>
        {elapsed > 0 && (
          <span className="font-mono text-[8.5px] tabular-nums text-ink-faint">
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      <ol className="divide-y divide-line/50">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`flex items-start gap-2 px-2.5 py-1.5 ${
              step.state === 'active' ? 'bg-accent-soft/35' : ''
            }`}
          >
            <span className="mt-[1px] shrink-0">
              <StepGlyph state={step.state} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[10.5px] font-medium leading-snug ${
                  step.state === 'active'
                    ? 'text-accent'
                    : step.state === 'error'
                      ? 'text-danger'
                      : step.state === 'pending'
                        ? 'text-ink-faint'
                        : 'text-ink'
                }`}
              >
                {step.label}
              </span>
              {step.detail && (
                <span
                  className={`mt-0.5 block truncate text-[9px] leading-snug ${
                    step.state === 'error' ? 'text-danger/80' : 'text-ink-faint'
                  }`}
                  title={step.detail}
                >
                  {step.detail}
                </span>
              )}
            </span>
            {step.state === 'pending' && (
              <span className="mt-0.5 shrink-0 text-[8px] uppercase tracking-[0.06em] text-ink-faint/70">
                queued
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  isAnnotating,
  setIsAnnotating,
  pendingAnnotations,
  onRemoveAnnotation,
  queuedPrompts,
  queuePaused,
  onRemoveQueued,
  onClearQueue,
  onResumeQueue,
  onClear,
  onImportProject,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !nearBottomRef.current) return;
    element.scrollTo({ top: element.scrollHeight, behavior: isLoading ? 'auto' : 'smooth' });
  }, [messages, isLoading, queuedPrompts.length]);

  const insertCodeBlock = () => {
    const next = `${input}\n\`\`\`\n\n\`\`\``;
    setInput(next);
    window.setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#composer-input');
      if (textarea) {
        textarea.focus();
        const position = next.length - 4;
        textarea.setSelectionRange(position, position);
      }
    }, 10);
  };

  const visibleMessages = useMemo(() => messages, [messages]);
  const userMessageCount = messages.filter((message) => message.role === 'user').length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* Build log toolbar ------------------------------------------------ */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface/50 px-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          <Icon name="message" size={11} />
          Build log
        </span>
        <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold text-ink-faint">
          {userMessageCount}
        </span>
        {queuedPrompts.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-1.5 py-0.5 text-[9px] font-semibold text-accent">
            <Icon name="clock" size={8} />
            {queuedPrompts.length} queued
          </span>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          {isLoading && (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-danger transition-colors hover:bg-danger/[0.07]"
              title="Stop this build"
            >
              <Icon name="stop" size={9} />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
          <button
            onClick={onClear}
            className="toolbar-btn"
            title="Start a new project"
            aria-label="Start a new project"
          >
            <Icon name="trash" size={11} />
            <span className="hidden lg:inline">New</span>
          </button>
        </div>
      </div>

      {/* Conversation ----------------------------------------------------- */}
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          nearBottomRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 90;
        }}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto"
      >
        {visibleMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <LogoMark size={36} />
            <p className="mt-3 text-[13px] font-semibold text-ink">Your build log is empty</p>
            <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-ink-faint">
              Bring a screenshot, a live link, a project file, or a sentence. The first build
              starts as soon as you send it.
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-3 py-4">
            {visibleMessages.map((message) => {
              const files =
                message.role === 'assistant' ? listGeneratedFiles(message.content) : [];
              const summary =
                message.role === 'assistant' ? preFileText(message.content) : '';
              const followUps =
                message.role === 'assistant'
                  ? message.followUps?.length
                    ? message.followUps
                    : parseFollowUps(message.content)
                  : [];

              if (message.role === 'user') {
                return (
                  <div key={message.id} className="flex flex-col items-end gap-1.5">
                    <div className="max-w-[88%] whitespace-pre-wrap rounded-[16px] rounded-br-[5px] bg-ink px-3.5 py-2.5 text-[12.5px] leading-relaxed text-canvas">
                      {message.content.replace(/\n\n\[CONTEXT:[\s\S]*$/, '').trim() ||
                        'Sent references'}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex max-w-[88%] flex-wrap justify-end gap-1.5">
                        {message.attachments.map((attachment, index) =>
                          attachment.type === 'image' ? (
                            <img
                              key={`${message.id}-${index}`}
                              src={attachment.content}
                              alt={attachment.name ?? `Attached reference ${index + 1}`}
                              className="h-12 w-12 rounded-lg border border-line object-cover"
                            />
                          ) : (
                            <span
                              key={`${message.id}-${index}`}
                              className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[9.5px] text-ink-muted"
                            >
                              <Icon name="file-text" size={10} className="shrink-0 text-accent" />
                              <span className="truncate">{attachment.name ?? 'Text reference'}</span>
                              {attachment.size && (
                                <span className="shrink-0 text-ink-faint">
                                  {formatBytes(attachment.size)}
                                </span>
                              )}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={message.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    <LogoMark size={24} />
                  </span>

                  <div className="min-w-0 flex-1 space-y-2">
                    {message.steps && message.steps.length > 0 && (
                      <BuildTimeline message={message} now={now} />
                    )}

                    {summary && (
                      <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink">
                        {summary}
                      </div>
                    )}

                    {files.length > 0 && (
                      <div className="rounded-xl border border-line bg-surface p-2.5 shadow-[var(--shadow-sm)]">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-success/12 text-success">
                            <Icon
                              name={message.status === 'streaming' ? 'refresh' : 'check'}
                              size={10}
                              strokeWidth={2.4}
                              className={message.status === 'streaming' ? 'animate-spin' : ''}
                            />
                          </span>
                          <p className="text-[11px] font-semibold text-ink">
                            {files.length} file{files.length === 1 ? '' : 's'}{' '}
                            {message.status === 'streaming' ? 'streaming' : 'written'}
                          </p>
                          <span className="ml-auto text-[9px] text-ink-faint">
                            {message.status === 'streaming' ? 'live preview' : 'preview synced'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {files.slice(0, 8).map((file) => (
                            <span
                              key={file}
                              className="inline-flex max-w-full items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-muted"
                            >
                              <Icon name="file" size={8} className="shrink-0 text-ink-faint" />
                              <span className="truncate">{file}</span>
                            </span>
                          ))}
                          {files.length > 8 && (
                            <span className="px-1 py-0.5 text-[9px] text-ink-faint">
                              +{files.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {message.error && (
                      <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.06] px-3 py-2.5 text-[11.5px] leading-relaxed text-danger">
                        <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                        <span>
                          <span className="block text-[9px] font-bold uppercase tracking-[0.08em] opacity-80">
                            Build failed
                          </span>
                          <span className="mt-0.5 block">{message.error}</span>
                        </span>
                      </div>
                    )}

                    {message.warning && !message.error && (
                      <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/[0.07] px-3 py-2 text-[10.5px] leading-relaxed text-ink-muted">
                        <Icon name="info" size={12} className="mt-0.5 shrink-0 text-warning" />
                        <span>{message.warning}</span>
                      </div>
                    )}

                    {followUps.length > 0 && message.status !== 'error' && (
                      <div className="pt-0.5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-ink-faint">
                          Keep going
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {followUps.map((question) => (
                            <button
                              key={question}
                              onClick={() => onSend([], question)}
                              className="group inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-left text-[10px] font-medium text-ink-muted transition-colors hover:border-accent/35 hover:bg-accent-soft hover:text-accent"
                              title={isLoading ? 'Queue this follow-up' : question}
                            >
                              <Icon
                                name="sparkles"
                                size={9}
                                className="shrink-0 text-ink-faint group-hover:text-accent"
                              />
                              <span className="truncate">{question}</span>
                              <Icon name="arrow-right" size={9} className="shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.latency != null && message.latency > 0 && (
                      <div className="flex items-center gap-2 pl-0.5 font-mono text-[9px] text-ink-faint">
                        <span>{(message.latency / 1000).toFixed(1)}s</span>
                        <span className="h-0.5 w-0.5 rounded-full bg-ink-faint" />
                        <span>
                          {files.length > 0
                            ? `${files.length} files`
                            : message.status === 'error'
                              ? 'failed'
                              : 'answered'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Queue ------------------------------------------------------------ */}
      {queuedPrompts.length > 0 && (
        <div className="shrink-0 border-t border-line bg-surface/60 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.09em] text-ink-faint">
              <Icon name="clock" size={9} />
              Up next · {queuedPrompts.length}
            </span>
            {queuePaused && (
              <span className="rounded-full border border-warning/30 bg-warning/10 px-1.5 py-[1px] text-[8.5px] font-semibold text-warning">
                paused
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {queuePaused && (
                <button
                  onClick={onResumeQueue}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-semibold text-accent transition-colors hover:bg-accent-soft"
                >
                  <Icon name="play" size={8} />
                  Resume
                </button>
              )}
              <button
                onClick={onClearQueue}
                className="rounded px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-faint transition-colors hover:text-danger"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="mt-1.5 space-y-1">
            {queuedPrompts.slice(0, 3).map((prompt) => (
              <div
                key={prompt.id}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1"
              >
                <Icon name="clock" size={9} className="shrink-0 text-ink-faint" />
                <span className="min-w-0 flex-1 truncate text-[10px] text-ink-muted">
                  {prompt.text.replace(/\n\n\[CONTEXT:[\s\S]*$/, '').trim() ||
                    `${prompt.attachments.length} reference${
                      prompt.attachments.length === 1 ? '' : 's'
                    }`}
                </span>
                {prompt.attachments.length > 0 && (
                  <span className="shrink-0 text-[8.5px] text-ink-faint">
                    {prompt.attachments.length} ref
                  </span>
                )}
                <button
                  onClick={() => onRemoveQueued(prompt.id)}
                  className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-danger"
                  aria-label="Remove queued message"
                  title="Remove from queue"
                >
                  <Icon name="x" size={8} />
                </button>
              </div>
            ))}
            {queuedPrompts.length > 3 && (
              <p className="px-1 text-[9px] text-ink-faint">
                +{queuedPrompts.length - 3} more waiting
              </p>
            )}
          </div>
        </div>
      )}

      {/* Docked composer -------------------------------------------------- */}
      <div className="shrink-0 border-t border-line bg-canvas px-3 py-2.5">
        <Composer
          value={input}
          onChange={setInput}
          onSend={onSend}
          isLoading={isLoading}
          onStop={onStop}
          isAnnotating={isAnnotating}
          onToggleAnnotating={setIsAnnotating}
          pendingAnnotations={pendingAnnotations}
          onRemoveAnnotation={onRemoveAnnotation}
          variant="compact"
          onInsertCode={insertCodeBlock}
          onImportProject={onImportProject}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
