import React, { useEffect, useRef, useState } from 'react';
import type { Attachment } from '../types';

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
  /** Renders the big centred composer on the empty state. */
  variant: 'hero' | 'compact';
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

  const addImageFile = (file: File) => {
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
  };

  /*
   * Pasting an image anywhere in the window attaches it to the next prompt.
   *
   * The listener sits on the window rather than the textarea so a screenshot
   * pastes even when the input is not focused, which is how people actually
   * work: take a screenshot, press Ctrl+V, describe the change. Text pastes
   * are left untouched, and the default is only prevented for images.
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
      images.forEach(addImageFile);
      setPasteNotice(
        images.length === 1
          ? 'Image attached.'
          : `${images.length} images attached.`,
      );
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  // The notice clears itself, so it never outstays its welcome.
  useEffect(() => {
    if (!pasteNotice) return;
    const timer = window.setTimeout(() => setPasteNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [pasteNotice]);

  const resize = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, variant === 'hero' ? 220 : 160)}px`;
  };

  const handleSend = () => {
    if (isLoading) return;
    if (!value.trim() && attachments.length === 0 && pendingAnnotations.length === 0) return;
    onSend(attachments);
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === 'string') {
        setAttachments((current) => [
          ...current,
          { type: 'image', content: result, mimeType: file.type },
        ]);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isHero = variant === 'hero';

  return (
    <div className={isHero ? 'animate-rise' : ''}>
      {isHero && (
        <div className="mb-5 text-center">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[38px]">
            Describe your idea
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-muted">
            Build a complete website with HTML, CSS and JavaScript.
          </p>
        </div>
      )}

      {pasteNotice && (
        <div
          role="status"
          className="mb-2 flex w-fit items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11.5px] font-medium text-success"
        >
          <i className="fa-solid fa-check text-[10px]" aria-hidden="true" />
          {pasteNotice}
        </div>
      )}

      {pendingAnnotations.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {pendingAnnotations.map((annotation, index) => (
            <button
              key={`${annotation.x}-${annotation.y}-${index}`}
              onClick={() => onRemoveAnnotation(index)}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent transition-colors hover:bg-accent/20"
            >
              <i className="fa-solid fa-location-crosshairs text-[10px]" aria-hidden="true" />
              {Math.round(annotation.x)}%, {Math.round(annotation.y)}%
              <i className="fa-solid fa-xmark text-[9px]" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg border border-line bg-surface-2"
            >
              <img
                src={attachment.content}
                alt={`Reference ${index + 1}`}
                className="h-16 w-16 object-cover"
              />
              <button
                onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-canvas/90 text-[9px] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label={`Remove reference ${index + 1}`}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`rounded-[20px] border border-line bg-surface shadow-[var(--shadow-md)] transition-colors focus-within:border-line-strong ${
          isHero ? 'px-4 py-3.5' : 'px-3.5 py-2.5'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Build a landing page for a coffee brand called Ember"
          aria-label="Describe the website you want to build"
          className={`scroll-thin w-full resize-none bg-transparent text-ink outline-none placeholder:text-ink-faint ${
            isHero ? 'min-h-[54px] text-[15px]' : 'max-h-40 min-h-[24px] text-[14px]'
          }`}
        />

        <div className="mt-2 flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
            aria-label="Attach a reference image"
            title="Attach a reference image — or paste one from the clipboard"
          >
            <i className="fa-regular fa-image text-[13px]" aria-hidden="true" />
          </button>

          <button
            onClick={() => onToggleAnnotating(!isAnnotating)}
            aria-pressed={isAnnotating}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isAnnotating
                ? 'bg-accent-soft text-accent'
                : 'text-ink-faint hover:bg-surface-3 hover:text-ink'
            }`}
            aria-label="Point at a spot in the preview to change it"
            title="Point at a spot in the preview to change it"
          >
            <i className="fa-solid fa-location-crosshairs text-[13px]" aria-hidden="true" />
          </button>

          {onInsertCode && (
            <button
              onClick={onInsertCode}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
              aria-label="Insert a code block"
              title="Insert a code block"
            >
              <i className="fa-solid fa-code text-[13px]" aria-hidden="true" />
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isLoading ? (
              <button onClick={onStop} className="btn btn-md btn-secondary">
                <i className="fa-solid fa-stop text-[10px]" aria-hidden="true" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={
                  !value.trim() && attachments.length === 0 && pendingAnnotations.length === 0
                }
                className="btn btn-icon btn-primary"
                aria-label="Send"
              >
                <i className="fa-solid fa-arrow-up text-[12px]" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isHero && (
        <p className="mt-3 text-center text-[11.5px] text-ink-faint">
          Your API key stays in this browser. Paste a screenshot straight into
          the box to use it as a reference.
        </p>
      )}
    </div>
  );
};

export default Composer;
