import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Standard decorators must be lowered before Node executes the test files.
  // Vitest 4 is paired with Vite 7 so this remains an esbuild transform.
  esbuild: { target: "es2022" },
  resolve: {
    // Tests run against core's source, not its dist, so a stale build can
    // never produce phantom failures.
    alias: {
      "@themoss/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
});
