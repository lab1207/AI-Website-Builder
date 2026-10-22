# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-10-22

### The source-to-site release

Rebuild from a screenshot, a live URL, existing code, a project file, or a sentence — with a real staged build trail, a visible prompt queue, back-and-forth follow-ups, and explicit errors instead of silent loops.

### Added

- **Screenshot, link, code, and file intake.** The composer accepts images, text and source files (HTML, CSS, JS, JSX, TS, Vue, Markdown, JSON, YAML, SVG, and more), `.zip` and `.html` project imports, and live URLs. Drag and drop, paste, or the new Add menu all feed the same source slots.
- **Live URL capture.** `src/lib/reference.ts` normalizes the address, renders a screenshot through image.thum.io with Microlink as a fallback, and reads the page with r.jina.ai into an attached text reference. The fallback chain reports both services and the real reason when none can render; the UI discloses which services see the URL.
- **Attachment-only prompts.** Sending a screenshot or a file with no text writes a source-specific instruction automatically — rebuild the screenshot exactly, treat the files as the source of truth, or rebuild the captured URL.
- **A real build trail.** Each assistant message carries staged `BuildStep`s (brief received, connecting, writing, assembling files, final check) with live details, elapsed time, and done/active/error/stopped states. The old looping fill-and-reset progress bar and rotating marketing steps are gone.
- **Provider stage telemetry.** `sendChat` reports sending, connected, streaming, and done; the timeline reflects the true connection state rather than a timer.
- **A visible prompt queue.** Sending while a build runs queues the message. The queue tray lists what is waiting, allows removing or clearing items, drains one prompt at a time, and pauses after an error or a manual stop with an explicit Resume.
- **Back-and-forth follow-ups.** A finished build can end with up to three `__NEXT:` suggestions that render as clickable chips, and the prompt tells the model to ask 1–3 clarifying questions instead of guessing when a decision would change the whole site.
- **Explicit failures.** Request timeouts, idle-stream watchdogs, provider error frames, empty responses, output-limit cut-offs, safety refusals, rate limits with `Retry-After`, out-of-credit accounts, and rejected keys all become specific messages in the build log. A failed run keeps any partial output and pauses the queue.
- **An API connection test.** Settings sends a real one-token, non-streaming request through the selected provider and model and reports latency plus the reply, so a key that can list models but cannot generate is caught immediately.
- **Cloudflare Pages path.** A Cloudflare tab in Publish prepares the project name, the exact `wrangler pages project create` and `wrangler pages deploy` commands with copy support, and instructions for Git-connected automatic deploys. Cloudflare's API sends no browser CORS headers, so the panel states that plainly instead of attempting a silent request.
- **Expanded live editing.** The Assets panel now finds CSS custom properties (colour, spacing, radii, shadows) and hex colours alongside images, links, and button labels, with a colour picker and commit-on-blur editing that writes back to every file using the value.
- **Landing-page source tabs.** Describe, Screenshot, Link, and Code tabs seed the studio directly — a prompt arrives in the composer, a screenshot arrives attached, a link is captured on arrival, and pasted code arrives as a source file.
- **Default-on thinking mode.** Thinking is enabled by default and moved to Settings, alongside the extra-instructions field that used to live in the chat toolbar.

### Changed

- **The composer is a source intake.** One Add menu for images, code and text, live links, and project imports; attachment chips with thumbnails and sizes; clear-all; per-file validation for size, type, and emptiness; and a queue-aware send button that shows Build, Queue, or Stop.
- **The chat panel is a build log.** Fake loading dots, the simulated progress bar, and decorative step rotation were replaced by the staged timeline, file cards that show streaming versus written, follow-up chips, queue visibility, and stop controls in both the composer and the top bar.
- **The generation prompt** now covers source fidelity explicitly (inventory the reference, match proportions and copy, reproduce every section and state, rebuild responsive equivalents), requires real nested file paths, and defines the `__NEXT:` protocol.
- **The parser** accepts nested paths, spaces, and underscores; strips `__NEXT:` from the final file; ignores empty markers; and normalizes backslashes and `./` prefixes.
- **Settings and the chat toolbar.** Instructions and the model list leave more room for the provider, the connection test, and the thinking switch; the chat toolbar keeps only the build log and a New action.
- **Gemini sessions** are recreated when the model, key, instructions, or sampling settings change, accept text attachments, and translate SDK failures (rate limit, rejected key) into plain language.
- **Landing copy and illustrations** now lead with rebuilding from a source, the build trail, the queue, and deploying to your own Vercel or Cloudflare account.
- **README, changelog, and screenshots** updated for the release; the test suite grew from 89 to 120 tests.

### Fixed

- **No silent loop.** A completion that produced nothing previously left the UI waiting or finished with no website; empty responses, idle streams, truncated output, and error frames now fail loudly with the reason.
- **Queueing no longer drops instructions.** Sending during a build appends to the queue instead of being ignored, and an annotation plus a typed prompt now both survive into the request.
- **Asset edits no longer apply per keystroke.** Values commit on blur or Enter, which stops the cursor from jumping and the project from being re-parsed on every character.
- **Preview navigation is validated.** `awb:preview-navigate` messages must come from the preview iframe's own window and name a real page; path traversal is ignored.
- **Downloads are not cancelled.** Object URLs are revoked after a delay instead of immediately after `click()`, in both the preview export and the publish panel.
- **The misleading "Save code changes" export item** was replaced with "Copy rendered HTML"; code edits were already live.
- **Landing screenshot intake** accepts several images, not just one, matching its copy.
- **OpenRouter requests** now send the correct referer and title headers.
- **Reference capture failures** include the last service error instead of claiming only that both were rate-limited.

### Security

- URL capture uses third-party rendering and reading services and says so in the composer before you enter an address.
- Publishing tokens remain in memory only; the Cloudflare path never asks for a token it cannot use from the browser.
- The secret scan, sandboxed preview, CSP alignment, and per-provider local key storage are unchanged and still enforced in CI.

## [3.0.0] - 2026-10-21

### The studio release

A complete redesign and rebuild of the product surface: a proper landing page, a home that feels like a studio, a searchable model picker, multi-page and framework previews, readable version diffs, domain guides, and release-grade documentation and security.

### Added

- **A full landing page.** Hero product preview, features, what ships, a four-step build flow, provider band, FAQ, final call to action, responsive composition, and a sticky header. The logo and the studio's landing control return to it without losing the current project.
- **A studio home.** A large prompt composer, project continuation card, model and stack chips, import, provider status, and four art-directed starter projects.
- **A new workspace shell.** Left rail, project top bar, view switcher, build controls, collapsible conversation, and right-side sheets for history, settings, publish, and domains.
- **A searchable model picker.** Models grouped by provider, a filter field, active provider and model, reload support, and an honest fallback state when a live list cannot be read.
- **Multi-page previews.** Real page discovery, preview tabs, and a `postMessage` navigation bridge so links between generated pages stay inside the preview.
- **Framework previews without a local build.** React, Vue, and Next.js projects now include a self-contained `preview.html` beside the runnable framework source.
- **Version diffs.** Local snapshots now come with a side-by-side line diff, addition and removal counts, file switching, and restore.
- **Custom-domain guides.** Records for GitHub Pages, Vercel, Netlify, and Cloudflare Pages, copyable values, host-specific notes, and a generated `CNAME` file.
- **A new identity.** Warm paper, near-black ink, and an ember-to-pink-to-violet gradient; Fraunces, Manrope, and Fira Code; a new logo, favicon, app icons, social card, and web manifest.
- **A light-first launch experience.** A pre-paint theme script removes the dark-mode flash while preserving the saved or system preference.
- **Mobile workspace navigation.** A drawer, bottom workspace bar, and full-width preview replace the desktop layout on small screens.
- **Release documentation.** A rewritten README with new screenshots, provider and key guidance, privacy notes, architecture, local setup, deployment, and testing; a complete changelog for this release.
- **Test coverage for the new logic.** Domain normalization and DNS guides, version diffs and labels, preview page discovery and navigation, framework scaffolds, and model-list fallbacks. The suite now has 120 tests.

### Changed

- **Visual system.** One coherent set of tokens for surfaces, lines, ink, accent, focus, motion, and both themes, applied across the landing page, home, workspace, sheets, dialogs, toasts, and empty states.
- **Navigation.** The app now moves between Landing, Home, History, Publish, and Settings as real views instead of stacking everything in one screen.
- **Primary actions.** Disabled Build and Publish buttons use a neutral surface rather than a washed-out gradient, so their state is unambiguous.
- **Model source reporting.** Fallback lists are detected by their contents, not array identity, so Settings can say plainly whether it is showing a live list or a built-in one.
- **Composer copy.** Saving a key no longer claims the model list has reloaded when it has not; the UI reports the actual state.
- **Generation helpers.** The system prompt and `__FILE:` parser moved to `src/lib/generation.ts`, leaving the Gemini module responsible only for the SDK session.
- **Bundle strategy.** JSZip and the Gemini SDK are now separate lazy chunks. The initial application JavaScript is about 120 kB gzipped, down from the previous monolithic bundle.
- **Metadata.** New title, description, Open Graph and Twitter cards, JSON-LD feature list, theme colors, canonical/social URL placeholders, and light/dark browser chrome.
- **Content security.** Removed the unused cdnjs allowance from the CSP while keeping the policy consistent across the meta tag, `_headers`, Netlify, and Vercel configs.
- **Dependencies.** Removed the unused Inter font package and the retired `AppHeader` component.

### Fixed

- The landing page's sticky header now works: the root uses `overflow-x-clip` instead of a scroll-container-creating `overflow-x-hidden`.
- Long hero words no longer force horizontal overflow on small screens.
- Keyboard hints now read **Enter** and **Shift + Enter**; the return and shift glyphs were missing from the bundled interface font and rendered as empty boxes.
- Provider cards stack below 430px instead of truncating their labels.
- The disabled primary-button treatment has readable text and an obvious disabled state.
- Feature card two now has a point-and-edit illustration that matches its copy.
- Empty and recovered workspaces preserve the distinction between built-in models and a live provider list.
- The preview bridge keeps secondary-page navigation inside the iframe and leaves external links, hash links, and downloads alone.
- The secret-scanning test now covers `.github` and `assets`, not just application source.

### Security

- No API key is committed. The secret scan runs in CI and checks key shapes for every supported provider, plus GitHub and Figma tokens.
- Provider keys remain in local storage, one per provider, and are sent directly to that provider. Publishing tokens remain in memory only.
- The preview remains sandboxed without `allow-same-origin`, and the storage shim keeps generated `localStorage` code working.
- The CSP, framing, referrer, permissions, and MIME policies remain aligned across GitHub Pages, Netlify, Vercel, and Cloudflare Pages.

### Performance

- JSZip: separate 27.6 kB gzipped chunk, loaded on import, ZIP export, or download.
- Gemini SDK: separate 67.7 kB gzipped chunk, loaded only for a Gemini generation.
- Production build: clean, with no dynamic-import or chunk-size warnings.

## [2.0.0] - 2026-10-20

### The multi-provider release

### Added

- Google Gemini, OpenAI, OpenRouter, NVIDIA NIM, and Anthropic Claude, plus any OpenAI-compatible endpoint.
- Per-provider API keys and a model picker that reads the models a key can use.
- GitHub and Vercel publishing.
- Local version snapshots with restore.
- React, Vue, and Next.js project scaffolds, plus Tailwind CSS output.
- Image references, Figma design-reference import, AI code explanations, and Auto fix.
- Annotation mode, code view, an asset panel, and ZIP or single-file HTML export.
- Light and dark themes, with the theme remembered.

### Changed

- Rebuilt the interface as a spacious browser studio with a top bar, device-framed preview, and drawer panels.
- Moved to a `src/` layout with pure logic in `src/lib/`.
- Replaced CDN dependencies with a real Tailwind build and self-hosted fonts and icons.
- Removed the default API key from the bundle; visitors add their own, with `VITE_GEMINI_API_KEY` retained for private deployments.
- Defaulted to Gemini 3.8 Flash after the retirement of `gemini-3-pro-preview`.
- Renamed the project from its original working name and gave it its own design language.

### Fixed

- The Tailwind `{msg.latency && …}` bug that hid generation timing when the first chunk had zero latency.
- The shared button class that left Explain and Auto fix on different wrapping rules.
- A missing stylesheet link that failed on every load.
- Retired endpoints no longer appear in the model list.
- Icon-only controls have labels, expanded states, and a live region.
- Focus rings, reduced-motion support, and a corrected disclaimer.

### Security

- The preview sandbox no longer grants `allow-same-origin`.
- Added CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Relicensed under GPL-3.0-or-later.

## [1.0.0] - 2026-10-20

The first complete public release.

### Added

- Prompt-to-website generation with streamed responses.
- Live preview of generated HTML, CSS, and JavaScript at desktop, tablet, and phone widths.
- Conversational editing with the current viewport sent as context.
- Click-to-annotate changes directly in the preview.
- ZIP and single-file HTML export.
- In-browser code editing and a basic asset panel.
- A browser-local API key panel.
- A model picker, thinking mode, and image reference input.
- Light and dark themes.

[3.0.0]: https://github.com/lab1207/AI-Website-Builder/releases/tag/v3.0.0
[2.0.0]: https://github.com/lab1207/AI-Website-Builder/releases/tag/v2.0.0
[1.0.0]: https://github.com/lab1207/AI-Website-Builder/releases/tag/v1.0.0
