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
  { label: "Eastern",  abbr: "ET",  tz: "America/New_York",     posX: 435, posY: 145 },
  { label: "Central",  abbr: "CT",  tz: "America/Chicago",      posX: 335, posY: 100 },
  { label: "Mountain", abbr: "MT",  tz: "America/Denver",       posX: 215, posY: 125 },
  { label: "Pacific",  abbr: "PT",  tz: "America/Los_Angeles",  posX: 100, posY: 165 },
  { label: "Alaska",   abbr: "AKT", tz: "America/Anchorage",    posX: 30,  posY: 235 },
  { label: "Hawaii",   abbr: "HST", tz: "Pacific/Honolulu",     posX: 210, posY: 235 },
];

const MAP_W = 200;
const MAP_H = 100;
const MAP_CONTAINER_ID = 100;
const MAP_CONTAINER_NAME = "map";

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const clocksEl = document.getElementById("clocks") as HTMLPreElement;
const mapEl = document.getElementById("map") as HTMLCanvasElement | null;
const versionEl = document.getElementById("version") as HTMLSpanElement | null;
const dstStatusEl = document.getElementById("dst-status") as HTMLParagraphElement | null;
const dstNextEl = document.getElementById("dst-next") as HTMLParagraphElement | null;
const factEl = document.getElementById("fact") as HTMLParagraphElement | null;
if (versionEl) versionEl.textContent = `v${__APP_VERSION__}`;

const DST_FACTS = [
  "DST in the US starts on the second Sunday of March and ends on the first Sunday of November.",
  "Arizona (except the Navajo Nation) doesn't observe daylight saving time.",
  "Hawaii doesn't observe DST either — Hawaii Standard Time year-round since 1947.",
  "The US first adopted daylight saving in 1918, as a wartime energy measure.",
  "Indiana didn't fully adopt DST statewide until 2006.",
  "Standard time zones were created in 1883 by US railroads to coordinate train schedules.",
  "Most of the world's population lives in countries that never change their clocks.",
  "Spring forward, fall back: clocks jump from 2 AM to 3 AM in spring, and 2 AM back to 1 AM in fall.",
  "The European Parliament voted to abolish DST in 2019 — member states haven't agreed on how to implement it.",
  "Multiple US Sunshine Protection Act bills have proposed making DST permanent.",
  "DST shifts an hour of evening daylight to the morning — it doesn't add daylight, only moves it.",
  "Russia abolished DST in 2011, then reversed course in 2014 — and is now on permanent standard time.",
];

function nthDayOfWeekInMonth(year: number, month: number, dayOfWeek: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (dayOfWeek - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function nextDstTransition(now: Date): { date: Date; type: "starts" | "ends" } {
  const y = now.getFullYear();
  const dstStart = nthDayOfWeekInMonth(y, 2, 0, 2); // 2nd Sunday of March
  const dstEnd = nthDayOfWeekInMonth(y, 10, 0, 1); // 1st Sunday of November
  if (now < dstStart) return { date: dstStart, type: "starts" };
  if (now < dstEnd) return { date: dstEnd, type: "ends" };
  return { date: nthDayOfWeekInMonth(y + 1, 2, 0, 2), type: "starts" };
}

function getZoneAbbr(tz: string, when: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(when);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

function renderDstInfo(): void {
  if (!dstStatusEl || !dstNextEl) return;
  const now = new Date();
  const abbrs = ZONES.map((z) => getZoneAbbr(z.tz, now));
  const dstAbbrs: string[] = [];
  const stdAbbrs: string[] = [];
  for (const a of abbrs) {
    if (a.endsWith("DT")) dstAbbrs.push(a);
    else stdAbbrs.push(a);
  }
  if (dstAbbrs.length === 0) {
    dstStatusEl.textContent = `All ${ZONES.length} zones are currently on standard time (${stdAbbrs.join(", ")}).`;
  } else if (stdAbbrs.length === 0) {
    dstStatusEl.textContent = `All ${ZONES.length} zones are currently observing daylight saving time (${dstAbbrs.join(", ")}).`;
  } else {
    dstStatusEl.textContent = `Daylight saving time observed in: ${dstAbbrs.join(", ")}. Standard time year-round / today: ${stdAbbrs.join(", ")}.`;
  }
  const next = nextDstTransition(now);
  const dateStr = next.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  dstNextEl.textContent = `DST ${next.type === "starts" ? "starts" : "ends"} on ${dateStr}.`;
}

let factIndex = 0;
function renderFact(): void {
  if (!factEl) return;
  factEl.textContent = DST_FACTS[factIndex];
  factIndex = (factIndex + 1) % DST_FACTS.length;
}

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

// Approximate Albers USA x-coords for the US time-zone meridians
// (Pacific/Mountain ~120°W, Mountain/Central ~104°W, Central/Eastern ~87°W),
// plus the y-range of the contiguous 48 in source coords. Eyeballed against
// us-atlas states-albers-10m; close enough for visual dividers.
const TZ_DIVIDER_X = [275, 445, 625];
const TZ_DIVIDER_Y_TOP = 70;
const TZ_DIVIDER_Y_BOTTOM = 470;

const MAP_STROKE = "#22ff66";

function drawUsMap(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);

  const { minX, maxX, minY, maxY } = US_OUTLINE_BOUNDS;
  const srcW = maxX - minX;
  const srcH = maxY - minY;
  const scale = Math.min(w / srcW, h / srcH);
  const ox = (w - srcW * scale) / 2 - minX * scale;
  const oy = (h - srcH * scale) / 2 - minY * scale;

  const lineWidth = Math.max(1, w / 400);
  const glow = Math.max(2, w / 120);
  const dash = Math.max(2, w / 120);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = MAP_STROKE;
  ctx.shadowColor = MAP_STROKE;
  ctx.shadowBlur = glow;

  // Time-zone dividers (dashed, vertical, contiguous US only). Drawn first so
  // the solid outline overpaints them where they touch the coast.
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([dash, dash * 1.5]);
  for (const px of TZ_DIVIDER_X) {
    const x = ox + px * scale;
    const yTop = oy + TZ_DIVIDER_Y_TOP * scale;
    const yBot = oy + TZ_DIVIDER_Y_BOTTOM * scale;
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBot);
    ctx.stroke();
  }
  ctx.restore();

  // Solid outline.
  ctx.lineWidth = lineWidth;
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

  ctx.shadowBlur = 0;
}

// ---- Three views ----

type ViewKind = "column" | "positions" | "map";
const VIEWS: ViewKind[] = ["column", "positions", "map"];

function buildColumnView() {
  // Single text container, full-width-ish, centered vertically.
  // Sized for six rows.
  const list = new TextContainerProperty({
    xPosition: 140,
    yPosition: 44,
    width: 360,
    height: 200,
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
  // List: 6 rows, ~28 px each ≈ 170 px tall. Place y so center matches map
  // center as closely as possible (60 + 85 = 145).
  const list = new TextContainerProperty({
    xPosition: 20,
    yPosition: 60,
    width: 260,
    height: 170,
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

  renderDstInfo();
  // DST status only flips a couple of times per year — checking each minute is
  // plenty (cheap, catches the flip if the wearer leaves the page open).
  setInterval(renderDstInfo, 60_000);

  renderFact();
  setInterval(renderFact, 8_000);

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
