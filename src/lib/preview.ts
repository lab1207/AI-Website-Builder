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
 * Inlines the generated CSS and JS into the HTML so the preview renders as a
 * single self-contained document.
 */
export function bundleHtml(files: Record<string, string>): string {
  const html = files['index.html'];
  if (!html) return '';

  let content = html;

  for (const [filename, source] of Object.entries(files)) {
    if (!filename.endsWith('.css')) continue;

    const linkPattern = new RegExp(
      `<link[^>]+href=["']${escapeRegExp(filename)}["'][^>]*>`,
      'gi',
    );
    if (linkPattern.test(content)) {
      content = content.replace(linkPattern, `<style>${source}</style>`);
    } else {
      content = content.replace('</head>', `<style>${source}</style></head>`);
    }
  }

  for (const [filename, source] of Object.entries(files)) {
    if (!filename.endsWith('.js')) continue;

    const scriptPattern = new RegExp(
      `<script[^>]+src=["']${escapeRegExp(filename)}["'][^>]*>\\s*<\\/script>`,
      'gi',
    );
    if (scriptPattern.test(content)) {
      content = content.replace(scriptPattern, `<script>${source}</script>`);
    } else {
      content = content.replace('</body>', `<script>${source}</script></body>`);
    }
  }

  return content;
}

/**
 * The document handed to the preview iframe.
 *
 * It is served through `srcdoc` inside a sandbox without `allow-same-origin`,
 * so generated code runs in an opaque origin and cannot reach the builder's
 * own window, storage, or API key.
 */
export function buildPreviewDocument(files: Record<string, string>): string {
  const bundled = bundleHtml(files);
  if (!bundled) return '';

  // The shim has to run before any generated script touches storage.
  if (/<head[^>]*>/i.test(bundled)) {
    return bundled.replace(/<head([^>]*)>/i, `<head$1>${STORAGE_SHIM}`);
  }
  return `${STORAGE_SHIM}${bundled}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
