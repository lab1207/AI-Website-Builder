import React from 'react';
import { VersionSnapshot, diffFiles } from '../lib/versionHistory';

interface HistoryPanelProps {
  versions: VersionSnapshot[];
  currentFiles: Record<string, string>;
  onRestore: (version: VersionSnapshot) => void;
  onClose: () => void;
  onClear: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  versions,
  currentFiles,
  onRestore,
  onClose,
  onClear,
}) => {
  return (
    <aside
      className="animate-fade-in flex h-full w-[min(340px,92vw)] shrink-0 flex-col border-l border-line bg-surface"
      aria-label="Version history"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-[13.5px] font-semibold text-ink">History</h2>
        <div className="flex items-center gap-1">
          {versions.length > 0 && (
            <button
              onClick={onClear}
              className="rounded-lg px-2 py-1 text-[11.5px] text-ink-faint transition-colors hover:bg-surface-2 hover:text-danger"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Close history"
          >
            <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
        {versions.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-ink-faint">
              <i className="fa-solid fa-clock-rotate-left text-[15px]" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-ink">No versions yet</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
              Every generation is saved here, so you can roll back to any earlier version.
            </p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {versions.map((version, index) => {
              const changes = diffFiles(version.files, currentFiles);
              const isCurrent = index === 0 && changes.length === 0;

              return (
                <li key={version.id}>
                  <div className="group rounded-xl border border-line bg-surface-2 p-3 transition-colors hover:border-line-strong">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-ink">
                          {version.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          {timeAgo(version.createdAt)} · {Object.keys(version.files).length} files
                        </p>
                      </div>
                      <button
                        onClick={() => onRestore(version)}
                        className="shrink-0 rounded-lg border border-line px-2 py-1 text-[11px] font-medium text-ink-muted opacity-0 transition-all hover:bg-surface hover:text-ink focus:opacity-100 group-hover:opacity-100"
                      >
                        Restore
                      </button>
                    </div>

                    {changes.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {changes.slice(0, 4).map((change) => (
                          <li
                            key={change.name}
                            className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-faint"
                          >
                            {change.kind === 'added' ? '+' : change.kind === 'removed' ? '−' : '~'}{' '}
                            {change.name}
                          </li>
                        ))}
                        {changes.length > 4 && (
                          <li className="px-1 py-0.5 text-[10px] text-ink-faint">
                            +{changes.length - 4} more
                          </li>
                        )}
                      </ul>
                    )}

                    {isCurrent && (
                      <p className="mt-2 text-[10.5px] font-medium text-success">Current version</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
};

export default HistoryPanel;
