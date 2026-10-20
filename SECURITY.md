# Security policy

## The short version

AI Website Builder is a static site. It has no backend, no database, no accounts, and no server-side secrets. Your API key is stored in your browser's `localStorage` and is sent only to the provider you picked — Gemini, OpenAI, OpenRouter, NVIDIA, Anthropic, or a custom endpoint you configured.

## Supported versions

The `main` branch is the supported version. Deployments are built from it.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include a description, reproduction steps, and the affected browser.

If private reporting is unavailable, contact the maintainer through their GitHub profile: <https://github.com/lab1207>.

## Scope

Things worth reporting include:

- script injection or a CSP bypass
- a way for generated preview code to reach the builder's own window, storage, or API key
- a way for the app to leak a visitor's API key somewhere other than the provider they picked
- a dependency vulnerability that is actually reachable in the built site
- a hosting configuration that exposes private data

The following are generally out of scope:

- missing security headers on a preview URL you configured yourself
- issues that require a compromised browser extension or a rooted device
- social engineering
- reports that only say a scanner found a generic issue without a reachable impact

## Privacy model

- No cookies, analytics, or tracking pixels.
- The API key lives in this browser and is only ever sent to the provider the visitor chose, with that visitor's own requests.
- Generated websites are rendered in a sandboxed iframe without `allow-same-origin`, so previewed code cannot read the builder's storage or key.
- Fonts and icons are bundled with the app, so no third-party font or icon request is made.
- If you build with `VITE_GEMINI_API_KEY`, that key is embedded in the published bundle. Only do this for a private deployment you control, and prefer entering a key in the app. This variable applies to Gemini only; the other providers always need a visitor-supplied key.

## No API keys in the repository

A key committed to this repository is exposed to everyone who can see it, and stays in the git history even after removal. Three layers keep that from happening:

1. **A CI test that fails the build.** `src/lib/secrets.test.ts` scans every tracked file on every push for the key shapes of every supported provider — Gemini (`AIza…`), OpenAI (`sk-proj-…`), OpenRouter (`sk-or-…`), NVIDIA (`nvapi-…`), Anthropic (`sk-ant-…`), GitHub tokens (`ghp_…`, `github_pat_…`), and Figma tokens (`figd_…`). A match turns the CI run red, and the commit does not deploy.
2. **GitHub push protection.** Secret scanning and push protection are enabled on this repository, so GitHub itself blocks a push that carries a recognised token before it lands.
3. **Nothing reads keys from source.** The only key input is the environment: `VITE_GEMINI_API_KEY` at build time, and the visitor's own key at runtime, stored in their browser. `.gitignore` excludes `.env` and `.env.*`, and `.env.example` documents the variable with no value attached.

If you believe a key has been committed, treat it as compromised: revoke it at the provider first, then report it privately as above.

## Preview isolation

The preview pane renders generated HTML inside an iframe with:

- `sandbox="allow-scripts allow-forms allow-modals allow-popups"`
- no `allow-same-origin`, so the frame runs in an opaque origin
- `srcdoc` rather than `document.write`, so the frame is never same-origin with the app

Because the frame has an opaque origin, `localStorage` is unavailable to it. The app injects a small in-memory storage shim so generated pages that use `localStorage` still work, isolated from the builder's own storage.

## About the Content-Security-Policy

The shipped policy allows `'unsafe-inline'` for scripts and styles, and permits images and fonts from any HTTPS host.

This is deliberate. The preview is the product, and generated websites routinely use inline `<script>` tags, inline styles, and CDN-hosted fonts and icons. A `srcdoc` frame inherits the parent document's policy, and a single-origin static deployment has no separate origin to relax it, so a policy strict enough to block inline scripts would also block the preview from running at all.

The protection that matters for generated content is the sandbox, not the policy: the preview runs in an opaque origin and cannot reach the builder's window, storage, or API key. The app itself never renders generated HTML into its own document, so it has no injection surface of its own. The policy still locks down `object-src`, `base-uri`, `frame-ancestors`, and `form-action`, and restricts `connect-src` to the Gemini API.
