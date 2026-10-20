import React, { useId } from 'react';

interface AppHeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  isGenerating: boolean;
  hasFiles: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenPublish: () => void;
  historyCount: number;
  isPublishing: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  projectName,
  onProjectNameChange,
  isGenerating,
  hasFiles,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenHistory,
  onOpenPublish,
  historyCount,
  isPublishing,
}) => {
  const nameId = useId();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-ink">
          <i className="fa-solid fa-bolt text-[13px]" aria-hidden="true" />
        </div>
        <span className="hidden shrink-0 text-[13px] font-semibold tracking-[-0.01em] text-ink sm:inline">
          AI Website Builder
        </span>
        <span className="hidden h-4 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
        <div className="min-w-0">
          <label htmlFor={nameId} className="sr-only">
            Project name
          </label>
          <input
            id={nameId}
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Untitled project"
            aria-label="Project name"
            className="w-40 truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[13px] font-semibold text-ink outline-none transition-colors hover:bg-surface-3 focus:border-line-strong focus:bg-surface sm:w-56"
          />
        </div>
      </div>

      <div className="ml-1 hidden items-center gap-2 md:flex">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            isGenerating
              ? 'border-accent/30 bg-accent-soft text-accent'
              : 'border-line bg-surface-2 text-ink-muted'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isGenerating ? 'animate-pulse-soft bg-accent' : 'bg-ink-faint'
            }`}
            aria-hidden="true"
          />
          {isGenerating ? 'Building' : hasFiles ? 'Ready' : 'New project'}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <a
          href="https://github.com/lab1207/AI-Website-Builder"
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn-md btn-secondary"
        >
          <i className="fa-brands fa-github text-[13px]" aria-hidden="true" />
          <span className="hidden sm:inline">Star</span>
        </a>

        <button
          onClick={onOpenHistory}
          className="btn btn-md btn-ghost relative"
        >
          <i className="fa-solid fa-clock-rotate-left text-[12px]" aria-hidden="true" />
          <span className="hidden sm:inline">History</span>
          {historyCount > 0 && (
            <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
              {historyCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenPublish}
          disabled={!hasFiles}
          className="btn btn-md btn-primary"
          data-loading={isPublishing ? 'true' : 'false'}
        >
          <i className="fa-solid fa-arrow-up-from-bracket text-[11px]" aria-hidden="true" />
          <span className="hidden sm:inline">
            {isPublishing ? 'Publishing…' : 'Publish'}
          </span>
        </button>

        <button
          onClick={onToggleTheme}
          className="btn btn-icon btn-ghost"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <i
            className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[13px]`}
            aria-hidden="true"
          />
        </button>

        <button
          onClick={onOpenSettings}
          className="btn btn-icon btn-ghost"
          aria-label="Open settings"
        >
          <i className="fa-solid fa-sliders text-[13px]" aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
