#!/usr/bin/env node
/**
 * Generate PWA icons from public/icon.svg.
 * Requires: npm install -D sharp
 * Usage: node scripts/generate-icons.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icon.svg");

let sharp;

try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Error: sharp is required. Run: npm install -D sharp");
  process.exit(1);
}

const svg = readFileSync(svgPath);

const outputs = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of outputs) {
  const outPath = join(root, "public", file);
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`✓ ${file} (${size}×${size})`);
}

console.log("Icon generation complete.");
