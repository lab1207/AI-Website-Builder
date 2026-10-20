import React, { useEffect, useRef, useState } from 'react';
import { Message, Attachment } from '../types';
import Composer from './Composer';

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

const SUGGESTIONS = [
  { icon: 'fa-solid fa-store', text: 'A landing page for a specialty coffee brand' },
  { icon: 'fa-solid fa-chart-pie', text: 'An analytics dashboard with charts and a sidebar' },
  { icon: 'fa-solid fa-envelope', text: 'A contact form with validation and a success state' },
  { icon: 'fa-solid fa-list-check', text: 'A task board with columns and drag-friendly cards' },
];

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
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, isLoading]);

  const insertCodeBlock = () => {
    const next = `${input}\n\`\`\`\n\n\`\`\``;
    setInput(next);
    setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#composer-input');
      if (textarea) {
        textarea.focus();
        const position = next.length - 4;
        textarea.setSelectionRange(position, position);
      }
    }, 10);
  };

  const renderContent = (content: string) => {
    if (content.includes('__FILE:')) {
      const parts = content.split(/__FILE:.*__/);
      const preText = parts[0].trim();

      return (
        <div>
          {preText && (
            <div className="mb-3 whitespace-pre-wrap text-ink">{preText}</div>
          )}
          <div className="flex w-fit items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/12 text-[11px] text-success">
              <i className="fa-solid fa-check" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-ink">Code generated</p>
              <p className="text-[11.5px] text-ink-faint">Open the Preview tab to see it</p>
            </div>
          </div>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed text-ink">{content}</div>;
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSystemOpen((open) => !open)}
            aria-expanded={systemOpen}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <i
              className={`fa-solid fa-chevron-${systemOpen ? 'up' : 'down'} text-[9px]`}
              aria-hidden="true"
            />
            Instructions
          </button>
          <button
            onClick={() => setIsThinking(!isThinking)}
            aria-pressed={isThinking}
            title="Let the model reason before it answers"
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium transition-colors ${
              isThinking
                ? 'bg-accent-soft text-accent'
                : 'text-ink-muted hover:bg-surface-3 hover:text-ink'
            }`}
          >
            <i className="fa-solid fa-brain text-[11px]" aria-hidden="true" />
            Thinking
          </button>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <i className="fa-regular fa-trash-can text-[11px]" aria-hidden="true" />
          New
        </button>
      </div>

      {systemOpen && (
        <div className="shrink-0 border-b border-line px-4 pb-3">
          <label htmlFor="system-instructions" className="sr-only">
            System instructions
          </label>
          <textarea
            id="system-instructions"
            value={systemInstruction}
            onChange={(event) => setSystemInstruction(event.target.value)}
            placeholder="Extra guidance for the model, for example: use only system fonts, keep the palette warm and neutral, and always include a contact section."
            className="scroll-thin h-24 w-full resize-none rounded-xl border border-line bg-surface p-3 font-mono text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
          />
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Added to every request. Leave empty to use the built-in prompt.
          </p>
        </div>
      )}

      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center px-6 py-10">
            <div className="w-full max-w-[560px]">
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
                variant="hero"
                onInsertCode={insertCodeBlock}
              />

              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => setInput(suggestion.text)}
                    className="group flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-all hover:-translate-y-px hover:border-line-strong hover:shadow-[var(--shadow-sm)]"
                  >
                    <i
                      className={`${suggestion.icon} mt-0.5 text-[12px] text-ink-faint transition-colors group-hover:text-accent`}
                      aria-hidden="true"
                    />
                    <span className="text-[12.5px] leading-snug text-ink-muted transition-colors group-hover:text-ink">
                      {suggestion.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-4 py-5">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-1.5">
                {message.role === 'user' ? (
                  <div className="ml-auto max-w-[85%] rounded-[18px] rounded-br-md bg-accent px-3.5 py-2.5 text-[13.5px] leading-relaxed text-accent-ink">
                    {message.content}
                  </div>
                ) : (
                  <div className="max-w-[92%]">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[10px] text-accent">
                        <i className="fa-solid fa-sparkles" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1 text-[13.5px]">{renderContent(message.content)}</div>
                    </div>

                    {message.latency != null && message.latency > 0 && (
                      <div className="pl-8.5 text-[10.5px] text-ink-faint">
                        {(message.latency / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2.5 pl-0.5 text-[12.5px] text-ink-muted">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-soft text-[10px] text-accent">
                  <i className="fa-solid fa-sparkles animate-pulse-soft" aria-hidden="true" />
                </div>
                <span className="dots text-[18px]">
                  <span />
                  <span />
                  <span />
                </span>
                <span>Building your site…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="shrink-0 border-t border-line bg-canvas px-4 py-3">
          <div className="mx-auto max-w-[720px]">
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
      )}
    </div>
  );
};

export default ChatPanel;
