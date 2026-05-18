# us-clocks

Tiny Even Hub app that displays the current time across the six US time zones on the G2 HUD. No network. No credentials. No phone interaction beyond launching.

## What's shown

Two containers on the 576×288 HUD canvas:

- **Left half** — vertical list of five US zones (Hawaii excluded) with day-of-week and current local time, 24-hour format, minute precision. The day of week makes the date roll-over across zones visible at a glance:
  ```
  Eastern   Sat 14:23
  Central   Sat 13:23
  Mountain  Sat 12:23
  Pacific   Sat 11:23
  Alaska    Sat 10:23
  ```
- **Right half** — real cartographic US outline. Extracted at build time from [us-atlas](https://github.com/topojson/us-atlas) (`states-albers-10m.json`, Natural Earth via D3, public domain) into a flat array of polylines pre-projected to Albers USA. ~4,500 points across 135 polylines, including the Great Lakes shorelines, Long Island, the Aleutians, and every coastal cape. Rendered at runtime to a 200×100 canvas, exported as PNG, sent to the lens via `bridge.updateImageRawData`. Hawaii is filtered out at extraction time.

To regenerate the outline (e.g. switch to a different simplification level or include Hawaii):

```bash
node scripts/extract-us-outline.mjs
```

That rewrites `src/us-outline.ts`; commit the regenerated file.

## Why the outline is hand-drawn

The image-container API only ships placeholder geometry in `createStartUpPageContainer`; the actual pixels must arrive via `updateImageRawData` after startup. Doing the drawing in canvas at runtime means there's no asset to ship in the `.ehpk` — the map is regenerated each launch from a list of lon/lat coordinates.

## Gestures

| On the glasses | Action |
|---|---|
| Double-tap | Exits via `shutDownPageContainer(exitMode: 1)` (system exit dialog, per QA review rules for root pages) |
| Anything else | No-op |

## Dev

```bash
cd us-clocks
npm install
npm run dev                                                       # vite at http://localhost:5174
npx -y @evenrealities/evenhub-simulator http://localhost:5174     # glasses preview
```

## Build + pack for portal upload

```bash
npm run build                                                     # → dist/
npx -y @evenrealities/evenhub-cli pack app.json dist -o usclocks.ehpk
```

Then drag `usclocks.ehpk` into the Even Hub portal at `hub.evenrealities.com`.
