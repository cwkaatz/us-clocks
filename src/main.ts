import {
  waitForEvenAppBridge,
  StartUpPageCreateResult,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  ImageContainerProperty,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  OsEventTypeList,
} from "@evenrealities/even_hub_sdk";

type Bridge = NonNullable<Awaited<ReturnType<typeof waitForEvenAppBridge>>>;

declare const __APP_VERSION__: string;

interface Zone {
  abbr: string;
  label: string;
  tz: string;
}

const ZONES: Zone[] = [
  { abbr: "ET", label: "Eastern", tz: "America/New_York" },
  { abbr: "CT", label: "Central", tz: "America/Chicago" },
  { abbr: "MT", label: "Mountain", tz: "America/Denver" },
  { abbr: "PT", label: "Pacific", tz: "America/Los_Angeles" },
  { abbr: "AK", label: "Alaska", tz: "America/Anchorage" },
  { abbr: "HI", label: "Hawaii", tz: "Pacific/Honolulu" },
];

const LIST_CONTAINER_ID = 1;
const LIST_CONTAINER_NAME = "clocks";
const MAP_CONTAINER_ID = 2;
const MAP_CONTAINER_NAME = "map";

// Image container size — bounded by SDK constraint (max 200×100 per docs §6).
const MAP_W = 200;
const MAP_H = 100;

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const clocksEl = document.getElementById("clocks") as HTMLPreElement;
const mapEl = document.getElementById("map") as HTMLCanvasElement | null;
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

function buildListContent(when: Date = new Date()): string {
  // Pad the labels to a common width so columns align (font is non-monospace
  // but spaces are consistent enough to look intentional).
  const widest = Math.max(...ZONES.map((z) => z.label.length));
  return ZONES.map((z) => `${z.label.padEnd(widest)}  ${formatTime(z.tz, when)}`).join("\n");
}

function renderPhone(): void {
  clocksEl.textContent = buildListContent();
}

// Rough US outline drawn at any (w,h). Coordinates are simplified — about
// 16 vertices for the contiguous 48, a small inset quad for Alaska, three
// dots for Hawaii. Enough to read as "USA" on the lens.
function projectUs(lon: number, lat: number, w: number, h: number): [number, number] {
  const xL = -125;
  const xR = -67;
  const yT = 49;
  const yB = 24;
  const nx = (lon - xL) / (xR - xL);
  const ny = (yT - lat) / (yT - yB);
  // Contiguous 48 occupies x:[0.20w, 0.98w], y:[0.25h, 0.85h] of the canvas,
  // leaving room top-left for Alaska and bottom-left for Hawaii.
  return [(0.2 + nx * 0.78) * w, (0.25 + ny * 0.6) * h];
}

const US_OUTLINE: [number, number][] = [
  [-124, 48],
  [-95, 49],
  [-77, 45],
  [-67, 47],
  [-70, 42],
  [-75, 39],
  [-80, 27],
  [-81, 25],
  [-84, 30],
  [-89, 30],
  [-94, 29],
  [-97, 26],
  [-103, 29],
  [-117, 32],
  [-122, 38],
  [-124, 40],
];

const ALASKA_OUTLINE: [number, number][] = [
  [0.02, 0.22],
  [0.1, 0.06],
  [0.18, 0.12],
  [0.16, 0.2],
  [0.06, 0.3],
];

const HAWAII_DOTS: [number, number][] = [
  [0.04, 0.92],
  [0.08, 0.92],
  [0.12, 0.92],
];

function drawUsMap(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = "white";

  // Contiguous 48
  ctx.beginPath();
  US_OUTLINE.forEach(([lon, lat], i) => {
    const [x, y] = projectUs(lon, lat, w, h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  // Alaska
  ctx.beginPath();
  ALASKA_OUTLINE.forEach(([rx, ry], i) => {
    const x = rx * w;
    const y = ry * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  // Hawaii — three dots
  HAWAII_DOTS.forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx * w, ry * h, 2, 0, 2 * Math.PI);
    ctx.fill();
  });
}

function buildHudFields() {
  const list = new TextContainerProperty({
    xPosition: 20,
    yPosition: 20,
    width: 260,
    height: 248,
    containerID: LIST_CONTAINER_ID,
    containerName: LIST_CONTAINER_NAME,
    content: buildListContent(),
    isEventCapture: 1,
  });
  const map = new ImageContainerProperty({
    xPosition: 320,
    yPosition: 94,
    width: MAP_W,
    height: MAP_H,
    containerID: MAP_CONTAINER_ID,
    containerName: MAP_CONTAINER_NAME,
  });
  return { containerTotalNum: 2, textObject: [list], imageObject: [map] };
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

async function pushListUpdate(bridge: Bridge): Promise<void> {
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: LIST_CONTAINER_ID,
      containerName: LIST_CONTAINER_NAME,
      contentOffset: 0,
      contentLength: 0,
      content: buildListContent(),
    }),
  );
}

async function sendMapImage(bridge: Bridge): Promise<ImageRawDataUpdateResult> {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  drawUsMap(ctx, MAP_W, MAP_H);

  // Mirror to phone preview so the user can compare what the lens shows.
  if (mapEl) {
    const pctx = mapEl.getContext("2d");
    if (pctx) drawUsMap(pctx, mapEl.width, mapEl.height);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) throw new Error("toBlob returned null");
  const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
  return await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: MAP_CONTAINER_ID,
      containerName: MAP_CONTAINER_NAME,
      imageData: bytes,
    }),
  );
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

  // Always render the phone-side map preview, even without a bridge.
  if (mapEl) {
    const pctx = mapEl.getContext("2d");
    if (pctx) drawUsMap(pctx, mapEl.width, mapEl.height);
  }

  const bridge = await waitForBridgeWithTimeout();
  if (!bridge) {
    statusEl.textContent =
      "No bridge. Run in evenhub-simulator (npx -y @evenrealities/evenhub-simulator http://localhost:5174) or load via the Even App.";
    return;
  }

  try {
    const mode = await ensureHud(bridge);
    statusEl.textContent = `Bridge ready. HUD ${mode}. Sending map…`;
  } catch (err) {
    statusEl.textContent = `HUD setup failed: ${err}`;
    return;
  }

  try {
    const r = await sendMapImage(bridge);
    statusEl.textContent = `Bridge ready. Map: ${r}.`;
  } catch (err) {
    statusEl.textContent = `Bridge ready. Map upload failed: ${err}`;
  }

  scheduleNextUpdate(async () => {
    try {
      await pushListUpdate(bridge);
    } catch {
      /* ignore — next tick retries */
    }
  });

  // Root-page double-tap → system exit dialog (exitMode 1).
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
