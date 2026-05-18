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
  label: string;
  tz: string;
}

const ZONES: Zone[] = [
  { label: "Eastern", tz: "America/New_York" },
  { label: "Central", tz: "America/Chicago" },
  { label: "Mountain", tz: "America/Denver" },
  { label: "Pacific", tz: "America/Los_Angeles" },
  { label: "Alaska", tz: "America/Anchorage" },
];

const LIST_CONTAINER_ID = 1;
const LIST_CONTAINER_NAME = "clocks";
const MAP_CONTAINER_ID = 2;
const MAP_CONTAINER_NAME = "map";

const MAP_W = 200;
const MAP_H = 100;

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const clocksEl = document.getElementById("clocks") as HTMLPreElement;
const mapEl = document.getElementById("map") as HTMLCanvasElement | null;
const versionEl = document.getElementById("version") as HTMLSpanElement | null;
if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;

function formatDayTime(tz: string, when: Date): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(when);
  const time = when.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day} ${time}`;
}

function buildListContent(when: Date = new Date()): string {
  const widest = Math.max(...ZONES.map((z) => z.label.length));
  return ZONES.map((z) => `${z.label.padEnd(widest)}  ${formatDayTime(z.tz, when)}`).join("\n");
}

function renderPhone(): void {
  clocksEl.textContent = buildListContent();
}

// ~130-vertex contiguous-48 outline. Each entry is [longitude, latitude].
// Traced clockwise from Cape Flattery (NW corner). The northern edge dips
// south through the Great Lakes (border runs through Superior / Huron /
// Erie / Ontario), giving the recognisable upper-Midwest indent that
// distinguishes a US silhouette from a generic blob.
const US_OUTLINE: [number, number][] = [
  // Northern border (W → E)
  [-124.7, 48.4], [-123.5, 48.5], [-123.0, 49.0], [-122.7, 48.99],
  [-118.0, 49.0], [-115.0, 49.0], [-110.0, 49.0], [-104.0, 49.0],
  [-99.5, 49.0], [-97.2, 49.0], [-95.2, 49.4], [-94.5, 48.7],
  [-92.5, 48.0], [-91.0, 47.5], [-89.5, 47.8], [-88.0, 48.0],
  [-86.0, 46.8], [-84.8, 46.0], [-83.5, 46.0], [-83.0, 45.0],
  [-82.5, 43.0], [-82.4, 42.4], [-82.8, 41.5], [-80.5, 42.1],
  [-79.5, 42.6], [-79.0, 42.9], [-77.8, 43.3], [-76.2, 43.5],
  [-75.0, 44.5], [-73.4, 45.0], [-71.5, 45.0], [-70.5, 45.5],
  [-69.2, 47.4], [-68.0, 47.3], [-67.5, 47.0],
  // Atlantic (N → S)
  [-67.0, 44.8], [-68.5, 44.4], [-69.8, 43.9], [-70.6, 43.6],
  [-70.8, 42.7], [-70.6, 42.4], [-70.0, 41.8], [-70.3, 41.6],
  [-71.0, 41.5], [-71.5, 41.4], [-72.5, 41.3], [-72.9, 41.2],
  [-73.6, 40.9], [-73.7, 40.6], [-73.2, 40.6], [-72.5, 40.9],
  [-72.9, 40.7], [-73.7, 40.5], [-74.0, 39.6], [-75.0, 38.8],
  [-75.1, 38.0], [-76.3, 37.0], [-75.9, 36.6], [-75.5, 35.5],
  [-76.3, 34.7], [-77.5, 34.3], [-79.0, 33.5], [-80.0, 32.5],
  [-81.0, 31.7], [-81.4, 30.7],
  // Florida loop
  [-81.0, 29.8], [-80.6, 28.5], [-80.0, 26.5], [-80.2, 25.7],
  [-80.5, 25.2], [-81.0, 25.1], [-81.5, 25.1], [-81.8, 24.5],
  [-82.3, 25.5], [-82.7, 27.0], [-82.7, 28.0], [-83.0, 29.0],
  [-83.8, 29.8], [-84.4, 30.0],
  // Gulf Coast (E → W)
  [-85.5, 29.7], [-86.5, 30.4], [-87.5, 30.3], [-88.0, 30.4],
  [-88.5, 30.3], [-89.0, 30.3], [-89.4, 29.5], [-89.0, 29.0],
  [-89.5, 28.9], [-90.5, 29.0], [-91.5, 29.5], [-93.0, 29.6],
  [-94.0, 29.7], [-95.0, 29.4], [-96.0, 28.5], [-97.0, 27.9],
  [-97.2, 26.4], [-97.4, 26.0],
  // Mexican border (E → W → N)
  [-99.0, 26.4], [-100.0, 28.5], [-101.5, 29.7], [-102.5, 29.8],
  [-103.0, 29.0], [-104.0, 29.5], [-105.5, 31.0], [-106.5, 31.8],
  [-108.2, 31.8], [-108.2, 31.3], [-109.0, 31.3], [-111.0, 31.3],
  [-113.0, 32.0], [-114.8, 32.5],
  // Pacific Coast (S → N)
  [-117.1, 32.5], [-117.3, 33.5], [-118.2, 33.7], [-118.5, 34.0],
  [-119.2, 34.2], [-120.5, 34.5], [-120.7, 35.2], [-121.0, 35.6],
  [-121.5, 36.0], [-121.9, 36.6], [-122.4, 37.5], [-122.5, 37.8],
  [-123.0, 38.5], [-123.5, 38.9], [-123.8, 39.6], [-124.3, 40.4],
  [-124.1, 41.7], [-124.4, 42.6], [-124.4, 43.7], [-124.0, 44.6],
  [-124.0, 45.5], [-123.9, 46.3], [-124.1, 47.0], [-124.6, 47.8],
];

// Alaska in canvas-relative coords (0..1). Mainland blob + SE panhandle.
const ALASKA_OUTLINE: [number, number][] = [
  [0.020, 0.18], [0.030, 0.10], [0.060, 0.03], [0.130, 0.02],
  [0.170, 0.04], [0.205, 0.08], [0.215, 0.14], [0.190, 0.18],
  [0.205, 0.22], [0.220, 0.28], [0.190, 0.30], [0.180, 0.24],
  [0.155, 0.20], [0.110, 0.20], [0.060, 0.22],
];

function projectUs(lon: number, lat: number, w: number, h: number): [number, number] {
  const xL = -125;
  const xR = -67;
  const yT = 49.5;
  const yB = 24;
  const nx = (lon - xL) / (xR - xL);
  const ny = (yT - lat) / (yT - yB);
  // Contiguous 48 occupies most of the canvas; AK lives in the top-left
  // quadrant. No Hawaii any more so we use the bottom-left freely.
  return [(0.22 + nx * 0.77) * w, (0.05 + ny * 0.92) * h];
}

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
