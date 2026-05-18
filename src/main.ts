import {
  waitForEvenAppBridge,
  StartUpPageCreateResult,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  OsEventTypeList,
} from "@evenrealities/even_hub_sdk";

type Bridge = NonNullable<Awaited<ReturnType<typeof waitForEvenAppBridge>>>;

declare const __APP_VERSION__: string;

// Positions chosen to suggest a US map on the 576×288 HUD canvas.
// Each zone is one TextContainer ("ABBR  HH:MM"). Alaska top-left and
// Hawaii bottom-left mimic the inset boxes used on classic US maps.
interface Zone {
  id: number;
  abbr: string;
  tz: string;
  x: number;
  y: number;
}

const W = 140;
const H = 36;
const ZONES: Zone[] = [
  { id: 1, abbr: "AK", tz: "America/Anchorage",     x: 30,  y: 28 },
  { id: 2, abbr: "PT", tz: "America/Los_Angeles",   x: 110, y: 155 },
  { id: 3, abbr: "MT", tz: "America/Denver",        x: 218, y: 138 },
  { id: 4, abbr: "CT", tz: "America/Chicago",       x: 330, y: 118 },
  { id: 5, abbr: "ET", tz: "America/New_York",      x: 430, y: 108 },
  { id: 6, abbr: "HI", tz: "Pacific/Honolulu",      x: 30,  y: 220 },
];

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const clocksEl = document.getElementById("clocks") as HTMLPreElement;
const versionEl = document.getElementById("version") as HTMLSpanElement | null;
if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;

function formatTime(tz: string, when: Date): string {
  return when.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function labelFor(zone: Zone, when: Date): string {
  return `${zone.abbr}  ${formatTime(zone.tz, when)}`;
}

function renderPhone(): void {
  const now = new Date();
  // Phone view stays as a vertical list — full names so it's readable.
  const widest = Math.max(...ZONES.map((z) => zoneName(z.abbr).length));
  clocksEl.textContent = ZONES.map(
    (z) => `${zoneName(z.abbr).padEnd(widest)}  ${formatTime(z.tz, now)}`,
  ).join("\n");
}

function zoneName(abbr: string): string {
  switch (abbr) {
    case "AK": return "Alaska";
    case "HI": return "Hawaii";
    case "PT": return "Pacific";
    case "MT": return "Mountain";
    case "CT": return "Central";
    case "ET": return "Eastern";
    default:   return abbr;
  }
}

function buildHudFields() {
  const now = new Date();
  const textObject = ZONES.map(
    (z) =>
      new TextContainerProperty({
        xPosition: z.x,
        yPosition: z.y,
        width: W,
        height: H,
        containerID: z.id,
        containerName: `zone-${z.abbr.toLowerCase()}`,
        content: labelFor(z, now),
        // First zone captures events so we can detect double-tap → exit.
        isEventCapture: z.id === 1 ? 1 : 0,
      }),
  );
  return { containerTotalNum: ZONES.length, textObject };
}

async function ensureHud(bridge: Bridge): Promise<"created" | "rebuilt"> {
  const fields = buildHudFields();
  const createResult = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer(fields),
  );
  if (createResult === StartUpPageCreateResult.success) return "created";
  const rebuildOk = await bridge.rebuildPageContainer(new RebuildPageContainer(fields));
  if (rebuildOk) return "rebuilt";
  throw new Error(`create=${createResult}, rebuild=false`);
}

async function pushTimes(bridge: Bridge): Promise<void> {
  const now = new Date();
  // Serialize the updates — the SDK docs warn against concurrent sends.
  for (const z of ZONES) {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: z.id,
        containerName: `zone-${z.abbr.toLowerCase()}`,
        contentOffset: 0,
        contentLength: 0,
        content: labelFor(z, now),
      }),
    );
  }
}

function delayUntilNextMinute(): number {
  const now = new Date();
  return 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();
}

function scheduleNextUpdate(callback: () => Promise<void>): void {
  setTimeout(async () => {
    try {
      await callback();
    } finally {
      scheduleNextUpdate(callback);
    }
  }, delayUntilNextMinute());
}

async function waitForBridgeWithTimeout(ms = 1500): Promise<Bridge | null> {
  return Promise.race([
    waitForEvenAppBridge(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function start(): Promise<void> {
  renderPhone();
  setInterval(renderPhone, 1000);

  const bridge = await waitForBridgeWithTimeout();
  if (!bridge) {
    statusEl.textContent =
      "No bridge. Run in evenhub-simulator (npx -y @evenrealities/evenhub-simulator http://localhost:5174) or load via the Even App.";
    return;
  }

  try {
    const mode = await ensureHud(bridge);
    statusEl.textContent = `Bridge ready. HUD ${mode}. ${ZONES.length} zones, refreshed each minute.`;
  } catch (err) {
    statusEl.textContent = `HUD setup failed: ${err}`;
    return;
  }

  scheduleNextUpdate(async () => {
    try {
      await pushTimes(bridge);
    } catch {
      /* ignore — next tick retries */
    }
  });

  // Root-page double-tap → system exit dialog (exitMode 1). Per QA rules
  // exitMode 0 is auto-rejected on root pages.
  bridge.onEvenHubEvent(async (event) => {
    const e = event.textEvent ?? event.sysEvent;
    if (!e) return;
    if (e.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      await bridge.shutDownPageContainer(1);
    }
  });
}

start().catch((err) => {
  statusEl.textContent = `Init failed: ${err}`;
});
