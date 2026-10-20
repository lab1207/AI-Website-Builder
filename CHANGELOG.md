# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-20

The first complete public release.

### Added

- Prompt-to-website generation with streaming responses.
- Live preview of generated HTML, CSS, and JavaScript, with desktop, tablet, and mobile widths.
- Conversational editing: refine a project through chat, with the current viewport passed to the model as context.
- Annotation mode: click a spot in the preview to tell the model exactly where to change something.
- Import an existing `.zip` or `.html` project and keep editing it with AI.
- Export as a ZIP of separate files, or as a single self-contained HTML file.
- In-browser code editing, plus an asset panel that finds images, links, and button text and lets you replace them.
- Run settings for model, temperature, top-K, top-P, and output token limits.
- A model picker that reads the models your own key can actually use.
- Thinking mode for deeper reasoning.
- Image input, so a screenshot can be used as a reference.
- An API key panel. Your key is stored in your browser and sent only to Google.

### Changed

- Moved to a `src/` layout with a `lib/` folder for the pure logic.
- Replaced the Tailwind CDN with a real Tailwind build, and the Google Fonts and Font Awesome CDNs with self-hosted copies. The app now makes no third-party requests.
- Replaced the Google AI Studio import map, which pointed React and the build tooling at a CDN, with a normal Vite setup.
- The API key is no longer inlined into the bundle by default. Visitors add their own in the app; `VITE_GEMINI_API_KEY` remains available as a fallback for private deployments.
- The preview iframe is now served through `srcdoc` in a sandbox without `allow-same-origin`, so generated code can no longer reach the builder's window, storage, or key. A storage shim keeps `localStorage` working inside the preview.
- Default model is now Gemini 3.8 Flash. `gemini-3-pro-preview` was shut down in March 2026 and `gemini-2.5-flash` is now limited to accounts that used it before.
- The Gemini SDK is loaded on demand, so the app starts without downloading it.
- Renamed the product from "Lovable Clone" to AI Website Builder, and replaced the borrowed design tokens with its own.

### Fixed

- Removed a stylesheet link to a file that did not exist, which failed on every load.
- Removed an unused component and an unused dependency.
- The model list no longer offers endpoints that have been retired.
- Added labels, expanded states, and a live region to the controls that had only icons.
- Added a visible focus ring, reduced-motion support, and a fixed disclaimer that no longer names a specific model.

### Security

- The API key is no longer shipped to visitors in the built bundle by default.
- The preview sandbox no longer grants `allow-same-origin` alongside `allow-scripts`, which together let generated code escape the frame.
- Added a Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.

### Infrastructure

- Continuous integration for typecheck, tests, and build.
- One-command hosting configurations for Vercel, Cloudflare Pages, Netlify, and GitHub Pages.
- Relicensed from MIT to GPL-3.0-or-later.

[1.0.0]: https://github.com/lab1207/AI-Website-Builder/releases/tag/v1.0.0
