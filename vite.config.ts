import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, '.', '');

    // Robustly handle the API key:
    // 1. Check GEMINI_API_KEY (Netlify/Server env convention)
    // 2. Check VITE_GEMINI_API_KEY (Vite convention)
    // 3. Fallback to empty string to prevent build-time undefined issues
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Prevent "ReferenceError: process is not defined" in browser
        // by replacing the specific variable with its string value during build.
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});