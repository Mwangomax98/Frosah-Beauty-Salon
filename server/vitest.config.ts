import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    // Tests share one MySQL database, so files run one after another.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ["test/**/*.test.ts"],
  },
});
