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
import {
  US_CONTIGUOUS_OUTLINE_POLYLINES,
  US_ALASKA_OUTLINE_POLYLINES,
  US_INTRA_ZONE_BORDER_POLYLINES,
  US_TZ_BORDER_POLYLINES,
  US_CONTIGUOUS_BOUNDS,
  US_ALASKA_BOUNDS,
} from "./us-outline";

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

// ---- World view: curated catalog + user picks ----

interface CityCatalogEntry {
  label: string;
  tz: string;
  region: "Americas" | "Europe" | "Middle East / Africa" | "Asia" | "Oceania";
}

const CITY_CATALOG: CityCatalogEntry[] = [
  // Americas
  { region: "Americas",             label: "Anchorage",    tz: "America/Anchorage" },
  { region: "Americas",             label: "Honolulu",     tz: "Pacific/Honolulu" },
  { region: "Americas",             label: "Los Angeles",  tz: "America/Los_Angeles" },
  { region: "Americas",             label: "Denver",       tz: "America/Denver" },
  { region: "Americas",             label: "Chicago",      tz: "America/Chicago" },
  { region: "Americas",             label: "New York",     tz: "America/New_York" },
  { region: "Americas",             label: "Toronto",      tz: "America/Toronto" },
  { region: "Americas",             label: "Mexico City",  tz: "America/Mexico_City" },
  { region: "Americas",             label: "Bogota",       tz: "America/Bogota" },
  { region: "Americas",             label: "Lima",         tz: "America/Lima" },
  { region: "Americas",             label: "Santiago",     tz: "America/Santiago" },
  { region: "Americas",             label: "Sao Paulo",    tz: "America/Sao_Paulo" },
  { region: "Americas",             label: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },
  // Europe
  { region: "Europe",               label: "Reykjavik",    tz: "Atlantic/Reykjavik" },
  { region: "Europe",               label: "Dublin",       tz: "Europe/Dublin" },
  { region: "Europe",               label: "London",       tz: "Europe/London" },
  { region: "Europe",               label: "Lisbon",       tz: "Europe/Lisbon" },
  { region: "Europe",               label: "Madrid",       tz: "Europe/Madrid" },
  { region: "Europe",               label: "Paris",        tz: "Europe/Paris" },
  { region: "Europe",               label: "Amsterdam",    tz: "Europe/Amsterdam" },
  { region: "Europe",               label: "Berlin",       tz: "Europe/Berlin" },
  { region: "Europe",               label: "Rome",         tz: "Europe/Rome" },
  { region: "Europe",               label: "Stockholm",    tz: "Europe/Stockholm" },
  { region: "Europe",               label: "Helsinki",     tz: "Europe/Helsinki" },
  { region: "Europe",               label: "Warsaw",       tz: "Europe/Warsaw" },
  { region: "Europe",               label: "Athens",       tz: "Europe/Athens" },
  { region: "Europe",               label: "Istanbul",     tz: "Europe/Istanbul" },
  { region: "Europe",               label: "Moscow",       tz: "Europe/Moscow" },
  // Middle East / Africa
  { region: "Middle East / Africa", label: "Lagos",        tz: "Africa/Lagos" },
  { region: "Middle East / Africa", label: "Cairo",        tz: "Africa/Cairo" },
  { region: "Middle East / Africa", label: "Cape Town",    tz: "Africa/Johannesburg" },
  { region: "Middle East / Africa", label: "Nairobi",      tz: "Africa/Nairobi" },
  { region: "Middle East / Africa", label: "Tel Aviv",     tz: "Asia/Jerusalem" },
  { region: "Middle East / Africa", label: "Riyadh",       tz: "Asia/Riyadh" },
  { region: "Middle East / Africa", label: "Tehran",       tz: "Asia/Tehran" },
  { region: "Middle East / Africa", label: "Dubai",        tz: "Asia/Dubai" },
  // Asia
  { region: "Asia",                 label: "Karachi",      tz: "Asia/Karachi" },
  { region: "Asia",                 label: "Mumbai",       tz: "Asia/Kolkata" },
  { region: "Asia",                 label: "Kathmandu",    tz: "Asia/Kathmandu" },
  { region: "Asia",                 label: "Dhaka",        tz: "Asia/Dhaka" },
  { region: "Asia",                 label: "Bangkok",      tz: "Asia/Bangkok" },
  { region: "Asia",                 label: "Jakarta",      tz: "Asia/Jakarta" },
  { region: "Asia",                 label: "Singapore",    tz: "Asia/Singapore" },
  { region: "Asia",                 label: "Manila",       tz: "Asia/Manila" },
  { region: "Asia",                 label: "Hong Kong",    tz: "Asia/Hong_Kong" },
  { region: "Asia",                 label: "Shanghai",     tz: "Asia/Shanghai" },
  { region: "Asia",                 label: "Taipei",       tz: "Asia/Taipei" },
  { region: "Asia",                 label: "Seoul",        tz: "Asia/Seoul" },
  { region: "Asia",                 label: "Tokyo",        tz: "Asia/Tokyo" },
  // Oceania
  { region: "Oceania",              label: "Perth",        tz: "Australia/Perth" },
  { region: "Oceania",              label: "Adelaide",     tz: "Australia/Adelaide" },
  { region: "Oceania",              label: "Brisbane",     tz: "Australia/Brisbane" },
  { region: "Oceania",              label: "Sydney",       tz: "Australia/Sydney" },
  { region: "Oceania",              label: "Auckland",     tz: "Pacific/Auckland" },
  { region: "Oceania",              label: "Fiji",         tz: "Pacific/Fiji" },
];

interface UserCity {
  label: string;
  tz: string;
}

const MAX_WORLD_PICKS = 6;

const DEFAULT_WORLD_PICKS: UserCity[] = [
  { label: "London",   tz: "Europe/London" },
  { label: "Berlin",   tz: "Europe/Berlin" },
  { label: "Dubai",    tz: "Asia/Dubai" },
  { label: "Tokyo",    tz: "Asia/Tokyo" },
  { label: "Sydney",   tz: "Australia/Sydney" },
  { label: "Auckland", tz: "Pacific/Auckland" },
];

let worldPicks: UserCity[] = [...DEFAULT_WORLD_PICKS];

function isValidTimezone(tz: string): boolean {
  if (typeof tz !== "string" || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isValidPick(p: unknown): p is UserCity {
  if (!p || typeof p !== "object") return false;
  const obj = p as UserCity;
  return typeof obj.label === "string"
    && obj.label.length > 0
    && typeof obj.tz === "string"
    && isValidTimezone(obj.tz);
}

// Convert "America/Argentina/Buenos_Aires" -> "Buenos Aires" for custom picks
// that aren't in the catalog.
function labelFromTz(tz: string): string {
  const last = tz.split("/").pop() ?? tz;
  return last.replace(/_/g, " ");
}

// Build the Zone[] the column-view builder consumes from the current picks.
function currentWorldZones(): Zone[] {
  return worldPicks.map((pick) => ({
    label: pick.label,
    abbr: pick.label.slice(0, 3).toUpperCase(),
    tz: pick.tz,
    posX: 0,
    posY: 0,
  }));
}

// ---- Approximate coordinates for sunrise/sunset (phone page) ----

const TZ_COORDS: Record<string, { lat: number; lon: number }> = {
  // US (matches ZONES)
  "America/New_York":               { lat: 40.7128, lon: -74.0060 },
  "America/Chicago":                { lat: 41.8781, lon: -87.6298 },
  "America/Denver":                 { lat: 39.7392, lon: -104.9903 },
  "America/Los_Angeles":            { lat: 34.0522, lon: -118.2437 },
  "America/Anchorage":              { lat: 61.2181, lon: -149.9003 },
  "Pacific/Honolulu":               { lat: 21.3099, lon: -157.8581 },
  // Other Americas (CITY_CATALOG)
  "America/Toronto":                { lat: 43.6532, lon: -79.3832 },
  "America/Mexico_City":            { lat: 19.4326, lon: -99.1332 },
  "America/Bogota":                 { lat: 4.7110,  lon: -74.0721 },
  "America/Lima":                   { lat: -12.0464, lon: -77.0428 },
  "America/Santiago":               { lat: -33.4489, lon: -70.6693 },
  "America/Sao_Paulo":              { lat: -23.5505, lon: -46.6333 },
  "America/Argentina/Buenos_Aires": { lat: -34.6037, lon: -58.3816 },
  // Europe
  "Atlantic/Reykjavik":             { lat: 64.1466, lon: -21.9426 },
  "Europe/Dublin":                  { lat: 53.3498, lon: -6.2603 },
  "Europe/London":                  { lat: 51.5074, lon: -0.1278 },
  "Europe/Lisbon":                  { lat: 38.7223, lon: -9.1393 },
  "Europe/Madrid":                  { lat: 40.4168, lon: -3.7038 },
  "Europe/Paris":                   { lat: 48.8566, lon: 2.3522 },
  "Europe/Amsterdam":               { lat: 52.3676, lon: 4.9041 },
  "Europe/Berlin":                  { lat: 52.5200, lon: 13.4050 },
  "Europe/Rome":                    { lat: 41.9028, lon: 12.4964 },
  "Europe/Stockholm":               { lat: 59.3293, lon: 18.0686 },
  "Europe/Helsinki":                { lat: 60.1699, lon: 24.9384 },
  "Europe/Warsaw":                  { lat: 52.2297, lon: 21.0122 },
  "Europe/Athens":                  { lat: 37.9838, lon: 23.7275 },
  "Europe/Istanbul":                { lat: 41.0082, lon: 28.9784 },
  "Europe/Moscow":                  { lat: 55.7558, lon: 37.6173 },
  // Africa
  "Africa/Lagos":                   { lat: 6.5244,  lon: 3.3792 },
  "Africa/Cairo":                   { lat: 30.0444, lon: 31.2357 },
  "Africa/Johannesburg":            { lat: -33.9249, lon: 18.4241 }, // Cape Town
  "Africa/Nairobi":                 { lat: -1.2921, lon: 36.8219 },
  // Middle East
  "Asia/Jerusalem":                 { lat: 32.0853, lon: 34.7818 },
  "Asia/Riyadh":                    { lat: 24.7136, lon: 46.6753 },
  "Asia/Tehran":                    { lat: 35.6892, lon: 51.3890 },
  "Asia/Dubai":                     { lat: 25.2048, lon: 55.2708 },
  // Asia
  "Asia/Karachi":                   { lat: 24.8607, lon: 67.0011 },
  "Asia/Kolkata":                   { lat: 19.0760, lon: 72.8777 }, // Mumbai
  "Asia/Kathmandu":                 { lat: 27.7172, lon: 85.3240 },
  "Asia/Dhaka":                     { lat: 23.8103, lon: 90.4125 },
  "Asia/Bangkok":                   { lat: 13.7563, lon: 100.5018 },
  "Asia/Jakarta":                   { lat: -6.2088, lon: 106.8456 },
  "Asia/Singapore":                 { lat: 1.3521,  lon: 103.8198 },
  "Asia/Manila":                    { lat: 14.5995, lon: 120.9842 },
  "Asia/Hong_Kong":                 { lat: 22.3193, lon: 114.1694 },
  "Asia/Shanghai":                  { lat: 31.2304, lon: 121.4737 },
  "Asia/Taipei":                    { lat: 25.0330, lon: 121.5654 },
  "Asia/Seoul":                     { lat: 37.5665, lon: 126.9780 },
  "Asia/Tokyo":                     { lat: 35.6762, lon: 139.6503 },
  // Oceania
  "Australia/Perth":                { lat: -31.9505, lon: 115.8605 },
  "Australia/Adelaide":             { lat: -34.9285, lon: 138.6007 },
  "Australia/Brisbane":             { lat: -27.4698, lon: 153.0251 },
  "Australia/Sydney":               { lat: -33.8688, lon: 151.2093 },
  "Pacific/Auckland":               { lat: -36.8485, lon: 174.7633 },
  "Pacific/Fiji":                   { lat: -18.1248, lon: 178.4501 },
};

// NOAA-style sunrise/sunset for a date at the given lat/lon. Returns null
// values when the sun doesn't rise / doesn't set on that date (polar
// regions in summer/winter).
function sunriseSunset(
  date: Date,
  lat: number,
  lon: number,
): { rise: Date | null; set: Date | null; allDay: boolean; allNight: boolean } {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const N = Math.floor((date.getTime() - yearStart) / 86_400_000);
  const gamma = (2 * Math.PI / 365) * (N - 1);

  const dec =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.001480 * Math.sin(3 * gamma);

  const eot =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const latRad = (lat * Math.PI) / 180;
  const zenithRad = (90.833 * Math.PI) / 180;
  const cosH =
    (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(dec)) /
    (Math.cos(latRad) * Math.cos(dec));

  if (cosH > 1)  return { rise: null, set: null, allDay: false, allNight: true };
  if (cosH < -1) return { rise: null, set: null, allDay: true,  allNight: false };

  const H = Math.acos(cosH);
  const Hdeg = (H * 180) / Math.PI;
  const baseUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const riseUtcMin = 720 - 4 * (lon + Hdeg) - eot;
  const setUtcMin  = 720 - 4 * (lon - Hdeg) - eot;
  return {
    rise: new Date(baseUtc + riseUtcMin * 60_000),
    set:  new Date(baseUtc + setUtcMin  * 60_000),
    allDay: false,
    allNight: false,
  };
}

// The lens contiguous map is split into TWO 288×91 image containers stacked
// vertically. Combined they form a 288×182 visual area — ~60 % more pixels
// than a single 288×144 container, because two stacked containers escape the
// SDK's per-image 144 px height cap. Each container renders its half of the
// contiguous bounds and the canvas auto-clips anything outside.
const CONTIG_HALF_W = 288;
const CONTIG_HALF_H = 91;
const CONTIG_TOP_ID = 100;
const CONTIG_TOP_NAME = "map-top";
const CONTIG_BOTTOM_ID = 102;
const CONTIG_BOTTOM_NAME = "map-bot";
const CONTIG_SPLIT_Y =
  Math.round((US_CONTIGUOUS_BOUNDS.minY + US_CONTIGUOUS_BOUNDS.maxY) / 2);
const CONTIG_TOP_BOUNDS = { ...US_CONTIGUOUS_BOUNDS, maxY: CONTIG_SPLIT_Y };
const CONTIG_BOTTOM_BOUNDS = { ...US_CONTIGUOUS_BOUNDS, minY: CONTIG_SPLIT_Y };
// Alaska natural Albers-USA aspect ≈ 1.88 (261×139 source). 110×58 ≈ 1.90,
// so the inset fills its container with essentially no letterboxing.
const ALASKA_MAP_W = 110;
const ALASKA_MAP_H = 58;
const ALASKA_MAP_ID = 101;
const ALASKA_MAP_NAME = "alaska";

// Positions view: full-canvas (576×288) background of the contiguous US, drawn
// across a 2×2 grid of 288×144 image containers. Each tile renders the same
// global projection but offset for its own quadrant; canvas-clip handles the
// edges. IDs in 110-113 to keep them separate from the map-view image slots.
const POS_BG_TILE_W = 288;
const POS_BG_TILE_H = 144;
const POS_BG_TILES: ReadonlyArray<{ x: number; y: number; id: number; name: string }> = [
  { x: 0,   y: 0,   id: 110, name: "pos-bg-tl" },
  { x: 288, y: 0,   id: 111, name: "pos-bg-tr" },
  { x: 0,   y: 144, id: 112, name: "pos-bg-bl" },
  { x: 288, y: 144, id: 113, name: "pos-bg-br" },
];

// Four continental US zones with vertically-staggered label positions so the
// adjacent labels (which are wider than their 80-px zone bands on the lens)
// don't overlap each other.
const POSITIONS_LAYOUT: ReadonlyArray<{ abbr: string; tz: string; xPosition: number; yPosition: number }> = [
  { abbr: "PT", tz: "America/Los_Angeles", xPosition: 55,  yPosition: 145 },
  { abbr: "MT", tz: "America/Denver",       xPosition: 164, yPosition: 110 },
  { abbr: "CT", tz: "America/Chicago",      xPosition: 246, yPosition: 180 },
  { abbr: "ET", tz: "America/New_York",     xPosition: 368, yPosition: 145 },
];

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const clocksEl = document.getElementById("clocks") as HTMLPreElement;
const mapEl = document.getElementById("map") as HTMLCanvasElement | null;
const versionEl = document.getElementById("version") as HTMLSpanElement | null;
const dstStatusEl = document.getElementById("dst-status") as HTMLParagraphElement | null;
const dstNextEl = document.getElementById("dst-next") as HTMLParagraphElement | null;
const factEl = document.getElementById("fact") as HTMLParagraphElement | null;
const sunSectionEl = document.getElementById("sun-section") as HTMLElement | null;
const sunRiseSetEl = document.getElementById("sun-rise-set") as HTMLParagraphElement | null;
const sunDaylightEl = document.getElementById("sun-daylight") as HTMLParagraphElement | null;
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

function renderSunTimes(): void {
  if (!sunSectionEl || !sunRiseSetEl || !sunDaylightEl) return;
  const coords = TZ_COORDS[LOCAL_TZ];
  if (!coords) {
    // Hide the section entirely when we don't have coordinates for the
    // device's zone — a missing data row is better than a wrong sunset time.
    sunSectionEl.style.display = "none";
    return;
  }
  sunSectionEl.style.display = "";
  const now = new Date();
  const result = sunriseSunset(now, coords.lat, coords.lon);
  if (result.allDay) {
    sunRiseSetEl.textContent = "Midnight sun — the sun doesn't set today.";
    sunDaylightEl.textContent = "";
    return;
  }
  if (result.allNight) {
    sunRiseSetEl.textContent = "Polar night — the sun doesn't rise today.";
    sunDaylightEl.textContent = "";
    return;
  }
  const rise = result.rise as Date;
  const set = result.set as Date;
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: settings.timeFormat === "12h",
    });
  const cityFromTz = LOCAL_TZ.split("/").pop()?.replace(/_/g, " ") ?? LOCAL_TZ;
  sunRiseSetEl.textContent = `Sunrise ${fmtTime(rise)} · Sunset ${fmtTime(set)} · ${cityFromTz}`;
  const dayLengthMin = Math.round((set.getTime() - rise.getTime()) / 60_000);
  const h = Math.floor(dayLengthMin / 60);
  const m = dayLengthMin % 60;
  sunDaylightEl.textContent = `Daylight ${h}h ${m.toString().padStart(2, "0")}m`;
}

// ---- Settings & persistence ----

type TimeFormat = "24h" | "12h";

interface Settings {
  timeFormat: TimeFormat;
}

const DEFAULT_SETTINGS: Settings = { timeFormat: "24h" };
const SETTINGS_KEY = "us-clocks-settings-v1";
const VIEW_PREF_KEY = "us-clocks-last-view-v1";
const TUTORIAL_KEY = "us-clocks-tutorial-seen-v1";
const WORLD_PICKS_KEY = "us-clocks-world-picks-v1";

let settings: Settings = { ...DEFAULT_SETTINGS };

function loadSettingsSync(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* swallow */
  }
  return { ...DEFAULT_SETTINGS };
}

async function saveSettings(s: Settings, bridge: Bridge | null): Promise<void> {
  const json = JSON.stringify(s);
  try { localStorage.setItem(SETTINGS_KEY, json); } catch { /* swallow */ }
  if (bridge) {
    try { await bridge.setLocalStorage(SETTINGS_KEY, json); } catch { /* swallow */ }
  }
}

function loadLastViewSync(): ViewKind | null {
  try {
    const raw = localStorage.getItem(VIEW_PREF_KEY);
    if (raw && (VIEWS as readonly string[]).includes(raw)) return raw as ViewKind;
  } catch {
    /* swallow */
  }
  return null;
}

async function saveLastView(view: ViewKind, bridge: Bridge | null): Promise<void> {
  try { localStorage.setItem(VIEW_PREF_KEY, view); } catch { /* swallow */ }
  if (bridge) {
    try { await bridge.setLocalStorage(VIEW_PREF_KEY, view); } catch { /* swallow */ }
  }
}

function loadTutorialSeenSync(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

async function saveTutorialSeen(bridge: Bridge | null): Promise<void> {
  try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch { /* swallow */ }
  if (bridge) {
    try { await bridge.setLocalStorage(TUTORIAL_KEY, "1"); } catch { /* swallow */ }
  }
}

function clearTutorialSeen(bridge: Bridge | null): void {
  try { localStorage.removeItem(TUTORIAL_KEY); } catch { /* swallow */ }
  if (bridge) {
    try { void bridge.setLocalStorage(TUTORIAL_KEY, ""); } catch { /* swallow */ }
  }
}

function loadWorldPicksSync(): UserCity[] {
  try {
    const raw = localStorage.getItem(WORLD_PICKS_KEY);
    // Empty array IS a valid state ("user cleared all"); only the absence of
    // the key (or invalid contents) falls back to defaults.
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(isValidPick)) {
        return parsed.slice(0, MAX_WORLD_PICKS);
      }
    }
  } catch { /* swallow */ }
  return [...DEFAULT_WORLD_PICKS];
}

async function saveWorldPicks(
  picks: UserCity[],
  bridge: Bridge | null,
): Promise<void> {
  const json = JSON.stringify(picks);
  try { localStorage.setItem(WORLD_PICKS_KEY, json); } catch { /* swallow */ }
  if (bridge) {
    try { await bridge.setLocalStorage(WORLD_PICKS_KEY, json); } catch { /* swallow */ }
  }
}

// ---- Time / zone helpers ----

const LOCAL_LABEL = "Local";
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function getHourIn(tz: string, when: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
  }).formatToParts(when);
  const raw = Number(parts.find((p) => p.type === "hour")?.value);
  // Older engines emit "24" for midnight with hour12:false; normalise to 0.
  return raw === 24 ? 0 : raw;
}

// UTC offset (in minutes) of the wall-clock time in `tz` at `when`.
function zoneOffsetMinutes(tz: string, when: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(when);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const hour = get("hour") === 24 ? 0 : get("hour");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - when.getTime()) / 60000);
}

function formatOffsetVsLocal(tz: string, when: Date): string {
  const diff = zoneOffsetMinutes(tz, when) - zoneOffsetMinutes(LOCAL_TZ, when);
  if (diff === 0) return " 0h";
  const sign = diff > 0 ? "+" : "-";
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (m === 0) return `${sign}${h}h`;
  // Half- and quarter-hour zones (India +5:30, Adelaide +9:30, Nepal +5:45,
  // Newfoundland -3:30, etc.) — show the precise minute offset.
  return `${sign}${h}:${m.toString().padStart(2, "0")}`;
}

// "*" = business hours (09:00–16:59), "." = awake but off (07:00–08:59,
// 17:00–21:59), "z" = sleep window (22:00–06:59).
function statusGlyph(tz: string, when: Date): string {
  const h = getHourIn(tz, when);
  if (h >= 9 && h < 17) return "*";
  if (h >= 22 || h < 7) return "z";
  return ".";
}

function formatDayTime(tz: string | null, when: Date): string {
  const dayFmt = new Intl.DateTimeFormat(
    "en-US",
    tz ? { timeZone: tz, weekday: "short" } : { weekday: "short" },
  );
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: settings.timeFormat === "12h",
  };
  if (tz) timeOpts.timeZone = tz;
  return `${dayFmt.format(when)} ${when.toLocaleTimeString("en-US", timeOpts)}`;
}

function buildListContent(
  when: Date = new Date(),
  opts: { compact?: boolean } = {},
): string {
  const compact = !!opts.compact;
  const widest = Math.max(LOCAL_LABEL.length, ...ZONES.map((z) => z.label.length));
  const timeColWidth = settings.timeFormat === "12h" ? 12 : 9; // "Mon HH:MM AM" vs "Mon HH:MM"

  function row(label: string, tz: string, isLocal: boolean): string {
    // Local row is blank — local time is in the top banner. Single space
    // keeps the row from collapsing in LVGL / monospace <pre>.
    if (isLocal) return " ";
    const dayTime = formatDayTime(tz, when).padEnd(timeColWidth);
    const glyph = statusGlyph(tz, when);
    if (compact) {
      return `${label.padEnd(widest)}  ${dayTime}`;
    }
    const abbr = getZoneAbbr(tz, when).padEnd(4);
    const offset = formatOffsetVsLocal(tz, when).padEnd(5);
    return `${label.padEnd(widest)}  ${abbr}  ${dayTime}  ${offset}  ${glyph}`;
  }

  return [
    row(LOCAL_LABEL, LOCAL_TZ, true),
    ...ZONES.map((z) => row(z.label, z.tz, false)),
  ].join("\n");
}

function renderPhone(): void {
  clocksEl.textContent = buildListContent();
}

// ---- Map drawing (contiguous 48 + Alaska inset) ----

const MAP_STROKE = "#22ff66";

type Polylines = ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
type Bounds = { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number };

function strokePolylines(
  ctx: CanvasRenderingContext2D,
  lines: Polylines,
  ox: number,
  oy: number,
  scale: number,
): void {
  for (const line of lines) {
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

function computeFit(w: number, h: number, bounds: Bounds) {
  const srcW = bounds.maxX - bounds.minX;
  const srcH = bounds.maxY - bounds.minY;
  const scale = Math.min(w / srcW, h / srcH);
  const ox = (w - srcW * scale) / 2 - bounds.minX * scale;
  const oy = (h - srcH * scale) / 2 - bounds.minY * scale;
  return { scale, ox, oy };
}

// Contiguous 48 with all three layers: sparse intra-zone dots, solid TZ
// borders, solid outer outline. Designed to fill its container width.
// `bounds` selects which slice of the source to render — pass
// US_CONTIGUOUS_BOUNDS for the full map, or one of CONTIG_TOP_BOUNDS /
// CONTIG_BOTTOM_BOUNDS to render just that half (the canvas auto-clips
// content outside the visible area).
function drawContiguousMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bounds: Bounds = US_CONTIGUOUS_BOUNDS,
): void {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);

  // Clip drawing to the requested region so any off-bounds polylines don't
  // bleed past the container.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  const { scale, ox, oy } = computeFit(w, h, bounds);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = MAP_STROKE;
  ctx.shadowColor = MAP_STROKE;

  // Layer 1: intra-zone state borders — sparse dots.
  ctx.save();
  ctx.lineWidth = Math.max(0.5, w / 800);
  ctx.shadowBlur = Math.max(0.5, w / 400);
  const dotLen = Math.max(1, w / 400);
  ctx.setLineDash([dotLen, dotLen * 4]);
  strokePolylines(ctx, US_INTRA_ZONE_BORDER_POLYLINES, ox, oy, scale);
  ctx.restore();

  // Layer 2: time-zone borders — solid, follows real state lines.
  ctx.save();
  ctx.lineWidth = Math.max(1, w / 500);
  ctx.shadowBlur = Math.max(1.5, w / 200);
  ctx.setLineDash([]);
  strokePolylines(ctx, US_TZ_BORDER_POLYLINES, ox, oy, scale);
  ctx.restore();

  // Layer 3: outer outline — same weight as TZ borders.
  ctx.save();
  ctx.lineWidth = Math.max(1, w / 500);
  ctx.shadowBlur = Math.max(1.5, w / 200);
  ctx.setLineDash([]);
  strokePolylines(ctx, US_CONTIGUOUS_OUTLINE_POLYLINES, ox, oy, scale);
  ctx.restore();

  ctx.restore();
  ctx.shadowBlur = 0;
}

// Alaska inset — outline only (no interior state borders).
function drawAlaskaInset(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  const { scale, ox, oy } = computeFit(w, h, US_ALASKA_BOUNDS);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = MAP_STROKE;
  ctx.shadowColor = MAP_STROKE;
  ctx.lineWidth = Math.max(1, w / 200);
  ctx.shadowBlur = Math.max(1, w / 100);
  ctx.setLineDash([]);
  strokePolylines(ctx, US_ALASKA_OUTLINE_POLYLINES, ox, oy, scale);

  ctx.restore();
  ctx.shadowBlur = 0;
}

// Positions-view background tile. The full virtual canvas is 576×288, and
// we render one tile of that into the given (tileX, tileY) position. The
// contiguous outline is drawn as a single thin dotted line with NO glow and
// NO state borders — only the outer outline plus TZ-boundary lines (which
// also follow real state borders, so they still read as geographic). The
// canvas auto-clips content outside the tile's bounds.
function drawPositionsBgTile(
  ctx: CanvasRenderingContext2D,
  tileW: number,
  tileH: number,
  tileX: number,
  tileY: number,
): void {
  const LENS_W = 576;
  const LENS_H = 288;
  const { minX, maxX, minY, maxY } = US_CONTIGUOUS_BOUNDS;
  const srcW = maxX - minX;
  const srcH = maxY - minY;
  const scale = Math.min(LENS_W / srcW, LENS_H / srcH);
  const globalOx = (LENS_W - srcW * scale) / 2 - minX * scale;
  const globalOy = (LENS_H - srcH * scale) / 2 - minY * scale;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, tileW, tileH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, tileW, tileH);
  ctx.clip();

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = MAP_STROKE;
  ctx.shadowBlur = 0; // lightest possible — no glow on this view
  ctx.lineWidth = 1;
  ctx.setLineDash([1.5, 3]);

  const ox = globalOx - tileX;
  const oy = globalOy - tileY;
  strokePolylines(ctx, US_CONTIGUOUS_OUTLINE_POLYLINES, ox, oy, scale);
  strokePolylines(ctx, US_TZ_BORDER_POLYLINES, ox, oy, scale);

  ctx.restore();
}

// Phone preview — single canvas showing both contiguous and Alaska in a
// layout that mirrors the lens: contiguous fills the top ~70 %, Alaska sits
// in the bottom-left as a small inset.
function drawPhoneMapPreview(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);
  const contigH = Math.floor(h * 0.70);
  const akW = Math.floor(w * 0.30);
  const akH = h - contigH;

  // Contiguous map on top.
  drawContiguousMap(ctx, w, contigH);

  // Alaska inset in bottom-left.
  ctx.save();
  ctx.translate(0, contigH);
  drawAlaskaInset(ctx, akW, akH);
  ctx.restore();
}

// ---- Top banner (date + optional DST countdown) ----

const BANNER_ID = 50;
const BANNER_NAME = "banner";
const DST_BANNER_WINDOW_DAYS = 14;

// Banner shows today's date + the device's current local time. When the next
// US DST transition is within the notification window, the countdown is
// appended after a separator. The local time here lets us blank out the
// "Local" row in every list view (saves space, less repetition).
function topBannerText(now: Date): string {
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: settings.timeFormat === "12h",
  });
  const base = `${dateStr}, ${timeStr}`;
  const next = nextDstTransition(now);
  const dayMs = 86_400_000;
  const daysUntil = Math.ceil((next.date.getTime() - now.getTime()) / dayMs);
  if (daysUntil <= 0 || daysUntil > DST_BANNER_WINDOW_DAYS) return base;
  return `${base}  ·  DST ${next.type} in ${daysUntil}d`;
}

function topBannerContainer(): TextContainerProperty {
  // The SDK's TextContainerProperty has no text-align field — text is always
  // left-aligned inside its container. To centre the banner text on the
  // 576-wide canvas we centre the CONTAINER itself, sized just-enough for the
  // text. LVGL on the G2 averages ~11 px per char; we err slightly wide to
  // avoid the text wrapping if the font is fractionally heavier than that.
  const text = topBannerText(new Date());
  const charW = 11;
  const textW = text.length * charW;
  const containerW = Math.min(540, textW + 16);
  const x = Math.max(8, Math.floor((576 - textW) / 2));
  // h=30 (not 22) so descenders (y in May, g in August) render in-frame.
  return new TextContainerProperty({
    xPosition: x,
    yPosition: 4,
    width: containerW,
    height: 30,
    containerID: BANNER_ID,
    containerName: BANNER_NAME,
    content: text,
    isEventCapture: 0,
  });
}

// ---- Views ----

type ViewKind = "column" | "positions" | "map" | "world";
const VIEWS: ViewKind[] = ["column", "positions", "map", "world"];

// The G2 LVGL font is NOT monospaced — padding strings with spaces can't
// align columns on the lens. We split the column view into four side-by-side
// text containers anchored at fixed x positions, so each column starts at the
// same pixel column regardless of how wide the rendered text is.
//
// The right-side column positions depend on:
//   1. the current time format (12h "Tue 09:55 PM" renders wider than 24h),
//   2. the widest label among the displayed rows (US zones top out at
//      "Mountain" = 8 chars; world picks can be longer — "Buenos Aires" = 12).
//   The labels column auto-widens, and times/offsets/glyphs slide right.
//
// The offsets column also accommodates "+5:30" style half/quarter-hour zones,
// 5 chars vs the typical 3 for whole-hour offsets.
//
// The page is rebuilt on a format flip or a picks change; the minute-tick path
// only does content upgrades, so per-format/per-picks layouts cost nothing at
// steady state.
function colLayoutFor(
  fmt: TimeFormat,
  widestLabelChars: number,
  showAbbr: boolean,
) {
  // ~12px per char in the LVGL font on the G2; allow 12px slack.
  // Columns: label | (abbr) | day-time | offset | glyph. Each anchored at a
  // fixed x so the LVGL font's non-monospaced glyphs can't break alignment.
  // Abbr column is only shown for the US Column view — for the World view,
  // Intl often falls back to GMT+N which duplicates the offset column AND
  // can overflow into the next line. World view skips abbr entirely.
  const labelsX = showAbbr ? 30 : 90;
  const minLabelsWidth = 110;
  const labelsWidth = Math.max(minLabelsWidth, widestLabelChars * 12 + 12);
  const abbrsWidth = 60;
  const timesX = showAbbr
    ? labelsX + labelsWidth + 8 + abbrsWidth + 8
    : labelsX + labelsWidth + 10;
  const timesWidth = fmt === "12h" ? 170 : 130;
  const gapBeforeOffset = 14;
  const offsetsX = timesX + timesWidth + gapBeforeOffset;
  const offsetsWidth = 65;
  const glyphsX = offsetsX + offsetsWidth + 6;
  // y=44 (not 30) gives a clear gap below the taller banner (banner ends at
  // y=34 with h=30). Height stays at 232 — 7 rows still fit comfortably,
  // ending at y=276 with 12 px of canvas margin below.
  return {
    yPosition: 44,
    height: 232,
    labels:  { xPosition: labelsX,  width: labelsWidth },
    abbrs:   { xPosition: showAbbr ? labelsX + labelsWidth + 8 : 0,
               width: showAbbr ? abbrsWidth : 0 },
    times:   { xPosition: timesX,   width: timesWidth },
    offsets: { xPosition: offsetsX, width: offsetsWidth },
    glyphs:  { xPosition: glyphsX,  width: 40 },
  };
}

function buildColumnViewParts(zones: Zone[], when: Date = new Date()): {
  labels: string;
  abbrs: string;
  times: string;
  offsets: string;
  glyphs: string;
} {
  // Local row is blank — local time lives in the top banner now. The blank
  // line still occupies a row in the column layout so the other zones don't
  // shift up (intentional per UX call: cleaner negative space at the top).
  // Use a single space so LVGL doesn't collapse an empty leading line.
  const labels = [" ", ...zones.map((z) => z.label)].join("\n");
  const abbrs: string[] = [" "];
  const times: string[] = [" "];
  const offsets: string[] = [" "];
  const glyphs: string[] = [" "];
  for (const z of zones) {
    abbrs.push(getZoneAbbr(z.tz, when));
    times.push(formatDayTime(z.tz, when));
    offsets.push(formatOffsetVsLocal(z.tz, when));
    glyphs.push(statusGlyph(z.tz, when));
  }
  return {
    labels,
    abbrs: abbrs.join("\n"),
    times: times.join("\n"),
    offsets: offsets.join("\n"),
    glyphs: glyphs.join("\n"),
  };
}

function buildColumnView(zones: Zone[], showAbbr: boolean) {
  const parts = buildColumnViewParts(zones);
  const widest = Math.max(
    LOCAL_LABEL.length,
    ...zones.map((z) => z.label.length),
  );
  const layout = colLayoutFor(settings.timeFormat, widest, showAbbr);
  const { yPosition, height } = layout;
  const containers: TextContainerProperty[] = [
    topBannerContainer(),
    new TextContainerProperty({
      ...layout.labels,
      yPosition,
      height,
      containerID: 1,
      containerName: "labels",
      content: parts.labels,
      isEventCapture: 1,
    }),
  ];
  if (showAbbr) {
    containers.push(
      new TextContainerProperty({
        ...layout.abbrs,
        yPosition,
        height,
        containerID: 5,
        containerName: "abbrs",
        content: parts.abbrs,
        isEventCapture: 0,
      }),
    );
  }
  containers.push(
    new TextContainerProperty({
      ...layout.times,
      yPosition,
      height,
      containerID: 2,
      containerName: "times",
      content: parts.times,
      isEventCapture: 0,
    }),
    new TextContainerProperty({
      ...layout.offsets,
      yPosition,
      height,
      containerID: 3,
      containerName: "offsets",
      content: parts.offsets,
      isEventCapture: 0,
    }),
    new TextContainerProperty({
      ...layout.glyphs,
      yPosition,
      height,
      containerID: 4,
      containerName: "glyphs",
      content: parts.glyphs,
      isEventCapture: 0,
    }),
  );
  return { containerTotalNum: containers.length, textObject: containers };
}

// Positions view: just abbr + time (no day) so each label fits compactly
// over its zone region. e.g. "ET 17:20" / "ET 05:20 PM".
function positionsTimeContent(abbr: string, tz: string, when: Date = new Date()): string {
  const time = when.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: settings.timeFormat === "12h",
  });
  return `${abbr} ${time}`;
}

function buildPositionsView() {
  // Full-canvas US-map background drawn as a 2×2 grid of image containers.
  // Each tile renders the SAME global projection but offset for its quadrant
  // (canvas auto-clips the off-tile content). Layered above are the banner
  // and one transparent text label per continental zone.
  const bgImages = POS_BG_TILES.map((tile) =>
    new ImageContainerProperty({
      xPosition: tile.x,
      yPosition: tile.y,
      width: POS_BG_TILE_W,
      height: POS_BG_TILE_H,
      containerID: tile.id,
      containerName: tile.name,
    }),
  );
  const labels = POSITIONS_LAYOUT.map((p, i) =>
    new TextContainerProperty({
      xPosition: p.xPosition,
      yPosition: p.yPosition,
      width: 130,
      height: 32,
      containerID: i + 1,
      containerName: `pos-${i + 1}`,
      content: positionsTimeContent(p.abbr, p.tz),
      isEventCapture: i === 0 ? 1 : 0,
    }),
  );
  const textObject = [topBannerContainer(), ...labels];
  const imageObject = bgImages;
  return {
    containerTotalNum: textObject.length + imageObject.length,
    textObject,
    imageObject,
  };
}

function buildMapView() {
  // List on the left, three map images on the right:
  //   - Contiguous top half: x=288..576 (w=288), y=44..135 (h=91)
  //   - Contiguous bottom half: x=288..576 (w=288), y=135..226 (h=91)
  //     The two halves sit flush against each other so the map reads as one
  //     288×182 image — ~60 % more visible pixels than a single 288×144
  //     container (the SDK's per-image height cap).
  //   - Alaska inset: x=292..402 (w=110), y=230..288 (h=58) — below.
  // List:    x=20..280 (w=260), y=44..244 (h=200).
  const list = new TextContainerProperty({
    xPosition: 20,
    yPosition: 44,
    width: 260,
    height: 200,
    containerID: 1,
    containerName: "list",
    content: buildListContent(new Date(), { compact: true }),
    isEventCapture: 1,
  });
  const contigTop = new ImageContainerProperty({
    xPosition: 288,
    yPosition: 44,
    width: CONTIG_HALF_W,
    height: CONTIG_HALF_H,
    containerID: CONTIG_TOP_ID,
    containerName: CONTIG_TOP_NAME,
  });
  const contigBottom = new ImageContainerProperty({
    xPosition: 288,
    yPosition: 44 + CONTIG_HALF_H,
    width: CONTIG_HALF_W,
    height: CONTIG_HALF_H,
    containerID: CONTIG_BOTTOM_ID,
    containerName: CONTIG_BOTTOM_NAME,
  });
  const alaskaMap = new ImageContainerProperty({
    xPosition: 292,
    yPosition: 230,
    width: ALASKA_MAP_W,
    height: ALASKA_MAP_H,
    containerID: ALASKA_MAP_ID,
    containerName: ALASKA_MAP_NAME,
  });
  const textObject = [topBannerContainer(), list];
  const imageObject = [contigTop, contigBottom, alaskaMap];
  return {
    containerTotalNum: textObject.length + imageObject.length,
    textObject,
    imageObject,
  };
}

function buildView(view: ViewKind) {
  if (view === "column") return buildColumnView(ZONES, true);
  if (view === "world") return buildColumnView(currentWorldZones(), false);
  if (view === "positions") return buildPositionsView();
  return buildMapView();
}

// ---- First-launch tutorial ----

function buildTutorialView() {
  const text = [
    "US Clocks",
    "",
    "Touch the temple:",
    "Swipe down  next view",
    "Swipe up    previous view",
    "Double-tap  exit",
    "",
    "Tap or swipe to begin.",
  ].join("\n");
  const c = new TextContainerProperty({
    xPosition: 60,
    yPosition: 30,
    width: 456,
    height: 232,
    containerID: 1,
    containerName: "tutorial",
    content: text,
    isEventCapture: 1,
  });
  return { containerTotalNum: 1, textObject: [c] };
}

// Show the tutorial page and resolve on the first user gesture.
async function runTutorial(bridge: Bridge): Promise<void> {
  await applyPage(bridge, buildTutorialView());
  await new Promise<void>((resolve) => {
    let unsub: (() => void) | undefined;
    const dismiss = () => {
      try { unsub?.(); } catch { /* swallow */ }
      resolve();
    };
    unsub = bridge.onEvenHubEvent((event) => {
      const e = event.textEvent ?? event.sysEvent;
      if (!e) return;
      const type = e.eventType;
      if (
        type === OsEventTypeList.CLICK_EVENT ||
        type === undefined || // CLICK_EVENT === 0 sometimes normalised to undefined
        type === OsEventTypeList.SCROLL_TOP_EVENT ||
        type === OsEventTypeList.SCROLL_BOTTOM_EVENT ||
        type === OsEventTypeList.DOUBLE_CLICK_EVENT
      ) {
        dismiss();
      }
    });
  });
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

async function pushListContainer(bridge: Bridge, opts: { compact?: boolean } = {}): Promise<void> {
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: "list",
      contentOffset: 0,
      contentLength: 0,
      content: buildListContent(new Date(), opts),
    }),
  );
}

async function pushTopBanner(bridge: Bridge): Promise<void> {
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: BANNER_ID,
      containerName: BANNER_NAME,
      contentOffset: 0,
      contentLength: 0,
      content: topBannerText(new Date()),
    }),
  );
}

async function pushColumnContainers(
  bridge: Bridge,
  zones: Zone[],
  showAbbr: boolean,
): Promise<void> {
  const parts = buildColumnViewParts(zones);
  // SDK warns against concurrent sends — serialise.
  const updates: Array<[number, string, string]> = [
    [1, "labels",  parts.labels],
  ];
  if (showAbbr) updates.push([5, "abbrs", parts.abbrs]);
  updates.push(
    [2, "times",   parts.times],
    [3, "offsets", parts.offsets],
    [4, "glyphs",  parts.glyphs],
  );
  for (const [id, name, content] of updates) {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: id,
        containerName: name,
        contentOffset: 0,
        contentLength: 0,
        content,
      }),
    );
  }
}

async function pushPositionContainers(bridge: Bridge): Promise<void> {
  const now = new Date();
  // Serialize — SDK docs warn against concurrent sends.
  for (let i = 0; i < POSITIONS_LAYOUT.length; i++) {
    const p = POSITIONS_LAYOUT[i];
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: i + 1,
        containerName: `pos-${i + 1}`,
        contentOffset: 0,
        contentLength: 0,
        content: positionsTimeContent(p.abbr, p.tz, now),
      }),
    );
  }
}

async function canvasToBytes(canvas: HTMLCanvasElement): Promise<number[]> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) throw new Error("toBlob returned null");
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

async function sendMapImages(bridge: Bridge): Promise<ImageRawDataUpdateResult> {
  // Three images sent SERIALLY — the SDK warns against concurrent
  // updateImageRawData calls. Contiguous top + bottom halves stack to form
  // a single 288×182 visual map; Alaska is its own inset below.
  const drawTo = (
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ): HTMLCanvasElement => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    draw(ctx, w, h);
    return c;
  };

  const top = drawTo(CONTIG_HALF_W, CONTIG_HALF_H, (ctx, w, h) =>
    drawContiguousMap(ctx, w, h, CONTIG_TOP_BOUNDS),
  );
  const bot = drawTo(CONTIG_HALF_W, CONTIG_HALF_H, (ctx, w, h) =>
    drawContiguousMap(ctx, w, h, CONTIG_BOTTOM_BOUNDS),
  );
  const ak = drawTo(ALASKA_MAP_W, ALASKA_MAP_H, drawAlaskaInset);

  // Repaint the phone preview to match.
  if (mapEl) {
    const pctx = mapEl.getContext("2d");
    if (pctx) drawPhoneMapPreview(pctx, mapEl.width, mapEl.height);
  }

  const send = async (
    canvas: HTMLCanvasElement,
    id: number,
    name: string,
  ): Promise<ImageRawDataUpdateResult> => {
    const bytes = await canvasToBytes(canvas);
    return await bridge.updateImageRawData(
      new ImageRawDataUpdate({
        containerID: id,
        containerName: name,
        imageData: bytes,
      }),
    );
  };

  const r1 = await send(top, CONTIG_TOP_ID, CONTIG_TOP_NAME);
  if (r1 !== ImageRawDataUpdateResult.success) return r1;
  const r2 = await send(bot, CONTIG_BOTTOM_ID, CONTIG_BOTTOM_NAME);
  if (r2 !== ImageRawDataUpdateResult.success) return r2;
  return await send(ak, ALASKA_MAP_ID, ALASKA_MAP_NAME);
}

async function sendPositionsBackground(
  bridge: Bridge,
): Promise<ImageRawDataUpdateResult> {
  // Four image containers covering the full lens canvas, each rendering its
  // quadrant of the contiguous US background. Serialised per SDK rules.
  for (const tile of POS_BG_TILES) {
    const c = document.createElement("canvas");
    c.width = POS_BG_TILE_W;
    c.height = POS_BG_TILE_H;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    drawPositionsBgTile(ctx, POS_BG_TILE_W, POS_BG_TILE_H, tile.x, tile.y);
    const bytes = await canvasToBytes(c);
    const result = await bridge.updateImageRawData(
      new ImageRawDataUpdate({
        containerID: tile.id,
        containerName: tile.name,
        imageData: bytes,
      }),
    );
    if (result !== ImageRawDataUpdateResult.success) return result;
  }
  return ImageRawDataUpdateResult.success;
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

let currentBridge: Bridge | null = null;
let currentViewIndex = 0;

async function refreshCurrentView(): Promise<void> {
  const bridge = currentBridge;
  if (!bridge) return;
  const view = VIEWS[currentViewIndex];
  if (view === "positions") await pushPositionContainers(bridge);
  else if (view === "column") await pushColumnContainers(bridge, ZONES, true);
  else if (view === "world") await pushColumnContainers(bridge, currentWorldZones(), false);
  else await pushListContainer(bridge, { compact: true }); // map view
  await pushTopBanner(bridge);
}

async function start(): Promise<void> {
  settings = loadSettingsSync();
  worldPicks = loadWorldPicksSync();
  wireSettingsUi();
  wireWorldPickerUi();

  renderPhone();
  setInterval(renderPhone, 1000);

  renderDstInfo();
  // DST status only flips a couple of times per year — checking each minute is
  // plenty (cheap, catches the flip if the wearer leaves the page open).
  setInterval(renderDstInfo, 60_000);

  renderFact();
  setInterval(renderFact, 8_000);

  renderSunTimes();
  // Sunrise/sunset shift slowly over the day; re-checking every minute also
  // catches midnight rollover within a minute.
  setInterval(renderSunTimes, 60_000);

  if (mapEl) {
    const pctx = mapEl.getContext("2d");
    if (pctx) drawPhoneMapPreview(pctx, mapEl.width, mapEl.height);
  }

  const maybeBridge = await waitForBridgeWithTimeout();
  if (!maybeBridge) {
    statusEl.textContent =
      "No bridge. Run in evenhub-simulator (npx -y @evenrealities/evenhub-simulator http://localhost:5174) or load via the Even App.";
    return;
  }
  const bridge: Bridge = maybeBridge;
  currentBridge = bridge;

  // First-launch tutorial: show only until the user dismisses with any
  // gesture, then never again (unless the phone-side "Show tutorial again"
  // button clears the flag).
  if (!loadTutorialSeenSync()) {
    try {
      await runTutorial(bridge);
      await saveTutorialSeen(bridge);
    } catch {
      // If the tutorial path errors, don't strand the user — fall through.
      await saveTutorialSeen(bridge);
    }
  }

  // Pick up the user's last-used view if persisted.
  const lastView = loadLastViewSync();
  const startIdx = lastView ? Math.max(0, VIEWS.indexOf(lastView)) : 0;
  currentViewIndex = startIdx;
  let busy = false;

  async function showView(idx: number): Promise<void> {
    const wrapped = ((idx % VIEWS.length) + VIEWS.length) % VIEWS.length;
    currentViewIndex = wrapped;
    const view = VIEWS[wrapped];
    statusEl.textContent = `Bridge ready. View: ${view}.`;
    await applyPage(bridge, buildView(view));
    if (view === "map") {
      try {
        const r = await sendMapImages(bridge);
        if (r !== ImageRawDataUpdateResult.success) {
          statusEl.textContent = `Bridge ready. Map: ${r}.`;
        }
      } catch (err) {
        statusEl.textContent = `Bridge ready. Map upload failed: ${err}`;
      }
    } else if (view === "positions") {
      try {
        const r = await sendPositionsBackground(bridge);
        if (r !== ImageRawDataUpdateResult.success) {
          statusEl.textContent = `Bridge ready. Positions bg: ${r}.`;
        }
      } catch (err) {
        statusEl.textContent = `Bridge ready. Positions bg failed: ${err}`;
      }
    }
    void saveLastView(view, bridge);
  }

  try {
    await showView(currentViewIndex);
  } catch (err) {
    statusEl.textContent = `HUD setup failed: ${err}`;
    return;
  }

  // Time refresh tick — updates whichever containers the current view has.
  scheduleNextUpdate(async () => {
    try {
      await refreshCurrentView();
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
        await showView(currentViewIndex + 1);
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
        await showView(currentViewIndex - 1);
      } catch (err) {
        statusEl.textContent = `View switch failed: ${err}`;
      } finally {
        busy = false;
      }
      return;
    }
  });
}

// ---- Phone-page settings UI ----

function wireSettingsUi(): void {
  const resetLink = document.getElementById("reset-tutorial");
  if (resetLink) {
    resetLink.addEventListener("click", (e) => {
      e.preventDefault();
      clearTutorialSeen(currentBridge);
      resetLink.textContent = "Cleared — the tutorial will show on next launch.";
      (resetLink as HTMLAnchorElement).style.pointerEvents = "none";
    });
  }

  const radios = document.querySelectorAll<HTMLInputElement>(
    'input[name="timeFormat"]',
  );
  if (radios.length === 0) return;
  for (const r of radios) {
    r.checked = r.value === settings.timeFormat;
    r.addEventListener("change", async () => {
      if (!r.checked) return;
      const v = r.value;
      if (v !== "24h" && v !== "12h") return;
      settings = { ...settings, timeFormat: v };
      renderPhone();
      renderSunTimes();
      await saveSettings(settings, currentBridge);
      // Column view's container positions depend on the format, so a flip
      // requires a page rebuild. Other views just need a content refresh.
      try {
        const bridge = currentBridge;
        const cv = VIEWS[currentViewIndex];
        if (bridge) {
          // Banner width and column-layout both depend on the time format,
          // so a flip needs a full page rebuild on every view.
          await applyPage(bridge, buildView(cv));
          if (cv === "map") {
            try { await sendMapImages(bridge); } catch { /* ignore */ }
          } else if (cv === "positions") {
            try { await sendPositionsBackground(bridge); } catch { /* ignore */ }
          }
        }
      } catch {
        /* ignore — minute tick will retry */
      }
    });
  }
}

// ---- Phone-page world picker UI ----

function wireWorldPickerUi(): void {
  const picksEl = document.getElementById("world-picks-list");
  const searchEl = document.getElementById("world-search") as HTMLInputElement | null;
  const resultsEl = document.getElementById("world-results");
  const capEl = document.getElementById("world-picks-cap");
  const resetEl = document.getElementById("world-reset");
  if (!picksEl || !searchEl || !resultsEl) return;
  if (capEl) capEl.textContent = String(MAX_WORLD_PICKS);

  let query = "";

  function renderPicks(): void {
    if (!picksEl) return;
    if (worldPicks.length === 0) {
      picksEl.innerHTML =
        '<span class="picks-empty">No cities — World view will show only Local.</span>';
      return;
    }
    picksEl.innerHTML = "";
    for (const pick of worldPicks) {
      const chip = document.createElement("span");
      chip.className = "pick";
      const text = document.createElement("span");
      text.textContent = pick.label;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", `Remove ${pick.label}`);
      btn.textContent = "×";
      btn.addEventListener("click", () => {
        removePick(pick.tz);
      });
      chip.append(text, btn);
      picksEl.appendChild(chip);
    }
  }

  function renderResults(): void {
    if (!resultsEl) return;
    resultsEl.innerHTML = "";
    const q = query.trim().toLowerCase();
    const isFull = worldPicks.length >= MAX_WORLD_PICKS;

    // Filter the catalog. When the query looks like an IANA name ("Asia/X"),
    // also offer it as a custom add at the top of the list if it's a valid
    // timezone and not already picked.
    let entries = CITY_CATALOG.filter((e) => {
      if (!q) return true;
      return (
        e.label.toLowerCase().includes(q) ||
        e.tz.toLowerCase().includes(q) ||
        e.region.toLowerCase().includes(q)
      );
    });

    const lookingLikeIana = q.includes("/");
    const queryRaw = searchEl?.value?.trim() ?? "";
    if (
      lookingLikeIana &&
      isValidTimezone(queryRaw) &&
      !worldPicks.some((p) => p.tz === queryRaw) &&
      !entries.some((e) => e.tz.toLowerCase() === q)
    ) {
      const li = document.createElement("li");
      const left = document.createElement("div");
      const labelStrong = document.createElement("strong");
      labelStrong.textContent = labelFromTz(queryRaw);
      const tzSpan = document.createElement("div");
      tzSpan.className = "tz-name";
      tzSpan.textContent = queryRaw + " (custom)";
      left.append(labelStrong, tzSpan);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = isFull ? "Full" : "Add";
      btn.disabled = isFull;
      btn.addEventListener("click", () => {
        addPick({ label: labelFromTz(queryRaw), tz: queryRaw });
        searchEl!.value = "";
        query = "";
        renderResults();
      });
      li.append(left, btn);
      resultsEl.appendChild(li);
    }

    if (entries.length === 0 && !lookingLikeIana) {
      const empty = document.createElement("div");
      empty.className = "picker-empty";
      empty.textContent = "No matches.";
      resultsEl.appendChild(empty);
      return;
    }

    // Group by region — only when there's no query, since search results read
    // better flat.
    if (!q) {
      const byRegion = new Map<string, CityCatalogEntry[]>();
      for (const e of entries) {
        const arr = byRegion.get(e.region) ?? [];
        arr.push(e);
        byRegion.set(e.region, arr);
      }
      for (const [region, list] of byRegion) {
        const header = document.createElement("li");
        header.className = "region-header";
        header.textContent = region;
        resultsEl.appendChild(header);
        for (const e of list) appendCatalogRow(e, isFull);
      }
    } else {
      for (const e of entries) appendCatalogRow(e, isFull);
    }
  }

  function appendCatalogRow(entry: CityCatalogEntry, isFull: boolean): void {
    if (!resultsEl) return;
    const alreadyPicked = worldPicks.some((p) => p.tz === entry.tz);
    const li = document.createElement("li");
    const left = document.createElement("div");
    const labelEl = document.createElement("strong");
    labelEl.textContent = entry.label;
    const tzEl = document.createElement("div");
    tzEl.className = "tz-name";
    tzEl.textContent = entry.tz;
    left.append(labelEl, tzEl);

    if (alreadyPicked) {
      const note = document.createElement("span");
      note.className = "already-picked";
      note.textContent = "picked";
      li.append(left, note);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = isFull ? "Full" : "Add";
      btn.disabled = isFull;
      btn.addEventListener("click", () => {
        addPick({ label: entry.label, tz: entry.tz });
      });
      li.append(left, btn);
    }
    resultsEl.appendChild(li);
  }

  function addPick(pick: UserCity): void {
    if (worldPicks.length >= MAX_WORLD_PICKS) return;
    if (worldPicks.some((p) => p.tz === pick.tz)) return;
    worldPicks = [...worldPicks, pick];
    persistAndPush();
  }

  function removePick(tz: string): void {
    worldPicks = worldPicks.filter((p) => p.tz !== tz);
    persistAndPush();
  }

  function resetPicks(): void {
    worldPicks = [...DEFAULT_WORLD_PICKS];
    persistAndPush();
  }

  function persistAndPush(): void {
    void saveWorldPicks(worldPicks, currentBridge);
    renderPicks();
    renderResults();
    void pushWorldIfShowing();
  }

  async function pushWorldIfShowing(): Promise<void> {
    const bridge = currentBridge;
    if (!bridge) return;
    if (VIEWS[currentViewIndex] !== "world") return;
    try {
      // Pick count or label widths may have changed — rebuild the page.
      await applyPage(bridge, buildView("world"));
    } catch {
      /* minute tick will retry */
    }
  }

  searchEl.addEventListener("input", () => {
    query = searchEl.value;
    renderResults();
  });

  if (resetEl) {
    resetEl.addEventListener("click", (e) => {
      e.preventDefault();
      resetPicks();
    });
  }

  renderPicks();
  renderResults();
}

start().catch((err) => {
  statusEl.textContent = `Init failed: ${err}`;
});
