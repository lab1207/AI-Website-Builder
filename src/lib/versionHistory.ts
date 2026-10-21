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
  const trimmed = prompt?.trim();
  if (trimmed) {
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

export interface DiffLine {
  kind: 'same' | 'added' | 'removed';
  text: string;
  /** 1-based line number in the older file, when the line exists there. */
  beforeLine?: number;
  /** 1-based line number in the newer file, when the line exists there. */
  afterLine?: number;
}

export interface LineDiff {
  lines: DiffLine[];
  added: number;
  removed: number;
  unchanged: number;
}

/**
 * A unified, line-level diff.
 *
 * Uses the classic longest-common-subsequence table, with the shared prefix
 * and suffix stripped first so a one-line edit in a 1,000-line file stays
 * cheap. No dependency, no server, and deterministic output.
 */
export function diffLines(before: string, after: string): LineDiff {
  const beforeLines = before === '' ? [] : before.split('\n');
  const afterLines = after === '' ? [] : after.split('\n');

  let start = 0;
  while (
    start < beforeLines.length &&
    start < afterLines.length &&
    beforeLines[start] === afterLines[start]
  ) {
    start += 1;
  }

  let endBefore = beforeLines.length;
  let endAfter = afterLines.length;
  while (
    endBefore > start &&
    endAfter > start &&
    beforeLines[endBefore - 1] === afterLines[endAfter - 1]
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }

  const middleBefore = beforeLines.slice(start, endBefore);
  const middleAfter = afterLines.slice(start, endAfter);

  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (let index = 0; index < start; index += 1) {
    lines.push({
      kind: 'same',
      text: beforeLines[index],
      beforeLine: index + 1,
      afterLine: index + 1,
    });
    unchanged += 1;
  }

  if (middleBefore.length === 0 || middleAfter.length === 0) {
    for (let index = 0; index < middleBefore.length; index += 1) {
      lines.push({
        kind: 'removed',
        text: middleBefore[index],
        beforeLine: start + index + 1,
      });
      removed += 1;
    }
    for (let index = 0; index < middleAfter.length; index += 1) {
      lines.push({
        kind: 'added',
        text: middleAfter[index],
        afterLine: start + index + 1,
      });
      added += 1;
    }
  } else {
    const rows = middleBefore.length;
    const columns = middleAfter.length;
    // +1 for the zero row/column in the LCS table.
    const width = columns + 1;
    const table = new Uint32Array((rows + 1) * width);

    for (let row = rows - 1; row >= 0; row -= 1) {
      for (let column = columns - 1; column >= 0; column -= 1) {
        table[row * width + column] =
          middleBefore[row] === middleAfter[column]
            ? table[(row + 1) * width + column + 1] + 1
            : Math.max(
                table[(row + 1) * width + column],
                table[row * width + column + 1],
              );
      }
    }

    let row = 0;
    let column = 0;
    while (row < rows && column < columns) {
      if (middleBefore[row] === middleAfter[column]) {
        lines.push({
          kind: 'same',
          text: middleBefore[row],
          beforeLine: start + row + 1,
          afterLine: start + column + 1,
        });
        unchanged += 1;
        row += 1;
        column += 1;
      } else if (
        table[(row + 1) * width + column] >= table[row * width + column + 1]
      ) {
        lines.push({
          kind: 'removed',
          text: middleBefore[row],
          beforeLine: start + row + 1,
        });
        removed += 1;
        row += 1;
      } else {
        lines.push({
          kind: 'added',
          text: middleAfter[column],
          afterLine: start + column + 1,
        });
        added += 1;
        column += 1;
      }
    }

    while (row < rows) {
      lines.push({
        kind: 'removed',
        text: middleBefore[row],
        beforeLine: start + row + 1,
      });
      removed += 1;
      row += 1;
    }
    while (column < columns) {
      lines.push({
        kind: 'added',
        text: middleAfter[column],
        afterLine: start + column + 1,
      });
      added += 1;
      column += 1;
    }
  }

  for (let index = endBefore; index < beforeLines.length; index += 1) {
    lines.push({
      kind: 'same',
      text: beforeLines[index],
      beforeLine: index + 1,
      afterLine: endAfter + (index - endBefore) + 1,
    });
    unchanged += 1;
  }

  return { lines, added, removed, unchanged };
}
