#!/usr/bin/env node
/**
 * Vercel project root is the monorepo root, but Next.js builds in `web/`.
 * Copy `web/.next` → `.next` so Vercel can find routes-manifest.json et al.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "web", ".next");
const dest = join(root, ".next");

if (!existsSync(join(src, "routes-manifest.json"))) {
  console.error(
    "sync-vercel-next: web/.next/routes-manifest.json not found. Did the build finish?"
  );
  process.exit(1);
}

try {
  rmSync(dest, { recursive: true, force: true });
} catch {
  // ignore
}

cpSync(src, dest, { recursive: true });
console.log("sync-vercel-next: copied web/.next → .next");
