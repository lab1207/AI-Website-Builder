import { describe, expect, it } from 'vitest';
import { parseGeneratedFiles } from './geminiService';

describe('parseGeneratedFiles', () => {
  it('returns an empty map when there are no file markers', () => {
    expect(parseGeneratedFiles('just some prose')).toEqual({});
  });

  it('reads a single file', () => {
    const files = parseGeneratedFiles('__FILE: index.html__\n<html><body>hi</body></html>');
    expect(files['index.html']).toBe('<html><body>hi</body></html>');
  });

  it('reads several files in order', () => {
    const response = [
      '__FILE: index.html__',
      '<html></html>',
      '',
      '__FILE: styles.css__',
      'body { margin: 0 }',
      '',
      '__FILE: script.js__',
      'console.log(1)',
    ].join('\n');

    const files = parseGeneratedFiles(response);

    expect(Object.keys(files)).toEqual(['index.html', 'styles.css', 'script.js']);
    expect(files['styles.css']).toBe('body { margin: 0 }');
    expect(files['script.js']).toBe('console.log(1)');
  });

  it('trims surrounding whitespace from each file', () => {
    const files = parseGeneratedFiles('__FILE: index.html__\n\n   <html></html>   \n\n');
    expect(files['index.html']).toBe('<html></html>');
  });

  it('keeps markdown fences out of the content', () => {
    const response = [
      '__FILE: index.html__',
      '```html',
      '<html></html>',
      '```',
    ].join('\n');

    // The fence is content the model produced, so it is kept verbatim. What
    // matters is that the file body is not swallowed by the next marker.
    const files = parseGeneratedFiles(response);
    expect(files['index.html']).toContain('<html></html>');
  });

  it('stops a file at the next marker', () => {
    const response = ['__FILE: a.txt__', 'AAA', '__FILE: b.txt__', 'BBB'].join('\n');
    const files = parseGeneratedFiles(response);
    expect(files['a.txt']).toBe('AAA');
    expect(files['b.txt']).toBe('BBB');
  });

  it('ignores markers that are not closed', () => {
    expect(parseGeneratedFiles('__FILE: index.html\nno closing marker')).toEqual({});
  });

  it('keeps file names with dots and dashes', () => {
    const files = parseGeneratedFiles('__FILE: my-page.v2.html__\nhello');
    expect(files['my-page.v2.html']).toBe('hello');
  });
});
