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
- **Right half** — US outline rendered in JS via the HTML `canvas` API, exported as PNG, sent to the lens via `bridge.updateImageRawData`. ~130-vertex hand-traced contiguous-48 polygon (Great Lakes indent, Florida loop, Texas/Brownsville bulge, Pacific NW peninsula) plus a 15-vertex Alaska in the top-left with the SE panhandle. The image container is capped by the SDK at 200×100 px, 4-bit greyscale.

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
