import React, { useState } from 'react';
import type { FileMap } from '../types';
import {
  deployToVercel,
  importFigmaFile,
  publishToGitHub,
  PublishResult,
} from '../lib/publish';

interface PublishPanelProps {
  files: FileMap;
  projectName: string;
  onClose: () => void;
  /** Called with images pulled from Figma, ready to attach to the next prompt. */
  onFigmaImport: (images: Array<{ name: string; dataUrl: string }>) => void;
  /** Lets the header show its own spinner while a deploy runs. */
  onBusyChange?: (busy: boolean) => void;
}

type Section = 'download' | 'github' | 'vercel';

const PublishPanel: React.FC<PublishPanelProps> = ({
  files,
  projectName,
  onClose,
  onFigmaImport,
  onBusyChange,
}) => {
  const [section, setSection] = useState<Section>('download');
  const [status, setStatus] = useState<PublishResult | null>(null);
  const [busy, setBusy] = useState(false);

  const [githubToken, setGithubToken] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState(projectName.toLowerCase().replace(/\s+/g, '-'));

  const [vercelToken, setVercelToken] = useState('');

  const [figmaToken, setFigmaToken] = useState('');
  const [figmaKey, setFigmaKey] = useState('');

  const run = async (action: () => Promise<PublishResult>) => {
    setBusy(true);
    onBusyChange?.(true);
    setStatus(null);
    try {
      setStatus(await action());
    } catch (error) {
      setStatus({ ok: false, message: (error as Error).message });
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const handleFigma = () =>
    run(async () => {
      const result = await importFigmaFile(figmaToken, figmaKey);
      if (result.ok && result.frames.length > 0) {
        onFigmaImport(
          result.frames.map((frame) => ({ name: frame.name, dataUrl: frame.image })),
        );
      }
      return { ok: result.ok, message: result.message };
    });

  const tabs: Array<{ value: Section; label: string; icon: string }> = [
    { value: 'download', label: 'Download', icon: 'fa-solid fa-download' },
    { value: 'github', label: 'GitHub', icon: 'fa-brands fa-github' },
    { value: 'vercel', label: 'Vercel', icon: 'fa-solid fa-bolt' },
  ];

  return (
    <aside
      className="animate-fade-in flex h-full w-[min(380px,92vw)] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface"
      aria-label="Publish"
    >
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
        <h2 className="text-[13.5px] font-semibold text-ink">Publish</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Close publish panel"
        >
          <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-4 flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setSection(tab.value);
                setStatus(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors ${
                section === tab.value
                  ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <i className={`${tab.icon} text-[11px]`} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {section === 'download' && (
          <div className="space-y-4">
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              Download the project as a ZIP with every file separated, ready to open in any
              editor.
            </p>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                Object.entries(files)
                  .map(([name, content]) => `===== ${name} =====\n${content}`)
                  .join('\n\n'),
              )}`}
              download="project.txt"
              className="hidden"
            >
              text
            </a>
            <button
              onClick={async () => {
                const { default: JSZip } = await import('jszip');
                const zip = new JSZip();
                for (const [name, content] of Object.entries(files)) {
                  zip.file(name, content);
                }
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `${githubRepo || 'project'}.zip`;
                anchor.click();
                URL.revokeObjectURL(url);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-[12.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              <i className="fa-solid fa-download text-[11px]" aria-hidden="true" />
              Download ZIP
            </button>
            <p className="text-[11px] leading-relaxed text-ink-faint">
              {Object.keys(files).length} file{Object.keys(files).length === 1 ? '' : 's'} ·{' '}
              {Object.values(files).reduce((sum, content) => sum + content.split('\n').length, 0)}{' '}
              lines
            </p>
          </div>
        )}

        {section === 'github' && (
          <div className="space-y-3">
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              Push the project to a GitHub repository. You need a personal access token with the
              <code className="mx-1 rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]">
                repo
              </code>
              scope. The token is used once and never stored.
            </p>
            <label className="block space-y-1.5">
              <span className="text-[11.5px] font-medium text-ink-muted">Owner</span>
              <input
                value={githubOwner}
                onChange={(event) => setGithubOwner(event.target.value)}
                placeholder="your-username"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11.5px] font-medium text-ink-muted">Repository</span>
              <input
                value={githubRepo}
                onChange={(event) => setGithubRepo(event.target.value)}
                placeholder="my-site"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11.5px] font-medium text-ink-muted">Token</span>
              <input
                type="password"
                value={githubToken}
                onChange={(event) => setGithubToken(event.target.value)}
                placeholder="ghp_..."
                autoComplete="off"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
              />
            </label>
            <button
              onClick={() =>
                run(() => publishToGitHub(githubToken, githubOwner, githubRepo, files))
              }
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-[12.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              {busy ? (
                <i className="fa-solid fa-spinner fa-spin text-[11px]" aria-hidden="true" />
              ) : (
                <i className="fa-brands fa-github text-[12px]" aria-hidden="true" />
              )}
              Push to GitHub
            </button>
          </div>
        )}

        {section === 'vercel' && (
          <div className="space-y-3">
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              Deploy the project as a static site. You need a Vercel access token. It is used once
              and never stored.
            </p>
            <label className="block space-y-1.5">
              <span className="text-[11.5px] font-medium text-ink-muted">Project name</span>
              <input
                value={projectName}
                readOnly
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink-faint outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11.5px] font-medium text-ink-muted">Vercel token</span>
              <input
                type="password"
                value={vercelToken}
                onChange={(event) => setVercelToken(event.target.value)}
                placeholder="vercel token"
                autoComplete="off"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
              />
            </label>
            <button
              onClick={() =>
                run(() =>
                  deployToVercel({ token: vercelToken, name: projectName, files }),
                )
              }
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-[12.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              {busy ? (
                <i className="fa-solid fa-spinner fa-spin text-[11px]" aria-hidden="true" />
              ) : (
                <i className="fa-solid fa-bolt text-[11px]" aria-hidden="true" />
              )}
              Deploy to Vercel
            </button>
          </div>
        )}

        {status && (
          <div
            role="status"
            className={`mt-4 space-y-1.5 rounded-xl border p-3 text-[12px] leading-relaxed ${
              status.ok
                ? 'border-success/30 bg-success/8 text-success'
                : 'border-danger/30 bg-danger/8 text-danger'
            }`}
          >
            <p>{status.message}</p>
            {status.url && (
              <a
                href={status.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-medium underline"
              >
                {status.url}
                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        <section className="mt-6 space-y-3 border-t border-line pt-5">
          <h3 className="text-[12px] font-semibold text-ink">Import from Figma</h3>
          <p className="text-[12px] leading-relaxed text-ink-muted">
            Pull the frames of a Figma file and attach them to your next prompt as design
            references.
          </p>
          <label className="block space-y-1.5">
            <span className="text-[11.5px] font-medium text-ink-muted">File key</span>
            <input
              value={figmaKey}
              onChange={(event) => setFigmaKey(event.target.value)}
              placeholder="from the Figma URL"
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11.5px] font-medium text-ink-muted">Figma token</span>
            <input
              type="password"
              value={figmaToken}
              onChange={(event) => setFigmaToken(event.target.value)}
              placeholder="figd_..."
              autoComplete="off"
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
            />
          </label>
          <button
            onClick={handleFigma}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            {busy ? (
              <i className="fa-solid fa-spinner fa-spin text-[11px]" aria-hidden="true" />
            ) : (
              <i className="fa-solid fa-pen-ruler text-[11px]" aria-hidden="true" />
            )}
            Import frames
          </button>
        </section>
      </div>
    </aside>
  );
};

export default PublishPanel;
