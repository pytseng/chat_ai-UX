#!/usr/bin/env node
/**
 * Download representative item photos and upload to R2 (secret-stash/inventory/).
 * Run: node scripts/seed-inventory-images.mjs
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = resolve(root, "scripts/.inventory-cache");
const bucket = process.env.R2_BUCKET || "portfolio-2026";

const u = (photoId) =>
  `https://images.unsplash.com/photo-${photoId}?w=480&h=480&fit=crop&q=85`;

/** Unsplash product-style photos — verified HTTP 200 IDs only */
const IMAGE_SOURCES = {
  "li-t1": u("1556821840-3a63f95609a7"),
  "li-t2": u("1544022613-e87ca75a784a"),
  "li-t3": u("1618354691373-d851c5c3a990"),
  "li-t4": u("1544022613-e87ca75a784a"),
  "li-t5": u("1591047139829-d91aecb6caea"),
  "li-t6": u("1591047139829-d91aecb6caea"),
  "li-t7": u("1434389677669-e08b4cac3105"),
  "li-t8": u("1594938298603-c8148c4dae35"),
  "li-t9": u("1618354691373-d851c5c3a990"),
  "li-b1": u("1542291026-7eec264c27ff"),
  "li-b2": u("1594938298603-c8148c4dae35"),
  "li-b3": u("1434389677669-e08b4cac3105"),
  "li-b4": u("1551698618-1dfe5d97d256"),
  "li-b5": u("1594938298603-c8148c4dae35"),
  "li-b6": u("1551698618-1dfe5d97d256"),
  "li-b7": u("1490481651871-ab68de25d43d"),
  "li-i1": u("1618354691373-d851c5c3a990"),
  "li-i2": u("1542291026-7eec264c27ff"),
  "li-i3": u("1618354691373-d851c5c3a990"),
  "li-i4": u("1618354691373-d851c5c3a990"),
  "li-i5": u("1618354691373-d851c5c3a990"),
  "li-i6": u("1542291026-7eec264c27ff"),
  "li-a1": u("1521369909029-2afed882baee"),
  "li-a2": u("1601925260368-ae2f83cf8b7f"),
  "li-a3": u("1562157873-818bc0726f68"),
  "li-a4": u("1601925260368-ae2f83cf8b7f"),
  "li-a5": u("1601925260368-ae2f83cf8b7f"),
  "li-a6": u("1521369909029-2afed882baee"),
  "li-a7": u("1523275335684-37898b6baf30"),
  "li-a8": u("1523275335684-37898b6baf30"),
  "li-g1": u("1553062407-98eeb64c6a62"),
  "li-g2": u("1578662996442-48f60103fc96"),
  "li-g3": u("1578662996442-48f60103fc96"),
  "li-g4": u("1602143407151-7111542de6e8"),
  "li-g5": u("1591047139829-d91aecb6caea"),
  "li-g6": u("1553062407-98eeb64c6a62"),
  "li-g7": u("1553062407-98eeb64c6a62"),
  "li-g8": u("1556228720-195a672e8a03"),
  "li-g9": u("1602143407151-7111542de6e8"),
  "li-g10": u("1556228720-195a672e8a03"),
  "li-o1": u("1583394838336-acd977736f90"),
  "li-o2": u("1583394838336-acd977736f90"),
  "li-o3": u("1609091839311-d5365f9ff1c5"),
  "li-o4": u("1516035069371-29a1b244cc32"),
  "li-o5": u("1556228578-8c89e6adf883"),
  "li-o6": u("1556228578-8c89e6adf883"),
  "li-o7": u("1490481651871-ab68de25d43d"),
  "li-o8": u("1583394838336-acd977736f90"),
  "li-o9": u("1556228578-8c89e6adf883"),
  "li-o10": u("1556228578-8c89e6adf883"),
  "li-o11": u("1556228578-8c89e6adf883"),
  "li-o12": u("1516035069371-29a1b244cc32"),
};

function loadEnv() {
  for (const path of [
    resolve(root, ".env.local"),
    resolve(root, ".env"),
    resolve(root, "../../Projects/Portfolio-2026/.env.local"),
    resolve(root, "../../Projects/Portfolio-2026/.env"),
  ]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function download(id, url) {
  const out = resolve(cacheDir, `${id}.jpg`);
  const res = await fetch(url, {
    headers: { "User-Agent": "SecretStash-inventory-seed/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  return out;
}

function upload(localPath, key) {
  const status = spawnSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      "--file",
      localPath,
      "--remote",
      "--content-type",
      "image/jpeg",
    ],
    { cwd: root, stdio: "inherit", env: process.env, shell: process.platform === "win32" }
  ).status;
  if (status !== 0) throw new Error(`upload ${key}`);
}

loadEnv();
mkdirSync(cacheDir, { recursive: true });

let ok = 0;
let fail = 0;

for (const [id, url] of Object.entries(IMAGE_SOURCES)) {
  const key = `secret-stash/inventory/${id}.jpg`;
  try {
    process.stdout.write(`${id} … `);
    const local = await download(id, url);
    upload(local, key);
    ok++;
    console.log("ok");
  } catch (err) {
    fail++;
    console.log(`fail (${err.message})`);
  }
}

console.log(`\n${ok}/${Object.keys(IMAGE_SOURCES).length} uploaded.`);
process.exit(fail > 0 ? 1 : 0);
