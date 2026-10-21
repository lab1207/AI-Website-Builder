import React, { useEffect, useRef, useState } from 'react';
import type { Attachment } from '../types';
import Icon from './Icon';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (attachments: Attachment[]) => void;
  isLoading: boolean;
  onStop: () => void;
  isAnnotating: boolean;
  onToggleAnnotating: (value: boolean) => void;
  pendingAnnotations: Array<{ x: number; y: number }>;
  onRemoveAnnotation: (index: number) => void;
  /** The large composer on the dashboard, or the docked one in a conversation. */
  variant: 'dashboard' | 'compact';
  onInsertCode?: () => void;
}

const Composer: React.FC<ComposerProps> = ({
  value,
  onChange,
  onSend,
  isLoading,
  onStop,
  isAnnotating,
  onToggleAnnotating,
  pendingAnnotations,
  onRemoveAnnotation,
  variant,
  onInsertCode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pasteNotice, setPasteNotice] = useState('');

  const isDashboard = variant === 'dashboard';
  const canSend =
    !isLoading &&
    (value.trim().length > 0 || attachments.length > 0 || pendingAnnotations.length > 0);

  const addImageFiles = (files: File[]) => {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result;
        if (typeof result === 'string') {
          setAttachments((current) => [
            ...current,
            { type: 'image', content: result, mimeType: file.type || 'image/png' },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /*
   * A screenshot pasted anywhere should become a reference image.
   *
   * The listener sits on the window, not the textarea, so it works even when
   * focus is somewhere else — which is how people actually work: screenshot,
   * Ctrl+V, then describe the change. Text pastes are untouched.
   */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const images: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) images.push(file);
        }
      }
      if (images.length === 0) return;

      event.preventDefault();
      addImageFiles(images);
      setPasteNotice(images.length === 1 ? 'Screenshot attached' : `${images.length} images attached`);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  useEffect(() => {
    if (!pasteNotice) return;
    const timer = window.setTimeout(() => setPasteNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [pasteNotice]);

  const resize = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, isDashboard ? 230 : 160)}px`;
  };

  useEffect(() => {
    resize();
    // The value can change from a template or a suggestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, variant]);

  const handleSend = () => {
    if (!canSend) return;
    onSend(attachments);
    setAttachments([]);
    setPasteNotice('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length > 0) addImageFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      {(pasteNotice || pendingAnnotations.length > 0 || attachments.length > 0) && (
        <div className="mb-2 space-y-2">
          {pasteNotice && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10.5px] font-semibold text-success"
            >
              <Icon name="check" size={10} strokeWidth={2.4} />
              {pasteNotice}
            </div>
          )}

          {pendingAnnotations.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {pendingAnnotations.map((annotation, index) => (
                <button
                  key={`${annotation.x}-${annotation.y}-${index}`}
                  onClick={() => onRemoveAnnotation(index)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[10.5px] font-semibold text-accent transition-colors hover:bg-accent/15"
                  title="Remove this point"
                >
                  <Icon name="cursor" size={9} />
                  {Math.round(annotation.x)}%, {Math.round(annotation.y)}%
                  <Icon name="x" size={9} />
                </button>
              ))}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border border-line bg-surface-2"
                >
                  <img
                    src={attachment.content}
                    alt={`Reference ${index + 1}`}
                    className={`${isDashboard ? 'h-[68px] w-[68px]' : 'h-14 w-14'} object-cover`}
                  />
                  <button
                    onClick={() =>
                      setAttachments((current) => current.filter((_, i) => i !== index))
                    }
                    className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink/85 text-canvas opacity-90 shadow-sm transition-opacity hover:opacity-100"
                    aria-label={`Remove reference ${index + 1}`}
                  >
                    <Icon name="x" size={9} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={`group relative rounded-[22px] border bg-surface shadow-[var(--shadow-md)] transition-all duration-200 focus-within:border-accent/35 focus-within:shadow-[var(--shadow-glow)] ${
          isDashboard
            ? 'border-line p-3.5 sm:p-4'
            : 'border-line px-3 py-2.5'
        }`}
      >
        <textarea
          ref={textareaRef}
          id="composer-input"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            isDashboard
              ? 'Describe the site you want to build…'
              : 'Ask for a change, or point at the preview…'
          }
          aria-label="Describe the website you want to build"
          className={`scroll-thin w-full resize-none bg-transparent text-ink outline-none placeholder:text-ink-faint ${
            isDashboard
              ? 'min-h-[64px] text-[15px] leading-relaxed sm:min-h-[76px] sm:text-[16px]'
              : 'max-h-40 min-h-[26px] text-[13px] leading-relaxed'
          }`}
        />

        <div className={`flex items-center gap-0.5 ${isDashboard ? 'mt-2' : 'mt-1'}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Attach a reference image"
            title="Attach a reference image — or paste one anywhere"
          >
            <Icon name="image" size={15} />
            {isDashboard && <span className="hidden text-[10.5px] font-medium sm:inline">Attach</span>}
          </button>

          <button
            onClick={() => onToggleAnnotating(!isAnnotating)}
            aria-pressed={isAnnotating}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-1.5 transition-colors ${
              isAnnotating
                ? 'bg-accent-soft text-accent'
                : 'text-ink-faint hover:bg-surface-2 hover:text-ink'
            }`}
            aria-label="Point at a spot in the preview to change it"
            title="Point at a spot in the preview"
          >
            <Icon name="cursor" size={14} />
            {isDashboard && <span className="hidden text-[10.5px] font-medium sm:inline">Point</span>}
          </button>

          {onInsertCode && (
            <button
              onClick={onInsertCode}
              className="flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Insert a code block"
              title="Insert a code block"
            >
              <Icon name="code" size={14} />
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isDashboard && (
              <span className="hidden text-[9.5px] text-ink-faint sm:inline">
                <kbd className="rounded border border-line bg-surface-2 px-1 font-sans text-[9px]">
                  Enter
                </kbd>{' '}
                to build
              </span>
            )}

            {isLoading ? (
              <button onClick={onStop} className="btn btn-sm btn-secondary">
                <span className="flex h-2.5 w-2.5 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-current" />
                </span>
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`btn btn-primary !rounded-xl ${isDashboard ? 'h-9 px-3' : 'h-8 w-8 !px-0'}`}
                aria-label="Send prompt"
                title="Send"
              >
                {isDashboard ? (
                  <>
                    <Icon name="sparkles" size={14} />
                    <span>Build</span>
                    <Icon name="arrow-up" size={13} />
                  </>
                ) : (
                  <Icon name="arrow-up" size={14} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {isDashboard && (
        <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9.5px] text-ink-faint">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-line bg-surface px-1 font-sans">Shift + Enter</kbd>
            new line
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="image" size={9} />
            paste a screenshot anywhere
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="lock" size={9} />
            your key stays here
          </span>
        </p>
      )}
    </div>
  );
};

export default Composer;
