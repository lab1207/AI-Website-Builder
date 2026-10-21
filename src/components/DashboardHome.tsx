import React from 'react';
import Composer from './Composer';
import Icon, { type IconName } from './Icon';
import { VersionSnapshot } from '../lib/versionHistory';
import { PROJECT_TYPES, ProjectType, SiteMode, Styling } from '../lib/projectTypes';
import type { Attachment } from '../types';

interface DashboardHomeProps {
  projectName: string;
  hasWork: boolean;
  input: string;
  setInput: (value: string) => void;
  onSend: (attachments: Attachment[]) => void;
  isLoading: boolean;
  onStop: () => void;
  isAnnotating: boolean;
  setIsAnnotating: (value: boolean) => void;
  pendingAnnotations: Array<{ x: number; y: number }>;
  onRemoveAnnotation: (index: number) => void;
  versions: VersionSnapshot[];
  onOpenHistory: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  projectType: ProjectType;
  styling: Styling;
  siteMode: SiteMode;
  onSiteModeChange: (mode: SiteMode) => void;
  onUseTemplate: (
    prompt: string,
    options?: { projectType?: ProjectType; siteMode?: SiteMode },
  ) => void;
  hasKey: boolean;
  modelPicker: React.ReactNode;
  onImportProject: () => void;
}

const timeAgo = (timestamp: number): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

interface Template {
  name: string;
  category: string;
  prompt: string;
  projectType: ProjectType;
  siteMode: SiteMode;
  art: 'aurora' | 'atelier' | 'table' | 'north';
  tint: string;
}

const TEMPLATES: Template[] = [
  {
    name: 'Aurora',
    category: 'SaaS landing',
    prompt:
      'A landing page for Aurora, an AI observability platform for engineering teams. Dark, technical, confident. Include a product visual, metrics, pricing, and a waitlist form.',
    projectType: 'vanilla',
    siteMode: 'single',
    art: 'aurora',
    tint: 'from-[#131a3a] to-[#2f2160]',
  },
  {
    name: 'Atelier',
    category: 'Portfolio',
    prompt:
      'A portfolio for a furniture designer called Atelier North. Warm paper tones, large editorial type, a project index with photography, and a studio story. Build it in React.',
    projectType: 'react',
    siteMode: 'single',
    art: 'atelier',
    tint: 'from-[#e8ddcb] to-[#c8ad8a]',
  },
  {
    name: 'Table & Thyme',
    category: 'Restaurant',
    prompt:
      'A multi-page site for a neighbourhood restaurant called Table & Thyme. Home, menu, and reservations. Seasonal food photography, a warm serif, and an easy reservation form.',
    projectType: 'vanilla',
    siteMode: 'multi',
    art: 'table',
    tint: 'from-[#243527] to-[#54613b]',
  },
  {
    name: 'Northwind',
    category: 'Agency',
    prompt:
      'A multi-page site for Northwind, a brand and digital studio. Home, work, and contact. Stark black and bone white, oversized type, a case study grid, and a clear contact section. Build it in Next.js.',
    projectType: 'next',
    siteMode: 'multi',
    art: 'north',
    tint: 'from-[#141414] to-[#3a3a36]',
  },
];

const TemplateArt: React.FC<{ art: Template['art'] }> = ({ art }) => {
  if (art === 'aurora') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#101736] via-[#1d1a46] to-[#38205c] p-3 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-bold tracking-[0.16em] text-white/80">AURORA</span>
          <span className="rounded-full border border-white/20 px-1.5 py-[2px] text-[5.5px] text-white/70">
            Get access
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <div className="h-2 w-[90%] rounded bg-white/85" />
            <div className="mt-1 h-2 w-[70%] rounded bg-white/85" />
            <div className="mt-2 h-1 w-[80%] rounded bg-white/20" />
            <div className="mt-1 h-1 w-[55%] rounded bg-white/20" />
            <span className="mt-2 inline-block rounded bg-[#8b7bff] px-1.5 py-[3px] text-[5px] font-bold text-white">
              Start free
            </span>
          </div>
          <div className="h-[54px] w-[44%] rounded border border-white/15 bg-white/[0.06] p-1.5">
            <div className="h-1 w-5 rounded bg-[#8b7bff]" />
            <div className="mt-1 flex h-5 items-end gap-[2px]">
              {[40, 65, 48, 80, 60, 95, 72].map((height, index) => (
                <span
                  key={index}
                  className="w-[4px] rounded-sm bg-gradient-to-t from-[#8b7bff]/40 to-[#b8aeff]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full bg-[#7257ff]/50 blur-xl" />
      </div>
    );
  }

  if (art === 'atelier') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#ece2d2] p-3 text-[#2b2117]">
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-semibold tracking-tight">Atelier North</span>
          <span className="text-[5.5px] uppercase tracking-[0.1em] text-[#2b2117]/60">Work</span>
        </div>
        <div className="mt-2 grid grid-cols-[1.1fr_0.9fr] gap-2">
          <div>
            <p className="font-display text-[15px] leading-[0.95] tracking-[-0.04em]">
              Objects
              <br />
              with a
              <br />
              <em className="text-[#a65a2e]">quiet</em> weight.
            </p>
            <div className="mt-1.5 h-px w-8 bg-[#2b2117]/20" />
            <div className="mt-1.5 h-1 w-[85%] rounded bg-[#2b2117]/15" />
            <div className="mt-1 h-1 w-[60%] rounded bg-[#2b2117]/15" />
          </div>
          <div className="relative h-[74px] overflow-hidden rounded-sm bg-gradient-to-br from-[#c59564] via-[#9b6845] to-[#4f3423]">
            <div className="absolute bottom-2 left-2 h-7 w-9 rounded-sm bg-[#e8d8c3]/80 shadow-md" />
            <div className="absolute bottom-2 right-2 h-10 w-2 rounded-sm bg-[#342417]/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
        </div>
      </div>
    );
  }

  if (art === 'table') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#20301f] to-[#4b5736] p-3 text-[#f2ebd9]">
        <div className="flex items-center justify-between">
          <span className="font-display text-[9px] font-semibold">Table & Thyme</span>
          <div className="flex gap-1.5 text-[5.5px] uppercase tracking-[0.08em] text-white/55">
            <span>Menu</span>
            <span>Visit</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_0.8fr] items-center gap-2">
          <div>
            <p className="font-display text-[17px] leading-[0.92] tracking-[-0.035em]">
              Grown
              <br />
              <em className="text-[#d9c890]">nearby.</em>
            </p>
            <p className="mt-1 text-[5.5px] leading-relaxed text-white/55">
              A seasonal kitchen on the edge of the market.
            </p>
            <span className="mt-2 inline-block rounded-full border border-white/25 px-1.5 py-[2px] text-[5px] font-semibold">
              Book a table
            </span>
          </div>
          <div className="relative h-[64px] overflow-hidden rounded-full bg-gradient-to-br from-[#d3b06b] via-[#9a6b3d] to-[#3a2b1d]">
            <div className="absolute inset-2 rounded-full border border-white/15" />
            <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3dfb1]/60 blur-[1px]" />
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-[#d9c890]/20 blur-md" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e8e4da] p-3 text-[#141414]">
      <div className="flex items-center justify-between">
        <span className="text-[6px] font-black uppercase tracking-[0.14em]">Northwind®</span>
        <span className="text-[5px] uppercase tracking-[0.1em] text-black/50">Studio</span>
      </div>
      <p className="mt-3 font-display text-[17px] leading-[0.9] tracking-[-0.05em]">
        We make
        <br />
        brands
        <br />
        <em className="text-[#e94f22]">matter.</em>
      </p>
      <div className="mt-2 flex items-center justify-between border-t border-black/15 pt-1.5 text-[5px] uppercase tracking-[0.08em] text-black/45">
        <span>Brand · Digital · Film</span>
        <span>2026</span>
      </div>
      <div className="absolute right-2 top-9 h-14 w-9 border border-black/15 bg-[#d6d0c2]">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-black/5 to-black/25" />
      </div>
    </div>
  );
};

const DashboardHome: React.FC<DashboardHomeProps> = ({
  projectName,
  hasWork,
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  isAnnotating,
  setIsAnnotating,
  pendingAnnotations,
  onRemoveAnnotation,
  versions,
  onOpenHistory,
  onContinue,
  onOpenSettings,
  projectType,
  styling,
  siteMode,
  onSiteModeChange,
  onUseTemplate,
  hasKey,
  modelPicker,
  onImportProject,
}) => {
  const projectTypeLabel =
    PROJECT_TYPES.find((option) => option.value === projectType)?.label ?? 'HTML, CSS & JS';

  return (
    <div className="scroll-thin h-full w-full overflow-y-auto bg-canvas">
      <div className="relative mx-auto w-full max-w-[980px] px-4 pb-16 pt-9 sm:px-6 sm:pt-14">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-[560px] -translate-x-1/2 rounded-full blur-[90px]"
          style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Your studio
            </span>
            <span className="text-[10px] text-ink-faint">/</span>
            <span className="text-[10px] font-medium text-ink-faint">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <h1 className="display mt-3 text-[38px] leading-[1.02] sm:text-[54px]">
            What will you <em>build</em> today?
          </h1>
          <p className="mt-2.5 max-w-[560px] text-[13px] leading-relaxed text-ink-muted sm:text-[13.5px]">
            Describe it, paste a screenshot, or start from a template. You get a live site,
            editable code, saved versions, and a publish button — not a chat transcript.
          </p>
        </div>

        {hasWork && (
          <div className="relative mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3 shadow-[var(--shadow-sm)] backdrop-blur">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon name="layers" size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-ink">{projectName}</p>
              <p className="text-[10px] text-ink-faint">
                {versions.length} saved version{versions.length === 1 ? '' : 's'} · ready when you
                are
              </p>
            </div>
            <button onClick={onContinue} className="btn btn-sm btn-secondary">
              Continue building
              <Icon name="arrow-right" size={11} />
            </button>
            <button
              onClick={onOpenHistory}
              className="btn btn-icon btn-sm btn-ghost"
              aria-label="Open version history"
              title="Version history"
            >
              <Icon name="clock" size={13} />
            </button>
          </div>
        )}

        <div className="relative mt-6">
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
            variant="dashboard"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {modelPicker}

            <button
              onClick={onOpenSettings}
              className="chip"
              title="Change the project type and styling"
            >
              <Icon name="layers" size={11} className="text-ink-faint" />
              {projectTypeLabel}
              {projectType !== 'vanilla' && styling === 'tailwind' && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-accent">
                  TW
                </span>
              )}
              <Icon name="chevron-down" size={9} className="text-ink-faint" />
            </button>

            <button
              onClick={() => onSiteModeChange(siteMode === 'multi' ? 'single' : 'multi')}
              className={`chip ${siteMode === 'multi' ? '!border-accent/30 !bg-accent-soft !text-accent' : ''}`}
              title="Toggle a one-page or multi-page site"
            >
              <Icon name="files" size={11} />
              {siteMode === 'multi' ? 'Multi-page' : 'One page'}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={onImportProject} className="chip">
                <Icon name="upload" size={11} />
                Import
              </button>
              {!hasKey ? (
                <button
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[10.5px] font-semibold text-accent transition-colors hover:bg-accent/15"
                >
                  <Icon name="key" size={10} />
                  Connect a provider
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink-faint">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  provider connected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Templates ------------------------------------------------------ */}
        <section className="relative mt-9">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">
                Start with a spark
              </h2>
              <p className="mt-0.5 text-[10.5px] text-ink-faint">
                A prompt and a stack, already thought through.
              </p>
            </div>
            <span className="hidden text-[10px] text-ink-faint sm:inline">Click to load</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() =>
                  onUseTemplate(template.prompt, {
                    projectType: template.projectType,
                    siteMode: template.siteMode,
                  })
                }
                className="group flex overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-md)]"
              >
                <div className="relative h-[104px] w-[132px] shrink-0 overflow-hidden border-r border-line">
                  <div
                    className={`h-full w-full bg-gradient-to-br ${template.tint} transition-transform duration-500 group-hover:scale-[1.04]`}
                  >
                    <TemplateArt art={template.art} />
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    {template.category}
                  </span>
                  <span className="mt-1 text-[13px] font-semibold tracking-[-0.01em] text-ink">
                    {template.name}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-ink-muted">
                    {template.prompt}
                  </span>
                  <span className="mt-2 flex items-center gap-1.5">
                    <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[8.5px] font-semibold text-ink-faint">
                      {PROJECT_TYPES.find((option) => option.value === template.projectType)?.label}
                    </span>
                    {template.siteMode === 'multi' && (
                      <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[8.5px] font-semibold text-ink-faint">
                        3 pages
                      </span>
                    )}
                    <Icon
                      name="arrow-up"
                      size={10}
                      className="ml-auto rotate-45 text-ink-faint transition-colors group-hover:text-accent"
                    />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Recent versions / capabilities -------------------------------- */}
        {versions.length > 0 ? (
          <section className="relative mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">
                Recent versions
              </h2>
              <button
                onClick={onOpenHistory}
                className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent hover:underline"
              >
                View all
                <Icon name="arrow-right" size={10} />
              </button>
            </div>
            <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {versions.slice(0, 3).map((version) => (
                <button
                  key={version.id}
                  onClick={onOpenHistory}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-ink-faint">
                    <Icon name="clock" size={12} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold text-ink">
                      {version.label}
                    </span>
                    <span className="block truncate text-[9.5px] text-ink-faint">
                      {timeAgo(version.createdAt)} · {Object.keys(version.files).length} files
                    </span>
                  </span>
                  <Icon name="chevron-right" size={12} className="shrink-0 text-ink-faint" />
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="relative mt-8 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              {
                icon: 'eye' as IconName,
                title: 'See it live',
                body: 'A sandboxed preview, desktop to mobile.',
              },
              {
                icon: 'diff' as IconName,
                title: 'Keep every take',
                body: 'Line-by-line diffs and one-click restores.',
              },
              {
                icon: 'globe' as IconName,
                title: 'Actually ship',
                body: 'ZIP, GitHub, Vercel, custom domains.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/60 px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
                  <Icon name={item.icon} size={13} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-faint">{item.body}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <p className="relative mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9.5px] text-ink-faint">
          <span className="inline-flex items-center gap-1">
            <Icon name="lock" size={9} />
            Keys stay in this browser
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-ink-faint" />
          <span className="inline-flex items-center gap-1">
            <Icon name="shield" size={9} />
            Sandboxed preview
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-ink-faint" />
          <span>Open source · GPL-3.0</span>
        </p>
      </div>
    </div>
  );
};

export default DashboardHome;
