import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Message, Attachment } from '../types';
import Composer from './Composer';
import Icon from './Icon';
import { LogoMark } from './Logo';

interface ChatPanelProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSend: (attachments: Attachment[]) => void;
  isLoading: boolean;
  onStop: () => void;
  isAnnotating: boolean;
  setIsAnnotating: (value: boolean) => void;
  pendingAnnotations: Array<{ x: number; y: number }>;
  onRemoveAnnotation: (index: number) => void;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  isThinking: boolean;
  setIsThinking: (value: boolean) => void;
  onClear: () => void;
}

const BUILD_STEPS = [
  'Reading the brief',
  'Planning the layout',
  'Writing the markup',
  'Polishing the details',
  'Checking the viewport',
];

function generatedFiles(content: string): string[] {
  return Array.from(content.matchAll(/__FILE:\s*([^_\n]+?)\s*__/g)).map((match) =>
    match[1].trim(),
  );
}

function preFileText(content: string): string {
  const index = content.search(/__FILE:/);
  return (index === -1 ? content : content.slice(0, index)).trim();
}

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
  systemInstruction,
  setSystemInstruction,
  isThinking,
  setIsThinking,
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [systemOpen, setSystemOpen] = useState(false);
  const [buildStep, setBuildStep] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setBuildStep(0);
      return;
    }
    const timer = window.setInterval(
      () => setBuildStep((step) => (step + 1) % BUILD_STEPS.length),
      2600,
    );
    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: isLoading ? 'auto' : 'smooth' });
  }, [messages, isLoading]);

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {/* Build log toolbar ------------------------------------------------ */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface/50 px-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          <Icon name="message" size={11} />
          Build log
        </span>
        <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold text-ink-faint">
          {messages.filter((message) => message.role === 'user').length}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setSystemOpen((open) => !open)}
            aria-expanded={systemOpen}
            className="toolbar-btn"
            data-active={systemOpen || systemInstruction.trim() ? 'true' : 'false'}
            title="Extra instructions for every request"
          >
            <Icon name="sliders" size={11} />
            <span className="hidden sm:inline">Instructions</span>
            {systemInstruction.trim() && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="Custom instructions on" />
            )}
          </button>
          <button
            onClick={() => setIsThinking(!isThinking)}
            aria-pressed={isThinking}
            className="toolbar-btn"
            data-active={isThinking ? 'true' : 'false'}
            title="Let the model reason before it answers"
          >
            <Icon name="bulb" size={11} />
            <span className="hidden sm:inline">Thinking</span>
          </button>
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

      {systemOpen && (
        <div className="shrink-0 border-b border-line bg-surface px-3 pb-3 pt-2.5">
          <label
            htmlFor="system-instructions"
            className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-faint"
          >
            Extra instructions
          </label>
          <textarea
            id="system-instructions"
            value={systemInstruction}
            onChange={(event) => setSystemInstruction(event.target.value)}
            placeholder="Use only system fonts. Keep the palette warm and neutral. Always include a contact section."
            className="scroll-thin mt-1.5 h-20 w-full resize-none rounded-xl border border-line bg-surface-2 p-2.5 text-[11.5px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-accent/40"
          />
          <p className="mt-1 text-[9.5px] text-ink-faint">
            Added to every request, after the built-in design rules.
          </p>
        </div>
      )}

      {/* Conversation ----------------------------------------------------- */}
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <LogoMark size={36} />
            <p className="mt-3 text-[13px] font-semibold text-ink">Your build log is empty</p>
            <p className="mt-1 max-w-[240px] text-[11.5px] leading-relaxed text-ink-faint">
              Close this view and describe a website on the dashboard to begin.
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-3 py-4">
            {visibleMessages.map((message) => {
              const files = message.role === 'assistant' ? generatedFiles(message.content) : [];
              const summary = preFileText(message.content);
              const isError = message.role === 'assistant' && message.content.startsWith('Error:');

              if (message.role === 'user') {
                return (
                  <div key={message.id} className="flex flex-col items-end gap-1.5">
                    <div className="max-w-[88%] rounded-[16px] rounded-br-[5px] bg-ink px-3.5 py-2.5 text-[12.5px] leading-relaxed text-canvas">
                      {message.content.replace(/\n\n\[CONTEXT:[\s\S]*$/, '').trim()}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {message.attachments.map((attachment, index) => (
                          <img
                            key={index}
                            src={attachment.content}
                            alt={`Attached reference ${index + 1}`}
                            className="h-12 w-12 rounded-lg border border-line object-cover"
                          />
                        ))}
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

                  <div className="min-w-0 flex-1">
                    {isError ? (
                      <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.06] px-3 py-2.5 text-[11.5px] leading-relaxed text-danger">
                        <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                        <span>{message.content.replace(/^Error:\s*/, '')}</span>
                      </div>
                    ) : message.content ? (
                      <>
                        {summary && (
                          <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink">
                            {summary}
                          </div>
                        )}
                        {files.length > 0 && (
                          <div className="mt-2 rounded-xl border border-line bg-surface p-2.5 shadow-[var(--shadow-sm)]">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-success/12 text-success">
                                <Icon name="check" size={10} strokeWidth={2.4} />
                              </span>
                              <p className="text-[11px] font-semibold text-ink">
                                {files.length} file{files.length === 1 ? '' : 's'} written
                              </p>
                              <span className="ml-auto text-[9px] text-ink-faint">
                                preview synced
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
                      </>
                    ) : (
                      <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
                        <div className="flex items-center gap-2 text-[11.5px] text-ink-muted">
                          <span className="dots text-accent">
                            <span />
                            <span />
                            <span />
                          </span>
                          {BUILD_STEPS[buildStep]}…
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-700"
                            style={{ width: `${35 + buildStep * 14}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {message.latency != null && message.latency > 0 && (
                      <div className="mt-1.5 flex items-center gap-2 pl-0.5 font-mono text-[9px] text-ink-faint">
                        <span>{(message.latency / 1000).toFixed(1)}s</span>
                        <span className="h-0.5 w-0.5 rounded-full bg-ink-faint" />
                        <span>{files.length > 0 ? 'generated' : 'answered'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-2 pl-8.5 text-[10.5px] text-ink-faint">
                <span className="dots text-accent">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="animate-pulse-soft">{BUILD_STEPS[buildStep]}…</span>
              </div>
            )}
          </div>
        )}
      </div>

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
        />
      </div>
    </div>
  );
};

export default ChatPanel;
