/**
 * Creates (or resets) a Super Admin account.
 *
 *   npm run admin:create -- --email you@aljafil.com --name "Your Name"
 *
 * The password is read from ADMIN_PASSWORD or prompted for (input hidden).
 * It is never printed or logged.
 */
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";

import { hashPassword, passwordPolicyError } from "../src/lib/auth/password";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  out._writeToOutput = (s: string) => {
    if (s.includes(question)) out.output.write(s);
  };
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    }),
  );
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Administrator";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Pass a valid --email");
  const password = process.env.ADMIN_PASSWORD || (await promptHidden("Password: "));
  const err = passwordPolicyError(password);
  if (err) throw new Error("Password must be at least 10 characters and contain letters and digits");

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name, role: "SUPER_ADMIN", passwordHash },
      update: { passwordHash, role: "SUPER_ADMIN", active: true },
    });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.create({ data: { action: "cli_admin", entity: "user", entityId: user.id, summary: `Super Admin set via CLI: ${email}` } });
    console.log(`Super Admin ready: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
