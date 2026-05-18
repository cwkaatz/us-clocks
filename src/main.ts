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
  { label: "Hawaii", tz: "Pacific/Honolulu" },
];

const LABEL_WIDTH = Math.max(...ZONES.map((z) => z.label.length));
const TEXT_CONTAINER_ID = 1;
const TEXT_CONTAINER_NAME = "clocks";

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

function buildContent(): string {
  const now = new Date();
  return ZONES.map((z) => `${z.label.padEnd(LABEL_WIDTH + 1)} ${formatTime(z.tz, now)}`).join("\n");
}

function renderPhone(): void {
  clocksEl.textContent = buildContent();
}

function buildHudFields() {
  const text = new TextContainerProperty({
    xPosition: 50,
    yPosition: 20,
    width: 476,
    height: 248,
    containerID: TEXT_CONTAINER_ID,
    containerName: TEXT_CONTAINER_NAME,
    content: buildContent(),
    isEventCapture: 1,
  });
  return { containerTotalNum: 1, textObject: [text] };
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

async function pushToHud(bridge: Bridge): Promise<void> {
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: TEXT_CONTAINER_ID,
      containerName: TEXT_CONTAINER_NAME,
      contentOffset: 0,
      contentLength: 0,
      content: buildContent(),
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
  // Keep the phone view alive even without a bridge — useful for desktop preview.
  setInterval(renderPhone, 1000);

  const bridge = await waitForBridgeWithTimeout();
  if (!bridge) {
    statusEl.textContent =
      "No bridge. Run in evenhub-simulator (npx -y @evenrealities/evenhub-simulator http://localhost:5174) or load via the Even App.";
    return;
  }

  try {
    const mode = await ensureHud(bridge);
    statusEl.textContent = `Bridge ready. HUD ${mode}. Updating every minute.`;
  } catch (err) {
    statusEl.textContent = `HUD setup failed: ${err}`;
    return;
  }

  // Minute-aligned refresh of the HUD. The phone view ticks every second
  // separately; both share the same buildContent() source.
  scheduleNextUpdate(async () => {
    try {
      await pushToHud(bridge);
    } catch {
      /* ignore — next tick retries */
    }
  });

  // Root-page double-tap MUST trigger the system exit dialog (mode 1).
  // Per QA review rules, immediate exit (mode 0) on the root page is
  // auto-rejected.
  bridge.onEvenHubEvent(async (event) => {
    const e = event.textEvent ?? event.sysEvent;
    if (!e) return;
    if (e.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      // exitMode 1 = system exit confirmation dialog. Required on root pages
      // per QA review rules; mode 0 (immediate exit) is auto-rejected there.
      await bridge.shutDownPageContainer(1);
    }
  });
}

start().catch((err) => {
  statusEl.textContent = `Init failed: ${err}`;
});
