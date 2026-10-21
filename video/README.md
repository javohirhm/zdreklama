# Demo reel

A 45-second product reel for ZDREKLAMA, generated from the running app. No
manual editing: capture the app with Puppeteer, then compose it with ffmpeg.

```text
video/
  capture.mjs        drives the app in Chrome and grabs a still per beat
  compose.mjs        slow push-ins, cross-dissolves, caption overlays → MP4
  studio/
    title.html       branded opening card
    closing.html     branded closing card
    caption.html     lower-third caption (rendered to a transparent PNG)
  out/
    stills/          captured frames + caption overlays
    shots.json       shot list with timing, motion and captions
  zdreklama-demo.mp4 the finished reel
```

## Regenerate

The app has to be running — the capture drives the real UI.

```bash
npm run dev          # in one terminal
npm run video        # in another
```

`npm run video` runs both stages. `npm run video:capture` and
`npm run video:compose` run them separately; compose alone reuses whatever is
already in `video/out/stills`.

Requirements: `ffmpeg` and `ffprobe` on the PATH, and Google Chrome (override
with `CHROME_PATH`).

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | App origin — auto-detects `5174`, `5173`, then `4000` |
| `CHROME_PATH` | Chrome executable to drive |
| `MUSIC` | Optional audio file to bed under the reel |
| `CRF` | x264 quality, default `19` |

## How the reel is built

**capture.mjs** — opens the app in headless Chrome at 1920×1080 (2× device
pixel ratio for crisp text), waits for each page's data to settle, and writes
one still per shot. Full-page captures get their own tab because
`captureBeyondViewport` can leave a shared renderer in a bad state. Each still
is checked for a plausible file size, so a blank frame is retried instead of
shipped.

**compose.mjs** — two ffmpeg passes:

1. Every still becomes a clip with `zoompan` (a slow push-in, plus a drift for
   shots that should move sideways). The full-page dashboard capture pans
   through the page instead of zooming. Clips are chained with `xfade`
   cross-dissolves.
2. Caption overlays are composited on top: a transparent PNG per shot, faded
   in and out, timed against the reel timeline.

## Changing the reel

The shot list lives at the top of `capture.mjs`:

```js
{
  id: "05-orders",
  kind: "app",                     // "app" = a page, "card" = a studio template
  path: "/orders",
  wait: "article.order-card",      // selector that proves the page has data
  duration: 5.0,                   // seconds on screen
  zoom: [1.0, 1.15],               // start → end magnification
  pan: [0.3, 0.3],                 // horizontal / vertical drift
  caption: ["Orders", "Budgets, margin and crew on one board"],
}
```

- `zoom` — `1.0` shows the whole frame, `1.2` pushes in.
- `pan` — `-1` to `1`, a fraction of the available slack in each direction.
- `caption` — `[kicker, line]`; the kicker is set in mono caps, the line below it.
- `fullPage: true` — capture the whole page and pan down through it.

Captions render from `studio/caption.html`; the card templates use the same
Manrope and DM Mono files the app bundles, so the reel matches the product.
