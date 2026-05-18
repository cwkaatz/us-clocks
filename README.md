# us-clocks

Tiny Even Hub app that displays the current time across the six US time zones on the G2 HUD. No network. No credentials. No phone interaction beyond launching.

## What's shown

```
Eastern   14:23
Central   13:23
Mountain  12:23
Pacific   11:23
Alaska    10:23
Hawaii    08:23
```

24-hour format, minute precision. Refreshed every minute (aligned to `:00` seconds).

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
