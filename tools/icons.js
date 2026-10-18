import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BG = [16, 20, 24];
const MARK = [74, 178, 122];
const SS = 4;

const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// anillo y raya, supersample x4 porque a 16px sin antialias queda un manchon
function draw(size) {
  const big = size * SS;
  const acc = new Float64Array(size * size * 4);

  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const u = (x + 0.5) / big;
      const v = (y + 0.5) / big;
      const dx = u - 0.5;
      const dy = v - 0.5;

      const edge = Math.hypot(Math.max(Math.abs(dx) - 0.28, 0), Math.max(Math.abs(dy) - 0.28, 0));
      if (edge > 0.22) continue;

      const radius = Math.hypot(dx, dy);
      const slash = Math.abs((dx + dy) / Math.SQRT2);
      const inRing = radius > 0.235 && radius < 0.365;
      const inSlash = slash < 0.052 && radius < 0.365;
      const color = inRing || inSlash ? MARK : BG;

      const px = Math.floor(x / SS);
      const py = Math.floor(y / SS);
      const i = (py * size + px) * 4;
      acc[i] += color[0];
      acc[i + 1] += color[1];
      acc[i + 2] += color[2];
      acc[i + 3] += 255;
    }
  }

  const out = Buffer.alloc(size * size * 4);
  const n = SS * SS;
  for (let i = 0; i < out.length; i += 4) {
    out[i] = Math.round(acc[i] / n);
    out[i + 1] = Math.round(acc[i + 1] / n);
    out[i + 2] = Math.round(acc[i + 2] / n);
    out[i + 3] = Math.round(acc[i + 3] / n);
  }
  return out;
}

for (const size of [16, 32, 48, 128]) {
  writeFileSync(new URL(`../icon${size}.png`, import.meta.url), png(size, draw(size)));
  console.log(`icon${size}.png`);
}