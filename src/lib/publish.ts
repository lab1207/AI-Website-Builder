import type { FileMap } from '../types';

/*
 * Publishing integrations.
 *
 * Everything here talks to a public API using a token the visitor supplies.
 * No token is ever stored on our servers, because there are no servers.
 */

export interface PublishResult {
  ok: boolean;
  message: string;
  url?: string;
}

function headers(token: string, extra: Record<string, string> = {}) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'AI-Website-Builder',
    ...extra,
  };
}

export interface GitHubPublishOptions {
  /** A website is meant to be public; Pages on a free account requires it. */
  makePublic?: boolean;
  /** Adds a CNAME file and attempts to attach the domain to Pages. */
  customDomain?: string;
  /** Set to false to push without touching the Pages configuration. */
  enablePages?: boolean;
}

interface RepoInfo {
  default_branch?: string;
  private?: boolean;
  html_url?: string;
}

function apiError(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { message?: string };
    if (parsed.message) return parsed.message.slice(0, 180);
  } catch {
    // Not JSON; fall through to the raw slice.
  }
  return detail.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}

/**
 * Creates (or updates) a repository, commits every file, and asks GitHub
 * Pages to serve it.
 *
 * The Git data API needs three steps — tree, commit, ref update. Creating the
 * tree alone, which an earlier version did, leaves the repository unchanged.
 */
export async function publishToGitHub(
  token: string,
  owner: string,
  repo: string,
  inputFiles: FileMap,
  options: GitHubPublishOptions = {},
): Promise<PublishResult> {
  if (!token) return { ok: false, message: 'Add a GitHub token first.' };
  if (!owner || !repo) return { ok: false, message: 'Enter an owner and a repository name.' };

  const repoName = repo.trim();
  const domain = options.customDomain?.trim().toLowerCase() ?? '';
  const files: FileMap = { ...inputFiles };

  if (domain) {
    // GitHub Pages reads this file directly from the root of the branch.
    files['CNAME'] = `${domain}\n`;
  }
  if (!('.nojekyll' in files)) {
    // Jekyll would otherwise ignore files and folders that start with an
    // underscore, which is common in component-based builds.
    files['.nojekyll'] = '\n';
  }

  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;

  try {
    let repoInfo: RepoInfo | null = null;

    const existing = await fetch(base, { headers: headers(token) });
    if (existing.status === 404) {
      const created = await fetch(base, {
        method: 'POST',
        headers: headers(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: repoName,
          private: options.makePublic === false,
          auto_init: true,
          description: 'Built with AI Website Builder',
          ...(domain ? { homepage: `https://${domain}` } : {}),
        }),
      });

      if (!created.ok) {
        return {
          ok: false,
          message: `Could not create the repository (${created.status}). ${apiError(
            await created.text(),
          )}`,
        };
      }
      repoInfo = (await created.json()) as RepoInfo;
    } else if (!existing.ok) {
      return {
        ok: false,
        message:
          existing.status === 401
            ? 'GitHub rejected that token. Create a new token with the repo scope.'
            : `Cannot reach that repository (${existing.status}). ${apiError(
                await existing.text(),
              )}`,
      };
    } else {
      repoInfo = (await existing.json()) as RepoInfo;
    }

    const branch = repoInfo?.default_branch || 'main';

    // Find the parent commit, if the branch exists yet.
    let parentSha: string | null = null;
    const refResponse = await fetch(`${base}/git/ref/heads/${branch}`, {
      headers: headers(token),
    });
    if (refResponse.ok) {
      const ref = (await refResponse.json()) as { object?: { sha?: string } };
      parentSha = ref.object?.sha ?? null;
    } else if (refResponse.status !== 404) {
      return {
        ok: false,
        message: `Could not read the branch (${refResponse.status}). ${apiError(
          await refResponse.text(),
        )}`,
      };
    }

    // 1. The tree: every generated file, as blobs.
    const treeResponse = await fetch(`${base}/git/trees`, {
      method: 'POST',
      headers: headers(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        tree: Object.entries(files).map(([path, content]) => ({
          path,
          mode: '100644',
          type: 'blob',
          content,
        })),
      }),
    });

    if (!treeResponse.ok) {
      return {
        ok: false,
        message: `Could not write the files (${treeResponse.status}). ${apiError(
          await treeResponse.text(),
        )}`,
      };
    }
    const tree = (await treeResponse.json()) as { sha?: string };
    if (!tree.sha) return { ok: false, message: 'GitHub returned no tree for the commit.' };

    // 2. The commit that points at the tree.
    const commitResponse = await fetch(`${base}/git/commits`, {
      method: 'POST',
      headers: headers(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: 'Build with AI Website Builder',
        tree: tree.sha,
        parents: parentSha ? [parentSha] : [],
      }),
    });

    if (!commitResponse.ok) {
      return {
        ok: false,
        message: `Could not create the commit (${commitResponse.status}). ${apiError(
          await commitResponse.text(),
        )}`,
      };
    }
    const commit = (await commitResponse.json()) as { sha?: string };
    if (!commit.sha) return { ok: false, message: 'GitHub returned no commit.' };

    // 3. Move the branch. An empty repository needs the ref created instead.
    if (parentSha) {
      const update = await fetch(`${base}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers: headers(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      if (!update.ok) {
        return {
          ok: false,
          message: `Could not update ${branch} (${update.status}). ${apiError(
            await update.text(),
          )}`,
        };
      }
    } else {
      const createRef = await fetch(`${base}/git/refs`, {
        method: 'POST',
        headers: headers(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
      });
      if (!createRef.ok) {
        return {
          ok: false,
          message: `Could not create the branch (${createRef.status}). ${apiError(
            await createRef.text(),
          )}`,
        };
      }
    }

    const count = Object.keys(files).length;
    const repoUrl = repoInfo?.html_url ?? `https://github.com/${owner}/${repoName}`;
    let pagesEnabled = false;
    let pagesUrl = '';

    // Pages is best-effort: a token without the right scope, a private repo on
    // a free plan, or an org policy can all say no. The push still succeeded.
    if (options.enablePages !== false) {
      try {
        const pagesResponse = await fetch(`${base}/pages`, {
          method: 'POST',
          headers: headers(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ source: { branch, path: '/' } }),
        });

        pagesEnabled = pagesResponse.ok || pagesResponse.status === 409;
        if (!pagesEnabled) {
          // 422/404 usually means Pages already exists or is unavailable.
          const current = await fetch(`${base}/pages`, { headers: headers(token) });
          pagesEnabled = current.ok;
        }

        if (pagesEnabled && domain) {
          await fetch(`${base}/pages`, {
            method: 'PUT',
            headers: headers(token, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ cname: domain, https_enforced: true }),
          });
        }

        const published = await fetch(`${base}/pages`, { headers: headers(token) });
        if (published.ok) {
          const payload = (await published.json()) as { html_url?: string };
          pagesUrl =
            payload.html_url ??
            (domain
              ? `https://${domain}`
              : owner.toLowerCase() === `${repoName.toLowerCase()}.github.io`
                ? `https://${owner.toLowerCase()}.github.io/`
                : `https://${owner.toLowerCase()}.github.io/${repoName}/`);
        }
      } catch {
        pagesEnabled = false;
      }
    }

    if (pagesEnabled) {
      return {
        ok: true,
        message: domain
          ? `Pushed ${count} files and attached ${domain}. Pages is building — DNS can take a little while.`
          : `Pushed ${count} files. GitHub Pages is building the site now.`,
        url: pagesUrl || repoUrl,
      };
    }

    return {
      ok: true,
      message: `Pushed ${count} files to ${owner}/${repoName}. To make it live, enable Pages in the repository settings (Branch: ${branch}, folder: /).`,
      url: repoUrl,
    };
  } catch (error) {
    return { ok: false, message: `Network error: ${(error as Error).message}` };
  }
}

export interface VercelProjectInput {
  token: string;
  name: string;
  files: FileMap;
}

/**
 * Deploys a static site to Vercel.
 *
 * The files are uploaded as a deployment, then the deployment is promoted to
 * production, which gives a shareable URL.
 */
export async function deployToVercel({
  token,
  name,
  files,
}: VercelProjectInput): Promise<PublishResult> {
  if (!token) return { ok: false, message: 'Add a Vercel token first.' };
  if (!name) return { ok: false, message: 'Give the project a name.' };

  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'site';
  const form = new FormData();

  for (const [path, content] of Object.entries(files)) {
    form.append('files', new Blob([content]), path);
  }
  form.append('name', safeName);
  form.append('project', safeName);
  form.append('target', 'production');
  // A static site needs no build step.
  form.append('public', 'true');

  try {
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        ok: false,
        message: `Vercel rejected the deployment (${response.status}). ${detail.slice(0, 160)}`,
      };
    }

    const payload = (await response.json()) as { url?: string; alias?: string };
    const url = payload.url ? `https://${payload.url}` : undefined;

    return {
      ok: true,
      message: 'Deployed to Vercel.',
      url,
    };
  } catch (error) {
    return { ok: false, message: `Network error: ${(error as Error).message}` };
  }
}

export interface FigmaFrame {
  id: string;
  name: string;
  /** A rendered PNG of the frame, as a data URL. */
  image: string;
}

export interface FigmaImportResult {
  ok: boolean;
  message: string;
  frames: FigmaFrame[];
  /** The document name, for the chat context. */
  documentName?: string;
}

/**
 * Reads the top level frames of a Figma file and renders each one as a PNG.
 *
 * The frames are returned as images so they can be attached to the next
 * prompt, which is exactly how a screenshot reference works.
 */
export async function importFigmaFile(
  token: string,
  fileKey: string,
): Promise<FigmaImportResult> {
  if (!token) return { ok: false, message: 'Add a Figma token first.', frames: [] };
  if (!fileKey) return { ok: false, message: 'Enter a Figma file key.', frames: [] };

  const url = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}?depth=2`;

  try {
    const response = await fetch(url, { headers: { 'X-Figma-Token': token } });
    if (!response.ok) {
      return {
        ok: false,
        message: `Figma returned ${response.status}. Check the token and the file key.`,
        frames: [],
      };
    }

    const file = (await response.json()) as {
      name?: string;
      document?: { children?: Array<{ id: string; name: string; type: string }> };
    };

    const topFrames = (file.document?.children ?? []).filter(
      (node) => node.type === 'FRAME' || node.type === 'COMPONENT',
    );

    if (topFrames.length === 0) {
      return {
        ok: false,
        message: 'No frames found in that file.',
        frames: [],
        documentName: file.name,
      };
    }

    // Render each frame to a PNG.
    const ids = topFrames.map((frame) => frame.id).join(',');
    const imageResponse = await fetch(
      `https://api.figma.com/v1/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(ids)}&format=png&scale=1`,
      { headers: { 'X-Figma-Token': token } },
    );

    if (!imageResponse.ok) {
      return {
        ok: false,
        message: `Figma returned ${imageResponse.status} while rendering the frames.`,
        frames: [],
        documentName: file.name,
      };
    }

    const images = (await imageResponse.json()) as { images?: Record<string, string | null> };

    const frames: FigmaFrame[] = [];
    for (const frame of topFrames) {
      const imageUrl = images.images?.[frame.id];
      if (!imageUrl) continue;
      try {
        const png = await fetch(imageUrl);
        const blob = await png.blob();
        const dataUrl = await blobToDataUrl(blob);
        frames.push({ id: frame.id, name: frame.name, image: dataUrl });
      } catch {
        // Skip a frame that will not render rather than failing the import.
      }
    }

    if (frames.length === 0) {
      return {
        ok: false,
        message: 'Figma returned no images for those frames.',
        frames: [],
        documentName: file.name,
      };
    }

    return {
      ok: true,
      message: `Imported ${frames.length} frame${frames.length === 1 ? '' : 's'} from ${file.name ?? 'the file'}.`,
      frames,
      documentName: file.name,
    };
  } catch (error) {
    return { ok: false, message: `Network error: ${(error as Error).message}`, frames: [] };
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
