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
import { US_OUTLINE_POLYLINES, US_OUTLINE_BOUNDS } from "./us-outline";

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

// Renders the US outline (contiguous 48 + AK, Hawaii excluded) extracted
// from us-atlas at build time. Source is Albers-USA-projected pixel coords
// for a ~1015×594 canvas; we fit-and-center into whatever (w, h) we get.
function drawUsMap(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const { minX, maxX, minY, maxY } = US_OUTLINE_BOUNDS;
  const srcW = maxX - minX;
  const srcH = maxY - minY;
  // Fit uniformly to avoid distortion. Then center.
  const scale = Math.min(w / srcW, h / srcH);
  const ox = (w - srcW * scale) / 2 - minX * scale;
  const oy = (h - srcH * scale) / 2 - minY * scale;

  for (const line of US_OUTLINE_POLYLINES) {
    if (line.length < 2) continue;
    ctx.beginPath();
    for (let i = 0; i < line.length; i++) {
      const [px, py] = line[i];
      const x = ox + px * scale;
      const y = oy + py * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
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
