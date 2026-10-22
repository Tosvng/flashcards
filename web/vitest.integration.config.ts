import { defineConfig } from 'vitest/config';

/** Contract tests against a real backend: plain Node (real fetch), no DOM. */
export default defineConfig({
  test: { environment: 'node', include: ['tests/integration/**/*.test.ts'] },
});
