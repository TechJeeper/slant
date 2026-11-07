import Poco from "commodetto/Poco";
import Message from "pebble/message";
import Battery from "embedded:sensor/Battery";
import Accelerometer from "embedded:sensor/Accelerometer";
import Health from "pebble/health";

const render = new Poco(screen);
const IS_ROUND = render.width === render.height;

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const OPEN_MS = 2200;
const LOW_BATTERY_PCT = 15;

/* ── 5×7 digit masks (MSB left) ──────────────────────────────────────────── */

const DIGITS = [
  [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], /* 0 */
  [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E], /* 1 */
  [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F], /* 2 */
  [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E], /* 3 */
  [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02], /* 4 */
  [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E], /* 5 */
  [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E], /* 6 */
  [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08], /* 7 */
  [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E], /* 8 */
  [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C]  /* 9 */
];

const COLON = [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00];

/* ── Settings ─────────────────────────────────────────────────────────────── */

const DEFAULT_SETTINGS = {
  preset: "gallery",
  glowMode: "fixed",
  customSlat: { r: 170, g: 170, b: 170 },
  customGlow: { r: 255, g: 248, b: 236 },
  customShadow: { r: 85, g: 85, b: 85 },
  density: "medium",
  layout: "stacked",
  accent: "date",
  use24Hour: true,
  leadingZero: true,
  flickOpen: true,
  openAmount: "normal"
};

const MATERIALS = {
  gallery: {
    slat: { r: 150, g: 152, b: 156 },
    glow: { r: 255, g: 248, b: 230 },
    shadow: { r: 90, g: 92, b: 96 },
    accentBg: { r: 120, g: 122, b: 126 },
    accentFg: { r: 255, g: 248, b: 230 }
  },
  oak: {
    slat: { r: 140, g: 96, b: 58 },
    glow: { r: 255, g: 170, b: 70 },
    shadow: { r: 70, g: 42, b: 22 },
    accentBg: { r: 110, g: 72, b: 40 },
    accentFg: { r: 255, g: 220, b: 170 }
  },
  night: {
    slat: { r: 28, g: 28, b: 32 },
    glow: { r: 255, g: 85, b: 100 },
    shadow: { r: 8, g: 8, b: 10 },
    accentBg: { r: 40, g: 28, b: 32 },
    accentFg: { r: 255, g: 170, b: 180 }
  },
  paper: {
    slat: { r: 236, g: 232, b: 220 },
    glow: { r: 40, g: 70, b: 120 },
    shadow: { r: 180, g: 176, b: 164 },
    accentBg: { r: 220, g: 214, b: 200 },
    accentFg: { r: 40, g: 70, b: 120 }
  }
};

const CYCLE_GLOWS = [
  { h: 5, c: { r: 255, g: 160, b: 120 } },  /* dawn */
  { h: 8, c: { r: 255, g: 230, b: 180 } },  /* morning */
  { h: 12, c: { r: 255, g: 248, b: 230 } }, /* noon */
  { h: 17, c: { r: 255, g: 150, b: 80 } },  /* golden */
  { h: 20, c: { r: 180, g: 90, b: 160 } },  /* dusk */
  { h: 22, c: { r: 70, g: 90, b: 180 } }    /* night */
];

function loadSettings() {
  const out = {};
  const keys = Object.keys(DEFAULT_SETTINGS);
  for (let i = 0; i < keys.length; i++) out[keys[i]] = DEFAULT_SETTINGS[keys[i]];
  const stored = localStorage.getItem("settings");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const pk = Object.keys(parsed);
      for (let i = 0; i < pk.length; i++) out[pk[i]] = parsed[pk[i]];
    } catch (e) {
      console.log("settings parse fail");
    }
  }
  return out;
}

function saveSettings() {
  localStorage.setItem("settings", JSON.stringify(settings));
}

let settings = loadSettings();

/* ── Colors / fonts ───────────────────────────────────────────────────────── */

let slatC, glowC, shadowC, accentBgC, accentFgC;
const smallFont = new render.Font("Gothic-Bold", 14);

function rgb(c) {
  return render.makeColor(c.r, c.g, c.b);
}

function cycleGlow(hour) {
  let best = CYCLE_GLOWS[CYCLE_GLOWS.length - 1].c;
  for (let i = 0; i < CYCLE_GLOWS.length; i++) {
    if (hour >= CYCLE_GLOWS[i].h) best = CYCLE_GLOWS[i].c;
  }
  return best;
}

function materialFor() {
  if (settings.preset === "custom") {
    return {
      slat: settings.customSlat,
      glow: settings.customGlow,
      shadow: settings.customShadow,
      accentBg: settings.customSlat,
      accentFg: settings.customGlow
    };
  }
  return MATERIALS[settings.preset] || MATERIALS.gallery;
}

function updateColors(now) {
  const m = materialFor();
  let glow = m.glow;
  if (settings.glowMode === "cycle") {
    glow = cycleGlow(now ? now.getHours() : new Date().getHours());
  }
  slatC = rgb(m.slat);
  glowC = rgb(glow);
  shadowC = rgb(m.shadow);
  accentBgC = rgb(m.accentBg);
  accentFgC = rgb(m.accentFg);
}

/* ── Runtime ──────────────────────────────────────────────────────────────── */

let lastDate = new Date();
let batteryPercent = 100;
let stepCount = 0;
let appReady = false;
let lowPower = false;
let louversOpen = false;
let openTimer = null;

const battery = new Battery({
  onSample() {
    batteryPercent = this.sample().percent;
    lowPower = batteryPercent <= LOW_BATTERY_PCT;
    if (appReady) drawScreen();
  }
});
batteryPercent = battery.sample().percent;
lowPower = batteryPercent <= LOW_BATTERY_PCT;

function readSteps() {
  try {
    const now = Date.now();
    if (Health.metric.accessible) {
      const access = Health.metric.accessible({
        metric: "step count",
        start: now,
        end: now
      });
      const ok = Health.access ? (access & Health.access.available) : access;
      if (!ok) return;
    }
    stepCount = Health.metric.get("step count") | 0;
  } catch (e) {
    /* health unavailable */
  }
}

readSteps();
updateColors(lastDate);

/* ── Formatting ───────────────────────────────────────────────────────────── */

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function timeParts(now) {
  let h = now.getHours();
  const m = now.getMinutes();
  if (!settings.use24Hour) {
    h = h % 12;
    if (h === 0) h = 12;
  }
  const hs = settings.leadingZero ? pad2(h) : String(h);
  return { hs, ms: pad2(m) };
}

function accentText(now) {
  switch (settings.accent) {
    case "date":
      return MONTHS[now.getMonth()] + " " + now.getDate();
    case "weekday":
      return DAYS[now.getDay()];
    case "battery":
      return batteryPercent + "%";
    case "steps":
      return String(stepCount);
    default:
      return "";
  }
}

/* ── Slat geometry ────────────────────────────────────────────────────────── */

function densitySpec() {
  if (lowPower) return { thick: 7, gap: 1 };
  if (settings.density === "fine") return { thick: 3, gap: 1 };
  if (settings.density === "bold") return { thick: 8, gap: 2 };
  return { thick: 5, gap: 2 };
}

function openGapBoost() {
  if (louversOpen) return 4;
  if (settings.openAmount === "tight") return 0;
  if (settings.openAmount === "airy") return 2;
  return 1;
}

function layoutDigits(now) {
  const w = render.unobstructed.width;
  const h = render.unobstructed.height;
  const ox = (render.width - w) >> 1;
  const oy = (render.height - h) >> 1;
  const parts = timeParts(now);
  const layout = lowPower ? "stacked" : settings.layout;

  if (layout === "row") {
    const cell = Math.min(((w - 20) / 17) | 0, ((h - 28) / 7) | 0);
    const totalW = 17 * cell;
    const totalH = 7 * cell;
    const x0 = ox + ((w - totalW) >> 1);
    const y0 = oy + ((h - totalH - 18) >> 1);
    return {
      cells: [
        { ch: parts.hs[0] || "0", x: x0, y: y0 },
        { ch: parts.hs[1] || "0", x: x0 + 4 * cell, y: y0 },
        { ch: ":", x: x0 + 8 * cell, y: y0 },
        { ch: parts.ms[0], x: x0 + 10 * cell, y: y0 },
        { ch: parts.ms[1], x: x0 + 14 * cell, y: y0 }
      ],
      cell,
      accentY: y0 + totalH + 8
    };
  }

  if (layout === "corner") {
    /* Compact stacked block anchored lower-left */
    const cell = Math.min(((w * 0.48) / 9) | 0, ((h * 0.42) / 16) | 0);
    const rowW = 9 * cell;
    const x0 = ox + 12;
    const blockH = 15 * cell;
    const y0 = oy + h - blockH - 22;
    const hs = parts.hs.length === 1 ? (" " + parts.hs) : parts.hs;
    return {
      cells: [
        { ch: hs[0] === " " ? null : hs[0], x: x0, y: y0 },
        { ch: hs[1], x: x0 + 5 * cell, y: y0 },
        { ch: parts.ms[0], x: x0, y: y0 + 8 * cell },
        { ch: parts.ms[1], x: x0 + 5 * cell, y: y0 + 8 * cell }
      ],
      cell,
      accentY: Math.max(oy + 10, y0 - 18),
      colonY: y0 + 7 * cell + ((cell - 2) >> 1),
      colonX: x0 + ((rowW - 4) >> 1)
    };
  }

  /* stacked — HH over MM, colon as small gap marker between rows */
  const cell = Math.min(((w - 24) / 9) | 0, ((h - 36) / 16) | 0);
  const rowW = 9 * cell;
  const x0 = ox + ((w - rowW) >> 1);
  const blockH = 15 * cell;
  const y0 = oy + ((h - blockH - 20) >> 1);
  const hs = parts.hs.length === 1 ? (" " + parts.hs) : parts.hs;
  return {
    cells: [
      { ch: hs[0] === " " ? null : hs[0], x: x0, y: y0 },
      { ch: hs[1], x: x0 + 5 * cell, y: y0 },
      { ch: parts.ms[0], x: x0, y: y0 + 8 * cell },
      { ch: parts.ms[1], x: x0 + 5 * cell, y: y0 + 8 * cell }
    ],
    cell,
    accentY: y0 + blockH + 6,
    colonY: y0 + 7 * cell + ((cell - 2) >> 1),
    colonX: x0 + ((rowW - 4) >> 1)
  };
}

function maskFor(ch) {
  if (ch === ":") return COLON;
  if (ch === null || ch === undefined) return null;
  const n = ch.charCodeAt(0) - 48;
  if (n < 0 || n > 9) return null;
  return DIGITS[n];
}

/* Build a coarse occupancy map: for each slat band, which x-ranges are "digit open". */
function digitOpenRanges(layout) {
  /* ranges[slatIndex] = array of {x0,x1} in screen coords — punched open */
  const cell = layout.cell;
  const rangesByY = {};

  function addRange(y0, y1, x0, x1) {
    const a = y0 | 0;
    const b = y1 | 0;
    for (let y = a; y < b; y++) {
      if (!rangesByY[y]) rangesByY[y] = [];
      rangesByY[y].push({ x0: x0 | 0, x1: x1 | 0 });
    }
  }

  for (let i = 0; i < layout.cells.length; i++) {
    const d = layout.cells[i];
    if (!d.ch) continue;
    const mask = maskFor(d.ch);
    if (!mask) continue;
    for (let row = 0; row < 7; row++) {
      const bits = mask[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (0x10 >> col)) {
          const x0 = d.x + col * cell;
          const y0 = d.y + row * cell;
          addRange(y0, y0 + cell, x0, x0 + cell);
        }
      }
    }
  }
  return rangesByY;
}

function mergeRanges(list) {
  if (!list || !list.length) return [];
  const sorted = list.slice().sort((a, b) => a.x0 - b.x0);
  const out = [{ x0: sorted[0].x0, x1: sorted[0].x1 }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].x0 <= last.x1 + 1) {
      if (sorted[i].x1 > last.x1) last.x1 = sorted[i].x1;
    } else {
      out.push({ x0: sorted[i].x0, x1: sorted[i].x1 });
    }
  }
  return out;
}

/* ── Draw ─────────────────────────────────────────────────────────────────── */

function drawLouvers(now) {
  const w = render.width;
  const h = render.height;
  const spec = densitySpec();
  const gap = spec.gap + openGapBoost();
  const thick = louversOpen ? Math.max(2, spec.thick - 2) : spec.thick;
  const pitch = thick + gap;
  const layout = layoutDigits(now);
  const openMap = digitOpenRanges(layout);

  render.begin();
  render.fillRectangle(glowC, 0, 0, w, h);

  /* Horizontal louvers with punched digit openings */
  for (let y = 0; y < h; y += pitch) {
    const bandH = Math.min(thick, h - y);
    if (bandH <= 0) continue;

    /* Collect open ranges across this band's rows */
    let bandRanges = [];
    for (let yy = y; yy < y + bandH; yy++) {
      const r = openMap[yy];
      if (r) {
        for (let i = 0; i < r.length; i++) bandRanges.push(r[i]);
      }
    }
    const opens = mergeRanges(bandRanges);

    if (!opens.length) {
      render.fillRectangle(slatC, 0, y, w, bandH);
    } else {
      let cursor = 0;
      for (let i = 0; i < opens.length; i++) {
        const o = opens[i];
        if (o.x0 > cursor) {
          render.fillRectangle(slatC, cursor, y, o.x0 - cursor, bandH);
        }
        /* leave glow in open digit region */
        cursor = o.x1;
      }
      if (cursor < w) {
        render.fillRectangle(slatC, cursor, y, w - cursor, bandH);
      }
    }

    /* Soft underside shadow — skip over digit punches for a cleaner cut */
    const sy = y + bandH;
    if (sy < h && gap > 0) {
      const sh = Math.min(1, h - sy);
      if (!opens.length) {
        render.fillRectangle(shadowC, 0, sy, w, sh);
      } else {
        let cursor = 0;
        for (let i = 0; i < opens.length; i++) {
          const o = opens[i];
          if (o.x0 > cursor) {
            render.fillRectangle(shadowC, cursor, sy, o.x0 - cursor, sh);
          }
          cursor = o.x1;
        }
        if (cursor < w) {
          render.fillRectangle(shadowC, cursor, sy, w - cursor, sh);
        }
      }
    }
  }

  /* Stacked layout: small glow colon dots between hour/minute rows */
  if (layout.colonX != null) {
    render.fillRectangle(glowC, layout.colonX, layout.colonY, 4, 4);
  }

  /* Accent strip — one tilted-feeling bar (drawn as offset rectangle) */
  if (!lowPower && settings.accent !== "off") {
    const label = accentText(now);
    if (label) {
      const tw = render.getTextWidth(label, smallFont);
      const pad = 8;
      const bw = tw + pad * 2;
      const bh = smallFont.height + 6;
      let bx = ((w - bw) >> 1) + (IS_ROUND ? 0 : 6);
      let by = layout.accentY;
      if (by + bh > h - 4) by = h - bh - 6;
      if (by < 4) by = 4;

      /* offset shadow for "tilted strip" feel */
      render.fillRectangle(shadowC, bx + 3, by + 3, bw, bh);
      render.fillRectangle(accentBgC, bx, by, bw, bh);
      render.drawText(label, smallFont, accentFgC, bx + pad, by + 3);
    }
  }

  /* Low-battery pip */
  if (lowPower) {
    render.fillRectangle(glowC, 6, 6, 10, 4);
  }

  render.end();
}

function drawScreen(e) {
  const now = (e && e.date) ? e.date : new Date();
  lastDate = now;
  updateColors(now);
  drawLouvers(now);
}

/* ── Flick opens louvers ──────────────────────────────────────────────────── */

function openLouversBriefly() {
  if (!settings.flickOpen || lowPower) return;
  louversOpen = true;
  drawScreen();
  if (openTimer) clearTimeout(openTimer);
  openTimer = setTimeout(() => {
    louversOpen = false;
    openTimer = null;
    drawScreen();
  }, OPEN_MS);
}

const accel = new Accelerometer({
  onTap() { openLouversBriefly(); }
});

/* ── Minute tick ──────────────────────────────────────────────────────────── */

function onMinute(e) {
  lastDate = e.date;
  readSteps();
  lowPower = batteryPercent <= LOW_BATTERY_PCT;
  drawScreen(e);
}

watch.addEventListener("minutechange", onMinute);
watch.addEventListener("resize", () => drawScreen());
watch.addEventListener("health", (what) => {
  if (what === "movement" || what === "significant") {
    if (settings.accent === "steps") {
      readSteps();
      drawScreen();
    }
  }
});

/* ── Clay / AppMessage ────────────────────────────────────────────────────── */

function colorFromInt(v) {
  return {
    r: (v >> 16) & 0xFF,
    g: (v >> 8) & 0xFF,
    b: v & 0xFF
  };
}

function asBool(v, fallback) {
  if (v === undefined) return fallback;
  if (v === true || v === 1 || v === "1" || v === "true") return true;
  if (v === false || v === 0 || v === "0" || v === "false") return false;
  return fallback;
}

function asString(v, fallback) {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

const MESSAGE_KEYS = [
  "Preset", "GlowMode",
  "CustomSlat", "CustomGlow", "CustomShadow",
  "Density", "Layout", "Accent",
  "Use24Hour", "LeadingZero", "FlickOpen", "OpenAmount"
];

const message = new Message({
  input: 384,
  output: 128,
  keys: MESSAGE_KEYS,
  onReadable() {
    try {
      const msg = this.read();
      const get = (key) => {
        let v;
        if (msg && typeof msg.get === "function") v = msg.get(key);
        else if (msg && (key in msg)) v = msg[key];
        if (v && typeof v === "object" && ("value" in v)) v = v.value;
        return v;
      };

      settings.preset = asString(get("Preset"), settings.preset);

      const csl = get("CustomSlat");
      if (csl !== undefined) settings.customSlat = colorFromInt(csl);
      const cgl = get("CustomGlow");
      if (cgl !== undefined) settings.customGlow = colorFromInt(cgl);
      const csh = get("CustomShadow");
      if (csh !== undefined) settings.customShadow = colorFromInt(csh);

      settings.glowMode = asString(get("GlowMode"), settings.glowMode);
      settings.density = asString(get("Density"), settings.density);
      settings.layout = asString(get("Layout"), settings.layout);
      settings.accent = asString(get("Accent"), settings.accent);
      settings.openAmount = asString(get("OpenAmount"), settings.openAmount);
      settings.use24Hour = asBool(get("Use24Hour"), settings.use24Hour);
      settings.leadingZero = asBool(get("LeadingZero"), settings.leadingZero);
      settings.flickOpen = asBool(get("FlickOpen"), settings.flickOpen);

      saveSettings();
      updateColors(lastDate);
      drawScreen();
    } catch (e) {
      console.log("settings error: " + e);
    }
  }
});

/* ── Boot ─────────────────────────────────────────────────────────────────── */

appReady = true;
drawScreen();
