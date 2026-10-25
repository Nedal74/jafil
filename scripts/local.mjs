/**
 * One-command local preview with NO database to install:
 *
 *   npm run local        (or `npm run dev` when no DATABASE_URL is configured)
 *
 * Runs PGlite — PostgreSQL compiled to WebAssembly, executed inside Node — and
 * exposes it on 127.0.0.1:5433 through the Postgres wire protocol so Prisma can
 * connect normally. No native binaries, so it behaves the same on Windows,
 * macOS and Linux, whatever the folder path. Data persists in ./storage/pglite.
 *
 * Then: apply migrations, seed structural config, create a local admin on the
 * first run, and start the Next.js dev server. Ctrl+C stops everything.
 * For local preview only — production uses a real PostgreSQL server.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { spawnCmd } from "./spawn-util.mjs";

const PORT = Number(process.env.LOCAL_PG_PORT || 5433);
const DATA_DIR = path.resolve("storage", "pglite");
// PGlite is a single shared backend: one pooled connection keeps transactions
// isolated, and pgbouncer=true makes Prisma use unnamed prepared statements so
// separate processes (migrate, seed, dev server) do not collide on "s0", "s1"…
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?sslmode=disable&connection_limit=1&pgbouncer=true`;
const ADMIN_EMAIL = "admin@aljafil.local";
const ADMIN_PASSWORD = "Aljafil12345";

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCmd(cmd, args, { stdio: "inherit", env: { ...process.env, DATABASE_URL, ...env } });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
  });
}

function ensureEnvFile() {
  const file = path.resolve(".env");
  const content = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (!/^NEXT_PUBLIC_SITE_URL=/m.test(content)) {
    writeFileSync(file, `${content}${content && !content.endsWith("\n") ? "\n" : ""}NEXT_PUBLIC_SITE_URL=http://localhost:3000\n`);
  }
}

let server;
let db;
async function stopDb() {
  await server?.stop().catch(() => {});
  await db?.close().catch(() => {});
}

async function main() {
  ensureEnvFile();
  mkdirSync(DATA_DIR, { recursive: true });
  console.log(`▶ Starting local database (PGlite) on 127.0.0.1:${PORT} …`);
  db = await PGlite.create({ dataDir: DATA_DIR });
  server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 20 });
  await server.start();

  console.log("▶ Applying database migrations …");
  await run("npx", ["prisma", "migrate", "deploy"]);
  await run("npx", ["tsx", "prisma/seed.ts"]);

  const users = await db.query('SELECT count(*)::int AS n FROM "User"');
  if (users.rows[0].n === 0) {
    await run("npx", ["tsx", "scripts/create-admin.ts", "--email", ADMIN_EMAIL, "--name", "Admin"], { ADMIN_PASSWORD });
    console.log(`\n  Local admin → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  (change it from /admin/users)\n`);
  }

  const port = process.env.PORT || "3000";
  console.log(`▶ Starting the website → http://localhost:${port}  (dashboard: /admin)\n`);
  const next = spawnCmd("npx", ["next", "dev", "-p", port], { stdio: "inherit", env: { ...process.env, DATABASE_URL } });

  const shutdown = async () => {
    next.kill();
    await stopDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  next.on("exit", shutdown);
}

main().catch(async (err) => {
  console.error("\n✖", err?.message ?? err);
  if (err?.code === "EADDRINUSE") console.error(`  Port ${PORT} is busy. Close the other program or set LOCAL_PG_PORT to another port.`);
  await stopDb();
  process.exit(1);
});
