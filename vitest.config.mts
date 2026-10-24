import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // `server-only` throws when imported outside a react-server context, so
      // point it at an empty module for unit tests.
      "server-only": path.resolve(import.meta.dirname, "./tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    // Database-backed tests share one connection, so keep files serial.
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
