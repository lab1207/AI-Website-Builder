import type { FileMap } from '../types';

export interface VersionSnapshot {
  id: string;
  /** Short label shown in the history list. */
  label: string;
  /** The prompt that produced this version, when there was one. */
  prompt?: string;
  /** Every file at this point in time. */
  files: FileMap;
  createdAt: number;
}

const STORAGE_KEY = 'ai-website-builder:history:v1';
const MAX_VERSIONS = 30;

function isSnapshot(value: unknown): value is VersionSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<VersionSnapshot>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.files === 'object' &&
    candidate.files !== null
  );
}

/** Reads the saved history for this browser. */
export function readHistory(): VersionSnapshot[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSnapshot);
  } catch {
    return [];
  }
}

/** Saves the history, keeping only the most recent entries. */
export function writeHistory(versions: VersionSnapshot[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(versions.slice(0, MAX_VERSIONS)),
    );
  } catch {
    // Storage can be full or blocked. History is a convenience, not a
    // requirement, so a failure here should never break the app.
  }
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** A short, readable label for a version. */
export function describeVersion(label: string, prompt?: string): string {
  if (label) return label;
  if (prompt) {
    const trimmed = prompt.trim();
    return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  }
  return 'Version';
}

/**
 * Lists the files that differ between two versions.
 */
export function diffFiles(before: FileMap, after: FileMap): Array<{
  name: string;
  kind: 'added' | 'removed' | 'changed';
}> {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Array<{ name: string; kind: 'added' | 'removed' | 'changed' }> = [];

  for (const name of names) {
    const hadBefore = name in before;
    const hasAfter = name in after;
    if (!hadBefore && hasAfter) changes.push({ name, kind: 'added' });
    else if (hadBefore && !hasAfter) changes.push({ name, kind: 'removed' });
    else if (before[name] !== after[name]) changes.push({ name, kind: 'changed' });
  }

  return changes.sort((a, b) => a.name.localeCompare(b.name));
}

/** Counts the lines in a file, for the history list. */
export function countLines(content: string): number {
  if (!content) return 0;
  return content.split('\n').length;
}
