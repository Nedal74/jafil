/**
 * Production build (`npm run build`, used by Vercel):
 *   1. prisma generate
 *   2. if DIRECT_URL is set: apply migrations + seed structural config through
 *      that direct/session connection (poolers in transaction mode can't run
 *      migrations), so a fresh Supabase database gets its tables automatically
 *   3. next build
 */
import { resolveDatabaseUrl, resolveDirectUrl } from "../src/lib/db-url.mjs";
import { spawnCmd } from "./spawn-util.mjs";

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCmd(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
  });
}

async function main() {
  await run("npx", ["prisma", "generate"]);

  // Accept the variables injected by Vercel's Supabase/Postgres integration too.
  const pooled = resolveDatabaseUrl();
  if (pooled) process.env.DATABASE_URL = pooled;
  const direct = resolveDirectUrl();
  if (direct) {
    console.log("▶ Applying database migrations (DIRECT_URL) …");
    await run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: direct });
    await run("npx", ["tsx", "prisma/seed.ts"], { DATABASE_URL: direct });
  } else if (process.env.VERCEL) {
    console.warn("⚠ No database configured (DIRECT_URL / POSTGRES_URL_NON_POOLING): migrations were skipped. See DEPLOY-VERCEL-AR.md.");
  }

  await run("npx", ["next", "build"]);
}

main().catch((err) => {
  console.error("✖", err.message);
  process.exit(1);
});
