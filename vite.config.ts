/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Fills the %SITE_URL% placeholders in index.html with the deployment URL.
 * Vercel, Netlify, and Cloudflare Pages all expose it, so the canonical and
 * social tags are correct without any manual setup.
 */
const siteUrlPlugin = (siteUrl: string) => ({
  name: 'site-url',
  transformIndexHtml(html: string) {
    return html.replaceAll('%SITE_URL%', siteUrl);
  },
});

/**
 * The canonical home of this project. Cloudflare Pages serves it at
 * ai-website-builder-7lq.pages.dev. Override with VITE_SITE_URL for a custom
 * domain.
 */
const DEFAULT_SITE_URL = 'https://ai-website-builder-7lq.pages.dev';

/**
 * Cloudflare preview deployments are served from https://<hash>.<project>.pages.dev.
 * Strip the hash label so canonical and social URLs always name the stable
 * production address instead of a throwaway preview subdomain.
 */
function productionUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const labels = parsed.hostname.split('.');
    if (parsed.hostname.endsWith('.pages.dev') && labels.length > 3) {
      parsed.hostname = labels.slice(1).join('.');
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return url.replace(/\/+$/, '');
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // A build-time key is optional. It is only useful for private self-hosted
  // deployments; a public deploy should let visitors paste their own key in
  // the app instead (see src/hooks/useApiKey.ts).
  const buildTimeKey = env.VITE_GEMINI_API_KEY || '';

  const inferredUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.URL || productionUrl(process.env.CF_PAGES_URL ?? '');
  const siteUrl = (env.VITE_SITE_URL || inferredUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');

  return {
    base: './',
    plugins: [react(), tailwindcss(), siteUrlPlugin(siteUrl)],
    define: {
      __BUILD_TIME_API_KEY__: JSON.stringify(buildTimeKey),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    preview: {
      port: 4173,
      host: true,
    },
    build: {
      target: 'es2022',
      sourcemap: false,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
