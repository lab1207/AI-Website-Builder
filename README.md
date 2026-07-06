<div align="center">

# ⚡ AI Website Builder 

### Generate complete HTML, CSS, and JavaScript websites from natural language with live preview and one-click export.

<p>

<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/Google-Gemini-blue?style=for-the-badge"/>
<img src="https://img.shields.io/badge/MIT-License-green?style=for-the-badge"/>

</p>

Fast • Live Preview • Prompt to Website • Open Source

<p>

<a href="#-preview">Preview</a> •
<a href="#-features">Features</a> •
<a href="#-how-it-works">How It Works</a> •
<a href="#-installation">Installation</a> •
<a href="#-roadmap">Roadmap</a>

</p>

</div>

---

# 💡 Why?

Building modern websites from scratch takes time.

**AI Website Builder** lets you describe your idea in plain English and instantly generates a complete HTML, CSS, and JavaScript project.

Refine it through conversation, preview changes in real time, and export the finished website as a ZIP project.

---

# 📸 Preview

<img width="1887" height="947" alt="Screenshot 2026-07-06 094620" src="https://github.com/user-attachments/assets/873979e9-b9f0-47bd-bd94-b2b1a4c7637e" />


<p align="center">

<img src="./preview.gif" width="100%">

</p>

---

# ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Website Generation | Generate complete websites from natural language prompts. |
| ⚡ Live Preview | Preview generated websites instantly inside the application. |
| 💬 Conversational Editing | Continue improving your project through chat. |
| 📦 ZIP Export | Download the generated website as a complete project. |
| 📁 Import Existing Projects | Upload an existing project and continue editing with AI. |
| 🖥 Responsive Preview | Switch between desktop and mobile preview modes. |
| 🖼 Image Input | Generate websites using reference images. |
| ⚙️ Model Settings | Configure Gemini model, temperature, Top-P, Top-K and output tokens. |
| ✏️ Annotation Mode | Modify specific parts of the generated website visually. |
| 🔄 Streaming Responses | Watch websites generate in real time. |

---

# 🚀 How It Works

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

The generated website can be refined through additional prompts, edited visually, or exported as a complete project.

---

# 🛠 Technology Stack

| Category | Technology |
|-----------|------------|
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| AI | Google Gemini |
| Preview | iframe |
| Export | JSZip |

---

# 📂 Project Structure

```text
src/
│
├── components/
│   ├── ChatInterface
│   ├── PreviewPane
│   ├── Sidebar
│   ├── RunSettings
│   └── ...
│
├── services/
│   └── geminiService.ts
│
├── types.ts
├── App.tsx
└── main.tsx
```

---

# 📦 Installation

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

Create a `.env` file

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Get a free API key from Google AI Studio

https://aistudio.google.com/app/apikey

Run locally

```bash
npm run dev
```

Build for production

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

# 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key used to generate websites. |

---

# 🔒 Privacy

The application runs entirely in your browser.

Your API key is stored locally during development and is never committed to this repository.

No backend server is required.

---

# 🗺 Roadmap

- [ ] Multi-page website generation
- [ ] React project generation
- [ ] Tailwind CSS support
- [ ] Vue project generation
- [ ] Next.js export
- [ ] Project version history
- [ ] GitHub repository export
- [ ] Deploy directly to Vercel
- [ ] Figma import
- [ ] AI code explanations

---

# 🤝 Contributing

Contributions, issues, and feature requests are welcome.

Feel free to open an issue or submit a pull request.

