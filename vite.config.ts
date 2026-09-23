import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    host: '127.0.0.1', port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
