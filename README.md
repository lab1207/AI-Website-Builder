<div align="center">

<a href="https://lab1207.github.io/AI-Website-Builder/">
  <img src="assets/logo.svg" width="620" alt="AI Website Builder" />
</a>

### The prompt-to-website studio that stays in your browser.

Describe it. Watch it become a real website. Refine it by pointing, version every move,<br />
and publish without leaving the tab.

<p>
  <a href="https://lab1207.github.io/AI-Website-Builder/"><strong>Start building →</strong></a>
  &nbsp;·&nbsp;
  <a href="CHANGELOG.md">Release notes</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/lab1207/AI-Website-Builder/issues">Report an issue</a>
</p>

<p>
  <a href="https://github.com/lab1207/AI-Website-Builder/actions/workflows/ci.yml">
    <img src="https://github.com/lab1207/AI-Website-Builder/actions/workflows/ci.yml/badge.svg" alt="CI status" />
  </a>
  <img src="https://img.shields.io/github/v/release/lab1207/AI-Website-Builder?style=flat-square&color=7257FF&label=release" alt="Latest release" />
  <img src="https://img.shields.io/github/license/lab1207/AI-Website-Builder?style=flat-square&color=E94F22" alt="GPL-3.0-or-later" />
  <img src="https://img.shields.io/github/stars/lab1207/AI-Website-Builder?style=flat-square&color=FF3D81" alt="GitHub stars" />
</p>

</div>

<a href="https://lab1207.github.io/AI-Website-Builder/">
  <img src="assets/screenshot-landing.webp" width="100%" alt="The AI Website Builder landing page: 'Describe it. Watch it become a real website.'" />
</a>

<p align="center"><sub><em>The landing page, at 1440px. Open source, bring your own key, no account.</em></sub></p>

---

## 01 · The short version

Most AI site builders stop at a chat transcript. This one keeps going.

You describe the site. The model returns complete files. The studio turns those files into a live, clickable preview, lets you point at the part that feels wrong, and keeps every version on the way. When it is ready, export it, push it to GitHub, deploy it to Vercel, or generate the DNS records for your own domain.

> **A real website is a set of files you can click through, edit, version, export, and host anywhere.**
> That is what this builds — not a mockup, and not a lock-in.

| The build | The finish |
| :--- | :--- |
| Six AI provider options, including any OpenAI-compatible endpoint | ZIP of the full source, or one self-contained HTML file |
| HTML/CSS/JS, React, Vue 3, and Next.js projects | GitHub publishing with commits and best-effort Pages setup |
| Single-page or linked multi-page sites | One-click Vercel deployment |
| Live preview on desktop, tablet, and phone widths | DNS records and a `CNAME` file for four hosts |
| Point-and-edit, chat edits, code view, and asset view | Version history with line diffs and one-click restore |
| Screenshot paste and project import | Light and dark themes, remembered locally |

<a href="https://lab1207.github.io/AI-Website-Builder/">
  <img src="assets/screenshot-workspace.webp" width="100%" alt="A multi-page restaurant site in the studio: file log, Home/About/Contact preview tabs, live preview, model picker, and export controls." />
</a>

<p align="center"><sub><em>A five-file, three-page project: live preview tabs, model controls, and export in one workspace.</em></sub></p>

## 02 · What a build actually includes

### The whole site, not a single screen

Vanilla projects can be **single-page or multi-page**. In multi-page mode the model is instructed to write real pages, link them together, and share the stylesheet and scripts. The preview notices those pages, gives each one a tab, and intercepts links inside the iframe so navigation stays in the preview instead of escaping it.

### Framework previews without a local build

Choose React, Vue 3, or Next.js and the export is a runnable Vite or Next project: `package.json`, entry point, config, and the generated components. Alongside that source, the model writes a self-contained `preview.html` — a faithful static rendering you can inspect in the studio without installing anything.

The preview is the design proof. The export is the real framework project.

### Edit by pointing

Annotation mode turns a click in the preview into precise context for the next prompt. Chat edits, whole-page regenerations, code edits, and the asset panel all work against the same project. Explain and Auto fix ask the model to reason about the current files.

### Versions that can be read

Every generation is snapshotted locally, up to 30 versions. Open history to see a real line diff — additions in green, removals in red, line numbers on both sides — then restore any snapshot without losing the current one.

### Publishing without ceremony

- **Download** a ZIP with every source file, or a single HTML file with the CSS and JS inlined.
- **GitHub** creates or updates the repository, commits the complete tree, and asks Pages to serve it.
- **Vercel** deploys the project and returns the live URL.
- **Domain** generates the exact A, CNAME, or ALIAS records for GitHub Pages, Vercel, Netlify, or Cloudflare Pages, and writes the `CNAME` file into the project.

The studio does not pretend to control your registrar. The domain sheet gives you the records; the DNS change is yours.

### Import, paste, continue

Drop in a `.zip` or a single `.html` file and keep editing it with AI. Paste a screenshot straight into the composer to use it as a visual reference. Import a Figma file with a personal token to pull its frames in as design references.

## 03 · Six provider options, one studio

| Provider | What you need | Model list |
| :--- | :--- | :--- |
| **Google Gemini** | [Gemini API key](https://aistudio.google.com/app/apikey) | Read live from the key; curated fallback if the list cannot be read |
| **OpenAI** | [OpenAI API key](https://platform.openai.com/api-keys) | Read live from the key |
| **OpenRouter** | [OpenRouter key](https://openrouter.ai/keys) | Read live, including the free and paid catalogue |
| **NVIDIA NIM** | [NVIDIA API key](https://build.nvidia.com/) | Read live from the key |
| **Anthropic Claude** | [Anthropic API key](https://console.anthropic.com/settings/keys) | Read live from the key |
| **OpenAI-compatible** | Base URL + key | Read from `/models` when the endpoint exposes it |

Open **Settings** to add a key. The model picker then loads the list that key can actually use and makes it searchable. If a provider cannot list models, the studio falls back to a small curated list and says so rather than silently pretending it refreshed.

Keys are stored one per provider in this browser. Switching from Gemini to Claude and back does not lose either key.

<a href="https://lab1207.github.io/AI-Website-Builder/">
  <img src="assets/screenshot-dashboard.webp" width="100%" alt="The studio home: a large 'What will you build today?' prompt, model and stack chips, import, provider status, and four starter projects." />
</a>

<p align="center"><sub><em>The home screen: one prompt, the stack, a provider, and four deliberately art-directed starting points.</em></sub></p>

## 04 · The details that make it a studio

- **A real workspace.** Rail navigation, project status, view switcher, device widths, preview tabs, a collapsible conversation, and sheets for history, settings, publishing, and domains.
- **A model picker that behaves like one.** Grouped by provider, searchable, with the active model and provider always visible in the top bar.
- **Consistent by construction.** One set of tokens for warm paper, ink, ember, pink, and violet; Fraunces, Manrope, and Fira Code self-hosted; custom SVG icons; the same radii, spacing, focus states, and motion in both themes.
- **States, not surprises.** Loading shimmers, streaming text, disabled-action styling, inline validation, toasts with a dismiss action, and confirmations for destructive work.
- **A phone is not an afterthought.** The workspace becomes a drawer, a bottom tab bar, and a full-width preview; the landing page has its own mobile composition and keeps the sticky header.
- **A landing page you can return to.** The site remembers that you have visited the studio, so the logo and the Landing control take you home without losing the project.
- **No hidden cloud.** The studio is a static SPA. There is no account system, no database, no proxy, and no analytics.

## 05 · Run it locally

Requirements: **Node.js 22.12 or newer** and npm.

```bash
git clone https://github.com/lab1207/AI-Website-Builder.git
cd AI-Website-Builder
npm install
npm run dev
```

Open the printed local URL, choose a provider in **Settings**, and paste your own API key. Nothing needs to be configured to start.

### Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Vite development server with HMR |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | 89 unit tests across providers, keys, preview, domains, history, scaffolds, and secret scanning |
| `npm run build` | Typecheck, then a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Typecheck, test, and build in one pass |

### Optional environment

Copy `.env.example` to `.env.local` only if you need one of these:

```bash
# The absolute URL used for canonical, Open Graph, and Twitter tags.
# GitHub Pages supplies this in CI. Set it for a custom domain.
VITE_SITE_URL=https://your-domain.example

# Optional fallback for private deployments only.
# This key is bundled into the JavaScript and is readable by every visitor.
VITE_GEMINI_API_KEY=
```

### Deploy the studio

`npm run build` produces a static `dist/` folder. The repository ships with:

- a GitHub Pages workflow that builds, tests, uploads, and deploys on every push to `main`;
- `netlify.toml` for Netlify;
- `vercel.json` for Vercel;
- `public/_headers` with the same CSP and security headers used by the header configs.

The social image and canonical URL are filled from `VITE_SITE_URL` at build time. `vite.config.ts` also detects Vercel, Netlify, Cloudflare Pages, and GitHub Pages URLs automatically.

## 06 · Privacy and security, plainly

- **Your key is yours.** It is stored in this browser's `localStorage`, per provider, and sent directly to that provider. There is no proxy and no server of ours to leak it. Clearing the key in Settings removes it. Local storage is not encrypted, so use a scoped or revocable key on a shared machine.
- **Publishing tokens do not persist.** GitHub, Vercel, and Figma tokens live in component memory and disappear when the sheet closes or the page reloads.
- **Generated code is isolated.** The preview runs in a sandboxed iframe without `allow-same-origin`. It cannot reach the studio's window, storage, or keys. A tiny storage shim keeps generated sites that use `localStorage` working.
- **No key is committed.** A test scans the tracked tree for provider-key shapes on every CI run, and the repository includes a `SECURITY.md` with the reporting process.
- **No third-party scripts in the studio.** Fonts and icons ship with the app. The only network calls at runtime are the ones your keys and actions trigger: model listing, generation, and publishing. External images in a generated preview are the generated site's own choice.
- **A tight Content-Security-Policy** is sent by every supported host and mirrored in a meta tag for GitHub Pages, which cannot set custom headers.

Read [SECURITY.md](SECURITY.md) for the full policy.

## 07 · How it is built

A static React app with no server-side component.

```text
src/
├─ components/        the landing page, studio shell, preview, panels, and primitives
├─ hooks/useProvider  provider and model state
├─ lib/
│  ├─ apiKey.ts       per-provider key storage and validation
│  ├─ domains.ts      DNS guides, host records, and CNAME files
│  ├─ generation.ts   the system prompt and the __FILE: parser
│  ├─ preview.ts      preview document, page discovery, and the navigation bridge
│  ├─ projectTypes.ts framework scaffolds and stack instructions
│  ├─ providers.ts    six provider adapters, model loading, and chat
│  ├─ publish.ts      GitHub, Vercel, and Figma APIs
│  └─ versionHistory.ts snapshots, restore, and the line diff
├─ services/geminiService.ts  the Gemini SDK adapter
├─ App.tsx
└─ styles.css         tokens, themes, and the design system
```

**Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, and the Google Gen AI SDK. Fraunces, Manrope, and Fira Code are self-hosted. There is no component library and no icon font.

**Performance:** the initial application JavaScript is about 120 kB gzipped. JSZip and the Gemini SDK are separate chunks loaded only when you import a ZIP or start a Gemini generation.

**Testing:** 89 unit tests cover the parser, provider fallbacks, key handling, the preview bridge, page discovery, scaffolds, DNS records, line diffs, config parity, and secret scanning. `npm run check` is the same gate CI uses.

## 08 · Release 3.0.0

This is the studio release: a new warm-paper identity, a complete landing page, a rebuilt home and workspace, a searchable model picker, multi-page preview tabs, version diffs, domain guides, refreshed documentation, and a much stricter release pipeline.

Read the full [CHANGELOG](CHANGELOG.md).

## 09 · License

[GPL-3.0-or-later](LICENSE). You can use, study, share, and modify it; derivative distributions must remain under the same license. There is no warranty.

Contributions are welcome — start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

---

<div align="center">
  <sub>Made for the web, in the browser.</sub>
</div>
