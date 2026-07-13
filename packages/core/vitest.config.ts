import { defineConfig } from "vitest/config";

export default defineConfig({
  // Standard decorators must be lowered before Node executes the test files.
  // Vitest 4 is paired with Vite 7 so this remains an esbuild transform.
  esbuild: { target: "es2022" },
});
