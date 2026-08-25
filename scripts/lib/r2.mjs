/** Shared R2 helpers for the seed/upload scripts. */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const BUCKET = process.env.R2_BUCKET || "portfolio-2026";

export const PUBLIC_BASE = (
  process.env.VITE_MEDIA_BASE ||
  "https://pub-e857b78d4e654544828a835e6f04f543.r2.dev"
).replace(/\/$/, "");

/** Pull credentials from the app env or the sibling portfolio project. */
export function loadEnv() {
  for (const path of [
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env"),
    resolve(ROOT, "../../Projects/Portfolio-2026/.env.local"),
    resolve(ROOT, "../../Projects/Portfolio-2026/.env"),
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

export function uploadToR2(localPath, key, contentType) {
  const status = spawnSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${BUCKET}/${key}`,
      "--file",
      localPath,
      "--remote",
      "--content-type",
      contentType,
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env }
  ).status;
  if (status !== 0) throw new Error(`upload failed: ${key}`);
  return `${PUBLIC_BASE}/${key}`;
}
