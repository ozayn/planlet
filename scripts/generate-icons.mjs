#!/usr/bin/env node
/**
 * Generate Planlet PNG icons and favicon from public/logo.svg.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const logoSvg = readFileSync(join(publicDir, "logo.svg"));

const BACKGROUND = "#faf9f7";

async function renderPng(size, options = {}) {
  const { paddingRatio = 0 } = options;

  if (paddingRatio > 0) {
    const inner = Math.round(size * (1 - paddingRatio * 2));
    const inset = Math.round(size * paddingRatio);
    const innerPng = await sharp(logoSvg).resize(inner, inner).png().toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BACKGROUND,
      },
    })
      .composite([{ input: innerPng, left: inset, top: inset }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
  }

  return sharp(logoSvg)
    .resize(size, size)
    .flatten({ background: BACKGROUND })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

function createIcoFromPng(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry[4] = 1;
  entry[6] = 32;
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

async function writeIcon(filename, size, options) {
  const buffer = await renderPng(size, options);
  const path = join(publicDir, filename);
  writeFileSync(path, buffer);
  console.log(`→ ${filename} (${size}×${size})`);
}

async function main() {
  console.log("Planlet — generate icons from public/logo.svg");

  await writeIcon("icon-192.png", 192);
  await writeIcon("icon-512.png", 512);
  await writeIcon("apple-touch-icon.png", 180);
  await writeIcon("oauth-logo.png", 512);
  await writeIcon("icon-512-maskable.png", 512, { paddingRatio: 0.1 });

  const favicon32 = await renderPng(32);
  writeFileSync(join(publicDir, "favicon.ico"), createIcoFromPng(favicon32, 32));
  console.log("→ favicon.ico (32×32 PNG-in-ICO)");

  console.log("✓ Icons generated");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
