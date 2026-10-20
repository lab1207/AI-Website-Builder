<div align="center">

# ⚡ AI Website Builder

### Describe a website. Get complete HTML, CSS, and JavaScript, with live preview and one-click export.

<p>

<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
<img src="https://img.shields.io/badge/Google--Gemini-8E75B2?style=for-the-badge"/>
<img src="https://img.shields.io/badge/license-GPL--3.0--or--later-e8b65f?style=for-the-badge"/>

</p>

Fast • Live Preview • Prompt to Website • Open Source

<p>

<a href="#-features">Features</a> •
<a href="#-how-it-works">How It Works</a> •
<a href="#-api-key">API Key</a> •
<a href="#-installation">Installation</a> •
<a href="#-deployment">Deployment</a> •
<a href="#-roadmap">Roadmap</a>

</p>

</div>

---

## 💡 Why?

Building a modern website from scratch takes time.

**AI Website Builder** lets you describe your idea in plain English and get a complete HTML, CSS, and JavaScript project. Refine it through conversation, watch it render in real time, edit the code by hand, and export the result as a ZIP.

It runs entirely in your browser. There is no backend, no database, and no account.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Website Generation | Generate complete websites from natural language prompts. |
| ⚡ Live Preview | Render generated websites instantly inside the app. |
| 💬 Conversational Editing | Keep improving your project through chat. |
| 📦 ZIP Export | Download the generated website as a complete project. |
| 📄 Single File Export | Ship one self-contained HTML file. |
| 📁 Import Existing Projects | Upload a `.zip` or `.html` and continue editing with AI. |
| 🖥 Responsive Preview | Switch between desktop, tablet, and mobile widths. |
| 🖼 Image Input | Generate websites from a reference screenshot. |
| ⚙️ Model Settings | Choose the model, temperature, top-P, top-K, and output tokens. |
| 📌 Annotation Mode | Click a spot in the preview to change exactly that part. |
| 🧩 Asset Editor | Find every image, link, and button label and replace it in place. |
| 🧠 Thinking Mode | Ask the model to reason before it answers. |
| 🔄 Streaming Responses | Watch the site generate in real time. |
| 🔒 Your Key, Your Browser | The API key never leaves your machine except to Google. |

---

## 🚀 How It Works

```text
             Describe Your Website
                      │
                      ▼
              Google Gemini AI
                      │
                      ▼
      Generate HTML • CSS • JavaScript
                      │
                      ▼
                Live Preview
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   Continue Editing          Export ZIP
```

The generated website can be refined with more prompts, edited visually, adjusted by hand in the code tab, or exported as a complete project.

---

## 🔑 API Key

The builder talks to Google's Gemini API directly from your browser, so it needs an API key.

**Add it in the app.** Open **Run settings** (the sliders icon, top right), paste your key under **API key**, and press **Save key**. It is stored in your browser's `localStorage` and sent only to `generativelanguage.googleapis.com`.

Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).

> **For a private deployment**, you can bake a key in at build time with `VITE_GEMINI_API_KEY`. It is embedded in the published bundle, so anyone who opens the site can read it. Only do this for a deployment you control, and prefer entering a key in the app.

---

## 🛠 Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| AI | Google Gemini |
| Preview | Sandboxed iframe |
| Export | JSZip |
| Tests | Vitest |

Everything is bundled from this repository. The app makes **no third-party requests** at runtime beyond the Gemini API call you trigger.

---

## 📂 Project Structure

```text
src/
│
├── components/          # Chat, preview, and settings panels
│   ├── ChatInterface.tsx
│   ├── PreviewPane.tsx
│   └── RunSettings.tsx
│
├── hooks/
│   └── useApiKey.ts     # Key storage and resolution
│
├── lib/                 # Pure logic, covered by tests
│   ├── apiKey.ts
│   └── preview.ts
│
├── services/
│   └── geminiService.ts # Gemini calls and file parsing
│
├── styles.css
├── types.ts
├── App.tsx
└── main.tsx
```

---

## 📦 Installation

Clone the repository

```bash
git clone https://github.com/lab1207/AI-Website-Builder.git
```

Enter the project

```bash
cd AI-Website-Builder
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

Open <http://localhost:3000> and add your API key in Run settings.

Build for production

```bash
npm run build
```

Preview the production build

```bash
npm run preview
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `VITE_GEMINI_API_KEY` | No | A key embedded at build time. Optional; see [API Key](#api-key). |
| `VITE_SITE_URL` | No | The absolute URL where the site is hosted, used for canonical and social tags. Inferred automatically on Vercel, Netlify, Cloudflare Pages, and GitHub Pages. |

There is no `.env` file requirement, and no key is ever committed.

---

## 🚀 Deployment

The build output in `dist/` is a plain static folder. It runs anywhere that can serve files.

- **Vercel** — import the repository. `vercel.json` is included.
- **Cloudflare Pages** — connect the repository and set the build command to `npm run build` and the output directory to `dist`. `public/_headers` is included.
- **Netlify** — connect the repository. `netlify.toml` is included.
- **GitHub Pages** — push to `main`; the included workflow builds and deploys. Set **Settings → Pages → Source** to **GitHub Actions**.

Security headers are shipped in `public/_headers`, `vercel.json`, and `netlify.toml`. If you replace them with your own, allow `https://generativelanguage.googleapis.com` in `connect-src`.

The site uses a relative Vite base (`base: './'`), so it also works under a repository subpath.

---

## 🔒 Privacy

The application runs entirely in your browser.

- Your API key is stored in `localStorage` and sent only to Google's API.
- There is no backend, no database, and no analytics.
- Fonts and icons are bundled with the app, so no third-party font or icon request is made.
- Generated websites are rendered in a sandboxed iframe in an opaque origin, so they cannot read the builder's storage or key.
- The only optional build-time key, `VITE_GEMINI_API_KEY`, is embedded in the published bundle. See [API Key](#api-key).

### A note on the Content-Security-Policy

The shipped policy allows inline scripts and styles, and permits images and fonts from any HTTPS host. That is on purpose: the preview is the product, and generated websites routinely use inline `<script>` tags, inline styles, and CDN-hosted fonts and icons. A `srcdoc` frame inherits the parent policy, so a policy strict enough to block inline scripts would also stop the preview from running.

What actually isolates generated content is the sandbox, not the policy. The preview runs in an opaque origin and cannot reach the builder's window, storage, or API key. The policy still locks down `object-src`, `base-uri`, `frame-ancestors`, and `form-action`, and restricts `connect-src` to the Gemini API. See [SECURITY.md](SECURITY.md) for the details.

---

## 🧪 Testing

```bash
npm run check
```

That runs TypeScript, the Vitest suite, and a production build.

---

## 🗺 Roadmap

- [x] Multi-file website generation
- [x] Sandboxed, isolated preview
- [x] Project import and export
- [x] In-browser code editing
- [x] Live model list
- [ ] Tailwind CSS output
- [ ] React project generation
- [ ] Vue project generation
- [ ] Next.js export
- [ ] Project version history
- [ ] GitHub repository export
- [ ] Deploy directly to Vercel
- [ ] Figma import
- [ ] AI code explanations

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

Licensed under the [GNU General Public License v3.0 or later](LICENSE). Free to use, study, change, and share. If you distribute a modified version, you must share its source under the same license.
