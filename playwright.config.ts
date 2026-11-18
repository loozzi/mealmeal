import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "Pixel 7", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      // Auth on 9099, Firestore on 8085, in-memory: every run starts empty.
      command: "npm run emulators",
      url: "http://127.0.0.1:8085",
      timeout: 120_000,
      reuseExistingServer: false,
      // The CLI stops its Java emulators on SIGINT; a hard kill would leave them holding the ports.
      gracefulShutdown: { signal: "SIGINT", timeout: 10_000 },
    },
    {
      command: `npm run build && npm run start -- -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      timeout: 300_000,
      reuseExistingServer: false,
      // Process env wins over .env.local, so the app talks to the emulators, never a real project.
      env: {
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-mealmeal",
        NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "127.0.0.1",
        NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        // Admin page: firebase-admin talks to the Firestore emulator; fixed test prices.
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8085",
        ADMIN_EMAILS: "admin@example.com",
        AI_PRICE_INPUT_PER_1M_USD: "0.10",
        AI_PRICE_OUTPUT_PER_1M_USD: "0.40",
      },
    },
  ],
});
