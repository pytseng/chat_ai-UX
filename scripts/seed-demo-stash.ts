#!/usr/bin/env node
/**
 * Search for packshot-style product photos, composite them on white, and
 * upload to R2 as secret-stash/demo/{id}.jpg.
 *
 *   npx tsx scripts/seed-demo-stash.ts            # search, process, upload
 *   npx tsx scripts/seed-demo-stash.ts --dry-run  # print chosen URLs only
 *   npx tsx scripts/seed-demo-stash.ts --process  # write local cache, skip R2
 *   npx tsx scripts/seed-demo-stash.ts --upload   # upload existing cache
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEMO_STASH_SPECS,
  demoItemImageKey,
  type DemoStashSpec,
} from "../src/lib/demoStash.ts";
import { PUBLIC_BASE, ROOT, loadEnv, uploadToR2 } from "./lib/r2.mjs";

const CACHE = resolve(ROOT, "scripts/.demo-stash-cache");
const SIZE = 800;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const REJECT_TITLE =
  /\b(models?|wearing|worn|on[- ]model|on a (?:man|woman|person)|portrait|campfire|couple|family|people|outfit of|review|blog|youtube|diagram|illustration|line drawing|uni adapt)\b|lifestyle|_lifestyle/i;

const TRUSTED_HOSTS = [
  "patagonia.com",
  "arcteryx.com",
  "outdoorresearch.com",
  "rei.com",
  "backcountry.com",
  "moosejaw.com",
  "osprey.com",
  "petzl.com",
  "sawyer.com",
  "smartwool.com",
  "darntough.com",
  "salomon.com",
  "bedrocksandals.com",
  "anker.com",
  "officedepot.com",
];

type Candidate = {
  title: string;
  imageUrl: string;
  source?: string;
  width?: number;
  height?: number;
  kind: "images" | "shopping";
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const processOnly = args.has("--process");
const uploadOnly = args.has("--upload");
const idArg = process.argv.find((arg) => arg.startsWith("--ids="));
const onlyIds = idArg
  ? new Set(idArg.slice("--ids=".length).split(",").filter(Boolean))
  : null;

loadEnv();

async function ensureSharp() {
  try {
    return await import("sharp");
  } catch {
    console.log("Installing sharp (one-off, not saved to package.json)…");
    const status = spawnSync(
      "npm",
      ["install", "sharp", "--no-save", "--no-package-lock"],
      { cwd: ROOT, stdio: "inherit" }
    ).status;
    if (status !== 0) throw new Error("Could not install sharp");
    return import("sharp");
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isTrusted(url: string): boolean {
  const host = hostOf(url);
  return TRUSTED_HOSTS.some(
    (trusted) => host === trusted || host.endsWith(`.${trusted}`)
  );
}

function haystack(candidate: Candidate): string {
  return `${candidate.title} ${candidate.source ?? ""} ${candidate.imageUrl}`.toLowerCase();
}

function matchesRequired(candidate: Candidate, spec: DemoStashSpec): boolean {
  const hay = haystack(candidate);
  return spec.mustMatch.every((token) => hay.includes(token.toLowerCase()));
}

function scoreCandidate(candidate: Candidate, spec: DemoStashSpec): number {
  if (spec.imageUrl && candidate.imageUrl === spec.imageUrl) return 100;
  if (!matchesRequired(candidate, spec)) return -100;
  let score = 0;
  const hay = haystack(candidate);

  if (REJECT_TITLE.test(hay)) return -100;
  if (isTrusted(candidate.imageUrl) || isTrusted(candidate.source ?? "")) {
    score += 10;
  }
  if (/\b(white background|packshot|cut.?out|isolated|studio|front-view|front view)\b/i.test(hay)) {
    score += 6;
  }
  if (candidate.kind === "shopping") score += 3;
  if ((candidate.width ?? 0) >= 400) score += 2;
  if ((candidate.width ?? 0) >= 800) score += 2;

  const tokens = spec.query
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/\s+/)
    .filter((token) => token.length > 2);
  for (const token of tokens) {
    if (hay.replace(/['’]/g, "").includes(token)) score += 1;
  }
  return score;
}

async function searchGoogleImages(
  query: string,
  apiKey: string
): Promise<Candidate[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set(
    "q",
    `${query} product "white background" -model -wearing -person`
  );
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  url.searchParams.set("img_color", "white");
  url.searchParams.set("img_size", "large");
  url.searchParams.set("num", "20");

  const response = await fetch(url);
  if (!response.ok) return [];
  const data = (await response.json()) as {
    images_results?: Array<{
      title?: string;
      original?: string;
      thumbnail?: string;
      link?: string;
      source?: string;
      original_width?: number;
      original_height?: number;
    }>;
  };

  return (data.images_results ?? [])
    .map((item) => ({
      title: item.title ?? "",
      imageUrl: item.original ?? item.thumbnail ?? "",
      source: item.link ?? item.source,
      width: item.original_width,
      height: item.original_height,
      kind: "images" as const,
    }))
    .filter((item) => item.imageUrl.startsWith("http"));
}

async function searchGoogleShopping(
  query: string,
  apiKey: string
): Promise<Candidate[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", `${query} men's`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  url.searchParams.set("num", "12");

  const response = await fetch(url);
  if (!response.ok) return [];
  const data = (await response.json()) as {
    shopping_results?: Array<{
      title?: string;
      thumbnail?: string;
      thumbnails?: string[];
      product_link?: string;
      link?: string;
    }>;
  };

  return (data.shopping_results ?? [])
    .map((item) => ({
      title: item.title ?? "",
      imageUrl: item.thumbnail ?? item.thumbnails?.[0] ?? "",
      source: item.product_link ?? item.link,
      kind: "shopping" as const,
    }))
    .filter((item) => item.imageUrl.startsWith("http"));
}

async function gatherCandidates(
  spec: DemoStashSpec,
  apiKey: string
): Promise<Candidate[]> {
  const [images, shopping] = await Promise.all([
    searchGoogleImages(spec.query, apiKey),
    searchGoogleShopping(spec.query, apiKey),
  ]);
  const merged = [...images, ...shopping];
  const seen = new Set<string>();
  const unique: Candidate[] = [];
  if (spec.imageUrl) {
    unique.push({
      title: spec.name,
      imageUrl: spec.imageUrl,
      kind: "images",
    });
  }
  for (const candidate of merged) {
    if (seen.has(candidate.imageUrl)) continue;
    seen.add(candidate.imageUrl);
    unique.push(candidate);
  }
  return unique.sort(
    (a, b) => scoreCandidate(b, spec) - scoreCandidate(a, spec)
  );
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.google.com/",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (type && !type.startsWith("image/") && type !== "application/octet-stream") {
      return null;
    }
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.byteLength < 2000) return null;
    return buf;
  } catch {
    return null;
  }
}

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sampleCorners(
  data: Buffer,
  width: number,
  height: number
): { luma: number; spread: number; color: [number, number, number] } {
  const inset = Math.max(2, Math.floor(Math.min(width, height) * 0.03));
  const points: Array<[number, number]> = [
    [inset, inset],
    [width - 1 - inset, inset],
    [inset, height - 1 - inset],
    [width - 1 - inset, height - 1 - inset],
  ];
  const colors: Array<[number, number, number]> = points.map(([x, y]) => {
    const i = (y * width + x) * 4;
    return [data[i]!, data[i + 1]!, data[i + 2]!];
  });
  const lumas = colors.map(([r, g, b]) => luma(r, g, b));
  const avgLuma = lumas.reduce((a, b) => a + b, 0) / lumas.length;
  const spread = Math.max(...lumas) - Math.min(...lumas);
  const color: [number, number, number] = [
    Math.round(colors.reduce((s, c) => s + c[0], 0) / 4),
    Math.round(colors.reduce((s, c) => s + c[1], 0) / 4),
    Math.round(colors.reduce((s, c) => s + c[2], 0) / 4),
  ];
  return { luma: avgLuma, spread, color };
}

function isSkin(r: number, g: number, b: number): boolean {
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    r > g &&
    r > b &&
    r - g > 15 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 15
  );
}

function hasPerson(data: Buffer, width: number, height: number): boolean {
  let skin = 0;
  let sampled = 0;
  const x0 = Math.floor(width * 0.22);
  const x1 = Math.floor(width * 0.78);
  const y0 = Math.floor(height * 0.08);
  const y1 = Math.floor(height * 0.72);
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      const i = (y * width + x) * 4;
      sampled++;
      if (isSkin(data[i]!, data[i + 1]!, data[i + 2]!)) skin++;
    }
  }
  return sampled > 0 && skin / sampled > 0.06;
}

function looksLikePackshot(
  data: Buffer,
  width: number,
  height: number
): boolean {
  const corners = sampleCorners(data, width, height);
  if (corners.luma < 200 || corners.spread > 40) return false;
  if (hasPerson(data, width, height)) return false;
  return true;
}

function floodToWhite(
  data: Buffer,
  width: number,
  height: number,
  bg: [number, number, number]
): Buffer {
  const n = width * height;
  const out = Buffer.from(data);
  const seen = new Uint8Array(n);
  const queue: number[] = [];
  const threshold = 48;

  const isBg = (i: number) => {
    const o = i * 4;
    const dr = Math.abs(out[o]! - bg[0]);
    const dg = Math.abs(out[o + 1]! - bg[1]);
    const db = Math.abs(out[o + 2]! - bg[2]);
    return dr + dg + db <= threshold;
  };

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (seen[i]) return;
    if (!isBg(i)) return;
    seen[i] = 1;
    queue.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length) {
    const i = queue.pop()!;
    const x = i % width;
    const y = Math.floor(i / width);
    const o = i * 4;
    out[o] = 255;
    out[o + 1] = 255;
    out[o + 2] = 255;
    out[o + 3] = 255;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  return out;
}

async function toWhiteSquare(
  sharpMod: typeof import("sharp"),
  input: Buffer
): Promise<Buffer> {
  const sharp = sharpMod.default;
  const decoded = await sharp(input, { failOn: "none" })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const corners = sampleCorners(
    decoded.data,
    decoded.info.width,
    decoded.info.height
  );
  const isolated = floodToWhite(
    decoded.data,
    decoded.info.width,
    decoded.info.height,
    corners.color
  );

  const png = await sharp(isolated, {
    raw: {
      width: decoded.info.width,
      height: decoded.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  return sharp(png)
    .trim({ background: "#ffffff", threshold: 12 })
    .resize(SIZE, SIZE, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

async function pickAndProcess(
  spec: DemoStashSpec,
  candidates: Candidate[],
  sharpMod: typeof import("sharp")
): Promise<{ buffer: Buffer; from: Candidate } | null> {
  const ranked = candidates.filter((c) => scoreCandidate(c, spec) > 0);
  for (const candidate of ranked.slice(0, 12)) {
    const raw = await downloadImage(candidate.imageUrl);
    if (!raw) continue;
    try {
      const sharp = sharpMod.default;
      const preview = await sharp(raw, { failOn: "none" })
        .rotate()
        .ensureAlpha()
        .resize(400, 400, { fit: "inside" })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const isOverride =
        Boolean(spec.imageUrl) && candidate.imageUrl === spec.imageUrl;
      if (
        !isOverride &&
        !looksLikePackshot(
          preview.data,
          preview.info.width,
          preview.info.height
        )
      ) {
        continue;
      }
      const buffer = await toWhiteSquare(sharpMod, raw);
      return { buffer, from: candidate };
    } catch {
      continue;
    }
  }
  return null;
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const apiKey = process.env.SERPAPI_KEY;
  if (!uploadOnly && !apiKey) {
    throw new Error("SERPAPI_KEY is missing");
  }

  const sharpMod = uploadOnly ? null : await ensureSharp();
  const manifest: Array<{
    id: string;
    name: string;
    key: string;
    url: string;
    source?: string;
  }> = [];

  const specs = onlyIds
    ? DEMO_STASH_SPECS.filter((spec) => onlyIds.has(spec.id))
    : DEMO_STASH_SPECS;
  if (specs.length === 0) {
    throw new Error("No matching demo ids");
  }

  for (const spec of specs) {
    const outPath = resolve(CACHE, `${spec.id}.jpg`);
    const key = demoItemImageKey(spec.id);

    if (uploadOnly) {
      if (!existsSync(outPath)) {
        throw new Error(`Missing processed file: ${outPath}`);
      }
      const url = uploadToR2(outPath, key, "image/jpeg");
      console.log(`uploaded ${spec.id} → ${url}`);
      manifest.push({ id: spec.id, name: spec.name, key, url });
      continue;
    }

    console.log(`\n▸ ${spec.id}  ${spec.query}`);
    const candidates =
      spec.imageUrl && !dryRun
        ? [
            {
              title: spec.name,
              imageUrl: spec.imageUrl,
              kind: "images" as const,
            },
          ]
        : await gatherCandidates(spec, apiKey!);
    const top = candidates.slice(0, 5);
    for (const [i, c] of top.entries()) {
      console.log(
        `  ${i + 1}. [${scoreCandidate(c, spec)}] ${c.kind} ${c.title.slice(0, 70)}`
      );
      console.log(`     ${c.imageUrl.slice(0, 120)}`);
    }

    if (dryRun) continue;
    if (!sharpMod) throw new Error("sharp failed to load");

    const picked = await pickAndProcess(spec, candidates, sharpMod);
    if (!picked) {
      console.warn(`  ! no usable image for ${spec.id}`);
      continue;
    }
    writeFileSync(outPath, picked.buffer);
    console.log(
      `  saved ${outPath}  from ${picked.from.title.slice(0, 60)}`
    );

    if (processOnly) {
      manifest.push({
        id: spec.id,
        name: spec.name,
        key,
        url: outPath,
        source: picked.from.imageUrl,
      });
      continue;
    }

    const url = uploadToR2(outPath, key, "image/jpeg");
    console.log(`  uploaded ${url}`);
    manifest.push({
      id: spec.id,
      name: spec.name,
      key,
      url,
      source: picked.from.imageUrl,
    });
  }

  if (!dryRun) {
    const manifestPath = resolve(CACHE, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nWrote ${manifestPath}`);
    console.log(`Public base: ${PUBLIC_BASE}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
