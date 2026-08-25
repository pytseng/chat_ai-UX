#!/usr/bin/env node
/**
 * Capture reference screenshots + GIFs of the Inventory panel's two views,
 * before the panel gets reworked. Output lands in scripts/.inventory-docs/.
 *
 * Run: node scripts/capture-inventory-docs.mjs [baseUrl]
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "scripts/.inventory-docs");
const videoDir = resolve(outDir, "video");
const BASE = process.argv[2] ?? "http://localhost:4173";

const VIEWPORT = { width: 430, height: 932 };

const SEL = {
  openInventory: 'button[aria-label="Open inventory"]',
  sheet: ".inventory-panel__sheet",
  viewSelect: ".inventory-panel__select",
  listTabs: ".list-inventory__tabs .pack-tabs__tab",
  search: ".list-inventory__search",
  categoryBtn: 'button[aria-label^="Change category for"]',
  moveChip: ".list-inventory__move-chip",
  gameCard: ".game-inv__card",
  gameTabs: ".game-inv__tabs .pack-tabs__tab",
  slotEmpty: ".game-inv__slot-empty",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openPanel(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.click(SEL.openInventory);
  await page.waitForSelector(SEL.sheet);
  await page.waitForTimeout(700);
}

async function selectView(page, value) {
  await page.selectOption(SEL.viewSelect, value);
  await page.waitForTimeout(600);
}

/** Wait for every <img> currently in the panel to finish loading. */
async function settleImages(page) {
  await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll(".inventory-panel__sheet img")).every(
          (img) => img.complete
        ),
      null,
      { timeout: 15000 }
    )
    .catch(() => {});
  await page.waitForTimeout(400);
}

async function shoot(browser, name, steps) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await openPanel(page);
  await steps(page);
  await settleImages(page);
  await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  await context.close();
  console.log(`  ${name}.png`);
}

async function record(browser, name, steps) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await steps(page);
  await page.waitForTimeout(600);
  await context.close();

  // Playwright names videos by an internal id; grab the newest webm.
  const webms = readdirSync(videoDir)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => resolve(videoDir, f));
  const latest = webms.sort()[webms.length - 1];
  const target = resolve(videoDir, `${name}.webm`);
  if (latest !== target) renameSync(latest, target);

  const gif = resolve(outDir, `${name}.gif`);
  const filter =
    "fps=12,scale=390:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3";
  const res = spawnSync(
    ffmpegPath,
    ["-y", "-i", target, "-vf", filter, "-loop", "0", gif],
    { stdio: "pipe" }
  );
  if (res.status !== 0) {
    throw new Error(`ffmpeg failed for ${name}: ${res.stderr?.toString().slice(-500)}`);
  }
  console.log(`  ${name}.gif`);
}

const only = process.argv.includes("--gifs-only")
  ? "gifs"
  : process.argv.includes("--shots-only")
    ? "shots"
    : "all";

if (only === "all") rmSync(outDir, { recursive: true, force: true });
mkdirSync(videoDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

if (only !== "gifs") {
console.log("Screenshots:");

await shoot(browser, "inventory-list", async () => {});

await shoot(browser, "inventory-list-category", async (page) => {
  await page.locator(SEL.categoryBtn).nth(1).click();
  await page.waitForTimeout(450);
});

await shoot(browser, "inventory-game", async (page) => {
  await selectView(page, "game-inventory");
});

await shoot(browser, "inventory-game-packed", async (page) => {
  await selectView(page, "game-inventory");
  await settleImages(page);
  for (const idx of [0, 1]) {
    await page.locator(SEL.gameCard).nth(idx).click();
    await page.waitForTimeout(350);
  }
  // Pull in a couple of other categories so more slots are filled
  for (const tab of ["Bottom", "Gear"]) {
    await page.locator(SEL.gameTabs, { hasText: tab }).first().click();
    await page.waitForTimeout(400);
    await settleImages(page);
    await page.locator(SEL.gameCard).first().click();
    await page.waitForTimeout(350);
  }
});
}

if (only !== "shots") {
console.log("GIFs:");

await record(browser, "inventory-switch", async (page) => {
  await page.click(SEL.openInventory);
  await page.waitForSelector(SEL.sheet);
  await page.waitForTimeout(1200);
  await selectView(page, "game-inventory");
  await page.waitForTimeout(1600);
  await selectView(page, "list-inventory");
  await page.waitForTimeout(1200);
});

await record(browser, "inventory-list-tour", async (page) => {
  await page.click(SEL.openInventory);
  await page.waitForSelector(SEL.sheet);
  await page.waitForTimeout(900);

  for (const tab of ["Bottom", "Innerwear", "Gear"]) {
    await page.locator(SEL.listTabs, { hasText: tab }).first().click();
    await page.waitForTimeout(750);
  }
  await page.locator(SEL.listTabs, { hasText: "Top" }).first().click();
  await page.waitForTimeout(600);

  await page.click(SEL.search);
  await page.type(SEL.search, "shell", { delay: 130 });
  await page.waitForTimeout(900);
  await page.fill(SEL.search, "");
  await page.waitForTimeout(600);

  await page.locator(SEL.categoryBtn).nth(1).click();
  await page.waitForTimeout(1100);
  await page.locator(SEL.moveChip, { hasText: "Innerwear" }).first().click();
  await page.waitForTimeout(1300);
});

await record(browser, "inventory-game-tour", async (page) => {
  await page.click(SEL.openInventory);
  await page.waitForSelector(SEL.sheet);
  await page.waitForTimeout(600);
  await selectView(page, "game-inventory");
  await page.waitForTimeout(1000);

  for (const idx of [0, 1, 2]) {
    await page.locator(SEL.gameCard).nth(0).click();
    await page.waitForTimeout(700);
  }
  await page.locator(SEL.gameTabs, { hasText: "Gear" }).first().click();
  await page.waitForTimeout(700);
  await page.locator(SEL.gameCard).first().click();
  await page.waitForTimeout(1100);
});
}

await browser.close();
rmSync(videoDir, { recursive: true, force: true });

console.log(`\nDone. Files in ${outDir}`);
for (const f of readdirSync(outDir).sort()) console.log(`  ${f}`);
