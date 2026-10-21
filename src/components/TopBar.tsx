import React, { useId } from 'react';
import Icon from './Icon';
import { ViewMode } from '../types';

interface TopBarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  isGenerating: boolean;
  hasFiles: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenMobileNav: () => void;
  modelPicker: React.ReactNode;
  onPublish: () => void;
  isPublishing: boolean;
  /** Hidden on the dashboard, where there is nothing to switch between yet. */
  showViews?: boolean;
}

const VIEW_OPTIONS = [
  { value: ViewMode.CHAT, icon: 'message' as const, label: 'Chat only' },
  { value: ViewMode.SPLIT, icon: 'columns' as const, label: 'Chat and preview' },
  { value: ViewMode.PREVIEW, icon: 'eye' as const, label: 'Preview only' },
];

const TopBar: React.FC<TopBarProps> = ({
  projectName,
  onProjectNameChange,
  isGenerating,
  hasFiles,
  viewMode,
  onViewModeChange,
  onOpenMobileNav,
  modelPicker,
  onPublish,
  isPublishing,
  showViews = true,
}) => {
  const nameId = useId();
  const status = isGenerating ? 'Building' : hasFiles ? 'Ready' : 'New';

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/75 px-2.5 backdrop-blur-xl sm:px-4">
      <button
        onClick={onOpenMobileNav}
        className="btn btn-icon btn-ghost md:hidden"
        aria-label="Open navigation"
      >
        <Icon name="menu" size={17} />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden items-center gap-2 sm:flex">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Studio
          </span>
          <Icon name="chevron-right" size={10} className="text-ink-faint/60" />
        </span>

        <label htmlFor={nameId} className="sr-only">
          Project name
        </label>
        <div className="group relative min-w-0">
          <input
            id={nameId}
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Untitled project"
            aria-label="Project name"
            className="w-[130px] truncate rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-semibold tracking-[-0.01em] text-ink outline-none transition-colors hover:bg-surface-2 focus:border-line-strong focus:bg-surface sm:w-[210px]"
          />
          <Icon
            name="pencil"
            size={10}
            className="pointer-events-none absolute right-1 top-1/2 hidden -translate-y-1/2 text-ink-faint group-hover:block"
          />
        </div>

        <span
          className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.08em] lg:inline-flex ${
            isGenerating
              ? 'border-accent/30 bg-accent-soft text-accent'
              : 'border-line bg-surface-2 text-ink-faint'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isGenerating ? 'animate-pulse-soft bg-accent' : hasFiles ? 'bg-success' : 'bg-ink-faint'
            }`}
          />
          {status}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {showViews && (
          <div className="mr-1 hidden items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5 sm:flex">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onViewModeChange(option.value)}
                aria-pressed={viewMode === option.value}
                className={`flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors ${
                  viewMode === option.value
                    ? 'bg-surface text-ink shadow-[var(--shadow-sm)]'
                    : 'text-ink-faint hover:text-ink'
                }`}
                aria-label={option.label}
                title={option.label}
              >
                <Icon name={option.icon} size={13} />
              </button>
            ))}
          </div>
        )}

        <div className="hidden sm:block">{modelPicker}</div>

        <button
          onClick={onPublish}
          disabled={!hasFiles}
          data-loading={isPublishing ? 'true' : 'false'}
          className="btn btn-md btn-primary"
        >
          <Icon name="rocket" size={13} />
          <span className="hidden sm:inline">Publish</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
