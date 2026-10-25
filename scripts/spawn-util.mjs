import { spawn } from "node:child_process";

const isWin = process.platform === "win32";

/** Quote an argument for cmd.exe (paths with spaces/parentheses, e.g. "aljafil (1)"). */
const quote = (a) => (/[\s"()&^|<>]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

/**
 * Cross-platform spawn. On Windows `npx` is a .cmd shim that needs a shell; we
 * pass a single pre-quoted command line instead of args + shell:true (DEP0190).
 */
export function spawnCmd(cmd, args, options = {}) {
  return isWin
    ? spawn([cmd, ...args].map(quote).join(" "), { ...options, shell: true })
    : spawn(cmd, args, options);
}
