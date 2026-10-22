import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileMap, DeviceType } from '../types';
import {
  buildPreviewDocument,
  defaultPreviewPage,
  listPreviewPages,
  pageLabel,
} from '../lib/preview';
import Icon, { type IconName } from './Icon';

interface PreviewPaneProps {
  files: FileMap;
  isGenerating: boolean;
  onAutoFix?: () => void;
  onExplain?: () => void;
  onGenerateFrameworkPreview?: () => void;
  isAnnotating?: boolean;
  onAnnotateSelect?: (x: number, y: number) => void;
  onFileUpdate?: (newFiles: FileMap) => void;
  previewDevice?: DeviceType;
  onDeviceChange?: (device: DeviceType) => void;
  /** True when the project type normally needs a build step. */
  needsBuild?: boolean;
  projectLabel?: string;
  /** The full project to export, including any scaffold files. */
  exportFiles?: FileMap;
}

type Tab = 'preview' | 'code' | 'assets';

type AssetType = 'image' | 'video' | 'link' | 'text' | 'token' | 'color';

interface DetectedAsset {
  id: string;
  originalValue: string;
  currentValue: string;
  type: AssetType;
  count: number;
  context?: string;
  /** The custom-property name, for design tokens such as --space-4. */
  name?: string;
}

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  desktop: 'w-full',
  tablet: 'w-[820px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

const DEVICE_ICONS: Record<DeviceType, IconName> = {
  desktop: 'monitor',
  tablet: 'tablet',
  mobile: 'smartphone',
};

const PreviewPane: React.FC<PreviewPaneProps> = ({
  files,
  isGenerating,
  onAutoFix,
  onExplain,
  onGenerateFrameworkPreview,
  isAnnotating,
  onAnnotateSelect,
  onFileUpdate,
  previewDevice = 'desktop',
  onDeviceChange,
  needsBuild = false,
  projectLabel = 'This project',
  exportFiles,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [localFiles, setLocalFiles] = useState<FileMap>(files);
  const [renderFiles, setRenderFiles] = useState<FileMap>(files);
  const [assetDrafts, setAssetDrafts] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<{
    media: DetectedAsset[];
    links: DetectedAsset[];
    content: DetectedAsset[];
    tokens: DetectedAsset[];
    colors: DetectedAsset[];
  }>({ media: [], links: [], content: [], tokens: [], colors: [] });

  useEffect(() => {
    setLocalFiles(files);
    setAssetDrafts({});
  }, [files]);

  /*
   * Reloading the iframe on every streamed token makes the preview flicker
   * and, in some browsers, leaves the last frame unpainted. Coalesce updates
   * while a build is running and always render the final state immediately.
   */
  useEffect(() => {
    if (!isGenerating) {
      setRenderFiles(localFiles);
      return;
    }
    const timer = window.setTimeout(() => setRenderFiles(localFiles), 350);
    return () => window.clearTimeout(timer);
  }, [localFiles, isGenerating]);

  const pages = useMemo(() => listPreviewPages(localFiles), [localFiles]);
  const hasStaticPreview = Boolean(localFiles['preview.html']);
  const canRender = pages.length > 0 && (!needsBuild || hasStaticPreview);

  useEffect(() => {
    if (pages.length === 0) {
      setActivePage('');
      return;
    }
    setActivePage((current) => (current && pages.includes(current) ? current : defaultPreviewPage(localFiles)));
  }, [pages, localFiles]);

  useEffect(() => {
    if (Object.keys(localFiles).length > 0 && !selectedFile) {
      setSelectedFile(Object.keys(localFiles)[0]);
    }
    if (selectedFile && !localFiles[selectedFile] && Object.keys(localFiles).length > 0) {
      setSelectedFile(Object.keys(localFiles)[0]);
    }
    scanForAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFiles, selectedFile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Multi-page links inside the preview ask the builder to switch page.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Only the sandboxed preview may drive navigation, and only to a page
      // that actually exists in this project.
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; page?: string } | null;
      if (!data || data.type !== 'awb:preview-navigate' || typeof data.page !== 'string') return;
      const clean = data.page.replace(/^\.?\//, '');
      if (clean.includes('..') || clean.startsWith('/')) return;
      if (pages.includes(clean)) {
        setActivePage(clean);
        setPreviewNonce((value) => value + 1);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [pages]);

  const previewDoc = useMemo(() => {
    if (!canRender || !activePage) return '';
    return buildPreviewDocument(renderFiles, activePage);
  }, [renderFiles, activePage, canRender]);

  const handleCodeChange = (newContent: string) => {
    if (!selectedFile) return;
    const updatedFiles = { ...localFiles, [selectedFile]: newContent };
    setLocalFiles(updatedFiles);
    onFileUpdate?.(updatedFiles);
  };

  const scanForAssets = () => {
    const mediaMap = new Map<string, DetectedAsset>();
    const linkMap = new Map<string, DetectedAsset>();
    const textMap = new Map<string, DetectedAsset>();
    const tokenMap = new Map<string, DetectedAsset>();
    const colorMap = new Map<string, DetectedAsset>();

    const addAsset = (
      map: Map<string, DetectedAsset>,
      value: string,
      type: AssetType,
      context?: string,
      name?: string,
    ) => {
      if (!value || value.trim() === '' || value.startsWith('data:')) return;
      const key = name ? `${name}:${value}` : value;

      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, {
          id: `${type}:${key}`,
          originalValue: value,
          currentValue: value,
          type,
          count: 1,
          context,
          name,
        });
      }
    };

    for (const [filename, source] of Object.entries(localFiles)) {
      if (!/\.html?$/i.test(filename)) continue;

      const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
      let match: RegExpExecArray | null;
      while ((match = imgRegex.exec(source)) !== null) addAsset(mediaMap, match[1], 'image');

      const videoRegex = /<(?:video|source)[^>]+src=["']([^"']+)["']/g;
      while ((match = videoRegex.exec(source)) !== null) addAsset(mediaMap, match[1], 'video');

      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/g;
      while ((match = linkRegex.exec(source)) !== null) {
        const href = match[1];
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          addAsset(linkMap, href, 'link');
        }
      }

      const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/g;
      while ((match = buttonRegex.exec(source)) !== null) {
        const text = match[1].trim();
        if (text && !text.includes('<')) addAsset(textMap, text, 'text', 'Button');
      }
    }

    for (const [filename, source] of Object.entries(localFiles)) {
      if (!/\.(css|scss|sass|less)$/i.test(filename)) continue;

      const urlRegex = /url\((['"]?)(.*?)\1\)/g;
      let match: RegExpExecArray | null;
      while ((match = urlRegex.exec(source)) !== null) {
        addAsset(mediaMap, match[2], 'image');
      }

      // Custom properties are the cleanest handle on colour, spacing, radii,
      // and shadows without touching every rule by hand.
      const tokenRegex = /--([a-z0-9-]+)\s*:\s*([^;{}]+);/gi;
      while ((match = tokenRegex.exec(source)) !== null) {
        const name = `--${match[1]}`;
        const value = match[2].trim();
        if (!value || value.length > 120 || value.startsWith('url(')) continue;
        addAsset(tokenMap, value, 'token', filename, name);
      }

      const colorRegex = /#[0-9a-f]{3,8}\b/gi;
      while ((match = colorRegex.exec(source)) !== null) {
        addAsset(colorMap, match[0].toLowerCase(), 'color', filename);
      }
    }

    setAssets({
      media: Array.from(mediaMap.values()),
      links: Array.from(linkMap.values()),
      content: Array.from(textMap.values()),
      tokens: Array.from(tokenMap.values()),
      colors: Array.from(colorMap.values()),
    });
  };

  const esc = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /**
   * Applies an asset edit once, on commit (blur or Enter), rather than on every
   * keystroke. Committing per character re-parsed the whole project and moved
   * the cursor on each key press.
   */
  const handleUpdateAsset = (asset: DetectedAsset, newValue: string) => {
    const trimmed = newValue.trim();
    if (!trimmed || trimmed === asset.currentValue) return;

    const newFiles = { ...localFiles };
    let updated = false;

    for (const filename of Object.keys(newFiles)) {
      const content = newFiles[filename];
      let newContent: string | null = null;

      if (asset.type === 'text') {
        const regex = new RegExp(`>${esc(asset.currentValue)}<`, 'g');
        if (regex.test(content)) newContent = content.replace(regex, `>${trimmed}<`);
      } else if (asset.type === 'token' && asset.name) {
        const regex = new RegExp(
          `(${esc(asset.name)}\\s*:\\s*)${esc(asset.currentValue)}`,
          'g',
        );
        if (regex.test(content)) newContent = content.replace(regex, `$1${trimmed}`);
      } else if (content.includes(asset.currentValue)) {
        newContent = content.split(asset.currentValue).join(trimmed);
      }

      if (newContent !== null) {
        newFiles[filename] = newContent;
        updated = true;
      }
    }

    if (updated) {
      setLocalFiles(newFiles);
      onFileUpdate?.(newFiles);
    }
  };

  const draftValue = (asset: DetectedAsset) => assetDrafts[asset.id] ?? asset.currentValue;

  const commitDraft = (asset: DetectedAsset) => {
    const draft = assetDrafts[asset.id];
    if (draft !== undefined) handleUpdateAsset(asset, draft);
    setAssetDrafts((previous) => {
      const next = { ...previous };
      delete next[asset.id];
      return next;
    });
  };

  const isColorValue = (value: string) =>
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

  const toColorInput = (value: string) => {
    const trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return '#000000';
  };

  const renderAssetRow = (asset: DetectedAsset) => {
    const value = draftValue(asset);
    const showColorPicker = asset.type === 'color' || isColorValue(asset.currentValue);
    return (
      <div key={asset.id} className="flex items-center gap-2">
        {asset.name && (
          <span
            className="w-[104px] shrink-0 truncate font-mono text-[9.5px] text-ink-faint"
            title={asset.name}
          >
            {asset.name}
          </span>
        )}
        {showColorPicker && (
          <input
            type="color"
            value={toColorInput(value)}
            onChange={(event) =>
              setAssetDrafts((previous) => ({ ...previous, [asset.id]: event.target.value }))
            }
            onBlur={() => commitDraft(asset)}
            aria-label={`Pick a colour for ${asset.name ?? asset.currentValue}`}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-line bg-surface-2 p-0.5"
          />
        )}
        <input
          value={value}
          onChange={(event) =>
            setAssetDrafts((previous) => ({ ...previous, [asset.id]: event.target.value }))
          }
          onBlur={() => commitDraft(asset)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              setAssetDrafts((previous) => {
                const next = { ...previous };
                delete next[asset.id];
                return next;
              });
            }
          }}
          aria-label={`Edit ${asset.name ?? asset.currentValue}`}
          className="input h-8 min-w-0 flex-1 py-0 font-mono text-[10.5px]"
        />
        {asset.count > 1 && (
          <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] text-ink-faint">
            ×{asset.count}
          </span>
        )}
      </div>
    );
  };

  const handleCopyCode = async () => {
    if (selectedFile && localFiles[selectedFile]) {
      try {
        await navigator.clipboard.writeText(localFiles[selectedFile]);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1800);
      } catch {
        setCopyFeedback(false);
      }
    }
  };

  const handleExportSeparated = async () => {
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const source = exportFiles ?? localFiles;
      for (const filename of Object.keys(source)) {
        zip.file(filename, source[filename]);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'project.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Revoking immediately can cancel the download in some browsers.
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } finally {
      setShowExportMenu(false);
    }
  };

  const handleCopyPreviewHtml = async () => {
    if (!canRender || !activePage) {
      setShowExportMenu(false);
      return;
    }
    try {
      await navigator.clipboard.writeText(buildPreviewDocument(localFiles, activePage));
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 1800);
    } catch {
      // Clipboard access can be denied; nothing else to do.
    }
    setShowExportMenu(false);
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !onAnnotateSelect) return;
    const rect = containerRef.current.getBoundingClientRect();
    onAnnotateSelect(
      Math.round(((event.clientX - rect.left) / rect.width) * 100),
      Math.round(((event.clientY - rect.top) / rect.height) * 100),
    );
  };

  const fileNames = useMemo(() => {
    const names = Object.keys(localFiles);
    return names.sort((a, b) => {
      if (a === 'index.html') return -1;
      if (b === 'index.html') return 1;
      return a.localeCompare(b);
    });
  }, [localFiles]);

  const totalAssets =
    assets.media.length +
    assets.links.length +
    assets.content.length +
    assets.tokens.length +
    assets.colors.length;
  const lineCount = selectedFile ? (localFiles[selectedFile]?.split('\n').length ?? 0) : 0;

  /* Empty project -------------------------------------------------------- */
  if (Object.keys(localFiles).length === 0) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-canvas px-6 text-center">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-70" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 h-60 w-72 -translate-x-1/2 rounded-full blur-[80px]"
          style={{ background: 'color-mix(in srgb, var(--accent) 13%, transparent)' }}
        />
        <div className="relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-accent shadow-[var(--shadow-md)]">
            <Icon name="eye" size={22} />
          </div>
          <p className="mt-5 text-[16px] font-semibold tracking-[-0.02em] text-ink">
            The canvas is waiting
          </p>
          <p className="mx-auto mt-1.5 max-w-[340px] text-[12.5px] leading-relaxed text-ink-muted">
            Describe a site on the left. Every file renders here as it is written — click
            through it, resize it, then point at anything you want changed.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            {[
              ['monitor', 'Live sandbox'],
              ['code', 'Editable files'],
              ['globe', 'Export or publish'],
            ].map(([icon, label]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-[10.5px] font-medium text-ink-muted backdrop-blur"
              >
                <Icon name={icon as IconName} size={10} className="text-accent" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* Framework project without a static preview --------------------------- */
  if (needsBuild && !hasStaticPreview) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-canvas px-6 text-center">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative max-w-[430px]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-ink-muted shadow-[var(--shadow-md)]">
            <Icon name="package" size={22} />
          </div>
          <p className="mt-5 text-[16px] font-semibold tracking-[-0.02em] text-ink">
            {projectLabel} needs a build step
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            The browser cannot run a bundled framework project on its own. Ask the assistant
            for a self-contained <span className="font-mono text-[11px]">preview.html</span> and
            it will appear here without installing anything.
          </p>
          {onGenerateFrameworkPreview && (
            <button
              onClick={onGenerateFrameworkPreview}
              disabled={isGenerating}
              className="btn btn-md btn-primary mt-5"
            >
              <Icon name="wand" size={13} />
              Generate the live preview
            </button>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
            The Code tab still shows every file. Export gives you the runnable scaffold with
            <code className="mx-1 rounded bg-surface-2 px-1 py-0.5 font-mono text-[10px]">
              npm install &amp;&amp; npm run dev
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  const containerClasses = isFullScreen
    ? 'fixed inset-0 z-[75] flex h-screen w-screen flex-col bg-canvas'
    : 'flex h-full flex-col overflow-hidden bg-canvas';

  return (
    <div className={containerClasses}>
      {/* Toolbar --------------------------------------------------------- */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-2.5">
        <div className="flex items-center gap-0.5">
          {(
            [
              ['preview', 'eye', 'Preview'],
              ['code', 'code', 'Code'],
              ['assets', 'palette', 'Assets'],
            ] as const
          ).map(([tab, icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab}
              className="toolbar-btn"
              data-active={activeTab === tab ? 'true' : 'false'}
            >
              <Icon name={icon} size={12} />
              <span className="hidden sm:inline">{label}</span>
              {tab === 'assets' && totalAssets > 0 && (
                <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold text-ink-faint">
                  {totalAssets}
                </span>
              )}
            </button>
          ))}

          {needsBuild && hasStaticPreview && (
            <span className="ml-1 hidden items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-success lg:inline-flex">
              <Icon name="check" size={8} strokeWidth={2.4} />
              static preview
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onExplain && activeTab === 'preview' && (
            <button
              onClick={onExplain}
              disabled={isGenerating}
              className="toolbar-btn hidden lg:inline-flex"
              title="Explain the code"
            >
              <Icon name="bulb" size={12} />
              Explain
            </button>
          )}

          {onAutoFix && activeTab === 'preview' && (
            <button
              onClick={onAutoFix}
              disabled={isGenerating}
              className="toolbar-btn hidden lg:inline-flex"
              title="Find and fix layout, accessibility, and syntax issues"
            >
              <Icon name="wand" size={12} />
              Auto fix
            </button>
          )}

          {activeTab === 'preview' && (
            <div className="mx-0.5 hidden items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5 sm:flex">
              {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((device) => (
                <button
                  key={device}
                  onClick={() => onDeviceChange?.(device)}
                  aria-label={`Show ${device} preview`}
                  title={`${device} preview`}
                  className={`flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors ${
                    previewDevice === device
                      ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                      : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  <Icon name={DEVICE_ICONS[device]} size={12} />
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setPreviewNonce((value) => value + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Reload the preview"
            title="Reload the preview"
          >
            <Icon name="refresh" size={13} />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="btn btn-icon btn-ghost"
            aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
            title={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            <Icon name={isFullScreen ? 'minimize' : 'maximize'} size={13} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn btn-md btn-secondary"
            >
              <Icon name="download" size={12} />
              <span className="hidden sm:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="popover absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden p-1">
                <button
                  onClick={handleExportSeparated}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  <Icon name="download" size={13} className="text-ink-faint" />
                  Download ZIP
                </button>
                <button
                  onClick={() => void handleCopyPreviewHtml()}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  <Icon name="copy" size={13} className="text-ink-faint" />
                  Copy rendered HTML
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body ------------------------------------------------------------ */}
      <div
        className="relative flex min-h-0 flex-1 justify-center overflow-hidden bg-canvas p-3 sm:p-4"
        onClick={() => setShowExportMenu(false)}
      >
        {activeTab === 'preview' && (
          <div className={`flex h-full min-w-0 flex-col ${DEVICE_WIDTHS[previewDevice]}`}>
            {pages.length > 1 && (
              <div className="scroll-thin mb-2 flex shrink-0 items-center gap-1 overflow-x-auto">
                <span className="mr-1 hidden items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-faint sm:inline-flex">
                  <Icon name="files" size={10} />
                  Pages
                </span>
                {pages.map((page) => (
                  <button
                    key={page}
                    onClick={() => {
                      setActivePage(page);
                      setPreviewNonce((value) => value + 1);
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
                      activePage === page
                        ? 'border-accent/30 bg-accent-soft text-accent'
                        : 'border-line bg-surface text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Icon name="file" size={9} />
                    {pageLabel(page)}
                  </button>
                ))}
              </div>
            )}

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-md)]">
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                  <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                  <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                </span>
                <span className="mx-auto inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-md bg-white px-2.5 py-0.5 font-mono text-[9px] text-neutral-500 shadow-sm">
                  <Icon name="lock" size={7} />
                  {activePage || 'preview'} · sandboxed
                </span>
              </div>

              <div className="relative h-[calc(100%-2rem)] w-full">
                <iframe
                  key={`${activePage}-${previewNonce}`}
                  ref={iframeRef}
                  title="Website preview"
                  className="h-full w-full border-0 bg-white"
                  srcDoc={previewDoc}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                />

                {isAnnotating && (
                  <div
                    ref={containerRef}
                    className="absolute inset-0 z-20 cursor-crosshair bg-accent/5"
                    onClick={handleOverlayClick}
                  >
                    <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[10.5px] font-semibold text-canvas shadow-[var(--shadow-md)]">
                      Click the spot you want to change
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 flex shrink-0 items-center justify-between px-0.5 text-[9.5px] text-ink-faint">
              <span className="inline-flex items-center gap-1">
                <Icon name="shield" size={9} />
                Isolated preview · generated code cannot read your keys
              </span>
              <span className="hidden sm:inline">
                {Object.keys(localFiles).length} file
                {Object.keys(localFiles).length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-sm)]">
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
              {fileNames.map((filename) => (
                <button
                  key={filename}
                  onClick={() => setSelectedFile(filename)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10.5px] transition-colors ${
                    selectedFile === filename
                      ? 'bg-surface-3 text-ink'
                      : 'text-ink-faint hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  <Icon name="file" size={9} />
                  {filename}
                </button>
              ))}
              <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
                <span className="hidden font-mono text-[9px] text-ink-faint sm:inline">
                  {lineCount} lines
                </span>
                <button onClick={handleCopyCode} className="btn btn-sm btn-ghost">
                  <Icon
                    name={copyFeedback ? 'check' : 'copy'}
                    size={11}
                    className={copyFeedback ? 'text-success' : ''}
                  />
                  {copyFeedback ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              value={selectedFile ? (localFiles[selectedFile] ?? '') : ''}
              onChange={(event) => handleCodeChange(event.target.value)}
              spellCheck={false}
              aria-label={`Code for ${selectedFile ?? 'the selected file'}`}
              className="scroll-thin min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-[12px] leading-relaxed text-ink outline-none"
            />
            <div className="flex shrink-0 items-center justify-between border-t border-line px-3 py-2 text-[9.5px] text-ink-faint">
              <span>Edits here are live in the preview and saved to the project.</span>
              <span className="font-mono">{selectedFile}</span>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="scroll-thin h-full w-full overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-sm)]">
            {totalAssets === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-ink-faint">
                  <Icon name="palette" size={18} />
                </span>
                <p className="mt-3 text-[13px] font-medium text-ink">Nothing to edit yet</p>
                <p className="mt-1 max-w-[300px] text-[11.5px] leading-relaxed text-ink-faint">
                  Images, links, colours, design tokens, and button labels found in the generated
                  pages will be editable here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-[10px] leading-relaxed text-ink-faint">
                  Change a value and press Enter or click away. The edit is applied to every file
                  that uses it, and the preview updates immediately.
                </p>
                {(
                  [
                    ['Design tokens', 'sliders', assets.tokens],
                    ['Colours', 'palette', assets.colors],
                    ['Images and media', 'image', assets.media],
                    ['Links', 'link', assets.links],
                    ['Button labels', 'pencil', assets.content],
                  ] as const
                ).map(([title, icon, group]) =>
                  group.length === 0 ? null : (
                    <section key={title}>
                      <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                        <Icon name={icon} size={10} />
                        {title}
                        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px]">
                          {group.length}
                        </span>
                      </h3>
                      <div className="space-y-1.5">{group.map(renderAssetRow)}</div>
                    </section>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPane;
