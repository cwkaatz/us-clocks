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
  abbr: string;
  tz: string;
  // Approximate position on the 576×288 lens canvas for the "geographic
  // labels" view. Picked to roughly match each zone's region on a US map.
  posX: number;
  posY: number;
}

const ZONES: Zone[] = [
  { label: "Eastern",  abbr: "ET",  tz: "America/New_York",     posX: 435, posY: 110 },
  { label: "Central",  abbr: "CT",  tz: "America/Chicago",      posX: 335, posY: 100 },
  { label: "Mountain", abbr: "MT",  tz: "America/Denver",       posX: 215, posY: 125 },
  { label: "Pacific",  abbr: "PT",  tz: "America/Los_Angeles",  posX: 100, posY: 150 },
  { label: "Alaska",   abbr: "AKT", tz: "America/Anchorage",    posX: 30,  posY: 220 },
];

const MAP_W = 200;
const MAP_H = 100;
const MAP_CONTAINER_ID = 100;
const MAP_CONTAINER_NAME = "map";

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

// ---- Map drawing (US outline from us-atlas, AK + 48, no HI) ----

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

// ---- Three views ----

type ViewKind = "column" | "positions" | "map";
const VIEWS: ViewKind[] = ["column", "positions", "map"];

function buildColumnView() {
  // Single text container, full-width-ish, centered vertically.
  const list = new TextContainerProperty({
    xPosition: 140,
    yPosition: 60,
    width: 360,
    height: 180,
    containerID: 1,
    containerName: "list",
    content: buildListContent(),
    isEventCapture: 1,
  });
  return { containerTotalNum: 1, textObject: [list] };
}

function positionContent(z: Zone, when: Date = new Date()): string {
  return `${z.abbr} ${formatDayTime(z.tz, when)}`;
}

function buildPositionsView() {
  // One text container per zone, placed at its approximate geographic
  // position on the 576×288 canvas. First container captures events.
  const textObject = ZONES.map(
    (z, i) =>
      new TextContainerProperty({
        xPosition: z.posX,
        yPosition: z.posY,
        width: 150,
        height: 32,
        containerID: i + 1,
        containerName: `pos-${i + 1}`,
        content: positionContent(z),
        isEventCapture: i === 0 ? 1 : 0,
      }),
  );
  return { containerTotalNum: ZONES.length, textObject };
}

function buildMapView() {
  // List on the left, image (map) on the right. List is vertically centered
  // with the map so they read as a single composition.
  // Map: y=94..194 (center y=144).
  // List: 5 rows, ~28 px each ≈ 140 px tall. Place y so center matches map.
  const list = new TextContainerProperty({
    xPosition: 20,
    yPosition: 74,
    width: 260,
    height: 140,
    containerID: 1,
    containerName: "list",
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

function buildView(view: ViewKind) {
  if (view === "column") return buildColumnView();
  if (view === "positions") return buildPositionsView();
  return buildMapView();
}

// ---- Bridge plumbing ----

async function applyPage(
  bridge: Bridge,
  fields: ReturnType<typeof buildView>,
): Promise<"created" | "rebuilt"> {
  const createResult = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer(fields),
  );
  if (createResult === StartUpPageCreateResult.success) return "created";
  const rebuildOk = await bridge.rebuildPageContainer(new RebuildPageContainer(fields));
  if (rebuildOk) return "rebuilt";
  throw new Error(`create=${createResult}, rebuild=false`);
}

async function pushListContainer(bridge: Bridge): Promise<void> {
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: "list",
      contentOffset: 0,
      contentLength: 0,
      content: buildListContent(),
    }),
  );
}

async function pushPositionContainers(bridge: Bridge): Promise<void> {
  const now = new Date();
  // Serialize — SDK docs warn against concurrent sends.
  for (let i = 0; i < ZONES.length; i++) {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: i + 1,
        containerName: `pos-${i + 1}`,
        contentOffset: 0,
        contentLength: 0,
        content: positionContent(ZONES[i], now),
      }),
    );
  }
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

  const maybeBridge = await waitForBridgeWithTimeout();
  if (!maybeBridge) {
    statusEl.textContent =
      "No bridge. Run in evenhub-simulator (npx -y @evenrealities/evenhub-simulator http://localhost:5174) or load via the Even App.";
    return;
  }
  const bridge: Bridge = maybeBridge;

  let viewIndex = 0;
  let busy = false;

  async function showView(idx: number): Promise<void> {
    const wrapped = ((idx % VIEWS.length) + VIEWS.length) % VIEWS.length;
    viewIndex = wrapped;
    const view = VIEWS[wrapped];
    statusEl.textContent = `Bridge ready. View: ${view}.`;
    await applyPage(bridge, buildView(view));
    if (view === "map") {
      try {
        const r = await sendMapImage(bridge);
        if (r !== ImageRawDataUpdateResult.success) {
          statusEl.textContent = `Bridge ready. Map: ${r}.`;
        }
      } catch (err) {
        statusEl.textContent = `Bridge ready. Map upload failed: ${err}`;
      }
    }
  }

  try {
    await showView(0);
  } catch (err) {
    statusEl.textContent = `HUD setup failed: ${err}`;
    return;
  }

  // Time refresh tick — updates whichever containers the current view has.
  scheduleNextUpdate(async () => {
    try {
      const view = VIEWS[viewIndex];
      if (view === "positions") await pushPositionContainers(bridge);
      else await pushListContainer(bridge);
    } catch {
      /* ignore — next tick retries */
    }
  });

  bridge.onEvenHubEvent(async (event) => {
    const e = event.textEvent ?? event.sysEvent;
    if (!e) return;
    const type = e.eventType;
    if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      await bridge.shutDownPageContainer(1);
      return;
    }
    if (busy) return;
    if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      // swipe down → next view
      busy = true;
      try {
        await showView(viewIndex + 1);
      } catch (err) {
        statusEl.textContent = `View switch failed: ${err}`;
      } finally {
        busy = false;
      }
      return;
    }
    if (type === OsEventTypeList.SCROLL_TOP_EVENT) {
      // swipe up → previous view
      busy = true;
      try {
        await showView(viewIndex - 1);
      } catch (err) {
        statusEl.textContent = `View switch failed: ${err}`;
      } finally {
        busy = false;
      }
      return;
    }
  });
}

start().catch((err) => {
  statusEl.textContent = `Init failed: ${err}`;
});
