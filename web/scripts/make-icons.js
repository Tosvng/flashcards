/**
 * Generates the PWA icons into public/ with no dependencies (PNG written by hand).
 * Design: two stacked flashcards on the brand blue. Replace the PNGs with real artwork any time;
 * this script only exists so the repo does not ship Expo's placeholder icons.
 *   node scripts/make-icons.js
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const BLUE = [47, 91, 234];
const WHITE = [255, 255, 255];
/** The card behind is tinted toward the background so the stack reads as depth. */
const FRONT = BLUE.map((c) => Math.round(255 * 0.62 + c * 0.38));
const SS = 3; // supersampling per axis, for smooth edges

/** Is (x, y) inside the rounded rectangle? Coordinates are fractions of the icon size. */
function inRoundRect(x, y, left, top, w, h, r) {
  const cx = Math.min(Math.max(x, left + r), left + w - r);
  const cy = Math.min(Math.max(y, top + r), top + h - r);
  return x >= left && x <= left + w && y >= top && y <= top + h && (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** Returns [r, g, b, a] for a point; `scale` shrinks the artwork toward the centre (maskable safe zone). */
function shade(u, v, { scale, rounded }) {
  if (rounded && !inRoundRect(u, v, 0, 0, 1, 1, 0.22)) return [0, 0, 0, 0];
  const x = (u - 0.5) / scale + 0.5;
  const y = (v - 0.5) / scale + 0.5;
  // Back card (tilted look via offset), then front card with two text lines.
  if (inRoundRect(x, y, 0.2, 0.2, 0.5, 0.56, 0.06)) {
    if (inRoundRect(x, y, 0.3, 0.38, 0.3, 0.05, 0.025) || inRoundRect(x, y, 0.3, 0.5, 0.22, 0.05, 0.025)) return [...BLUE, 255];
    return [...WHITE, 255];
  }
  if (inRoundRect(x, y, 0.3, 0.26, 0.5, 0.56, 0.06)) return [...FRONT, 255];
  return [...BLUE, 255];
}

function render(size, options) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb, pa] = shade((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, options);
          r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
        }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      const n = SS * SS;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round(a / n);
    }
  }
  return raw;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)) >>> 0, 8 + data.length);
  return out;
}

function png(size, options) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(render(size, options), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ICONS = [
  // Normal icons: rounded corners baked in, transparent outside.
  { file: 'icon-192.png', size: 192, scale: 1, rounded: true },
  { file: 'icon-512.png', size: 512, scale: 1, rounded: true },
  // Maskable: full-bleed, artwork inside the central 80% safe zone so any mask shape works.
  { file: 'icon-maskable-512.png', size: 512, scale: 0.8, rounded: false },
  // iOS draws its own rounded corners and dislikes transparency: full-bleed, 180px.
  { file: 'apple-touch-icon.png', size: 180, scale: 0.9, rounded: false },
  { file: 'favicon-32.png', size: 32, scale: 1, rounded: true },
];

if (require.main === module) {
  const dir = path.join(__dirname, '..', 'public');
  fs.mkdirSync(dir, { recursive: true });
  for (const { file, size, scale, rounded } of ICONS) {
    fs.writeFileSync(path.join(dir, file), png(size, { scale, rounded }));
    console.log(`wrote public/${file} (${size}x${size})`);
  }
}

module.exports = { png, ICONS };
