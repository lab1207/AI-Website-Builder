import { describe, expect, it } from 'vitest';
import { bundleHtml, buildPreviewDocument } from './preview';

describe('bundleHtml', () => {
  it('returns nothing without an index.html', () => {
    expect(bundleHtml({ 'styles.css': 'body{}' })).toBe('');
  });

  it('inlines a linked stylesheet', () => {
    const files = {
      'index.html': '<html><head><link rel="stylesheet" href="styles.css"></head><body></body></html>',
      'styles.css': 'body { color: red }',
    };

    const bundled = bundleHtml(files);

    expect(bundled).toContain('<style>body { color: red }</style>');
    expect(bundled).not.toContain('href="styles.css"');
  });

  it('inlines a stylesheet that is not linked', () => {
    const files = {
      'index.html': '<html><head></head><body></body></html>',
      'styles.css': 'body { color: blue }',
    };

    expect(bundleHtml(files)).toContain('<style>body { color: blue }</style>');
  });

  it('inlines a linked script', () => {
    const files = {
      'index.html': '<html><body><script src="script.js"></script></body></html>',
      'script.js': 'console.log("hi")',
    };

    const bundled = bundleHtml(files);

    expect(bundled).toContain('<script>console.log("hi")</script>');
    expect(bundled).not.toContain('src="script.js"');
  });

  it('inlines a script that is not linked', () => {
    const files = {
      'index.html': '<html><body></body></html>',
      'script.js': 'console.log("hi")',
    };

    expect(bundleHtml(files)).toContain('<script>console.log("hi")</script>');
  });

  it('leaves unrelated files alone', () => {
    const files = {
      'index.html': '<html><head></head><body></body></html>',
      'README.md': '# hello',
    };

    const bundled = bundleHtml(files);

    expect(bundled).not.toContain('# hello');
  });
});

describe('buildPreviewDocument', () => {
  it('adds a storage shim so the preview can use localStorage', () => {
    const document = buildPreviewDocument({
      'index.html': '<html><head></head><body></body></html>',
    });

    expect(document).toContain('localStorage');
    expect(document).toContain('<html>');
  });

  it('puts the shim in the head so it runs before any generated script', () => {
    const document = buildPreviewDocument({
      'index.html': '<html><head><title>Test</title></head><body></body></html>',
    });

    const shimIndex = document.indexOf('localStorage');
    const titleIndex = document.indexOf('<title>');

    expect(shimIndex).toBeGreaterThan(-1);
    expect(shimIndex).toBeLessThan(titleIndex);
  });

  it('returns nothing without an index.html', () => {
    expect(buildPreviewDocument({ 'styles.css': 'body{}' })).toBe('');
  });
});
