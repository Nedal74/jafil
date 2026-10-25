/**
 * `npm run dev`: if a database is configured (DATABASE_URL in the environment
 * or in .env), start Next.js normally; otherwise fall back to `npm run local`,
 * which starts the bundled local database first. This avoids the
 * "Environment variable not found: DATABASE_URL" error on a fresh checkout.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnCmd } from "./spawn-util.mjs";

function hasDatabaseUrl() {
  if (process.env.DATABASE_URL) return true;
  if (!existsSync(".env")) return false;
  return /^\s*DATABASE_URL\s*=\s*\S+/m.test(readFileSync(".env", "utf8"));
}

const [cmd, args] = hasDatabaseUrl()
  ? ["npx", ["next", "dev", ...process.argv.slice(2)]]
  : [process.execPath, ["scripts/local.mjs"]];

if (cmd !== "npx") console.log("No DATABASE_URL configured → starting the bundled local database (npm run local).\n");
const child = spawnCmd(cmd, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
