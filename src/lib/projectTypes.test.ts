import { describe, expect, it } from 'vitest';
import {
  scaffoldFor,
  projectTypeInstruction,
} from './projectTypes';

describe('projectTypeInstruction', () => {
  it('asks framework projects for a self-contained preview.html', () => {
    for (const type of ['react', 'vue', 'next'] as const) {
      const instruction = projectTypeInstruction(type, 'vanilla');
      expect(instruction, type).toContain('preview.html');
      expect(instruction, type).toContain('self-contained');
    }
  });

  it('requires real linked pages in multi-page mode', () => {
    const instruction = projectTypeInstruction('vanilla', 'vanilla', 'multi');
    expect(instruction).toContain('multi-page');
    expect(instruction).toContain('index.html plus about.html and contact.html');
    expect(instruction).toContain('Never fake a page with href="#"');
  });

  it('never asks for Tailwind classes on a vanilla project', () => {
    const instruction = projectTypeInstruction('vanilla', 'tailwind');
    expect(instruction).toContain('STYLING: plain CSS.');
    expect(instruction).not.toContain('STYLING: Tailwind CSS.');
  });

  it('opts a framework project into Tailwind when chosen', () => {
    const instruction = projectTypeInstruction('react', 'tailwind');
    expect(instruction).toContain('STYLING: Tailwind CSS.');
    expect(instruction).toContain('preview.html is the exception');
  });
});

describe('scaffoldFor', () => {
  it('adds nothing to a vanilla project', () => {
    expect(scaffoldFor('vanilla')).toEqual({});
  });

  it('ships a runnable React + Vite project', () => {
    const files = scaffoldFor('react');
    expect(files['package.json']).toContain('"react"');
    expect(files['vite.config.js']).toContain('@vitejs/plugin-react');
    expect(files['src/main.jsx']).toContain("from './App.jsx'");
    expect(files['index.html']).toContain('/src/main.jsx');
    expect(files['src/styles.css']).toBeDefined();
    expect(files['src/index.css']).toBeUndefined();
  });

  it('adds Tailwind to a React project when requested', () => {
    const files = scaffoldFor('react', 'tailwind');
    expect(files['package.json']).toContain('@tailwindcss/vite');
    expect(files['vite.config.js']).toContain('tailwindcss()');
    expect(files['src/index.css']).toBe("@import 'tailwindcss';\n");
  });

  it('ships a Vue 3 single-file-component project', () => {
    const files = scaffoldFor('vue');
    expect(files['package.json']).toContain('"vue"');
    expect(files['vite.config.js']).toContain('@vitejs/plugin-vue');
    expect(files['src/main.js']).toContain('createApp(App)');
  });

  it('ships a Next.js App Router project, with Tailwind only when asked', () => {
    const plain = scaffoldFor('next');
    expect(plain['package.json']).toContain('"next"');
    expect(plain['app/layout.jsx']).toContain('RootLayout');
    expect(plain['postcss.config.mjs']).toBeUndefined();

    const tailwind = scaffoldFor('next', 'tailwind');
    expect(tailwind['package.json']).toContain('@tailwindcss/postcss');
    expect(tailwind['postcss.config.mjs']).toContain('@tailwindcss/postcss');
    expect(tailwind['app/globals.css']).toBe("@import 'tailwindcss';\n");
  });
});
