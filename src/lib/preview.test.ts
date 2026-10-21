import { describe, expect, it } from 'vitest';
import {
  bundleHtml,
  buildPreviewDocument,
  defaultPreviewPage,
  listPreviewPages,
  pageLabel,
} from './preview';

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

describe('preview pages', () => {
  it('lists index.html first, then other pages alphabetically', () => {
    const pages = listPreviewPages({
      'work.html': '',
      'index.html': '',
      'about.html': '',
      'contact.html': '',
    });

    expect(pages).toEqual(['index.html', 'about.html', 'contact.html', 'work.html']);
  });

  it('prefers a framework preview.html over source templates', () => {
    expect(
      listPreviewPages({
        'src/App.jsx': '',
        'about.html': '',
        'preview.html': '',
      }),
    ).toEqual(['preview.html']);
  });

  it('opens the first page that is available', () => {
    expect(defaultPreviewPage({ 'contact.html': '', 'index.html': '' })).toBe(
      'index.html',
    );
    expect(defaultPreviewPage({})).toBe('');
  });

  it('turns filenames into readable tabs', () => {
    expect(pageLabel('index.html')).toBe('Home');
    expect(pageLabel('preview.html')).toBe('Preview');
    expect(pageLabel('about-us.html')).toBe('About Us');
    expect(pageLabel('pages/work.html')).toBe('Work');
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

  it('can render a secondary page and keeps its shared styles', () => {
    const document = buildPreviewDocument(
      {
        'index.html': '<html><head><link rel="stylesheet" href="styles.css"></head><body>Home</body></html>',
        'about.html': '<html><head><link rel="stylesheet" href="styles.css"></head><body>About</body></html>',
        'styles.css': 'body { color: teal }',
      },
      'about.html',
    );

    expect(document).toContain('About');
    expect(document).not.toContain('Home');
    expect(document).toContain('<style>body { color: teal }</style>');
  });

  it('adds the navigation bridge that keeps multi-page links in the preview', () => {
    const document = buildPreviewDocument({
      'index.html': '<html><body><a href="about.html">About</a></body></html>',
    });

    expect(document).toContain('awb:preview-navigate');
    expect(document).toContain('parent.postMessage');
    expect(document).toContain('preventDefault');
  });

  it('escapes an inline script so generated code cannot close its own tag', () => {
    const bundled = bundleHtml({
      'index.html': '<html><body><script src="script.js"></script></body></html>',
      'script.js': 'document.body.innerHTML = "</script>";',
    });

    expect(bundled).toContain('<\\/script');
    expect(bundled).not.toContain('"</script>"');
  });
});
