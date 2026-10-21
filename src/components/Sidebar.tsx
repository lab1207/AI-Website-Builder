import React from 'react';
import Icon, { type IconName } from './Icon';
import Logo from './Logo';

type PanelName = 'settings' | 'history' | 'publish';

interface RailButtonProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  external?: boolean;
}

const RailButton: React.FC<RailButtonProps> = ({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  expanded = false,
  external = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-active={active ? 'true' : 'false'}
    className={
      expanded
        ? `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
            active
              ? 'bg-accent-soft text-accent'
              : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
          } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`
        : `rail-item ${disabled ? 'cursor-not-allowed opacity-40' : ''}`
    }
    aria-label={label}
    title={label}
  >
    <Icon name={icon} size={expanded ? 16 : 18} />
    {expanded ? (
      <>
        <span className="flex-1 text-left">{label}</span>
        {external && <Icon name="external" size={12} className="text-ink-faint" />}
      </>
    ) : (
      <span>{label}</span>
    )}
  </button>
);

interface SidebarProps {
  activePanel: 'none' | PanelName;
  onHome: () => void;
  onNewProject: () => void;
  onOpenPanel: (panel: PanelName) => void;
  onOpenLanding: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  hasFiles: boolean;
  isHome: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activePanel,
  onHome,
  onNewProject,
  onOpenPanel,
  onOpenLanding,
  onToggleTheme,
  theme,
  hasFiles,
  isHome,
  mobileOpen,
  onCloseMobile,
}) => {
  const items = [
    {
      icon: 'home' as IconName,
      label: 'Home',
      active: isHome && activePanel === 'none',
      onClick: onHome,
    },
    {
      icon: 'clock' as IconName,
      label: 'History',
      active: activePanel === 'history',
      onClick: () => onOpenPanel('history'),
    },
    {
      icon: 'rocket' as IconName,
      label: 'Publish',
      active: activePanel === 'publish',
      onClick: () => onOpenPanel('publish'),
      disabled: !hasFiles,
    },
    {
      icon: 'sliders' as IconName,
      label: 'Settings',
      active: activePanel === 'settings',
      onClick: () => onOpenPanel('settings'),
    },
  ];

  return (
    <>
      <aside
        className="hidden h-full w-[76px] shrink-0 flex-col items-center border-r border-line bg-surface/70 px-2.5 py-3 md:flex"
        aria-label="App navigation"
      >
        <button
          onClick={onHome}
          className="mb-3 rounded-xl transition-transform hover:scale-[1.04]"
          aria-label="AI Website Builder home"
          title="AI Website Builder"
        >
          <Logo size={34} showWordmark={false} />
        </button>

        <button
          onClick={onNewProject}
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-canvas shadow-[var(--shadow-sm)] transition-transform hover:scale-105 active:scale-95"
          aria-label="New project"
          title="New project"
        >
          <Icon name="plus" size={16} strokeWidth={2.2} />
        </button>

        <nav className="flex w-full flex-col gap-1.5">
          {items.map((item) => (
            <RailButton key={item.label} {...item} />
          ))}
        </nav>

        <div className="mt-auto flex w-full flex-col gap-1.5 pt-3">
          <div className="mx-auto mb-1 h-px w-8 bg-line" />
          <RailButton
            icon="github"
            label="GitHub"
            expanded={false}
            onClick={() =>
              window.open(
                'https://github.com/lab1207/AI-Website-Builder',
                '_blank',
                'noopener,noreferrer',
              )
            }
          />
          <RailButton icon="globe" label="Landing" onClick={onOpenLanding} />
          <button
            onClick={onToggleTheme}
            className="rail-item"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer ------------------------------------------------ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />
          <aside className="sheet-panel animate-panel-in absolute left-0 top-0 flex h-full w-[272px] flex-col bg-surface px-3 py-4">
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => {
                  onHome();
                  onCloseMobile();
                }}
                className="flex items-center gap-2.5"
              >
                <Logo size={32} showWordmark={false} />
                <span className="text-[13px] font-semibold">AI Website Builder</span>
              </button>
              <button
                onClick={onCloseMobile}
                className="btn btn-icon btn-ghost"
                aria-label="Close navigation"
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            <button
              onClick={() => {
                onNewProject();
                onCloseMobile();
              }}
              className="btn btn-md btn-primary mt-5 w-full"
            >
              <Icon name="plus" size={14} />
              New project
            </button>

            <nav className="mt-4 flex flex-col gap-1">
              {items.map((item) => (
                <RailButton
                  key={item.label}
                  {...item}
                  expanded
                  onClick={() => {
                    item.onClick();
                    if (!item.disabled) onCloseMobile();
                  }}
                />
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
              <RailButton
                icon="github"
                label="Star on GitHub"
                expanded
                external
                onClick={() => {
                  window.open(
                    'https://github.com/lab1207/AI-Website-Builder',
                    '_blank',
                    'noopener,noreferrer',
                  );
                  onCloseMobile();
                }}
              />
              <RailButton
                icon="globe"
                label="Marketing page"
                expanded
                onClick={() => {
                  onOpenLanding();
                  onCloseMobile();
                }}
              />
              <RailButton
                icon={theme === 'dark' ? 'sun' : 'moon'}
                label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
                expanded
                onClick={onToggleTheme}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
