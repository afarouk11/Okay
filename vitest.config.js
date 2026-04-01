import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: { "node": "24.x" },
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['api/**/*.js', 'src/**/*.js'],
      exclude: ['tests/**', 'src/jarvis.js'],  // jarvis.js is browser-only (DOM + CDN imports)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
