import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001, // Different port from WASM version
  },
  resolve: {
    alias: {
      '@': '/cdt',
    },
  },
});