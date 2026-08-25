#!/usr/bin/env node
/**
 * Upload the captured Inventory panel docs to R2 under secret-stash/docs/inventory/.
 * Run: node scripts/capture-inventory-docs.mjs && node scripts/upload-inventory-docs.mjs
 */

import { existsSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { ROOT, BUCKET, loadEnv, uploadToR2 } from "./lib/r2.mjs";

const srcDir = resolve(ROOT, "scripts/.inventory-docs");
const prefix = "secret-stash/docs/inventory";

const CONTENT_TYPE = { ".png": "image/png", ".gif": "image/gif" };

loadEnv();

if (!existsSync(srcDir)) {
  console.error(`No captures found at ${srcDir}. Run capture-inventory-docs.mjs first.`);
  process.exit(1);
}

const files = readdirSync(srcDir)
  .filter((f) => CONTENT_TYPE[extname(f)])
  .sort();

const urls = [];
let fail = 0;

for (const file of files) {
  const key = `${prefix}/${file}`;
  try {
    urls.push(uploadToR2(resolve(srcDir, file), key, CONTENT_TYPE[extname(file)]));
  } catch (err) {
    fail++;
    console.error(`  ${file}: ${err.message}`);
  }
}

console.log(`\n${urls.length}/${files.length} uploaded to ${BUCKET}/${prefix}/\n`);
for (const url of urls) console.log(url);

process.exit(fail > 0 ? 1 : 0);
