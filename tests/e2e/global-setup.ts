import { execSync } from "node:child_process";

export default function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://aljafil:aljafil@localhost:5432/aljafil_test";
  if (!/test/.test(url)) throw new Error("E2E must run against a test database");
  execSync("npx tsx tests/e2e/seed-e2e.ts", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
