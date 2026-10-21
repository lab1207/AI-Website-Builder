/**
 * Helpers for assembling the preview document and the files that ship with
 * an export.
 */

/** A tiny in-memory storage shim for previews. */
const STORAGE_SHIM = `<script>
(function () {
  try {
    // A sandboxed preview has an opaque origin, where localStorage throws.
    // Give the generated page a working, isolated store instead.
    var probe = window.localStorage;
    probe.setItem('__probe__', '1');
    probe.removeItem('__probe__');
  } catch (error) {
    var makeStore = function () {
      var data = {};
      return {
        getItem: function (key) {
          return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
        },
        setItem: function (key, value) { data[key] = String(value); },
        removeItem: function (key) { delete data[key]; },
        clear: function () { data = {}; },
        key: function (index) { return Object.keys(data)[index] ?? null; },
        get length() { return Object.keys(data).length; },
      };
    };
    try {
      Object.defineProperty(window, 'localStorage', { value: makeStore(), configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: makeStore(), configurable: true });
    } catch (ignored) {}
  }
})();
<\/script>`;

/**
 * Keeps multi-page navigation inside the preview frame.
 *
 * A relative link such as `about.html` cannot resolve inside a srcdoc iframe,
 * so the click is handed to the builder, which switches the rendered page.
 */
const NAVIGATION_BRIDGE = `<script>
(function () {
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return;
    if (!/\\.html?($|[?#])/i.test(href)) return;
    event.preventDefault();
    var page = href.split(/[?#]/)[0].replace(/^\\.\\//, '');
    parent.postMessage({ type: 'awb:preview-navigate', page: page }, '*');
  }, true);
})();
<\/script>`;

/**
 * Inlines the generated CSS and JS into one HTML page so the preview renders
 * as a single self-contained document.
 */
export function bundleHtml(
  files: Record<string, string>,
  entry = 'index.html',
): string {
  const html = files[entry];
  if (!html) return '';

  let content = html;

  for (const [filename, source] of Object.entries(files)) {
    if (!filename.endsWith('.css')) continue;

    const linkPattern = new RegExp(
      `<link[^>]+href=["'](?:\\./)?${escapeRegExp(filename)}["'][^>]*>`,
      'gi',
    );
    if (linkPattern.test(content)) {
      content = content.replace(linkPattern, `<style>${safeInline(source, 'style')}</style>`);
    } else if (!filename.endsWith('print.css')) {
      content = content.replace('</head>', `<style>${safeInline(source, 'style')}</style></head>`);
    }
  }

  for (const [filename, source] of Object.entries(files)) {
    if (!filename.endsWith('.js')) continue;

    const scriptPattern = new RegExp(
      `<script[^>]+src=["'](?:\\./)?${escapeRegExp(filename)}["'][^>]*>\\s*<\\/script>`,
      'gi',
    );
    if (scriptPattern.test(content)) {
      content = content.replace(
        scriptPattern,
        `<script>${safeInline(source, 'script')}</script>`,
      );
    } else {
      content = content.replace(
        '</body>',
        `<script>${safeInline(source, 'script')}</script></body>`,
      );
    }
  }

  return content;
}

/** Every HTML page in the project, in the order the preview should offer them. */
export function listPreviewPages(files: Record<string, string>): string[] {
  if ('preview.html' in files) return ['preview.html'];

  const pages = Object.keys(files).filter((name) => /\.html?$/i.test(name));
  return pages.sort((a, b) => {
    if (a === 'index.html') return -1;
    if (b === 'index.html') return 1;
    return a.localeCompare(b);
  });
}

/** The page the preview should open first. */
export function defaultPreviewPage(files: Record<string, string>): string {
  return listPreviewPages(files)[0] ?? '';
}

/** A short, human label for a page tab. */
export function pageLabel(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  const stem = base.replace(/\.html?$/i, '');
  if (stem === 'index') return 'Home';
  if (stem === 'preview') return 'Preview';
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * The document handed to the preview iframe.
 *
 * It is served through `srcdoc` inside a sandbox without `allow-same-origin`,
 * so generated code runs in an opaque origin and cannot reach the builder's
 * own window, storage, or API key.
 */
export function buildPreviewDocument(
  files: Record<string, string>,
  entry = 'index.html',
): string {
  const bundled = bundleHtml(files, entry);
  if (!bundled) return '';

  let document = bundled;

  // The shim has to run before any generated script touches storage.
  if (/<head[^>]*>/i.test(document)) {
    document = document.replace(/<head([^>]*)>/i, `<head$1>${STORAGE_SHIM}`);
  } else {
    document = `${STORAGE_SHIM}${document}`;
  }

  if (/<\/body>/i.test(document)) {
    document = document.replace(/<\/body>/i, `${NAVIGATION_BRIDGE}</body>`);
  } else {
    document = `${document}${NAVIGATION_BRIDGE}`;
  }

  return document;
}

/** Prevents generated code from closing its own inline tag. */
function safeInline(source: string, tag: 'script' | 'style'): string {
  if (tag === 'script') return source.replace(/<\/script/gi, '<\\/script');
  return source.replace(/<\/style/gi, '<\\/style');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
