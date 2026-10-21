#!/usr/bin/env node
/**
 * ZDREKLAMA — demo reel capture.
 *
 * Captures a high-resolution still for every beat of the reel: the branded
 * title / closing cards rendered from ./studio, and real screens of the
 * running app driven through Puppeteer (scroll positions, order drawer,
 * command palette).
 *
 *   node video/capture.mjs
 *
 * Environment:
 *   BASE_URL     app origin   (default: auto-detect 5174 / 5173 / 4000)
 *   CHROME_PATH  Chrome binary (default: macOS Google Chrome)
 *
 * Output: video/out/stills/*.png  +  video/out/shots.json
 */

import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT = path.join(HERE, "out");
const STILLS = path.join(OUT, "stills");

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const W = 1920;
const H = 1080;
const STUDIO_PORT = Number(process.env.STUDIO_PORT || 5199);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function detectBase() {
  const candidates = [
    process.env.BASE_URL,
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:4000",
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return url.replace(/\/$/, "");
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    `No running app found. Start it with \`npm run dev\` (tried ${candidates.join(", ")})`
  );
}

function startStudioServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${STUDIO_PORT}`);
    const filePath = path.join(ROOT, decodeURIComponent(url.pathname));
    if (
      !filePath.startsWith(ROOT) ||
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).isDirectory()
    ) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(STUDIO_PORT, () =>
      resolve({
        url: `http://localhost:${STUDIO_PORT}`,
        close: () => new Promise((r) => server.close(r)),
      })
    );
  });
}

/* ───────────────────────── the shot list ─────────────────────────
 * Each shot becomes one still in the reel.
 *   zoom   – slow push in (1.02 → 1.10)
 *   pan    – fraction of the slack the frame drifts while zooming
 *   caption– lower third text
 */
const SHOTS = [
  {
    id: "01-title",
    kind: "card",
    html: "title.html",
    duration: 4.2,
    zoom: [1.0, 1.09],
    pan: [0, 0],
  },
  {
    id: "02-dashboard",
    kind: "app",
    path: "/",
    wait: ".recharts-surface",
    duration: 5.4,
    zoom: [1.0, 1.16],
    pan: [0.35, 0.25],
    caption: ["Dashboard", "Cash, margin and the order pulse in one view"],
  },
  {
    id: "03-dashboard-full",
    kind: "app",
    path: "/",
    wait: ".recharts-surface",
    fullPage: true,
    duration: 5.6,
    zoom: [1, 1],
    pan: [0, 1],
    caption: ["One screen", "Cash flow, order pulse, stock watch and crew"],
  },
  {
    id: "04-money",
    kind: "app",
    path: "/money",
    wait: "table.data-table tbody tr",
    duration: 5.0,
    zoom: [1.0, 1.15],
    pan: [-0.3, 0.3],
    caption: ["Money", "Every UZS in and out — filterable and exportable"],
  },
  {
    id: "05-orders",
    kind: "app",
    path: "/orders",
    wait: "article.order-card",
    duration: 5.0,
    zoom: [1.0, 1.15],
    pan: [0.3, 0.3],
    caption: ["Orders", "Budgets, margin and crew on one board"],
  },
  {
    id: "06-order-detail",
    kind: "app",
    path: "/orders?open=2",
    wait: ".sheet",
    duration: 5.4,
    zoom: [1.04, 1.18],
    pan: [0.85, 0],
    caption: ["Order detail", "Budget, spend, crew and material usage in one place"],
  },
  {
    id: "07-materials",
    kind: "app",
    path: "/materials",
    wait: "table.data-table tbody tr",
    duration: 4.6,
    zoom: [1.0, 1.15],
    pan: [-0.25, 0.3],
    caption: ["Materials", "Stock, reorder levels and a full movement log"],
  },
  {
    id: "08-team",
    kind: "app",
    path: "/team",
    wait: ".worker-card",
    duration: 4.6,
    zoom: [1.0, 1.15],
    pan: [0.25, 0.25],
    caption: ["Team", "Crew, payroll and order assignments"],
  },
  {
    id: "09-clients",
    kind: "app",
    path: "/clients",
    wait: ".client-card",
    duration: 4.6,
    zoom: [1.0, 1.15],
    pan: [-0.25, 0.25],
    caption: ["Clients", "Accounts, contacts and lifetime revenue"],
  },
  {
    id: "10-palette",
    kind: "app",
    path: "/",
    wait: ".recharts-surface",
    palette: true,
    duration: 4.6,
    zoom: [1.0, 1.13],
    pan: [-0.2, 0.2],
    caption: ["Command palette", "Jump anywhere in the workspace with ⌘K"],
  },
  {
    id: "11-closing",
    kind: "card",
    html: "closing.html",
    duration: 4.2,
    zoom: [1.0, 1.07],
    pan: [0, 0],
  },
];

const run = async () => {
  await fsp.rm(STILLS, { recursive: true, force: true });
  await fsp.mkdir(STILLS, { recursive: true });

  const base = await detectBase();
  const studio = await startStudioServer();
  console.log(`app     → ${base}`);
  console.log(`studio  → ${studio.url}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 120000,
    args: ["--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none"],
    defaultViewport: null,
  });

  const appPage = await browser.newPage();
  await appPage.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

  const studioPage = await browser.newPage();
  await studioPage.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

  const shots = [];

  const captureApp = async (page, shot) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(`${base}${shot.path}`, {
          waitUntil: "networkidle0",
          timeout: 20000,
        });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForSelector(shot.wait, { timeout: 8000 });
        await sleep(1400); // charts and entrance animations

        if (shot.scrollTo) {
          await page.evaluate((text) => {
            const node = [...document.querySelectorAll("h2, .card-title")].find((el) =>
              el.textContent?.trim().toLowerCase().includes(text.toLowerCase())
            );
            node?.scrollIntoView({ block: "center", behavior: "instant" });
          }, shot.scrollTo);
          await sleep(700);
        }

        if (shot.palette) {
          await page.keyboard.down("Control");
          await page.keyboard.press("k");
          await page.keyboard.up("Control");
          await sleep(700);
          await page.keyboard.type("order", { delay: 70 });
          await sleep(1400);
        }
        return true;
      } catch (error) {
        const state = await page
          .evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 180))
          .catch(() => "page unavailable");
        console.log(`\n    attempt ${attempt} failed: ${error.message.split("\n")[0]}`);
        console.log(`    page state: ${state}`);
        await sleep(900);
      }
    }
    return false;
  };

  for (const shot of SHOTS) {
    process.stdout.write(`  ${shot.id.padEnd(20)}`);

    // full-page captures get their own tab: captureBeyondViewport can leave
    // the renderer of a shared tab in a bad state
    const page = shot.fullPage ? await browser.newPage() : appPage;
    if (shot.fullPage) {
      await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    }

    const file = path.join(STILLS, `${shot.id}.png`);
    let ok = false;

    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        if (shot.kind === "card") {
          await studioPage.goto(`${studio.url}/video/studio/${shot.html}`, {
            waitUntil: "networkidle0",
          });
          await studioPage.evaluate(() => document.fonts.ready);
          await sleep(1800); // let the entrance animation settle
          await studioPage.screenshot({ path: file });
        } else {
          if (!(await captureApp(page, shot))) continue;
          await page.screenshot({
            path: file,
            fullPage: shot.fullPage === true,
            captureBeyondViewport: shot.fullPage === true,
          });
        }

        const { size } = await fsp.stat(file);
        if (size < 60_000) throw new Error(`suspiciously small still (${size} bytes)`);
        ok = true;
      } catch (error) {
        console.log(`\n    retry ${attempt}: ${error.message.split("\n")[0]}`);
        await sleep(900);
      }
    }

    if (shot.fullPage) await page.close().catch(() => {});
    if (!ok) {
      console.log("FAILED");
      continue;
    }

    shots.push({
      id: shot.id,
      file: path.relative(OUT, file),
      duration: shot.duration,
      zoom: shot.zoom,
      pan: shot.pan,
      fullPage: shot.fullPage === true,
      caption: shot.caption || null,
    });
    console.log("✓");
  }

  await fsp.writeFile(path.join(OUT, "shots.json"), JSON.stringify({ width: W, height: H, fps: 30, shots }, null, 2));

  /* ── caption overlays ──────────────────────────────────────── */
  console.log("\nrendering captions…");
  const captionPage = await browser.newPage();
  await captionPage.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

  for (const shot of shots) {
    if (!shot.caption) continue;
    const [kicker, text] = shot.caption;
    const url = `${studio.url}/video/studio/caption.html?k=${encodeURIComponent(kicker)}&t=${encodeURIComponent(text)}`;
    await captionPage.goto(url, { waitUntil: "networkidle0" });
    await captionPage.evaluate(() => document.fonts.ready);
    await sleep(150);
    const file = path.join(STILLS, `caption-${shot.id}.png`);
    await captionPage.screenshot({ path: file, omitBackground: true });
    shot.captionFile = path.relative(OUT, file);
    console.log(`  ${kicker}`);
  }

  await fsp.writeFile(path.join(OUT, "shots.json"), JSON.stringify({ width: W, height: H, fps: 30, shots }, null, 2));

  await browser.close();
  await studio.close();

  const total = shots.reduce((sum, s) => sum + s.duration, 0);
  console.log(`\n${shots.length} stills · ${total.toFixed(1)}s of footage`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
