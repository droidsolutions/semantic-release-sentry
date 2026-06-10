import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.mts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/**/*.mts"],
      reporter: ["lcov", "html", "text"],
    },
  },
});
