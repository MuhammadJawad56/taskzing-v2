#!/usr/bin/env node
/**
 * Production build for Vercel. Removes `.next` (and webpack cache) first so a
 * stale or partial output dir cannot cause "Cannot find module './NNNN.js'".
 */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const dir of [".next", "node_modules/.cache"]) {
  try {
    rmSync(join(root, dir), { recursive: true, force: true });
  } catch {
    // ignore
  }
}

execSync("npm run build", { stdio: "inherit", cwd: root, env: process.env });
