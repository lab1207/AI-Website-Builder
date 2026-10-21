import React, { useEffect, useMemo, useState } from 'react';
import {
  VersionSnapshot,
  diffFiles,
  diffLines,
  type LineDiff,
} from '../lib/versionHistory';
import Icon from './Icon';

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

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  versions,
  currentFiles,
  onRestore,
  onClose,
  onClear,
}) => {
  const [compareId, setCompareId] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState('');

  const selected = versions.find((version) => version.id === compareId) ?? null;

  const changes = useMemo(
    () => (selected ? diffFiles(selected.files, currentFiles) : []),
    [selected, currentFiles],
  );

  useEffect(() => {
    if (!selected) {
      setActiveFile('');
      return;
    }
    if (changes.length > 0 && !changes.some((change) => change.name === activeFile)) {
      setActiveFile(changes[0].name);
    }
    // Only reset when the comparison target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, currentFiles]);

  const activeDiff: LineDiff | null = useMemo(() => {
    if (!selected || !activeFile) return null;
    return diffLines(selected.files[activeFile] ?? '', currentFiles[activeFile] ?? '');
  }, [selected, activeFile, currentFiles]);

  const totals = useMemo(() => {
    if (!selected) return { added: 0, removed: 0 };
    return changes.reduce(
      (total, change) => {
        const diff = diffLines(
          selected.files[change.name] ?? '',
          currentFiles[change.name] ?? '',
        );
        return { added: total.added + diff.added, removed: total.removed + diff.removed };
      },
      { added: 0, removed: 0 },
    );
  }, [selected, changes, currentFiles]);

  /* Diff view ---------------------------------------------------------- */
  if (selected) {
    return (
      <div className="flex h-full w-full flex-col bg-surface">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
          <button
            onClick={() => setCompareId(null)}
            className="btn btn-icon btn-sm btn-ghost"
            aria-label="Back to version list"
          >
            <Icon name="arrow-left" size={15} />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em]">
              {selected.label}
            </h2>
            <p className="text-[10px] text-ink-faint">
              {formatDate(selected.createdAt)} · compared with the current files
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-icon btn-sm btn-ghost ml-auto"
            aria-label="Close history"
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-success">
            +{totals.added}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-danger">
            −{totals.removed}
          </span>
          <span className="text-[10px] text-ink-faint">
            {changes.length} file{changes.length === 1 ? '' : 's'} different
          </span>
          <button
            onClick={() => {
              onRestore(selected);
              onClose();
            }}
            className="btn btn-sm btn-secondary ml-auto"
          >
            <Icon name="clock" size={11} />
            Restore this version
          </button>
        </div>

        {changes.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <Icon name="check" size={19} />
            </span>
            <p className="mt-3 text-[13px] font-semibold">This is the current version</p>
            <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-ink-faint">
              Every file matches the editor. Make a change, then come back to see it line up
              here.
            </p>
          </div>
        ) : (
          <>
            <div className="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2">
              {changes.map((change) => {
                const diff = diffLines(
                  selected.files[change.name] ?? '',
                  currentFiles[change.name] ?? '',
                );
                return (
                  <button
                    key={change.name}
                    onClick={() => setActiveFile(change.name)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                      activeFile === change.name
                        ? 'border-accent/30 bg-accent-soft text-accent'
                        : 'border-line bg-surface-2 text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Icon name="file" size={9} />
                    {change.name}
                    <span className="text-[8.5px] text-success">+{diff.added}</span>
                    <span className="text-[8.5px] text-danger">−{diff.removed}</span>
                  </button>
                );
              })}
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-surface-2/30">
              {activeDiff && (
                <div className="min-w-[520px] py-1 font-mono text-[11px] leading-[1.65]">
                  {activeDiff.lines.map((line, index) => (
                    <div
                      key={`${index}-${line.kind}`}
                      className={`flex items-start gap-2 px-3 ${
                        line.kind === 'added'
                          ? 'diff-add'
                          : line.kind === 'removed'
                            ? 'diff-remove'
                            : 'text-ink-muted'
                      }`}
                    >
                      <span className="w-7 shrink-0 select-none text-right text-[9px] leading-[1.9] text-ink-faint/60">
                        {line.beforeLine ?? ''}
                      </span>
                      <span className="w-7 shrink-0 select-none text-right text-[9px] leading-[1.9] text-ink-faint/60">
                        {line.afterLine ?? ''}
                      </span>
                      <span className="w-3 shrink-0 select-none text-[10px] font-semibold">
                        {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{line.text || ' '}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2.5">
              <p className="text-[9.5px] text-ink-faint">
                Added lines are green, removed lines are red. Line numbers are old / new.
              </p>
              <button onClick={() => setCompareId(null)} className="btn btn-sm btn-ghost">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* List view ----------------------------------------------------------- */
  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon name="clock" size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]">Version history</h2>
          <p className="text-[10px] text-ink-faint">
            {versions.length} snapshot{versions.length === 1 ? '' : 's'} stored in this browser
          </p>
        </div>
        <button
          onClick={onClose}
          className="btn btn-icon btn-sm btn-ghost ml-auto"
          aria-label="Close history"
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      {versions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink-faint">
            <Icon name="clock" size={21} />
          </span>
          <p className="mt-3 text-[13px] font-semibold">No versions yet</p>
          <p className="mt-1 max-w-[270px] text-[11.5px] leading-relaxed text-ink-faint">
            Every build and import is snapshotted automatically. Generate a site and this panel
            starts filling up.
          </p>
        </div>
      ) : (
        <>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {versions.map((version, index) => {
                const changed = diffFiles(version.files, currentFiles).length;
                const isCurrent = index === 0 && changed === 0;
                return (
                  <article
                    key={version.id}
                    className="rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-sm)] transition-colors hover:border-line-strong"
                  >
                    <div className="flex items-start gap-2">
                      <span className="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-faint">
                        <Icon name="layers" size={11} />
                        {index < versions.length - 1 && (
                          <span className="absolute left-1/2 top-full h-3 w-px -translate-x-1/2 bg-line" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[12px] font-semibold text-ink">
                            {version.label}
                          </p>
                          {isCurrent && (
                            <span className="shrink-0 rounded bg-success/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-success">
                              current
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[9.5px] text-ink-faint">
                          {timeAgo(version.createdAt)} · {formatDate(version.createdAt)} ·{' '}
                          {Object.keys(version.files).length} files
                          {changed > 0 && (
                            <span className="text-ink-muted"> · {changed} changed</span>
                          )}
                        </p>
                        {version.prompt && (
                          <p className="mt-1.5 line-clamp-2 rounded-md bg-surface-2 px-2 py-1 text-[10px] leading-relaxed text-ink-muted">
                            {version.prompt.replace(/\n\n\[CONTEXT:[\s\S]*$/, '')}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            onClick={() => setCompareId(version.id)}
                            className="btn btn-xs btn-secondary"
                          >
                            <Icon name="diff" size={9} />
                            Compare
                          </button>
                          <button
                            onClick={() => {
                              onRestore(version);
                              onClose();
                            }}
                            className="btn btn-xs btn-ghost"
                          >
                            <Icon name="refresh" size={9} />
                            Restore
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2.5">
            <p className="text-[9.5px] text-ink-faint">
              The 30 most recent snapshots are kept locally.
            </p>
            <button onClick={onClear} className="btn btn-xs btn-danger">
              <Icon name="trash" size={9} />
              Clear all
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryPanel;
