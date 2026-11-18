import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Firestore security rules tests. Run through `npm run test:rules`, which starts the emulator.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests-rules/**/*.test.ts"],
    testTimeout: 15_000,
    fileParallelism: false,
  },
});
