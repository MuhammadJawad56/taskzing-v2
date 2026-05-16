/**
 * Regenerates public favicon + PWA icons from the light-mode TaskZing logo.
 * Run: node scripts/generate-favicons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const toIco = require("to-ico");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const src = path.join(publicDir, "images", "logos", "Taskzing-Logo-light-mode_1.png");

async function writeSquarePng(filename, size) {
  await sharp(src)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(path.join(publicDir, filename));
}

async function main() {
  if (!fs.existsSync(src)) {
    console.error("Missing source logo:", src);
    process.exit(1);
  }

  await writeSquarePng("favicon-16x16.png", 16);
  await writeSquarePng("favicon-32x32.png", 32);
  await writeSquarePng("apple-touch-icon.png", 180);
  await writeSquarePng("android-chrome-192x192.png", 192);
  await writeSquarePng("android-chrome-512x512.png", 512);

  const buf16 = await fs.promises.readFile(path.join(publicDir, "favicon-16x16.png"));
  const buf32 = await fs.promises.readFile(path.join(publicDir, "favicon-32x32.png"));
  const ico = await toIco([buf16, buf32]);
  await fs.promises.writeFile(path.join(publicDir, "favicon.ico"), ico);

  console.log("Updated favicon + touch / PWA icons from light-mode logo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
