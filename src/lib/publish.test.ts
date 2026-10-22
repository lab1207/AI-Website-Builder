import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishToGitHub } from './publish';

interface CapturedTreeEntry {
  path: string;
  content: string;
}

function githubMock(onTree: (tree: CapturedTreeEntry[]) => void) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url === 'https://api.github.com/repos/owner/repo' && method === 'GET') {
      return new Response('Not found', { status: 404 });
    }
    if (url === 'https://api.github.com/repos/owner/repo' && method === 'POST') {
      return new Response(JSON.stringify({ default_branch: 'main', html_url: 'https://github.com/owner/repo' }), {
        status: 201,
      });
    }
    if (url.includes('/git/ref/heads/main') && method === 'GET') {
      return new Response('Not found', { status: 404 });
    }
    if (url.endsWith('/git/trees') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { tree: CapturedTreeEntry[] };
      onTree(body.tree);
      return new Response(JSON.stringify({ sha: 'tree-sha' }), { status: 201 });
    }
    if (url.endsWith('/git/commits') && method === 'POST') {
      return new Response(JSON.stringify({ sha: 'commit-sha' }), { status: 201 });
    }
    if (url.endsWith('/git/refs') && method === 'POST') {
      return new Response(JSON.stringify({ ref: 'refs/heads/main' }), { status: 201 });
    }
    if (url.endsWith('/pages') && method === 'POST') {
      return new Response('{}', { status: 201 });
    }
    if (url.endsWith('/pages') && method === 'GET') {
      return new Response(JSON.stringify({ html_url: 'https://owner.github.io/repo/' }), {
        status: 200,
      });
    }
    return new Response('{}', { status: 200 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('publishToGitHub with a Cloudflare workflow', () => {
  it('commits a static-project workflow that deploys the repository root', async () => {
    let tree: CapturedTreeEntry[] = [];
    vi.stubGlobal('fetch', githubMock((entries) => (tree = entries)));

    const result = await publishToGitHub('token', 'owner', 'repo', {
      'index.html': '<h1>Hi</h1>',
    }, { cloudflareProject: 'My Site' });

    expect(result.ok).toBe(true);
    expect(result.message).toContain('CLOUDFLARE_API_TOKEN');

    const workflow = tree.find((entry) => entry.path === '.github/workflows/cloudflare-pages.yml');
    expect(workflow).toBeDefined();
    expect(workflow?.content).toContain('pages deploy . --project-name=my-site');
    expect(workflow?.content).toContain('cloudflare/wrangler-action@v4');
  });

  it('builds and deploys dist for a framework project', async () => {
    let tree: CapturedTreeEntry[] = [];
    vi.stubGlobal('fetch', githubMock((entries) => (tree = entries)));

    await publishToGitHub('token', 'owner', 'repo', {
      'index.html': '<div id="root"></div>',
      'package.json': JSON.stringify({ scripts: { build: 'vite build' } }),
    }, { cloudflareProject: 'framework-site' });

    const workflow = tree.find((entry) => entry.path === '.github/workflows/cloudflare-pages.yml');
    expect(workflow?.content).toContain('run: npm ci');
    expect(workflow?.content).toContain('pages deploy dist --project-name=framework-site');
  });

  it('leaves the workflow out when no Cloudflare project is requested', async () => {
    let tree: CapturedTreeEntry[] = [];
    vi.stubGlobal('fetch', githubMock((entries) => (tree = entries)));

    await publishToGitHub('token', 'owner', 'repo', { 'index.html': '<h1>Hi</h1>' });

    expect(tree.find((entry) => entry.path === '.github/workflows/cloudflare-pages.yml')).toBeUndefined();
  });
});
