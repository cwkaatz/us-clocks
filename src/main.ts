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

// Higher-fidelity US outline. The contiguous 48 is a ~70-vertex polygon
// projected from lon/lat; Alaska is a hand-traced quad-ish with a panhandle
// (canvas-relative coords); Hawaii is four filled ellipses of graduating size
// arranged NW→SE like the major islands.
function projectUs(lon: number, lat: number, w: number, h: number): [number, number] {
  const xL = -125;
  const xR = -67;
  const yT = 49.5;
  const yB = 24;
  const nx = (lon - xL) / (xR - xL);
  const ny = (yT - lat) / (yT - yB);
  // Contiguous 48 occupies x:[0.25w, 1.0w], y:[0.05h, 0.85h]; AK top-left,
  // HI bottom-left.
  return [(0.25 + nx * 0.74) * w, (0.05 + ny * 0.78) * h];
}

const US_OUTLINE: [number, number][] = [
  // Northern border, west → east
  [-123, 48.5], [-122.5, 49], [-114, 49], [-104, 49], [-97.2, 49], [-94, 49],
  [-89, 48], [-83.5, 45.8], [-83, 41.7], [-80, 42.5], [-79, 43.3],
  [-77.5, 43.5], [-76, 44], [-74, 44.5], [-71, 45], [-69.2, 47.4], [-67.5, 47],
  // Atlantic, north → south
  [-67, 44.8], [-70.5, 43.6], [-70.7, 42.5], [-70.0, 41.7], [-71, 41.3],
  [-72.5, 41], [-74, 40.5], [-74.5, 39.3], [-75.5, 38], [-76, 36.8],
  [-75.5, 35.5], [-77, 34.4], [-79, 33], [-81, 31.5], [-81.5, 30.5],
  // Florida loop
  [-80.5, 28.5], [-80.2, 26], [-80.5, 25], [-81.8, 24.5], [-82.5, 27],
  [-83, 29.5],
  // Gulf, east → west
  [-84.5, 30], [-87, 30.3], [-88.5, 30.3], [-89.5, 29], [-91.5, 29.3],
  [-93.8, 29.5], [-95, 29.2], [-97, 27.6], [-97.4, 26],
  // Mexican border, east → west
  [-99, 27], [-100, 28.5], [-102, 29.7], [-103.5, 29], [-104.5, 30],
  [-106.5, 31.8], [-108.2, 31.3], [-111, 31.3], [-114.7, 32.5],
  // Pacific, south → north
  [-117, 32.5], [-118, 33.8], [-119.5, 34.4], [-120.5, 34.5], [-121, 35.5],
  [-121.7, 36.5], [-122, 37], [-122.5, 37.8], [-123, 38.3], [-123.5, 38.9],
  [-124.3, 40.4], [-124, 41.7], [-124.2, 43], [-124.1, 44.5], [-124, 46.3],
  [-124, 47.5], [-124.7, 48.4],
];

// Alaska in canvas-relative coords (0..1). Rough mainland blob with a
// panhandle on the SE side — enough to read as "Alaska" without trying to
// capture every fjord.
const ALASKA_OUTLINE: [number, number][] = [
  [0.020, 0.22], [0.030, 0.12], [0.060, 0.04], [0.130, 0.03], [0.170, 0.05],
  [0.205, 0.10], [0.215, 0.16], [0.190, 0.20], [0.205, 0.24], [0.220, 0.30],
  [0.190, 0.32], [0.180, 0.26], [0.155, 0.22], [0.110, 0.22], [0.060, 0.26],
];

// Hawaii — four major islands as filled ellipses, increasing in size and
// drifting south-east. Sizes are absolute pixels.
interface Island { rx: number; ry: number; cx: number; cy: number }
const HAWAII_ISLANDS: Island[] = [
  { cx: 0.025, cy: 0.84, rx: 2.5, ry: 1.5 }, // Kauai
  { cx: 0.060, cy: 0.86, rx: 3.0, ry: 2.0 }, // Oahu
  { cx: 0.100, cy: 0.89, rx: 3.5, ry: 2.0 }, // Maui group
  { cx: 0.155, cy: 0.93, rx: 5.0, ry: 3.0 }, // Big Island
];

function drawUsMap(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

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

  // Hawaii — filled island ovals (4-bit greyscale tolerates this fine).
  HAWAII_ISLANDS.forEach(({ cx, cy, rx, ry }) => {
    ctx.beginPath();
    ctx.ellipse(cx * w, cy * h, rx, ry, 0, 0, Math.PI * 2);
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
