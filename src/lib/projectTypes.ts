import type { FileMap } from '../types';

export type ProjectType = 'vanilla' | 'react' | 'vue' | 'next';

export interface ProjectTypeOption {
  value: ProjectType;
  label: string;
  description: string;
  /** The file the live preview renders. */
  entry: string;
  /** Whether the live preview can render this project type in the browser. */
  previewable: boolean;
  /** Files the export must include beyond what the model generates. */
  scaffold?: FileMap;
}

export const PROJECT_TYPES: ProjectTypeOption[] = [
  {
    value: 'vanilla',
    label: 'HTML, CSS & JS',
    description: 'A single static site. No build step, no dependencies.',
    entry: 'index.html',
    previewable: true,
  },
  {
    value: 'react',
    label: 'React',
    description: 'A Vite + React project with components and a package.json.',
    entry: 'src/App.jsx',
    previewable: false,
  },
  {
    value: 'vue',
    label: 'Vue',
    description: 'A Vite + Vue 3 project using single-file components.',
    entry: 'src/App.vue',
    previewable: false,
  },
  {
    value: 'next',
    label: 'Next.js',
    description: 'A Next.js App Router project ready for Vercel.',
    entry: 'app/page.jsx',
    previewable: false,
  },
];

/** The output format the model is asked for. */
export type Styling = 'vanilla' | 'tailwind';

export const STYLING_OPTIONS: Array<{ value: Styling; label: string }> = [
  { value: 'vanilla', label: 'Plain CSS' },
  { value: 'tailwind', label: 'Tailwind CSS' },
];

const TYPE_INSTRUCTIONS: Record<ProjectType, string[]> = {
  vanilla: [
    'PROJECT TYPE: plain HTML, CSS and JavaScript.',
    '- Exactly three files: index.html, styles.css, script.js.',
    '- No frameworks, no build step, no bundler.',
  ],
  react: [
    'PROJECT TYPE: React, built with Vite.',
    '- Write JSX in .jsx files. No TypeScript.',
    '- Use function components with hooks. No class components.',
    '- The entry component is src/App.jsx, mounted from src/main.jsx.',
    '- You may add more files under src/ as the project grows. Always list every file you create with its own __FILE: marker.',
  ],
  vue: [
    'PROJECT TYPE: Vue 3, built with Vite.',
    '- Write single file components using the <script setup> block in .vue files.',
    '- The entry component is src/App.vue, mounted from src/main.js.',
    '- You may add more .vue files under src/. Always list every file you create with its own __FILE: marker.',
  ],
  next: [
    'PROJECT TYPE: Next.js, using the App Router.',
    '- Write JSX in .jsx files. No TypeScript.',
    '- The page lives at app/page.jsx and the root layout at app/layout.jsx.',
    '- Only add the "use client" directive when a component truly needs state or effects.',
    '- Include a package.json with next, react and react-dom, plus a next.config.mjs.',
    '- Always list every file you create with its own __FILE: marker.',
  ],
};

const STYLING_INSTRUCTIONS: Record<Styling, string[]> = {
  vanilla: [
    'STYLING: plain CSS.',
    '- Use :root custom properties for the palette and the spacing scale.',
    '- Lay out with Flexbox or CSS Grid. Avoid floats and absolute positioning.',
    '- Include img { max-width: 100%; height: auto; display: block; } so images never break the layout.',
  ],
  tailwind: [
    'STYLING: Tailwind CSS.',
    '- Use Tailwind utility classes in the markup. Do not write a stylesheet of custom CSS rules.',
    '- Reach for an arbitrary value only when no utility exists, for example class="text-[13px]".',
    '- Do not add a CDN <script> tag for Tailwind. The project already ships with Tailwind configured.',
  ],
};

/**
 * Extra rules layered onto the base system instruction for the chosen project
 * type. The base prompt stays focused on design; this only tells the model
 * which files and conventions to use.
 */
export function projectTypeInstruction(type: ProjectType, styling: Styling): string {
  const lines = [
    ...(TYPE_INSTRUCTIONS[type] ?? TYPE_INSTRUCTIONS.vanilla),
    '',
    ...(STYLING_INSTRUCTIONS[styling] ?? STYLING_INSTRUCTIONS.vanilla),
  ];
  return lines.join('\n');
}

/** The files every project of a given type needs, beyond what the model writes. */
export function scaffoldFor(type: ProjectType): FileMap {
  switch (type) {
    case 'react':
      return {
        'package.json': JSON.stringify(
          {
            name: 'my-site',
            private: true,
            version: '0.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^19.2.0',
              'react-dom': '^19.2.0',
            },
            devDependencies: {
              '@vitejs/plugin-react': '^6.1.2',
              vite: '^8.3.4',
            },
          },
          null,
          2,
        ),
        'vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
        'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My site</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
        'src/main.jsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
      };

    case 'vue':
      return {
        'package.json': JSON.stringify(
          {
            name: 'my-site',
            private: true,
            version: '0.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview',
            },
            dependencies: {
              vue: '^3.5.0',
            },
            devDependencies: {
              '@vitejs/plugin-vue': '^6.0.0',
              vite: '^8.3.4',
            },
          },
          null,
          2,
        ),
        'vite.config.js': `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
`,
        'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My site</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
        'src/main.js': `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`,
      };

    case 'next':
      return {
        'package.json': JSON.stringify(
          {
            name: 'my-site',
            private: true,
            version: '0.0.0',
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start',
            },
            dependencies: {
              next: '^15.0.0',
              react: '^19.2.0',
              'react-dom': '^19.2.0',
            },
          },
          null,
          2,
        ),
        'next.config.mjs': `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`,
        'app/layout.jsx': `export const metadata = {
  title: 'My site',
  description: 'Generated with AI Website Builder',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      };

    default:
      return {};
  }
}
