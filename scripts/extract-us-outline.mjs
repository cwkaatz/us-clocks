// Extract US outline (contiguous 48 + Alaska, no Hawaii) from us-atlas
// states-albers-10m TopoJSON and write a flat TS file the bundle imports
// at build time. Run with:
//   node scripts/extract-us-outline.mjs
// Re-run after changing the filter rules.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mesh } from "topojson-client";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dataPath = path.resolve(root, "node_modules/us-atlas/states-albers-10m.json");
const outPath = path.resolve(root, "src/us-outline.ts");

const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// Filter out Hawaii (FIPS id "15"). Keep Alaska (FIPS id "02") and everything else.
const filtered = {
  ...raw,
  objects: {
    ...raw.objects,
    states: {
      ...raw.objects.states,
      geometries: raw.objects.states.geometries.filter((g) => String(g.id) !== "15"),
    },
  },
};

// Map each state FIPS id to its PRIMARY US time zone. Some states straddle
// (TX panhandle, FL panhandle, Idaho panhandle, Indiana, Kentucky, Tennessee,
// the Dakotas, Nebraska, Kansas) but for a map at this scale, the dominant
// zone is what we draw against.
const STATE_TZ = {
  // Eastern
  "09": "ET", "10": "ET", "11": "ET", "12": "ET", "13": "ET",
  "18": "ET", "21": "ET", "23": "ET", "24": "ET", "25": "ET",
  "26": "ET", "33": "ET", "34": "ET", "36": "ET", "37": "ET",
  "39": "ET", "42": "ET", "44": "ET", "45": "ET", "50": "ET",
  "51": "ET", "54": "ET",
  // Central
  "01": "CT", "05": "CT", "17": "CT", "19": "CT", "20": "CT",
  "22": "CT", "27": "CT", "28": "CT", "29": "CT", "31": "CT",
  "38": "CT", "40": "CT", "46": "CT", "47": "CT", "48": "CT",
  "55": "CT",
  // Mountain
  "04": "MT", "08": "MT", "16": "MT", "30": "MT", "35": "MT",
  "49": "MT", "56": "MT",
  // Pacific
  "06": "PT", "32": "PT", "41": "PT", "53": "PT",
  // Alaska
  "02": "AKT",
};
const tzOf = (g) => STATE_TZ[String(g.id)];

// topojson.mesh with the predicate (a, b) => a === b returns only exterior
// arcs (where both sides of the arc reference the same geometry — i.e., no
// neighbouring state on the other side). The result is the merged outer
// boundary of the contiguous 48 + AK.
const outline = mesh(filtered, filtered.objects.states, (a, b) => a === b);

// Interior arcs partitioned by whether the two adjacent states are in the
// same time zone. Drawn as two separate layers on the lens.
const intraZoneBorders = mesh(filtered, filtered.objects.states, (a, b) => {
  const za = tzOf(a), zb = tzOf(b);
  return a !== b && za !== undefined && zb !== undefined && za === zb;
});

const tzBorders = mesh(filtered, filtered.objects.states, (a, b) => {
  const za = tzOf(a), zb = tzOf(b);
  return a !== b && za !== undefined && zb !== undefined && za !== zb;
});

const roundPolylines = (m) =>
  m.coordinates.map((line) =>
    line.map(([x, y]) => [Math.round(x), Math.round(y)]),
  );

const polylines = roundPolylines(outline);
const intraZonePolylines = roundPolylines(intraZoneBorders);
const tzPolylines = roundPolylines(tzBorders);

// Split the merged outline into "contiguous 48" and "Alaska" so the lens can
// render them in separate ImageContainerProperty slots — contiguous gets the
// full 288×144 SDK max, Alaska gets a small inset. In the Albers USA composite
// projection the us-atlas data uses, Alaska sits in the lower-left corner —
// roughly x < 200 and y > 450. A polyline is Alaska if its bounding box is
// entirely inside that region.
function bboxOf(line) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of line) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}
function isAlaskaLine(line) {
  const bb = bboxOf(line);
  // The main Alaska mainland polyline has maxX≈203 in this projection, so
  // the eastward threshold has to be a hair past that.
  return bb.maxX < 220 && bb.minY > 440;
}

const contiguousPolylines = polylines.filter((p) => !isAlaskaLine(p));
const alaskaPolylines = polylines.filter((p) => isAlaskaLine(p));

function boundsOf(lines) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const line of lines) {
    for (const [x, y] of line) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

// The contiguous outline includes Florida-Keys segments extending to y≈607
// in this projection. They're part of the same merged polyline as mainland
// Florida (topojson.mesh combined adjacent arcs), so we can't drop them by
// filtering polylines. Instead we just clamp the bounds' maxY to mainland
// Florida's southernmost reach — Keys still render but their pixels fall
// below the canvas (harmlessly clipped), and the rest of the US fills the
// container properly.
const CONTIG_MAX_Y_CAP = 485;
const rawContigBounds = boundsOf(contiguousPolylines);
const contiguousBounds = {
  ...rawContigBounds,
  maxY: Math.min(rawContigBounds.maxY, CONTIG_MAX_Y_CAP),
};
const alaskaBounds = boundsOf(alaskaPolylines);

const sumPoints = (lines) => lines.reduce((acc, line) => acc + line.length, 0);
const intraPoints = sumPoints(intraZonePolylines);
const tzPoints = sumPoints(tzPolylines);
const contigPoints = sumPoints(contiguousPolylines);
const alaskaPoints = sumPoints(alaskaPolylines);

const ts = `// AUTO-GENERATED by scripts/extract-us-outline.mjs. Do not edit by hand.
// Source: us-atlas states-albers-10m.json (public domain Natural Earth via D3).
// Pre-projected to Albers USA, Hawaii excluded.
// Contiguous outline:    ${contiguousPolylines.length} polylines, ${contigPoints} pts.
// Alaska outline:        ${alaskaPolylines.length} polylines, ${alaskaPoints} pts.
// Intra-zone borders:    ${intraZonePolylines.length} polylines, ${intraPoints} pts.
// Time-zone borders:     ${tzPolylines.length} polylines, ${tzPoints} pts.
export const US_CONTIGUOUS_OUTLINE_POLYLINES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = ${JSON.stringify(contiguousPolylines)} as const;
export const US_ALASKA_OUTLINE_POLYLINES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = ${JSON.stringify(alaskaPolylines)} as const;

// Interior state borders WITHIN a time zone (drawn as a sparse dotted
// underlay). All within contiguous 48 — Alaska has no interior arcs.
export const US_INTRA_ZONE_BORDER_POLYLINES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = ${JSON.stringify(intraZonePolylines)} as const;

// State borders that ALSO divide US time zones (drawn as solid lines so the
// time-zone boundaries pop on the lens). All within contiguous 48.
export const US_TZ_BORDER_POLYLINES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = ${JSON.stringify(tzPolylines)} as const;

// Bounding boxes used by the renderer to fit-and-centre each region.
// Contiguous bounds exclude tiny Florida-Keys outliers so the mainland fills
// the container (Keys still render where they fall — off-canvas, harmless).
export const US_CONTIGUOUS_BOUNDS = { minX: ${contiguousBounds.minX}, maxX: ${contiguousBounds.maxX}, minY: ${contiguousBounds.minY}, maxY: ${contiguousBounds.maxY} } as const;
export const US_ALASKA_BOUNDS = { minX: ${alaskaBounds.minX}, maxX: ${alaskaBounds.maxX}, minY: ${alaskaBounds.minY}, maxY: ${alaskaBounds.maxY} } as const;
`;

fs.writeFileSync(outPath, ts);
console.log(
  `Wrote ${outPath}: contig ${contiguousPolylines.length}/${contigPoints} (${JSON.stringify(contiguousBounds)}), AK ${alaskaPolylines.length}/${alaskaPoints} (${JSON.stringify(alaskaBounds)}), intra ${intraZonePolylines.length}/${intraPoints}, tz ${tzPolylines.length}/${tzPoints}`,
);
