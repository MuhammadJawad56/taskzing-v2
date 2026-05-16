/**
 * Crop store badge PNGs: trim near-white margins, split a combined sheet, remove outer
 * white matte (edge flood), or build dark-mode variants (white text + logos on black).
 * Usage:
 *   node scripts/process-store-badges.mjs trim
 *   node scripts/process-store-badges.mjs dematte
 *   node scripts/process-store-badges.mjs dark
 *   node scripts/process-store-badges.mjs split <path-to-combined.png>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BADGE_DIR = path.join(__dirname, "../public/images/store-badges");

function isNearWhite(r, g, b, threshold = 235) {
  return r >= threshold && g >= threshold && b >= threshold;
}

async function trimFile(absPath) {
  const tmp = absPath + ".tmp.png";
  await sharp(absPath)
    .trim({ threshold: 18 })
    .png({ compressionLevel: 9 })
    .toFile(tmp);
  fs.renameSync(tmp, absPath);
  const m = await sharp(absPath).metadata();
  console.log("trimmed", path.basename(absPath), "→", m.width, "x", m.height);
}

/** True if this pixel can be part of the outer white matte (reachable from image edge). */
function isMattePixel(r, g, b, a) {
  if (a < 200) return false;
  return r >= 170 && g >= 170 && b >= 170 && (r + g + b) / 3 >= 198;
}

/**
 * Remove outer white border by flood-filling from edges through light pixels only.
 * Inner white (text) stays: it is not connected to the edge through only light pixels.
 */
async function dematteFile(absPath) {
  const { data, info } = await sharp(absPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = 4;
  const n = w * h;
  const seen = new Uint8Array(n);
  const q = [];

  function push(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i]) return;
    const o = i * ch;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const a = data[o + 3];
    if (!isMattePixel(r, g, b, a)) return;
    seen[i] = 1;
    q.push(x, y);
  }

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  let qi = 0;
  while (qi < q.length) {
    const x = q[qi++];
    const y = q[qi++];
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbors) push(nx, ny);
  }

  let cleared = 0;
  for (let i = 0; i < n; i++) {
    if (!seen[i]) continue;
    data[i * ch + 3] = 0;
    cleared++;
  }

  const tmp = absPath + ".tmp.png";
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(tmp);
  fs.renameSync(tmp, absPath);
  console.log("dematte", path.basename(absPath), "cleared", cleared, "edge-connected light pixels");
}

/** Non-black interior → white (for dark-mode badge assets). Keeps dark pill + antialias. */
function whiteOutNonBlack(data, w, h, blackMax = 72) {
  const ch = 4;
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const o = i * ch;
    const a = data[o + 3];
    if (a < 15) continue;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const mx = r > g ? r : g;
    const m = mx > b ? mx : b;
    if (m > blackMax) {
      data[o] = 255;
      data[o + 1] = 255;
      data[o + 2] = 255;
    }
  }
}

async function writeDarkVariant(colorPath, outPath) {
  const { data, info } = await sharp(colorPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const copy = Buffer.from(data);
  whiteOutNonBlack(copy, w, h);
  await sharp(copy, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log("dark variant →", path.basename(outPath));
}

async function splitCombined(combinedPath) {
  const { data, info } = await sharp(combinedPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const rowDark = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    let cnt = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (!isNearWhite(r, g, b, 232)) cnt++;
    }
    rowDark[y] = cnt;
  }

  const minRowPixels = Math.max(12, Math.floor(w * 0.02));
  const ranges = [];
  let start = -1;
  for (let y = 0; y < h; y++) {
    if (rowDark[y] >= minRowPixels) {
      if (start < 0) start = y;
    } else if (start >= 0) {
      if (y - start > 8) ranges.push([start, y - 1]);
      start = -1;
    }
  }
  if (start >= 0 && h - start > 8) ranges.push([start, h - 1]);

  const merged = [];
  for (const [a, b] of ranges) {
    const last = merged[merged.length - 1];
    if (last && a - last[1] <= 24) last[1] = b;
    else merged.push([a, b]);
  }

  const big = merged.filter(([a, b]) => b - a > h * 0.04);
  if (big.length < 2) {
    console.error(
      "Expected 2 vertical badge regions, found",
      big.length,
      "(ranges:",
      merged.length,
      ")"
    );
    process.exit(1);
  }

  big.sort((u, v) => u[0] - v[0]);
  const bandTop = big[0];
  const bandBottom = big[1];

  function bboxForRows(y0, y1) {
    let minX = w;
    let maxX = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * ch;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (!isNearWhite(r, g, b, 232)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    const pad = 2;
    return {
      left: Math.max(0, minX - pad),
      top: Math.max(0, y0 - pad),
      width: Math.min(w - Math.max(0, minX - pad), maxX - minX + 1 + 2 * pad),
      height: Math.min(h - Math.max(0, y0 - pad), y1 - y0 + 1 + 2 * pad),
    };
  }

  const boxPlay = bboxForRows(bandTop[0], bandTop[1]);
  const boxApple = bboxForRows(bandBottom[0], bandBottom[1]);
  for (const [label, box] of [
    ["google-play", boxPlay],
    ["app-store", boxApple],
  ]) {
    const { left, top: t, width, height } = box;
    if (
      width < 1 ||
      height < 1 ||
      left < 0 ||
      t < 0 ||
      left + width > w ||
      t + height > h
    ) {
      console.error("bad bbox", label, box, "image", w, h);
      process.exit(1);
    }
  }

  const playOut = path.join(BADGE_DIR, "google-play.png");
  const appleOut = path.join(BADGE_DIR, "app-store.png");

  // Avoid .trim() on the extract pipeline — libvips can error on very small crops.
  await sharp(combinedPath)
    .extract(boxPlay)
    .png({ compressionLevel: 9 })
    .toFile(playOut);

  await sharp(combinedPath)
    .extract(boxApple)
    .png({ compressionLevel: 9 })
    .toFile(appleOut);

  await trimFile(playOut);
  await trimFile(appleOut);

  console.log("google-play.png ← top region", boxPlay);
  console.log("app-store.png ← bottom region", boxApple);
}

const mode = process.argv[2] || "trim";

if (mode === "split") {
  const p = process.argv[3];
  if (!p || !fs.existsSync(p)) {
    console.error("Usage: node scripts/process-store-badges.mjs split <combined.png>");
    process.exit(1);
  }
  if (!fs.existsSync(BADGE_DIR)) fs.mkdirSync(BADGE_DIR, { recursive: true });
  await splitCombined(p);
} else if (mode === "dematte") {
  for (const name of ["google-play.png", "app-store.png"]) {
    const p = path.join(BADGE_DIR, name);
    if (!fs.existsSync(p)) {
      console.warn("skip missing", p);
      continue;
    }
    await dematteFile(p);
  }
} else if (mode === "dark") {
  for (const name of ["google-play.png", "app-store.png"]) {
    const p = path.join(BADGE_DIR, name);
    if (!fs.existsSync(p)) {
      console.warn("skip missing", p);
      continue;
    }
    const base = name.replace(/\.png$/i, "");
    const out = path.join(BADGE_DIR, `${base}-dark.png`);
    await writeDarkVariant(p, out);
  }
} else if (mode === "prepare") {
  for (const name of ["google-play.png", "app-store.png"]) {
    const p = path.join(BADGE_DIR, name);
    if (!fs.existsSync(p)) {
      console.warn("skip missing", p);
      continue;
    }
    await dematteFile(p);
    const base = name.replace(/\.png$/i, "");
    await writeDarkVariant(p, path.join(BADGE_DIR, `${base}-dark.png`));
  }
} else {
  for (const name of ["google-play.png", "app-store.png"]) {
    const p = path.join(BADGE_DIR, name);
    if (!fs.existsSync(p)) {
      console.warn("skip missing", p);
      continue;
    }
    await trimFile(p);
  }
}
