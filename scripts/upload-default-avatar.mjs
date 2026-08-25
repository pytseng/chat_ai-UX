#!/usr/bin/env node
/**
 * Upload the shared default profile picture to R2. The app falls back to this
 * object whenever a profile picture is missing or fails to load.
 * Run: node scripts/upload-default-avatar.mjs
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, BUCKET, loadEnv, uploadToR2 } from "./lib/r2.mjs";

/** Must stay in sync with DEFAULT_AVATAR_KEY in src/components/Avatar.tsx */
const KEY = "secret-stash/avatar/default.png";
const SOURCE = resolve(ROOT, "public/mock-avatar.png");

loadEnv();

if (!existsSync(SOURCE)) {
  console.error(`Missing source image: ${SOURCE}`);
  process.exit(1);
}

const url = uploadToR2(SOURCE, KEY, "image/png");

console.log(`\nUploaded to ${BUCKET}/${KEY}`);
console.log(url);
