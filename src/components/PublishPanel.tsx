import React, { useEffect, useMemo, useState } from 'react';
import type { FileMap } from '../types';
import {
  deployToVercel,
  importFigmaFile,
  publishToGitHub,
  type PublishResult,
} from '../lib/publish';
import {
  domainGuide,
  isValidDomain,
  normalizeDomain,
  type DomainTarget,
} from '../lib/domains';
import Icon, { type IconName } from './Icon';

interface PublishPanelProps {
  files: FileMap;
  projectName: string;
  customDomain: string;
  onCustomDomainChange: (domain: string) => void;
  onClose: () => void;
  /** Called with images pulled from Figma, ready to attach to the next prompt. */
  onFigmaImport?: (images: Array<{ name: string; dataUrl: string }>) => void;
  /** Lets the header show its own spinner while a deploy runs. */
  onBusyChange?: (busy: boolean) => void;
}

type Section = 'download' | 'github' | 'vercel' | 'domain';

const SECTIONS: Array<{ value: Section; label: string; icon: IconName }> = [
  { value: 'download', label: 'Download', icon: 'download' },
  { value: 'github', label: 'GitHub', icon: 'github' },
  { value: 'vercel', label: 'Vercel', icon: 'vercel' },
  { value: 'domain', label: 'Domain', icon: 'globe' },
];

const DOMAIN_TARGETS: Array<{ value: DomainTarget; label: string }> = [
  { value: 'github', label: 'GitHub Pages' },
  { value: 'vercel', label: 'Vercel' },
  { value: 'netlify', label: 'Netlify' },
  { value: 'cloudflare', label: 'Cloudflare' },
];

const STORAGE_GITHUB = 'ai-website-builder:github-publish:v1';

function formatBytes(content: string): string {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const StatusCard: React.FC<{ result: PublishResult }> = ({ result }) => (
  <div
    className={`rounded-xl border px-3 py-2.5 ${
      result.ok
        ? 'border-success/25 bg-success/[0.06]'
        : 'border-danger/25 bg-danger/[0.06]'
    }`}
  >
    <div className="flex items-start gap-2">
      <Icon
        name={result.ok ? 'check-circle' : 'alert'}
        size={13}
        className={`mt-0.5 shrink-0 ${result.ok ? 'text-success' : 'text-danger'}`}
      />
      <p
        className={`text-[10.5px] leading-relaxed ${
          result.ok ? 'text-ink' : 'text-danger'
        }`}
      >
        {result.message}
      </p>
    </div>
    {result.url && (
      <a
        href={result.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-surface-2"
      >
        Open {result.ok ? 'the site' : 'the repository'}
        <Icon name="external" size={9} />
      </a>
    )}
  </div>
);

const SectionHeading: React.FC<{ icon: IconName; title: string; body: string }> = ({
  icon,
  title,
  body,
}) => (
  <div>
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon name={icon} size={13} />
      </span>
      <h3 className="text-[12px] font-semibold text-ink">{title}</h3>
    </div>
    <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-muted">{body}</p>
  </div>
);

const PublishPanel: React.FC<PublishPanelProps> = ({
  files,
  projectName,
  customDomain,
  onCustomDomainChange,
  onClose,
  onFigmaImport,
  onBusyChange,
}) => {
  const [section, setSection] = useState<Section>('download');
  const [status, setStatus] = useState<PublishResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [githubToken, setGithubToken] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [makePublic, setMakePublic] = useState(true);

  const [vercelToken, setVercelToken] = useState('');
  const [vercelName, setVercelName] = useState(
    projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 52) ||
      'my-site',
  );

  const [domainDraft, setDomainDraft] = useState(customDomain);
  const [domainTarget, setDomainTarget] = useState<DomainTarget>('github');
  const [domainTouched, setDomainTouched] = useState(false);

  const [figmaToken, setFigmaToken] = useState('');
  const [figmaKey, setFigmaKey] = useState('');
  const [figmaBusy, setFigmaBusy] = useState(false);
  const [figmaStatus, setFigmaStatus] = useState<PublishResult | null>(null);

  const fileNames = useMemo(
    () =>
      Object.keys(files).sort((a, b) => {
        if (a === 'index.html') return -1;
        if (b === 'index.html') return 1;
        return a.localeCompare(b);
      }),
    [files],
  );

  const normalized = isValidDomain(domainDraft)
    ? domainDraft
    : normalizeDomain(domainDraft);
  const domainGuideData = useMemo(
    () =>
      normalized
        ? domainGuide(normalized, domainTarget, { githubOwner })
        : null,
    [normalized, domainTarget, githubOwner],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(STORAGE_GITHUB) ?? '{}',
      ) as { owner?: string; repo?: string };
      if (saved.owner) setGithubOwner(saved.owner);
      if (saved.repo) setGithubRepo(saved.repo);
    } catch {
      // Publishing still works without remembered names.
    }
  }, []);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => onBusyChange?.(false);
  }, [onBusyChange]);

  useEffect(() => {
    setStatus(null);
  }, [section]);

  useEffect(() => {
    setDomainDraft(customDomain);
  }, [customDomain]);

  const rememberGitHub = (owner: string, repo: string) => {
    try {
      window.localStorage.setItem(STORAGE_GITHUB, JSON.stringify({ owner, repo }));
    } catch {
      // Not important.
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const [name, content] of Object.entries(files)) {
        zip.file(name, content);
      }

      if (!files['README.md']) {
        const hasPackage = Boolean(files['package.json']);
        zip.file(
          'README.md',
          `# ${projectName}\n\nBuilt with [AI Website Builder](https://github.com/lab1207/AI-Website-Builder).\n\n${
            hasPackage
              ? '## Run locally\n\n```bash\nnpm install\nnpm run dev\n```\n'
              : 'Open `index.html` in a browser, or serve the folder with any static host.\n'
          }${customDomain ? `\nCustom domain: **${customDomain}** (a CNAME file is included).\n` : ''}`,
        );
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project'}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus({ ok: true, message: `Downloaded ${fileNames.length} files as a ZIP.` });
    } catch (error) {
      setStatus({ ok: false, message: `Could not build the ZIP: ${(error as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const handleGitHub = async () => {
    if (!githubToken.trim()) {
      setStatus({ ok: false, message: 'Add a GitHub token first.' });
      return;
    }
    if (!githubOwner.trim() || !githubRepo.trim()) {
      setStatus({ ok: false, message: 'Enter the owner and repository name.' });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await publishToGitHub(githubToken.trim(), githubOwner.trim(), githubRepo.trim(), files, {
        makePublic,
        customDomain: customDomain || undefined,
      });
      setStatus(result);
      if (result.ok) rememberGitHub(githubOwner.trim(), githubRepo.trim());
    } catch (error) {
      setStatus({ ok: false, message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleVercel = async () => {
    if (!vercelToken.trim()) {
      setStatus({ ok: false, message: 'Add a Vercel token first.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const result = await deployToVercel({
        token: vercelToken.trim(),
        name: vercelName.trim(),
        files,
      });
      setStatus(result);
    } catch (error) {
      setStatus({ ok: false, message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleFigma = async () => {
    if (!onFigmaImport) return;
    setFigmaBusy(true);
    setFigmaStatus(null);
    try {
      const result = await importFigmaFile(figmaToken.trim(), figmaKey.trim());
      setFigmaStatus(result);
      if (result.ok) {
        onFigmaImport(result.frames.map((frame) => ({ name: frame.name, dataUrl: frame.image })));
      }
    } catch (error) {
      setFigmaStatus({ ok: false, message: (error as Error).message });
    } finally {
      setFigmaBusy(false);
    }
  };

  const commitDomain = () => {
    setDomainTouched(true);
    if (!domainDraft.trim()) {
      onCustomDomainChange('');
      return;
    }
    const value = normalizeDomain(domainDraft);
    if (value) {
      setDomainDraft(value);
      onCustomDomainChange(value);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface" aria-label="Publish and export">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon name="rocket" size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]">Publish &amp; export</h2>
          <p className="truncate text-[10px] text-ink-faint">
            {fileNames.length} files · {projectName}
          </p>
        </div>
        <button
          onClick={onClose}
          className="btn btn-icon btn-sm btn-ghost ml-auto"
          aria-label="Close publish panel"
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      <div className="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2">
        {SECTIONS.map((item) => (
          <button
            key={item.value}
            onClick={() => setSection(item.value)}
            aria-current={section === item.value}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10.5px] font-semibold transition-colors ${
              section === item.value
                ? 'border-accent/30 bg-accent-soft text-accent'
                : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            <Icon name={item.icon} size={11} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3.5">
        {section === 'download' && (
          <div className="space-y-4">
            <SectionHeading
              icon="download"
              title="One folder. Everything in it."
              body="Every page, style, script, scaffold file, and the CNAME if you added a domain. No lock-in, no account."
            />

            <div className="rounded-2xl border border-line bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-ink-muted shadow-[var(--shadow-sm)]">
                  <Icon name="folder" size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-ink">
                    {projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project'}.zip
                  </p>
                  <p className="text-[9.5px] text-ink-faint">
                    {fileNames.length} files
                    {customDomain && ' · CNAME included'}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={busy}
                  data-loading={busy ? 'true' : 'false'}
                  className="btn btn-sm btn-primary ml-auto shrink-0"
                >
                  <Icon name="download" size={11} />
                  Download
                </button>
              </div>

              <div className="scroll-thin mt-2.5 max-h-44 space-y-0.5 overflow-y-auto border-t border-line pt-2">
                {fileNames.map((name) => (
                  <div key={name} className="flex items-center gap-2 py-0.5">
                    <Icon name="file" size={9} className="shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-ink-muted">
                      {name}
                    </span>
                    <span className="shrink-0 font-mono text-[8.5px] text-ink-faint">
                      {formatBytes(files[name])}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {status && <StatusCard result={status} />}

            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://app.netlify.com/drop"
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-col rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-line-strong"
              >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink">
                  <Icon name="cloud" size={11} className="text-ink-faint" />
                  Netlify Drop
                </span>
                <span className="mt-1 text-[9px] leading-relaxed text-ink-faint">
                  Drag the unzipped folder in. No account needed.
                </span>
              </a>
              <a
                href="https://developers.cloudflare.com/pages/get-started/direct-upload/"
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-col rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-line-strong"
              >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink">
                  <Icon name="zap" size={11} className="text-ink-faint" />
                  Cloudflare Pages
                </span>
                <span className="mt-1 text-[9px] leading-relaxed text-ink-faint">
                  Direct upload, then add a custom domain.
                </span>
              </a>
            </div>

            <details className="rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                <Icon name="layers" size={12} className="text-ink-faint" />
                Import a Figma frame
                <Icon name="chevron-down" size={10} className="ml-auto text-ink-faint" />
              </summary>
              <div className="space-y-1.5 border-t border-line px-3 py-3">
                <input
                  type="password"
                  value={figmaToken}
                  onChange={(event) => setFigmaToken(event.target.value)}
                  placeholder="Figma personal access token"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Figma personal access token"
                  className="input"
                />
                <input
                  type="text"
                  value={figmaKey}
                  onChange={(event) => setFigmaKey(event.target.value)}
                  placeholder="Figma file key (from the file URL)"
                  spellCheck={false}
                  aria-label="Figma file key"
                  className="input"
                />
                <button
                  onClick={handleFigma}
                  disabled={figmaBusy}
                  data-loading={figmaBusy ? 'true' : 'false'}
                  className="btn btn-sm btn-secondary w-full"
                >
                  <Icon name="download" size={11} />
                  Import frames as references
                </button>
                {figmaStatus && <StatusCard result={figmaStatus} />}
              </div>
            </details>
          </div>
        )}

        {section === 'github' && (
          <div className="space-y-4">
            <SectionHeading
              icon="github"
              title="Push to GitHub Pages"
              body="Creates the repository if it is yours, commits every file, and asks Pages to serve the branch. The site URL comes back when it is live."
            />

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label htmlFor="github-owner" className="mb-1 block text-[9.5px] font-semibold text-ink-faint">
                    Owner
                  </label>
                  <input
                    id="github-owner"
                    value={githubOwner}
                    onChange={(event) => setGithubOwner(event.target.value)}
                    placeholder="your-username"
                    autoComplete="off"
                    spellCheck={false}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="github-repo" className="mb-1 block text-[9.5px] font-semibold text-ink-faint">
                    Repository
                  </label>
                  <input
                    id="github-repo"
                    value={githubRepo}
                    onChange={(event) => setGithubRepo(event.target.value)}
                    placeholder="my-new-site"
                    autoComplete="off"
                    spellCheck={false}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="github-token" className="mb-1 flex items-center justify-between text-[9.5px] font-semibold text-ink-faint">
                  Personal access token
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=AI%20Website%20Builder"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent hover:underline"
                  >
                    Create one (repo scope)
                  </a>
                </label>
                <input
                  id="github-token"
                  type="password"
                  value={githubToken}
                  onChange={(event) => setGithubToken(event.target.value)}
                  placeholder="github_pat_…"
                  autoComplete="off"
                  spellCheck={false}
                  className="input"
                />
                <p className="mt-1 text-[9px] leading-relaxed text-ink-faint">
                  Kept in memory for this tab only. Never saved to the repository or to disk.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-2">
                <input
                  type="checkbox"
                  checked={makePublic}
                  onChange={(event) => setMakePublic(event.target.checked)}
                  className="mt-0.5 h-3 w-3 accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-[10.5px] font-medium text-ink">
                    Make the repository public
                  </span>
                  <span className="block text-[9px] text-ink-faint">
                    Required for GitHub Pages on free accounts. A website is public anyway.
                  </span>
                </span>
              </label>

              {customDomain && (
                <p className="flex items-start gap-1.5 rounded-lg border border-success/25 bg-success/[0.06] px-2.5 py-2 text-[9.5px] leading-relaxed text-ink">
                  <Icon name="globe" size={10} className="mt-0.5 shrink-0 text-success" />
                  The CNAME for <strong className="mx-0.5">{customDomain}</strong> is included and
                  the domain is attached to Pages after the push.
                </p>
              )}

              <button
                onClick={handleGitHub}
                disabled={busy}
                data-loading={busy ? 'true' : 'false'}
                className="btn btn-md btn-primary w-full"
              >
                <Icon name="github" size={13} />
                Push &amp; publish
              </button>
            </div>

            {status && <StatusCard result={status} />}

            <div className="rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-[9.5px] leading-relaxed text-ink-faint">
              <p className="font-semibold text-ink-muted">Good to know</p>
              <p className="mt-1">
                Pages can take a minute to build. A newly created domain needs its DNS records
                first; the Domain tab gives you the exact values. If the token cannot enable
                Pages, the files are still pushed and the repository is linked.
              </p>
            </div>
          </div>
        )}

        {section === 'vercel' && (
          <div className="space-y-4">
            <SectionHeading
              icon="vercel"
              title="Deploy to Vercel"
              body="Uploads the project as a production deployment. Static sites go live immediately; framework projects are built by Vercel."
            />

            <div>
              <label htmlFor="vercel-token" className="mb-1 flex items-center justify-between text-[9.5px] font-semibold text-ink-faint">
                Vercel access token
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent hover:underline"
                >
                  Create one
                </a>
              </label>
              <input
                id="vercel-token"
                type="password"
                value={vercelToken}
                onChange={(event) => setVercelToken(event.target.value)}
                placeholder="vercel_…"
                autoComplete="off"
                spellCheck={false}
                className="input"
              />
              <p className="mt-1 text-[9px] text-ink-faint">
                Kept in memory for this tab only.
              </p>
            </div>

            <div>
              <label htmlFor="vercel-name" className="mb-1 block text-[9.5px] font-semibold text-ink-faint">
                Project name
              </label>
              <input
                id="vercel-name"
                value={vercelName}
                onChange={(event) => setVercelName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="input"
              />
            </div>

            <button
              onClick={handleVercel}
              disabled={busy}
              data-loading={busy ? 'true' : 'false'}
              className="btn btn-md btn-primary w-full"
            >
              <Icon name="rocket" size={13} />
              Deploy to production
            </button>

            {status && <StatusCard result={status} />}

            <div className="rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-[9.5px] leading-relaxed text-ink-faint">
              Add the custom domain in Vercel after the first deploy. The Domain tab shows the
              records to enter — or use Vercel&apos;s own domain flow, which can add them for you.
            </div>
          </div>
        )}

        {section === 'domain' && (
          <div className="space-y-4">
            <SectionHeading
              icon="globe"
              title="Bring your own domain"
              body="The builder ships a CNAME with the project and tells you exactly which DNS records to add. DNS itself happens at your registrar."
            />

            <div>
              <label htmlFor="custom-domain" className="mb-1 block text-[9.5px] font-semibold text-ink-faint">
                Domain
              </label>
              <div className="flex gap-1.5">
                <input
                  id="custom-domain"
                  value={domainDraft}
                  onChange={(event) => {
                    setDomainDraft(event.target.value);
                    setDomainTouched(false);
                  }}
                  onBlur={commitDomain}
                  placeholder="yourdomain.com"
                  autoComplete="off"
                  spellCheck={false}
                  className="input min-w-0 flex-1"
                />
                {customDomain && (
                  <button
                    onClick={() => {
                      setDomainDraft('');
                      onCustomDomainChange('');
                    }}
                    className="btn btn-sm btn-secondary shrink-0"
                    title="Remove the saved domain"
                  >
                    <Icon name="x" size={11} />
                  </button>
                )}
              </div>
              {domainDraft && !normalized && (
                <p className="mt-1 text-[9.5px] text-danger">
                  Enter a bare domain such as <span className="font-mono">studio.example.com</span>.
                </p>
              )}
              {domainTouched && normalized && (
                <p className="mt-1 flex items-center gap-1 text-[9.5px] text-success">
                  <Icon name="check" size={9} />
                  Saved. CNAME included in downloads and GitHub pushes.
                </p>
              )}
              {normalized && (
                <p className="mt-1 text-[9.5px] text-ink-faint">
                  A CNAME file will be written as <span className="font-mono">{normalized}</span>.
                </p>
              )}
            </div>

            <div>
              <span className="mb-1 block text-[9.5px] font-semibold text-ink-faint">
                Where is it hosted?
              </span>
              <div className="grid grid-cols-2 gap-1">
                {DOMAIN_TARGETS.map((target) => (
                  <button
                    key={target.value}
                    onClick={() => setDomainTarget(target.value)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                      domainTarget === target.value
                        ? 'border-accent/30 bg-accent-soft text-accent'
                        : 'border-line bg-surface-2 text-ink-muted hover:text-ink'
                    }`}
                  >
                    {target.label}
                  </button>
                ))}
              </div>
            </div>

            {domainGuideData ? (
              <div className="space-y-2.5">
                <div className="rounded-xl border border-line bg-surface-2 p-2.5">
                  <p className="text-[10px] leading-relaxed text-ink-muted">
                    {domainGuideData.summary}
                  </p>
                  <div className="mt-2 space-y-1">
                    {domainGuideData.records.map((record) => {
                      const key = `${record.type}-${record.name}-${record.value}`;
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5"
                        >
                          <span className="w-11 shrink-0 rounded bg-surface-2 px-1 py-0.5 text-center font-mono text-[8.5px] font-bold text-ink-muted">
                            {record.type}
                          </span>
                          <span className="w-8 shrink-0 truncate font-mono text-[9px] text-ink-muted">
                            {record.name}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-ink">
                            {record.value}
                          </span>
                          <button
                            onClick={async () => {
                              const ok = await copyText(record.value);
                              if (ok) {
                                setCopied(key);
                                window.setTimeout(() => setCopied(null), 1600);
                              }
                            }}
                            className="shrink-0 rounded p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                            aria-label={`Copy ${record.type} record value`}
                            title="Copy value"
                          >
                            <Icon name={copied === key ? 'check' : 'copy'} size={9} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {domainGuideData.records.some((record) => record.note) && (
                    <ul className="mt-1.5 space-y-0.5">
                      {domainGuideData.records
                        .filter((record) => record.note)
                        .map((record) => (
                          <li key={record.note} className="text-[9px] leading-relaxed text-ink-faint">
                            · {record.note}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <ul className="space-y-1">
                  {domainGuideData.notes.map((note) => (
                    <li key={note} className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-ink-faint">
                      <Icon name="info" size={9} className="mt-0.5 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>

                <a
                  href={domainGuideData.docsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"
                >
                  {domainGuideData.label} domain documentation
                  <Icon name="external" size={9} />
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center">
                <Icon name="globe" size={18} className="mx-auto text-ink-faint" />
                <p className="mt-2 text-[10.5px] text-ink-faint">
                  Add a domain above to see its DNS records.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishPanel;
