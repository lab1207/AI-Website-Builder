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

/**
 * Creates a repository and pushes every file to it.
 */
export async function publishToGitHub(
  token: string,
  owner: string,
  repo: string,
  files: FileMap,
): Promise<PublishResult> {
  if (!token) return { ok: false, message: 'Add a GitHub token first.' };
  if (!owner || !repo) return { ok: false, message: 'Enter an owner and a repository name.' };

  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  try {
    // Does the repository already exist?
    const existing = await fetch(base, { headers: headers(token) });
    if (existing.status === 404) {
      const created = await fetch(base, {
        method: 'POST',
        headers: headers(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: repo, private: true, auto_init: true }),
      });
      if (!created.ok) {
        const detail = await created.text();
        return {
          ok: false,
          message: `Could not create the repository (${created.status}). ${detail.slice(0, 160)}`,
        };
      }
    } else if (!existing.ok) {
      return { ok: false, message: `Cannot reach that repository (${existing.status}).` };
    }

    // The branch the files land on.
    const branchRes = await fetch(`${base}/branches/main`, { headers: headers(token) });
    let branch = 'main';
    if (branchRes.status === 404) {
      const repoRes = await fetch(base, { headers: headers(token) });
      const repo = (await repoRes.json()) as { default_branch?: string };
      branch = repo.default_branch ?? 'main';
    }

    // A tree entry per file.
    const tree = Object.entries(files).map(([path, content]) => ({
      path,
      mode: '100644',
      type: 'blob',
      content,
    }));

    const commit = await fetch(`${base}/git/trees`, {
      method: 'POST',
      headers: headers(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ branch, tree }),
    });

    if (!commit.ok) {
      const detail = await commit.text();
      return {
        ok: false,
        message: `Could not write the files (${commit.status}). ${detail.slice(0, 160)}`,
      };
    }

    return {
      ok: true,
      message: `Pushed ${Object.keys(files).length} files to ${owner}/${repo}.`,
      url: `https://github.com/${owner}/${repo}`,
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
