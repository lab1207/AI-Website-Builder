import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/*
 * No API key ever gets saved in this repository.
 *
 * A key committed here is exposed to everyone who can see the repository and
 * stays in its history even after removal, so this test runs on every push
 * and fails the build the moment a key-shaped string appears in a tracked
 * file. GitHub's own secret scanning is a second layer; this one guarantees
 * the CI run itself turns red.
 */

const ROOT = join(__dirname, '..', '..');

/** Directories that are never part of the source. */
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  '.git',
  '.github',
  'coverage',
  'assets', // screenshots and logos are binary; nothing to scan
]);

/** Binary extensions a text scan cannot read meaningfully. */
const SKIPPED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.zip',
]);

/**
 * Key shapes for every provider the builder supports, plus the other tokens
 * the publish feature can carry (GitHub, Figma).
 *
 * Each pattern is tight enough to avoid ordinary strings: a real Gemini key
 * is `AIza` plus exactly 35 characters, OpenRouter keys carry `sk-or-`, and
 * so on. A bare `sk-` alone would flag half the internet, so providers that
 * share it are told apart by their longer prefixes below.
 */
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Google Gemini key', pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'Anthropic key', pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: 'OpenRouter key', pattern: /sk-or-v1-[A-Za-z0-9]{40,}|sk-or-[A-Za-z0-9-]{40,}/g },
  { name: 'NVIDIA key', pattern: /nvapi-[A-Za-z0-9_-]{20,}/g },
  { name: 'OpenAI key', pattern: /sk-proj-[A-Za-z0-9_-]{40,}|sk-[A-Za-z0-9]{40,}/g },
  { name: 'GitHub personal access token', pattern: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}/g },
  { name: 'Figma personal access token', pattern: /figd_[A-Za-z0-9_-]{20,}/g },
];

/**
 * Strings that are known test fixtures, not real credentials.
 *
 * Every entry here is a fake the test suite itself built. Anything matching a
 * SECRET_PATTERNS entry that is not on this list fails the build.
 */
const KNOWN_FAKE_STRINGS: string[] = [
  // The test suite composes fake keys at runtime, so no literal appears in
  // source. If a future fixture needs a literal, allowlist it here and keep
  // it obviously fake.
];

function pathFromRoot(path: string): string {
  return join(ROOT, path);
}

function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry)) continue;
      files.push(...listFiles(full));
      continue;
    }
    if (SKIPPED_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
    files.push(full);
  }
  return files;
}

function scanFile(path: string): Array<{ name: string; match: string }> {
  const content = readFileSync(path, 'utf8');
  const findings: Array<{ name: string; match: string }> = [];

  let scanned = content;
  for (const fake of KNOWN_FAKE_STRINGS) {
    scanned = scanned.split(fake).join('');
  }

  for (const { name, pattern } of SECRET_PATTERNS) {
    const matches = scanned.match(pattern);
    if (matches) {
      for (const match of matches) findings.push({ name, match });
    }
  }
  return findings;
}

describe('no API keys in the repository', () => {
  it('keeps every tracked file free of key-shaped strings', () => {
    const files = listFiles(ROOT);
    const problems: string[] = [];

    for (const file of files) {
      const relative = file.slice(ROOT.length + 1);
      for (const finding of scanFile(file)) {
        problems.push(
          `${relative}: ${finding.name} matching "${finding.match.slice(0, 12)}…"`,
        );
      }
    }

    expect(
      problems,
      `Found credential-shaped strings in the repository:\n${problems.join('\n')}`,
    ).toEqual([]);
  });

  it('scans the files that matter', () => {
    // Guard the guard: if the walk somehow returns nothing, the test above
    // would pass vacuously. The repository must yield real source files.
    const files = listFiles(ROOT)
      .map((file) => file.slice(ROOT.length + 1))
      .filter((file) => file.startsWith('src'));
    expect(files.length).toBeGreaterThan(10);
    expect(files).toContain(join('src', 'App.tsx'));
  });

  it('never embeds a build-time key into committed source', () => {
    // The build-time key arrives through the environment, so the literal
    // must only ever exist in vite.config.ts as a reference to the variable.
    const config = readFileSync(pathFromRoot('vite.config.ts'), 'utf8');
    expect(config).toContain('env.VITE_GEMINI_API_KEY');
    // No default value in source: an assigned default would be a key.
    expect(config).not.toMatch(/VITE_GEMINI_API_KEY\s*=\s*['"][^'"]{10,}['"]/);
  });

  it('ignores local env files in git', () => {
    const gitignore = readFileSync(pathFromRoot('.gitignore'), 'utf8');
    expect(gitignore).toMatch(/\.env\b/m);
    expect(gitignore).toMatch(/\.env\.\*/m);
  });
});
