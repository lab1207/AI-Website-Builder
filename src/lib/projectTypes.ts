import type { FileMap } from '../types';

export type ProjectType = 'vanilla' | 'react' | 'vue' | 'next';

export type SiteMode = 'single' | 'multi';

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
    description: 'A static site that runs anywhere. One page or many, no build step.',
    entry: 'index.html',
    previewable: true,
  },
  {
    value: 'react',
    label: 'React',
    description: 'A Vite + React project with components, a live preview, and a runnable export.',
    entry: 'src/App.jsx',
    previewable: false,
  },
  {
    value: 'vue',
    label: 'Vue 3',
    description: 'Single-file components with script setup, bundled by Vite.',
    entry: 'src/App.vue',
    previewable: false,
  },
  {
    value: 'next',
    label: 'Next.js',
    description: 'The App Router, ready for Vercel, with a static in-browser preview.',
    entry: 'app/page.jsx',
    previewable: false,
  },
];

/** The output format the model is asked for. */
export type Styling = 'vanilla' | 'tailwind';

export const STYLING_OPTIONS: Array<{ value: Styling; label: string; hint: string }> = [
  { value: 'vanilla', label: 'Plain CSS', hint: 'Portable, readable, no dependencies.' },
  {
    value: 'tailwind',
    label: 'Tailwind CSS',
    hint: 'Utility classes, compiled by Vite. Framework projects only.',
  },
];

export const SITE_MODE_OPTIONS: Array<{
  value: SiteMode;
  label: string;
  description: string;
}> = [
  {
    value: 'single',
    label: 'One page',
    description: 'A focused landing page or app screen.',
  },
  {
    value: 'multi',
    label: 'Multi-page',
    description: 'Three linked pages with shared navigation.',
  },
];

const TYPE_INSTRUCTIONS: Record<ProjectType, string[]> = {
  vanilla: [
    'PROJECT TYPE: plain HTML, CSS and JavaScript.',
    '- The default files are index.html, styles.css and script.js. Keep the stylesheet and the script shared across pages.',
    '- No frameworks, no build step, no bundler.',
    '- If the request needs more pages, add real .html files (for example about.html) and link them with relative filenames. Never fake navigation with href="#".',
    '- Use inline SVG for icons. Do not load an icon font or a CSS framework from a CDN.',
  ],
  react: [
    'PROJECT TYPE: React, built with Vite.',
    '- Write JSX in .jsx files. No TypeScript.',
    '- Use function components with hooks. No class components.',
    '- The entry component is src/App.jsx, mounted from src/main.jsx.',
    '- You may add more files under src/. Always list every file you create with its own __FILE: marker.',
    '- ALSO create preview.html at the project root: a self-contained, high-fidelity static version of the design using plain HTML and CSS, with the CSS in a <style> block and any interaction in a plain <script> block. It must not import React, a bundler output, Tailwind, or any external script. This is what the live in-browser preview renders when a build is unavailable.',
  ],
  vue: [
    'PROJECT TYPE: Vue 3, built with Vite.',
    '- Write single file components using the <script setup> block in .vue files.',
    '- The entry component is src/App.vue, mounted from src/main.js.',
    '- You may add more .vue files under src/. Always list every file you create with its own __FILE: marker.',
    '- ALSO create preview.html at the project root: a self-contained static version of the design using plain HTML, CSS, and JavaScript. No Vue imports, no bundler output, no Tailwind, no external scripts. This is what the live in-browser preview renders when a build is unavailable.',
  ],
  next: [
    'PROJECT TYPE: Next.js, using the App Router.',
    '- Write JSX in .jsx files. No TypeScript.',
    '- The page lives at app/page.jsx and the root layout at app/layout.jsx.',
    '- Only add the "use client" directive when a component truly needs state or effects.',
    '- Include a package.json with next, react and react-dom, plus a next.config.mjs.',
    '- Always list every file you create with its own __FILE: marker.',
    '- ALSO create preview.html at the project root: a self-contained static version of the design using plain HTML, CSS, and JavaScript. It must not rely on Next.js, React, Tailwind, or external scripts. This is what the live in-browser preview renders when a build is unavailable.',
  ],
};

const STYLING_INSTRUCTIONS: Record<Styling, string[]> = {
  vanilla: [
    'STYLING: plain CSS.',
    '- Use :root custom properties for the palette and the spacing scale.',
    '- Lay out with Flexbox or CSS Grid. Avoid floats and absolute positioning for layout.',
    '- Include img { max-width: 100%; height: auto; display: block; } so images never break the layout.',
    '- Write real, specific copy. No lorem ipsum, no placeholder “Feature one” labels.',
  ],
  tailwind: [
    'STYLING: Tailwind CSS.',
    '- Use Tailwind utility classes in the markup. Do not write a stylesheet of custom CSS rules.',
    '- Reach for an arbitrary value only when no utility exists, for example class="text-[13px]".',
    '- Do not add a CDN <script> tag for Tailwind. The project already ships with Tailwind configured.',
    '- preview.html is the exception: it must use plain CSS, because it runs without a build step.',
  ],
};

const SITE_INSTRUCTIONS: Record<SiteMode, string[]> = {
  single: [
    'SITE STRUCTURE: one page by default.',
    '- Add another page only when the request clearly needs one. When you do, create a real file and link it with a relative filename.',
  ],
  multi: [
    'SITE STRUCTURE: a multi-page website.',
    '- Build at least three real, linked pages. Use index.html plus about.html and contact.html, or a better-fitting third page such as services.html or work.html.',
    '- Every page shares the same header, navigation, and footer. Mark the current page in the navigation.',
    '- For framework projects, build real routes or components for each page and make preview.html represent the home page with working in-page navigation.',
    '- Never fake a page with href="#". Use real files or real routes.',
  ],
};

/**
 * Extra rules layered onto the base system instruction for the chosen project
 * type. The base prompt stays focused on design; this only tells the model
 * which files and conventions to use.
 */
export function projectTypeInstruction(
  type: ProjectType,
  styling: Styling,
  siteMode: SiteMode = 'single',
): string {
  // Tailwind on a vanilla project would produce class names with nothing to
  // compile them, so that combination falls back to plain CSS.
  const effectiveStyling: Styling = type === 'vanilla' ? 'vanilla' : styling;

  const lines = [
    ...(TYPE_INSTRUCTIONS[type] ?? TYPE_INSTRUCTIONS.vanilla),
    '',
    ...(STYLING_INSTRUCTIONS[effectiveStyling] ?? STYLING_INSTRUCTIONS.vanilla),
    '',
    ...(SITE_INSTRUCTIONS[siteMode] ?? SITE_INSTRUCTIONS.single),
  ];
  return lines.join('\n');
}

const REACT_TAILWIND_DEPS = {
  tailwindcss: '^4.3.3',
  '@tailwindcss/vite': '^4.3.3',
};

function reactScaffold(styling: Styling): FileMap {
  const tailwind = styling === 'tailwind';
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
          ...(tailwind ? REACT_TAILWIND_DEPS : {}),
        },
      },
      null,
      2,
    ),
    'vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
${tailwind ? "import tailwindcss from '@tailwindcss/vite';\n" : ''}
export default defineConfig({
  plugins: [react()${tailwind ? ', tailwindcss()' : ''}],
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
${tailwind ? "import './index.css';" : "import './styles.css';"}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
    [tailwind ? 'src/index.css' : 'src/styles.css']: tailwind
      ? `@import 'tailwindcss';\n`
      : `/* Global styles for the project. */\n`,
  };
}

function vueScaffold(styling: Styling): FileMap {
  const tailwind = styling === 'tailwind';
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
          ...(tailwind ? REACT_TAILWIND_DEPS : {}),
        },
      },
      null,
      2,
    ),
    'vite.config.js': `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
${tailwind ? "import tailwindcss from '@tailwindcss/vite';\n" : ''}
export default defineConfig({
  plugins: [vue()${tailwind ? ', tailwindcss()' : ''}],
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
${tailwind ? "import './index.css';" : "import './styles.css';"}

createApp(App).mount('#app');
`,
    [tailwind ? 'src/index.css' : 'src/styles.css']: tailwind
      ? `@import 'tailwindcss';\n`
      : `/* Global styles for the project. */\n`,
  };
}

function nextScaffold(styling: Styling): FileMap {
  const tailwind = styling === 'tailwind';
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
        devDependencies: tailwind
          ? {
              '@tailwindcss/postcss': '^4.3.3',
              tailwindcss: '^4.3.3',
            }
          : undefined,
      },
      null,
      2,
    ),
    'next.config.mjs': `/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`,
    ...(tailwind
      ? {
          'postcss.config.mjs': `const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
`,
          'app/globals.css': `@import 'tailwindcss';\n`,
        }
      : {
          'app/globals.css': `/* Global styles for the project. */\n`,
        }),
    'app/layout.jsx': `import './globals.css';

export const metadata = {
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
}

/** The files every project of a given type needs, beyond what the model writes. */
export function scaffoldFor(type: ProjectType, styling: Styling = 'vanilla'): FileMap {
  switch (type) {
    case 'react':
      return reactScaffold(styling);
    case 'vue':
      return vueScaffold(styling);
    case 'next':
      return nextScaffold(styling);
    default:
      return {};
  }
}
export * from './generation';

