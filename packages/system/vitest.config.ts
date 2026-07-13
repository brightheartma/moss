import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Standard decorators must be lowered before Node executes the test files.
  // Vitest 4 is paired with Vite 7 so this remains an esbuild transform.
  esbuild: { target: "es2022" },
  resolve: {
    // Tests run against workspace sources, not dists, so a stale build can
    // never produce phantom failures.
    alias: {
      "@themoss/core": src("../core/src/index.ts"),
      "@themoss/simulator": src("../simulator/src/index.ts"),
      "@themoss/erc": src("../erc/src/index.ts"),
    },
  },
});
