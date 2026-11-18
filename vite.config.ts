import { defineConfig } from 'vite';
// top-level await in main.ts (font loading) needs a modern target
export default defineConfig({ build: { target: 'es2022', chunkSizeWarningLimit: 2000 } });
