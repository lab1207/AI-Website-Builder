import { describe, expect, it } from 'vitest';
import {
  countLines,
  describeVersion,
  diffFiles,
  diffLines,
} from './versionHistory';

describe('diffLines', () => {
  it('returns every line as unchanged when nothing moved', () => {
    const diff = diffLines('one\ntwo\nthree', 'one\ntwo\nthree');

    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(0);
    expect(diff.unchanged).toBe(3);
    expect(diff.lines.map((line) => line.kind)).toEqual(['same', 'same', 'same']);
  });

  it('marks an inserted line and keeps the line numbers on each side', () => {
    const diff = diffLines('one\nthree', 'one\ntwo\nthree');

    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(0);
    expect(diff.lines).toEqual([
      { kind: 'same', text: 'one', beforeLine: 1, afterLine: 1 },
      { kind: 'added', text: 'two', afterLine: 2 },
      { kind: 'same', text: 'three', beforeLine: 2, afterLine: 3 },
    ]);
  });

  it('marks a deleted line', () => {
    const diff = diffLines('one\ntwo\nthree', 'one\nthree');

    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(1);
    expect(diff.lines).toContainEqual({
      kind: 'removed',
      text: 'two',
      beforeLine: 2,
    });
    expect(diff.lines.at(-1)).toEqual({
      kind: 'same',
      text: 'three',
      beforeLine: 3,
      afterLine: 2,
    });
  });

  it('shows an edit as a removal followed by an addition', () => {
    const diff = diffLines('color: red', 'color: blue');

    expect(diff.lines).toEqual([
      { kind: 'removed', text: 'color: red', beforeLine: 1 },
      { kind: 'added', text: 'color: blue', afterLine: 1 },
    ]);
    expect(diff.unchanged).toBe(0);
  });

  it('handles empty files without inventing a blank line', () => {
    expect(diffLines('', '')).toEqual({
      lines: [],
      added: 0,
      removed: 0,
      unchanged: 0,
    });

    const added = diffLines('', 'hello');
    expect(added.lines).toEqual([{ kind: 'added', text: 'hello', afterLine: 1 }]);
  });

  it('counts a trailing newline as an empty final line', () => {
    expect(countLines('one\ntwo\n')).toBe(3);
    expect(countLines('')).toBe(0);
  });
});

describe('diffFiles', () => {
  it('sorts added, removed, and changed files by name', () => {
    const changes = diffFiles(
      { 'index.html': 'old', 'styles.css': 'body{}', 'old.js': 'x' },
      { 'index.html': 'new', 'styles.css': 'body{}', 'app.js': 'y' },
    );

    expect(changes).toEqual([
      { name: 'app.js', kind: 'added' },
      { name: 'index.html', kind: 'changed' },
      { name: 'old.js', kind: 'removed' },
    ]);
  });
});

describe('describeVersion', () => {
  it('uses an explicit label first', () => {
    expect(describeVersion('Coffee shop', 'anything')).toBe('Coffee shop');
  });

  it('falls back to a trimmed prompt', () => {
    expect(describeVersion('', '  A portfolio for a photographer  ')).toBe(
      'A portfolio for a photographer',
    );
  });

  it('truncates a long prompt', () => {
    const label = describeVersion('', 'x'.repeat(80));
    expect(label).toBe(`${'x'.repeat(60)}…`);
  });

  it('has a final fallback', () => {
    expect(describeVersion('', '   ')).toBe('Version');
  });
});
