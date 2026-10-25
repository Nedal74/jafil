import { defineConfig } from "@playwright/test";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://aljafil:aljafil@localhost:5432/aljafil_test";
const PORT = 3200;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    // Requires a prior `npm run build`.
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: { DATABASE_URL: TEST_DB, NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, STORAGE_DIR: "./storage/test-uploads", ANTHROPIC_API_KEY: "" },
  },
});
