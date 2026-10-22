import { describe, expect, it } from 'vitest';
import {
  listGeneratedFiles,
  parseFollowUps,
  parseGeneratedFiles,
  preFileText,
  stripMetaBlocks,
} from './generation';

describe('parseGeneratedFiles', () => {
  it('reads nested paths, spaces, and underscores', () => {
    const response = [
      'Here is the site.',
      '__FILE: index.html__',
      '<h1>Hello</h1>',
      '__FILE: src/components/Hero Section.jsx__',
      'export const Hero = () => null;',
      '__FILE: assets/my_notes.md__',
      '# Notes',
    ].join('\n');

    expect(parseGeneratedFiles(response)).toEqual({
      'index.html': '<h1>Hello</h1>',
      'src/components/Hero Section.jsx': 'export const Hero = () => null;',
      'assets/my_notes.md': '# Notes',
    });
  });

  it('stops the last file before a __NEXT line', () => {
    const response = [
      '__FILE: index.html__',
      '<h1>Hi</h1>',
      '__NEXT: Add a pricing section? | Improve mobile spacing?',
    ].join('\n');

    expect(parseGeneratedFiles(response)['index.html']).toBe('<h1>Hi</h1>');
  });

  it('ignores markers with no content instead of writing empty files', () => {
    const response = '__FILE: empty.css__\n\n__FILE: real.css__\nbody { margin: 0 }';
    expect(parseGeneratedFiles(response)).toEqual({ 'real.css': 'body { margin: 0 }' });
  });

  it('normalizes backslashes and leading dot-slash', () => {
    const response = '__FILE: .\\src\\App.jsx__\nconst App = () => null;';
    expect(parseGeneratedFiles(response)).toEqual({
      'src/App.jsx': 'const App = () => null;',
    });
  });
});

describe('listGeneratedFiles', () => {
  it('lists unique names in order', () => {
    const response = '__FILE: index.html__\na\n__FILE: index.html__\nb\n__FILE: styles.css__\nc';
    expect(listGeneratedFiles(response)).toEqual(['index.html', 'styles.css']);
  });
});

describe('parseFollowUps', () => {
  it('splits up to three suggestions', () => {
    expect(parseFollowUps('Done.\n__NEXT: A? | B? | C? | D?')).toEqual(['A?', 'B?', 'C?']);
  });

  it('returns an empty list when there is no marker', () => {
    expect(parseFollowUps('A normal answer.')).toEqual([]);
  });
});

describe('preFileText / stripMetaBlocks', () => {
  it('shows only the prose before the first file', () => {
    const response = 'I rebuilt the hero.\n\n__FILE: index.html__\n<h1>x</h1>';
    expect(preFileText(response)).toBe('I rebuilt the hero.');
  });

  it('removes __NEXT lines from plain-text replies', () => {
    const response = 'Ask me which palette you prefer.\n__NEXT: Warm or cool?';
    expect(stripMetaBlocks(response)).toBe('Ask me which palette you prefer.');
  });
});
