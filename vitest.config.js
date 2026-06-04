import { defineConfig } from 'vitest/config'

// jsdom so the share helpers (atob/btoa via window) and any DOM-touching test
// run; the core engine itself is environment-agnostic.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js']
  }
})
