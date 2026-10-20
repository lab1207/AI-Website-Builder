import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { FileMap, DeviceType } from '../types';
import { buildPreviewDocument } from '../lib/preview';

interface PreviewPaneProps {
  files: FileMap;
  isGenerating: boolean;
  onAutoFix?: () => void;
  onExplain?: () => void;
  isAnnotating?: boolean;
  onAnnotateSelect?: (x: number, y: number) => void;
  onFileUpdate?: (newFiles: FileMap) => void;
  previewDevice?: DeviceType;
  onDeviceChange?: (device: DeviceType) => void;
  /** True when the project type needs a build step before it can run. */
  needsBuild?: boolean;
  projectLabel?: string;
  /** The full project to export, including any scaffold files. */
  exportFiles?: FileMap;
}

type Tab = 'preview' | 'code' | 'assets';

type AssetType = 'image' | 'video' | 'link' | 'text';

interface DetectedAsset {
  id: string;
  originalValue: string;
  currentValue: string;
  type: AssetType;
  count: number;
  context?: string;
}

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  desktop: 'w-full',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

const PreviewPane: React.FC<PreviewPaneProps> = ({
  files,
  isGenerating,
  onAutoFix,
  onExplain,
  isAnnotating,
  onAnnotateSelect,
  onFileUpdate,
  previewDevice = 'desktop',
  onDeviceChange,
  needsBuild = false,
  projectLabel = 'this project',
  exportFiles,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [localFiles, setLocalFiles] = useState<FileMap>(files);
  const [previewDoc, setPreviewDoc] = useState('');
  const [assets, setAssets] = useState<{
    media: DetectedAsset[];
    links: DetectedAsset[];
    content: DetectedAsset[];
  }>({ media: [], links: [], content: [] });

  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  const handleCodeChange = (newContent: string) => {
    if (!selectedFile) return;
    const updatedFiles = { ...localFiles, [selectedFile]: newContent };
    setLocalFiles(updatedFiles);
    onFileUpdate?.(updatedFiles);
  };

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

  const scanForAssets = () => {
    const mediaMap = new Map<string, DetectedAsset>();
    const linkMap = new Map<string, DetectedAsset>();
    const textMap = new Map<string, DetectedAsset>();

    const addAsset = (
      map: Map<string, DetectedAsset>,
      value: string,
      type: AssetType,
      context?: string,
    ) => {
      if (!value || value.trim() === '' || value.startsWith('data:')) return;

      if (map.has(value)) {
        map.get(value)!.count += 1;
      } else {
        map.set(value, {
          id: `${type}-${value}-${Math.random()}`,
          originalValue: value,
          currentValue: value,
          type,
          count: 1,
          context,
        });
      }
    };

    if (localFiles['index.html']) {
      const html = localFiles['index.html'];

      const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
      let match: RegExpExecArray | null;
      while ((match = imgRegex.exec(html)) !== null) addAsset(mediaMap, match[1], 'image');

      const videoRegex = /<(?:video|source)[^>]+src=["']([^"']+)["']/g;
      while ((match = videoRegex.exec(html)) !== null) addAsset(mediaMap, match[1], 'video');

      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/g;
      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          addAsset(linkMap, href, 'link');
        }
      }

      const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/g;
      while ((match = buttonRegex.exec(html)) !== null) {
        const text = match[1].trim();
        if (text && !text.includes('<')) addAsset(textMap, text, 'text', 'Button');
      }
    }

    for (const filename of Object.keys(localFiles)) {
      if (filename.endsWith('.css') || filename === 'index.html') {
        const urlRegex = /url\((['"]?)(.*?)\1\)/g;
        let match: RegExpExecArray | null;
        while ((match = urlRegex.exec(localFiles[filename])) !== null) {
          addAsset(mediaMap, match[2], 'image');
        }
      }
    }

    setAssets({
      media: Array.from(mediaMap.values()),
      links: Array.from(linkMap.values()),
      content: Array.from(textMap.values()),
    });
  };

  const handleUpdateAsset = (asset: DetectedAsset, newValue: string) => {
    if (!newValue || newValue === asset.currentValue) return;

    const newFiles = { ...localFiles };
    let updated = false;

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const filename of Object.keys(newFiles)) {
      const content = newFiles[filename];
      let newContent = content;

      if (asset.type === 'text') {
        const regex = new RegExp(`>${escapeRegExp(asset.currentValue)}<`, 'g');
        if (regex.test(content)) {
          newContent = content.replace(regex, `>${newValue}<`);
          updated = true;
        }
      } else if (content.includes(asset.currentValue)) {
        newContent = content.split(asset.currentValue).join(newValue);
        updated = true;
      }

      if (updated) newFiles[filename] = newContent;
    }

    if (updated) {
      setLocalFiles(newFiles);
      onFileUpdate?.(newFiles);
    }
  };

  useEffect(() => {
    if (activeTab === 'preview' && localFiles['index.html']) {
      setPreviewDoc(buildPreviewDocument(localFiles));
    }
  }, [localFiles, activeTab]);

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
      const zip = new JSZip();
      const files = exportFiles ?? localFiles;
      for (const filename of Object.keys(files)) {
        zip.file(filename, files[filename]);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'project.zip';
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setShowExportMenu(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !onAnnotateSelect) return;
    const rect = containerRef.current.getBoundingClientRect();
    onAnnotateSelect(
      Math.round(((event.clientX - rect.left) / rect.width) * 100),
      Math.round(((event.clientY - rect.top) / rect.height) * 100),
    );
  };

  const fileNames = useMemo(() => Object.keys(localFiles), [localFiles]);
  const totalAssets = assets.media.length + assets.links.length + assets.content.length;

  if (needsBuild) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-canvas px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-ink-faint shadow-[var(--shadow-sm)]">
          <i className="fa-solid fa-box text-[18px]" aria-hidden="true" />
        </div>
        <p className="mt-4 text-[14px] font-medium text-ink">
          {projectLabel} needs a build step
        </p>
        <p className="mt-1.5 max-w-[360px] text-[12.5px] leading-relaxed text-ink-muted">
          The browser cannot run a bundled project on its own. Export the ZIP and start it with
          <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px]">
            npm install &amp;&amp; npm run dev
          </code>
        </p>
        <p className="mt-4 max-w-[360px] text-[11.5px] leading-relaxed text-ink-faint">
          The Code tab still shows every file, and Publish can push the whole project to GitHub
          or Vercel.
        </p>
      </div>
    );
  }

  if (Object.keys(localFiles).length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-canvas px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-ink-faint shadow-[var(--shadow-sm)]">
          <i className="fa-regular fa-eye text-[20px]" aria-hidden="true" />
        </div>
        <p className="mt-4 text-[14px] font-medium text-ink">Your preview will appear here</p>
        <p className="mt-1 max-w-[280px] text-[12.5px] leading-relaxed text-ink-faint">
          Describe a website on the left and it will render here as it is written.
        </p>
      </div>
    );
  }

  const containerClasses = isFullScreen
    ? 'fixed inset-0 z-50 flex flex-col h-screen w-screen bg-canvas'
    : 'flex flex-col h-full bg-canvas overflow-hidden';

  return (
    <div className={containerClasses}>
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3">
        <div className="flex items-center gap-1">
          {(['preview', 'code', 'assets'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-surface-3 text-ink'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {tab}
              {tab === 'assets' && totalAssets > 0 && (
                <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint">
                  {totalAssets}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {onExplain && activeTab === 'preview' && (
            <button
              onClick={onExplain}
              disabled={isGenerating}
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40 sm:flex"
            >
              <i className="fa-solid fa-graduation-cap text-[11px]" aria-hidden="true" />
              Explain
            </button>
          )}

          {onAutoFix && activeTab === 'preview' && (
            <button
              onClick={onAutoFix}
              disabled={isGenerating}
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40 sm:flex"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-[11px]" aria-hidden="true" />
              Auto fix
            </button>
          )}

          {activeTab === 'preview' && (
            <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
              {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((device) => (
                <button
                  key={device}
                  onClick={() => onDeviceChange?.(device)}
                  aria-label={`Show ${device} preview`}
                  title={`${device} preview`}
                  className={`rounded-[6px] p-1.5 transition-colors ${
                    previewDevice === device
                      ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                      : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  <i
                    className={`fa-solid fa-${
                      device === 'desktop'
                        ? 'desktop'
                        : device === 'tablet'
                          ? 'tablet-screen-button'
                          : 'mobile-screen-button'
                    } text-[11px]`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setPreviewDoc(buildPreviewDocument(localFiles))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Reload the preview"
            title="Reload the preview"
          >
            <i className="fa-solid fa-rotate-right text-[12px]" aria-hidden="true" />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
            title={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            <i
              className={`fa-solid ${isFullScreen ? 'fa-compress' : 'fa-expand'} text-[12px]`}
              aria-hidden="true"
            />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <i className="fa-solid fa-download text-[11px]" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="animate-panel-in absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[var(--shadow-lg)]">
                <button
                  onClick={handleExportSeparated}
                  className="w-full px-3.5 py-2 text-left text-[12.5px] text-ink transition-colors hover:bg-surface-2"
                >
                  Download ZIP
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    onFileUpdate?.(localFiles);
                  }}
                  className="w-full px-3.5 py-2 text-left text-[12.5px] text-ink transition-colors hover:bg-surface-2"
                >
                  Save changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 justify-center overflow-hidden bg-canvas p-4"
        onClick={() => setShowExportMenu(false)}
      >
        {activeTab === 'preview' && (
          <div
            className={`h-full overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-md)] transition-[width] duration-300 ${DEVICE_WIDTHS[previewDevice]}`}
          >
            <iframe
              title="Preview"
              className="h-full w-full border-0"
              srcDoc={previewDoc}
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
            />

            {isAnnotating && (
              <div
                ref={containerRef}
                className="absolute inset-0 z-50 cursor-crosshair bg-accent/5"
                onClick={handleOverlayClick}
              >
                <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-canvas/90 px-3 py-1.5 text-[11.5px] font-medium text-ink shadow-[var(--shadow-md)]">
                  Click the spot you want to change
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-sm)]">
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
              {fileNames.map((filename) => (
                <button
                  key={filename}
                  onClick={() => setSelectedFile(filename)}
                  className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-[11.5px] transition-colors ${
                    selectedFile === filename
                      ? 'bg-surface-3 text-ink'
                      : 'text-ink-faint hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  {filename}
                </button>
              ))}
              <button
                onClick={handleCopyCode}
                className="ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11.5px] text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <i
                  className={`fa-${copyFeedback ? 'solid' : 'regular'} fa-${
                    copyFeedback ? 'check text-success' : 'copy'
                  } text-[11px]`}
                  aria-hidden="true"
                />
                {copyFeedback ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              value={selectedFile ? (localFiles[selectedFile] ?? '') : ''}
              onChange={(event) => handleCodeChange(event.target.value)}
              spellCheck={false}
              aria-label={`Code for ${selectedFile ?? 'the selected file'}`}
              className="scroll-thin min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none"
            />
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="scroll-thin h-full w-full overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-sm)]">
            {totalAssets === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-faint">
                No images, links, or button labels found yet.
              </p>
            ) : (
              <div className="space-y-5">
                {(
                  [
                    ['Images and media', assets.media],
                    ['Links', assets.links],
                    ['Button labels', assets.content],
                  ] as const
                ).map(([title, group]) =>
                  group.length === 0 ? null : (
                    <section key={title}>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                        {title}
                      </h3>
                      <div className="space-y-1.5">
                        {group.map((asset) => (
                          <div key={asset.id} className="flex items-center gap-2">
                            <input
                              value={asset.currentValue}
                              onChange={(event) =>
                                handleUpdateAsset(asset, event.target.value)
                              }
                              aria-label={`${title}: ${asset.originalValue}`}
                              className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-line-strong"
                            />
                            {asset.count > 1 && (
                              <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] text-ink-faint">
                                ×{asset.count}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
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
