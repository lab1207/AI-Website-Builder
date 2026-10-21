import { describe, expect, it } from 'vitest';
import {
  cnameFile,
  domainGuide,
  githubPagesHost,
  isValidDomain,
  normalizeDomain,
} from './domains';

describe('normalizeDomain', () => {
  it('accepts the forms people paste', () => {
    expect(normalizeDomain('https://www.Example.com/about?ref=readme')).toBe('example.com');
    expect(normalizeDomain('HTTP://studio.example.co.uk/')).toBe('studio.example.co.uk');
    expect(normalizeDomain('www.example.com.')).toBe('example.com');
    expect(normalizeDomain('  EXAMPLE.COM  ')).toBe('example.com');
  });

  it('rejects an empty value or something that is not a hostname', () => {
    expect(normalizeDomain('')).toBeNull();
    expect(normalizeDomain('http://localhost:3000')).toBeNull();
    expect(normalizeDomain('not a domain')).toBeNull();
    expect(normalizeDomain('example')).toBeNull();
    expect(normalizeDomain('example.123')).toBeNull();
    expect(normalizeDomain('-bad.example.com')).toBeNull();
  });

  it('enforces the DNS label length limits', () => {
    const longLabel = 'a'.repeat(64);
    expect(isValidDomain(`${longLabel}.com`)).toBe(false);
    expect(isValidDomain(`${'a'.repeat(63)}.com`)).toBe(true);
    expect(isValidDomain(`${'a'.repeat(250)}.com`)).toBe(false);
  });
});

describe('githubPagesHost', () => {
  it('builds the project-site host GitHub serves', () => {
    expect(githubPagesHost('Lab1207', 'AI-Website-Builder')).toBe(
      'lab1207.github.io/AI-Website-Builder',
    );
  });
});

describe('domainGuide', () => {
  it('ships the four apex A records and an owner-aware CNAME for GitHub Pages', () => {
    const guide = domainGuide('studio.example.com', 'github', { githubOwner: 'Lab1207' });

    expect(guide.target).toBe('github');
    expect(guide.records.filter((record) => record.type === 'A')).toHaveLength(4);
    expect(guide.records.at(-1)).toMatchObject({
      type: 'CNAME',
      name: 'www',
      value: 'lab1207.github.io',
    });
    expect(guide.notes.join(' ')).toContain('CNAME file');
    expect(guide.docsUrl).toMatch(/^https:\/\/docs\.github\.com\//);
  });

  it('falls back to a placeholder owner rather than inventing one', () => {
    const guide = domainGuide('studio.example.com', 'github');
    expect(guide.records.at(-1)?.value).toBe('your-username.github.io');
  });

  it('returns targeted records for each supported host', () => {
    const vercel = domainGuide('studio.example.com', 'vercel');
    expect(vercel.label).toBe('Vercel');
    expect(vercel.records.some((record) => record.value === 'cname.vercel-dns.com')).toBe(true);

    const netlify = domainGuide('studio.example.com', 'netlify');
    expect(netlify.label).toBe('Netlify');
    expect(netlify.records.some((record) => record.type === 'ALIAS')).toBe(true);

    const cloudflare = domainGuide('studio.example.com', 'cloudflare');
    expect(cloudflare.label).toBe('Cloudflare Pages');
    expect(cloudflare.records.every((record) => record.type === 'CNAME')).toBe(true);
  });

  it('writes a CNAME file with a trailing newline', () => {
    expect(cnameFile('studio.example.com')).toBe('studio.example.com\n');
  });
});
