import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/server/**/*.test.ts"],
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});
