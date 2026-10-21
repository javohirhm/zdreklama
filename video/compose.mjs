#!/usr/bin/env node
/**
 * ZDREKLAMA — demo reel composer.
 *
 * Turns the stills captured by capture.mjs into the final 1080p MP4:
 * slow push-ins on every frame, cross-dissolves between them and lower-third
 * captions that fade in and out over their shot.
 *
 *   node video/compose.mjs
 *
 * Environment:
 *   MUSIC   optional audio file to bed under the reel
 *   CRF     video quality (default 19)
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out");
const FINAL = path.join(HERE, "zdreklama-demo.mp4");
const BASE = path.join(OUT, "base.mp4");

const FPS = 30;
const W = 1920;
const H = 1080;
const XFADE = 0.65;
const CRF = process.env.CRF || 19;

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))
    );
  });

const probeSize = (file) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file],
      { stdio: ["ignore", "pipe", "inherit"] }
    );
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", reject);
    child.on("close", () => {
      const [width, height] = out.trim().split(",").map(Number);
      if (!width || !height) reject(new Error(`could not probe ${file}`));
      else resolve({ width, height });
    });
  });

const manifest = JSON.parse(await fsp.readFile(path.join(OUT, "shots.json"), "utf8"));
const shots = manifest.shots;

/* ───────────────────────── pass 1: motion ───────────────────────── */

const inputs = [];
const filters = [];

for (const [index, shot] of shots.entries()) {
  const file = path.join(OUT, shot.file);
  if (!fs.existsSync(file)) throw new Error(`missing still: ${file}`);

  const frames = Math.round(shot.duration * FPS);

  if (shot.fullPage) {
    // a full-page capture needs a looping input so the crop window can slide
    const { width, height } = await probeSize(file);
    inputs.push("-loop", "1", "-i", file);
    filters.push(
      `[${index}:v]crop=${width}:${H * 2}:0:'(in_h-${H * 2})*min(t/${shot.duration},1)',` +
        `scale=${W}:${H}:flags=lanczos,setsar=1,fps=${FPS},` +
        `trim=duration=${shot.duration},setpts=PTS-STARTPTS,settb=1/${FPS}[v${index}]`
    );
  } else {
    inputs.push("-i", file);
    const [z0, z1] = shot.zoom;
    const [dx, dy] = shot.pan;
    const progress = `on/${frames - 1}`;
    const zoom = `${z0}+(${z1}-${z0})*${progress}`;
    const x = `(iw-iw/zoom)/2*(1+(${dx})*${progress})`;
    const y = `(ih-ih/zoom)/2*(1+(${dy})*${progress})`;
    filters.push(
      `[${index}:v]zoompan=z='${zoom}':x='${x}':y='${y}':d=${frames}:s=${W}x${H}:fps=${FPS},` +
        `format=yuv420p,setsar=1,settb=1/${FPS}[v${index}]`
    );
  }
}

// cross-dissolve the shots into one continuous reel
let previous = "v0";
let accumulated = shots[0].duration;
for (let i = 1; i < shots.length; i++) {
  const offset = accumulated - XFADE;
  const label = `x${i}`;
  filters.push(
    `[${previous}][v${i}]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}[${label}]`
  );
  previous = label;
  accumulated = accumulated + shots[i].duration - XFADE;
}

const totalDuration = accumulated;

// where every shot lands on the reel timeline
const shotTimes = [];
let clock = 0;
for (const shot of shots) {
  shotTimes.push(clock);
  clock += shot.duration - XFADE;
}

console.log(`pass 1 — ${shots.length} shots, ${totalDuration.toFixed(2)}s`);

await run([
  ...inputs,
  "-filter_complex",
  filters.join(";"),
  "-map",
  `[${previous}]`,
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-crf",
  String(CRF),
  "-pix_fmt",
  "yuv420p",
  "-r",
  String(FPS),
  "-movflags",
  "+faststart",
  BASE,
]);

/* ───────────────────── pass 2: caption overlays ───────────────────── */

const captioned = shots
  .map((shot, index) => ({ shot, index }))
  .filter(({ shot }) => shot.caption && shot.captionFile);

const captionInputs = [];
const captionFilters = [];

captioned.forEach(({ shot, index }, order) => {
  const start = shotTimes[index] + 0.35;
  const end =
    index + 1 < shots.length ? shotTimes[index + 1] - 0.25 : shotTimes[index] + shot.duration - 0.35;
  const length = Math.max(1.2, end - start);
  const input = order + 1;

  captionInputs.push(
    "-loop",
    "1",
    "-t",
    length.toFixed(3),
    "-i",
    path.join(OUT, shot.captionFile)
  );
  captionFilters.push(
    `[${input}:v]format=rgba,` +
      `fade=t=in:st=0:d=0.45:alpha=1,` +
      `fade=t=out:st=${(length - 0.45).toFixed(3)}:d=0.45:alpha=1,` +
      `setpts=PTS+${start.toFixed(3)}/TB,` +
      `scale=${W}:${H}:flags=lanczos,format=rgba[c${order}]`
  );
});

if (captioned.length) {
  let previous = "0:v";
  captionFilters.forEach((_, order) => {
    const label = `o${order}`;
    captionFilters.push(
      `[${previous}][c${order}]overlay=0:0:eof_action=pass:format=auto[${label}]`
    );
    previous = label;
  });

  console.log(`pass 2 — ${captioned.length} captions`);

  await run([
    "-i",
    BASE,
    ...captionInputs,
    "-filter_complex",
    captionFilters.join(";"),
    "-map",
    `[${previous}]`,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(CRF),
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(FPS),
    ...(process.env.MUSIC
      ? [
          "-i",
          process.env.MUSIC,
          "-map",
          "0:v:0",
          "-map",
          "1:a:0",
          "-shortest",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
        ]
      : []),
    "-movflags",
    "+faststart",
    FINAL,
  ]);
} else {
  await fsp.copyFile(BASE, FINAL);
}

await fsp.rm(BASE, { force: true });

const { size } = await fsp.stat(FINAL);
console.log(`\n${FINAL} — ${totalDuration.toFixed(1)}s, ${(size / 1024 / 1024).toFixed(1)} MB`);
