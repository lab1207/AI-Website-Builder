import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

function read(file: string): string {
  return readFileSync(resolve(ROOT, file), 'utf8');
}

/** Pulls the Content-Security-Policy value out of whichever format the file uses. */
function extractCsp(source: string): string {
  const headerMatch = source.match(/Content-Security-Policy:\s*(.+)/);
  if (headerMatch) return headerMatch[1].trim();

  const tomlMatch = source.match(/Content-Security-Policy\s*=\s*"([^"]+)"/);
  if (tomlMatch) return tomlMatch[1].trim();

  const json = JSON.parse(read('vercel.json')) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>;
  };
  for (const entry of json.headers) {
    for (const header of entry.headers) {
      if (header.key === 'Content-Security-Policy') return header.value.trim();
    }
  }

  throw new Error('No Content-Security-Policy found');
}

describe('hosting configuration', () => {
  const csp = extractCsp(read('public/_headers'));

  it('sends the same policy from every host', () => {
    // A drifting copy means one host silently loses its headers, so the three
    // files are compared against each other.
    expect(extractCsp(read('netlify.toml'))).toBe(csp);
    expect(extractCsp(read('vercel.json'))).toBe(csp);
  });

  it('locks the app down', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('allows the AI providers the builder can call', () => {
    // Every host the UI can talk to is listed here, and `https:` covers a
    // custom OpenAI-compatible endpoint the visitor points at.
    const expected = [
      'https://generativelanguage.googleapis.com',
      'https://api.openai.com',
      'https://openrouter.ai',
      'https://integrate.api.nvidia.com',
      'https://api.anthropic.com',
    ];
    for (const host of expected) {
      expect(csp, `connect-src should allow ${host}`).toContain(host);
    }
    expect(csp).toContain("connect-src 'self'");
  });

  it('does not widen the rest of the policy', () => {
    // Adding providers must not silently loosen the other directives.
    expect(csp).not.toContain("default-src *");
    expect(csp).not.toContain("script-src *");
    expect(csp).not.toContain("connect-src *");
  });

  it('parses as a valid Netlify _headers file', () => {
    // Netlify treats "/*" as a path rule, so a /* */ comment at the top of the
    // file is read as an invalid header and fails the deploy. Every indented
    // line must therefore look like a header, and no block-comment
    // terminator may be left behind.
    const headers = read('public/_headers');
    const lines = headers.split('\n');

    let insideRule = false;

    for (const line of lines) {
      if (line.trim() === '') continue;

      if (/^\s/.test(line)) {
        expect(line, 'indented lines must be headers').toMatch(
          /^\s+[A-Za-z0-9-]+:\s*\S.*$/,
        );
        continue;
      }

      expect(line, 'unindented lines must be paths').toMatch(/^\/\S*$/);
      insideRule = true;
    }

    expect(insideRule).toBe(true);
    expect(headers).not.toMatch(/^\s*\*\/\s*$/m);
  });
});
