# us-clocks

Tiny Even Hub app that displays the current time across the six US time zones on the G2 HUD. No network. No credentials. No phone interaction beyond launching.

## What's shown

Six text labels positioned geographically on the 576×288 HUD canvas, suggesting a US map:

```
AK 14:23
                        ET 14:23
            CT 13:23
       MT 12:23
  PT 11:23
HI 08:23
```

24-hour format, minute precision. Refreshed every minute (aligned to `:00` seconds). Alaska top-left and Hawaii bottom-left mimic the inset boxes from classic US maps.

A future iteration may add a real outline drawing via the SDK's `updateImageRawData` image-container API (max 200×100 px, 4-bit greyscale per the platform docs).

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
