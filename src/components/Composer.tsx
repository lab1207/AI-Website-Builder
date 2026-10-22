import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Attachment } from '../types';
import {
  captureWebsiteReference,
  hostLabel,
  normalizeWebsiteUrl,
} from '../lib/reference';
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
  /** Opens the project importer for .zip and .html files. */
  onImportProject?: () => void;
  /** A link passed from the landing page, captured automatically once. */
  initialLink?: string;
  onInitialLinkConsumed?: () => void;
  /** Image references passed from the landing page. */
  initialAttachments?: Attachment[];
  onInitialAttachmentsConsumed?: () => void;
}

type Notice = { tone: 'success' | 'error' | 'info'; text: string };

const MAX_ATTACHMENTS = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_BYTES = 200 * 1024;
const TEXT_EXTENSION =
  /\.(txt|md|mdx|markdown|html?|css|scss|sass|less|js|jsx|mjs|cjs|ts|tsx|json|jsonc|yml|yaml|toml|xml|svg|vue|svelte|astro|php|py|rb|go|rs|java|kt|swift|sh|bash|env|gitignore|csv|sql)$/i;

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(file: File): 'image' | 'text' | 'unsupported' {
  if (file.type === 'image/svg+xml') return 'text';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('text/')) return 'text';
  if (
    /(json|javascript|xml|x-yaml|yaml|toml|x-sh|sql)/i.test(file.type) ||
    TEXT_EXTENSION.test(file.name)
  ) {
    return 'text';
  }
  return 'unsupported';
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function signature(attachment: Attachment): string {
  return `${attachment.type}:${attachment.name ?? ''}:${attachment.size ?? attachment.content.length}`;
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
  onImportProject,
  initialLink,
  onInitialLinkConsumed,
  initialAttachments,
  onInitialAttachmentsConsumed,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const linkStartedRef = useRef('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const isDashboard = variant === 'dashboard';
  const canSend =
    value.trim().length > 0 || attachments.length > 0 || pendingAnnotations.length > 0;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.tone === 'error' ? 8000 : 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const addAttachments = useCallback((incoming: Attachment[]) => {
    const unique = incoming.filter(
      (next, index, all) =>
        all.findIndex((item) => signature(item) === signature(next)) === index,
    );
    if (unique.length === 0) return;

    setAttachments((current) => {
      const fresh = unique.filter(
        (next) => !current.some((item) => signature(item) === signature(next)),
      );
      const room = Math.max(0, MAX_ATTACHMENTS - current.length);
      if (fresh.length > room) {
        setNotice({
          tone: 'info',
          text: `Only ${MAX_ATTACHMENTS} references fit. ${fresh.length - room} were skipped.`,
        });
      }
      return [...current, ...fresh.slice(0, room)];
    });
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setNotice(null);
      const next: Attachment[] = [];
      const problems: string[] = [];

      for (const file of files) {
        const kind = fileKind(file);
        if (kind === 'unsupported') {
          problems.push(
            `${file.name || 'That file'} is not text or an image. PDFs and binaries need a screenshot instead.`,
          );
          continue;
        }

        if (kind === 'image') {
          if (file.size > MAX_IMAGE_BYTES) {
            problems.push(`${file.name} is larger than 8 MB. Compress it and try again.`);
            continue;
          }
          try {
            next.push({
              type: 'image',
              content: await readDataUrl(file),
              mimeType: file.type || 'image/png',
              name: file.name || 'screenshot.png',
              size: file.size,
            });
          } catch (error) {
            problems.push((error as Error).message);
          }
          continue;
        }

        if (file.size > MAX_TEXT_BYTES) {
          problems.push(
            `${file.name} is ${formatBytes(file.size)}. Text references are capped at 200 KB.`,
          );
          continue;
        }
        try {
          const text = await file.text();
          if (!text.trim()) {
            problems.push(`${file.name} is empty.`);
            continue;
          }
          next.push({
            type: 'text',
            content: text,
            mimeType: file.type || 'text/plain',
            name: file.name || 'reference.txt',
            size: file.size,
          });
        } catch {
          problems.push(`Could not read ${file.name}.`);
        }
      }

      addAttachments(next);
      if (problems.length > 0) {
        setNotice({ tone: 'error', text: problems[0] });
      } else if (next.length > 0) {
        setNotice({
          tone: 'success',
          text:
            next.length === 1
              ? `${next[0].name ?? 'Reference'} attached.`
              : `${next.length} references attached.`,
        });
      }
    },
    [addAttachments],
  );

  const captureLink = useCallback(
    async (rawUrl: string) => {
      const url = normalizeWebsiteUrl(rawUrl);
      if (!url) {
        setLinkError('Enter a full address, such as studio.example.com.');
        return;
      }

      setLinkBusy(true);
      setLinkError('');
      setNotice(null);
      try {
        const reference = await captureWebsiteReference(url);
        const next: Attachment[] = [reference.image];
        if (reference.pageText) next.push(reference.pageText);
        addAttachments(next);
        if (!value.trim()) {
          onChange(
            `Rebuild ${hostLabel(url)} as a working website. Match the attached screenshot exactly, and use the page text for real headings, navigation, and copy.`,
          );
        }
        setNotice({
          tone: 'success',
          text: `Captured ${hostLabel(url)} with ${reference.screenshotService}. Screenshot${
            reference.pageText ? ' and page text' : ''
          } attached.`,
        });
        if (reference.warnings.length > 0) setLinkError(reference.warnings[0]);
        setMenuOpen(false);
        setLinkOpen(false);
        setLinkValue('');
      } catch (error) {
        setLinkError((error as Error).message);
      } finally {
        setLinkBusy(false);
      }
    },
    [addAttachments, onChange, value],
  );

  // A link chosen on the landing page is captured as soon as the studio opens.
  useEffect(() => {
    if (!initialLink || linkStartedRef.current === initialLink) return;
    linkStartedRef.current = initialLink;
    setLinkValue(initialLink);
    setLinkOpen(true);
    setMenuOpen(true);
    void captureLink(initialLink);
    onInitialLinkConsumed?.();
  }, [captureLink, initialLink, onInitialLinkConsumed]);

  useEffect(() => {
    if (!initialAttachments?.length) return;
    addAttachments(initialAttachments);
    setNotice({
      tone: 'success',
      text:
        initialAttachments.length === 1
          ? `${initialAttachments[0].name ?? 'Screenshot'} attached. Describe the site or send it as-is.`
          : `${initialAttachments.length} references attached.`,
    });
    onInitialAttachmentsConsumed?.();
  }, [addAttachments, initialAttachments, onInitialAttachmentsConsumed]);

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
      void addFiles(images);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setLinkOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setLinkOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!linkOpen) return;
    const timer = window.setTimeout(() => linkInputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [linkOpen]);

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
    setNotice(null);
    setMenuOpen(false);
    setLinkOpen(false);
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) void addFiles(files);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setMenuOpen(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) void addFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMenuOpen(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) void addFiles(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div
      className="relative"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          setDragActive(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false);
      }}
      onDrop={handleDrop}
    >
      {(notice || pendingAnnotations.length > 0 || attachments.length > 0) && (
        <div className="mb-2 space-y-2">
          {notice && (
            <div
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10.5px] font-medium leading-relaxed ${
                notice.tone === 'error'
                  ? 'border-danger/30 bg-danger/[0.07] text-danger'
                  : notice.tone === 'success'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-line bg-surface-2 text-ink-muted'
              }`}
            >
              <Icon
                name={notice.tone === 'error' ? 'alert' : 'check'}
                size={10}
                strokeWidth={2.4}
                className="mt-0.5 shrink-0"
              />
              <span>{notice.text}</span>
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
            <div className="rounded-xl border border-line bg-surface/70 p-1.5">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                  <Icon name="paperclip" size={9} />
                  {attachments.length} reference{attachments.length === 1 ? '' : 's'}
                </span>
                <button
                  onClick={() => setAttachments([])}
                  className="text-[9.5px] font-semibold text-ink-faint transition-colors hover:text-danger"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((attachment, index) =>
                  attachment.type === 'image' ? (
                    <div
                      key={`${signature(attachment)}-${index}`}
                      className="group relative overflow-hidden rounded-lg border border-line bg-surface-2"
                    >
                      <img
                        src={attachment.content}
                        alt={attachment.name ?? `Reference ${index + 1}`}
                        className={`${isDashboard ? 'h-[72px] w-[72px]' : 'h-14 w-14'} object-cover`}
                      />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-ink/70 px-1 py-0.5 text-[7.5px] font-medium text-canvas opacity-0 transition-opacity group-hover:opacity-100">
                        {attachment.name ?? 'Screenshot'}
                      </span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink/85 text-canvas opacity-90 shadow-sm transition-opacity hover:opacity-100"
                        aria-label={`Remove ${attachment.name ?? `reference ${index + 1}`}`}
                      >
                        <Icon name="x" size={9} strokeWidth={2.2} />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={`${signature(attachment)}-${index}`}
                      className="flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 pl-2 pr-1"
                    >
                      <Icon name="file-text" size={12} className="shrink-0 text-accent" />
                      <span className="min-w-0">
                        <span className="block max-w-[160px] truncate text-[10px] font-semibold text-ink">
                          {attachment.name ?? 'Reference text'}
                        </span>
                        <span className="block text-[8px] text-ink-faint">
                          {formatBytes(attachment.size)} · text reference
                        </span>
                      </span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
                        aria-label={`Remove ${attachment.name ?? 'reference'}`}
                      >
                        <Icon name="x" size={9} strokeWidth={2.2} />
                      </button>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className={`group relative rounded-[22px] border bg-surface shadow-[var(--shadow-md)] transition-all duration-200 focus-within:border-accent/35 focus-within:shadow-[var(--shadow-glow)] ${
          dragActive
            ? 'border-accent ring-2 ring-accent/20'
            : 'border-line'
        } ${isDashboard ? 'p-3.5 sm:p-4' : 'border-line px-3 py-2.5'}`}
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-1 z-20 flex flex-col items-center justify-center rounded-[18px] border border-dashed border-accent bg-surface/95 text-center">
            <Icon name="paperclip" size={18} className="text-accent" />
            <p className="mt-1.5 text-[11.5px] font-semibold text-ink">Drop references here</p>
            <p className="text-[9.5px] text-ink-faint">Images, HTML, CSS, JS, Markdown, JSON, SVG</p>
          </div>
        )}

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
              ? 'Describe it, paste a screenshot, drop files, or add a link…'
              : 'Ask for a change, attach a reference, or queue the next step…'
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
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.mdx,.html,.htm,.css,.scss,.less,.js,.jsx,.mjs,.ts,.tsx,.json,.yml,.yaml,.toml,.xml,.svg,.vue,.svelte,.php,.py,.rb,.go,.rs,.java,.csv,.sql,text/*,application/json,image/svg+xml"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <div ref={menuRef} className="relative">
            <button
              onClick={() => {
                setMenuOpen((open) => !open);
                if (menuOpen) setLinkOpen(false);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={`flex h-8 items-center gap-1.5 rounded-lg px-1.5 transition-colors ${
                menuOpen
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-faint hover:bg-surface-2 hover:text-ink'
              }`}
              aria-label="Add a reference"
              title="Add images, code, files, a project, or a live link"
            >
              <Icon name="paperclip" size={15} />
              {isDashboard && <span className="text-[10.5px] font-medium">Add</span>}
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Add a reference"
                className="popover absolute bottom-full left-0 z-50 mb-2 w-[310px] max-w-[calc(100vw-32px)] p-1.5"
              >
                {!linkOpen ? (
                  <>
                    <div className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Bring a source
                    </div>
                    <button
                      role="menuitem"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-muted">
                        <Icon name="image" size={12} />
                      </span>
                      <span>
                        <span className="block text-[11.5px] font-semibold text-ink">
                          Images or screenshots
                        </span>
                        <span className="mt-0.5 block text-[9.5px] leading-snug text-ink-faint">
                          Drop in one or several views. Paste works too.
                        </span>
                      </span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-muted">
                        <Icon name="file-text" size={12} />
                      </span>
                      <span>
                        <span className="block text-[11.5px] font-semibold text-ink">
                          Code, text, or config
                        </span>
                        <span className="mt-0.5 block text-[9.5px] leading-snug text-ink-faint">
                          HTML, CSS, JS, JSX, Vue, Markdown, JSON, SVG.
                        </span>
                      </span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => setLinkOpen(true)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                        <Icon name="link" size={12} />
                      </span>
                      <span>
                        <span className="block text-[11.5px] font-semibold text-ink">
                          A live website link
                        </span>
                        <span className="mt-0.5 block text-[9.5px] leading-snug text-ink-faint">
                          Capture a screenshot and readable page text.
                        </span>
                      </span>
                    </button>
                    {onImportProject && (
                      <button
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onImportProject();
                        }}
                        className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-muted">
                          <Icon name="folder" size={12} />
                        </span>
                        <span>
                          <span className="block text-[11.5px] font-semibold text-ink">
                            Import a project
                          </span>
                          <span className="mt-0.5 block text-[9.5px] leading-snug text-ink-faint">
                            Replace the canvas with a .zip or .html build.
                          </span>
                        </span>
                      </button>
                    )}

                    <div className="my-1 border-t border-line" />
                    {onInsertCode && (
                      <button
                        role="menuitem"
                        onClick={() => {
                          onInsertCode();
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10.5px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <Icon name="code" size={11} />
                        Insert a code block in the prompt
                      </button>
                    )}
                    <p className="px-2 pb-1 pt-1 text-[8.5px] leading-relaxed text-ink-faint">
                      Drop files anywhere in this box. Images and text together work best.
                    </p>
                  </>
                ) : (
                  <div className="p-1">
                    <div className="flex items-center gap-1.5 px-1 pb-2">
                      <button
                        onClick={() => {
                          setLinkOpen(false);
                          setLinkError('');
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
                        aria-label="Back to sources"
                      >
                        <Icon name="chevron-left" size={11} />
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                        Rebuild from a link
                      </span>
                    </div>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void captureLink(linkValue);
                      }}
                    >
                      <div className="flex gap-1.5">
                        <input
                          ref={linkInputRef}
                          type="url"
                          value={linkValue}
                          onChange={(event) => setLinkValue(event.target.value)}
                          placeholder="https://studio.example.com"
                          aria-label="Website link to capture"
                          spellCheck={false}
                          autoComplete="url"
                          className="input h-8 min-w-0 flex-1 text-[11px]"
                        />
                        <button
                          type="submit"
                          disabled={linkBusy}
                          data-loading={linkBusy ? 'true' : 'false'}
                          className="btn btn-sm btn-primary shrink-0"
                        >
                          {linkBusy ? 'Capturing' : 'Capture'}
                        </button>
                      </div>
                    </form>
                    {linkBusy && (
                      <p className="mt-2 flex items-center gap-1.5 text-[9px] text-ink-faint">
                        <span className="h-2.5 w-2.5 animate-spin rounded-full border border-ink-faint border-t-transparent" />
                        Rendering the page. This can take 10–40 seconds.
                      </p>
                    )}
                    {linkError && (
                      <p role="alert" className="mt-2 rounded-md border border-danger/25 bg-danger/[0.06] px-2 py-1.5 text-[9.5px] leading-relaxed text-danger">
                        {linkError}
                      </p>
                    )}
                    <p className="mt-2 text-[8.5px] leading-relaxed text-ink-faint">
                      Uses image.thum.io (or Microlink) for the screenshot and r.jina.ai for page
                      text. Those services see the URL; your key never leaves the provider call.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isDashboard && (
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
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isDashboard && (
              <span className="hidden text-[9.5px] text-ink-faint sm:inline">
                <kbd className="rounded border border-line bg-surface-2 px-1 font-sans text-[9px]">
                  Enter
                </kbd>{' '}
                to {isLoading ? 'queue' : 'build'}
              </span>
            )}

            {isLoading && (
              <button onClick={onStop} className="btn btn-sm btn-secondary" title="Stop this build">
                <span className="flex h-2.5 w-2.5 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-current" />
                </span>
                <span>Stop</span>
              </button>
            )}

            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`btn btn-primary !rounded-xl ${isDashboard ? 'h-9 px-3' : 'h-8 min-w-8 !px-2'}`}
              aria-label={isLoading ? 'Queue this message' : 'Send prompt'}
              title={isLoading ? 'Queue after the current build' : 'Send'}
            >
              {isDashboard ? (
                <>
                  <Icon name={isLoading ? 'clock' : 'sparkles'} size={14} />
                  <span>{isLoading ? 'Queue' : 'Build'}</span>
                  <Icon name="arrow-up" size={13} />
                </>
              ) : (
                <Icon name={isLoading ? 'clock' : 'arrow-up'} size={14} />
              )}
            </button>
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
            <Icon name="paperclip" size={9} />
            drop a screenshot, code, or link
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
