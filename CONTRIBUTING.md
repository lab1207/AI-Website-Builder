# Contributing to AI Website Builder

Thanks for considering a contribution. This is a small, deliberately dependency-light project, and thoughtful fixes are very welcome.

## Before you start

- For a bug, open an issue using the bug report template.
- For a larger feature, open an issue first so we can talk about scope.
- For security issues, do not open a public issue; see [SECURITY.md](SECURITY.md).

## Local setup

```bash
git clone https://github.com/lab1207/AI-Website-Builder.git
cd AI-Website-Builder
npm install
npm run dev
```

Node.js 22 or newer is required.

There is no `.env` file to create. Add your Gemini API key in the app's **Run settings** panel, and it is stored in your browser only. See [README.md](README.md#api-key) for the details.

## Before opening a pull request

Run the full check:

```bash
npm run check
```

That runs TypeScript, the Vitest suite, and a production build. If you touched `src/lib/preview.ts` or `src/services/geminiService.ts`, add or update tests.

## Guidelines

- Keep it static. No backend, no accounts, no analytics.
- Prefer the platform: plain SVG, CSS, and standard browser APIs before a new dependency.
- Match the existing style: small focused components, strict TypeScript, no unused code.
- Respect accessibility: keyboard access, visible focus, reduced motion, and meaningful labels.
- Keep privacy promises real. The API key stays in the visitor's browser. Do not add a network call that includes it.
- Never commit a key. `VITE_GEMINI_API_KEY` is a convenience for private deployments, not a way to publish one.

## Commit messages

Short and imperative is perfect:

```
Fix preview sandbox isolation
Add a model picker that reads the live model list
```

## Review

A maintainer will review as soon as possible. Small, focused pull requests are easier to merge than large rewrites. If a change is declined, it is usually about scope or the project's static/private constraints, not about you.

## License

By contributing, you agree that your contribution is licensed under the [GNU General Public License v3.0 or later](LICENSE).
