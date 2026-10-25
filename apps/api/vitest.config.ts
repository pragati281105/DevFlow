import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Integration tests need a test DB — set TEST_DATABASE_URL or skip them
    globalSetup: [],
    // isolate each test file to avoid cross-test session pollution
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
