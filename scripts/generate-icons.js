// Dependency-free geometric icon renderer; supersampling keeps toolbar sizes crisp.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../icons/', import.meta.url));
mkdirSync(directory, { recursive: true });
const violet = '#6745d8';
const cream = '#fff9ec';
const ink = '#222331';
const coral = '#ff897d';
const circle = (x, y, cx, cy, radius) => (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
function stroke(x, y, [ax, ay, bx, by], width) {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) /
    ((bx - ax) ** 2 + (by - ay) ** 2)));
  return circle(x, y, ax + t * (bx - ax), ay + t * (by - ay), width / 2);
}
// The same geometric layers drive SVG and PNG, keeping the exports in sync.
const layers = [];
function ellipse(cx, cy, rx, ry, fill) {
  layers.push({ fill, svg: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`,
    contains: (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 });
}
function line(points, width, fill) {
  const segments = points.slice(1).map((point, index) => [...points[index], ...point]);
  layers.push({ fill,
    svg: `<polyline points="${points.map(point => point.join(',')).join(' ')}" fill="none" ` +
      `stroke="${fill}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
    contains: (x, y) => segments.some(segment => stroke(x, y, segment, width)) });
}
function curve(start, control, end, width, fill) {
  const points = Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    return start.map((value, axis) => Number(((1 - t) ** 2 * value +
      2 * (1 - t) * t * control[axis] + t ** 2 * end[axis]).toFixed(3)));
  });
  line(points, width, fill);
}
layers.push({ fill: violet,
  svg: `<rect x="4" y="4" width="120" height="120" rx="26" fill="${violet}"/>`,
  contains: (x, y) => circle(x, y, Math.max(30, Math.min(98, x)),
    Math.max(30, Math.min(98, y)), 26) });
// Capture parentheses leave breathing room around the round ears.
curve([28, 23], [3, 62], [28, 101], 7, cream);
curve([100, 23], [122, 56], [108, 79], 7, cream);
ellipse(44, 48, 13, 14, cream);
ellipse(84, 48, 13, 14, cream);
ellipse(44, 48, 7, 8, violet);
ellipse(84, 48, 7, 8, violet);
ellipse(64, 73, 32, 29, cream);
ellipse(52, 68, 3.8, 4.5, ink);
ellipse(76, 68, 3.8, 4.5, ink);
ellipse(64, 79, 7, 4.8, ink);
line([[64, 82], [64, 87]], 3, ink);
curve([53, 86], [57, 96], [64, 87], 3, ink);
curve([64, 87], [71, 96], [75, 86], 3, ink);
// A violet clearance ring prevents the asterisk merging into the bear or bracket.
const arms = [[103, 87, 103, 109], [93.5, 92.5, 112.5, 103.5], [93.5, 103.5, 112.5, 92.5]];
for (const [ax, ay, bx, by] of arms) line([[ax, ay], [bx, by]], 12, violet);
for (const [ax, ay, bx, by] of arms) line([[ax, ay], [bx, by]], 6.5, coral);
for (const layer of layers) layer.rgb = layer.fill.match(/[a-f0-9]{2}/gi).map(hex => parseInt(hex, 16));
function colorAt(x, y) {
  for (let index = layers.length - 1; index >= 0; index--) {
    if (layers[index].contains(x, y)) return layers[index].rgb;
  }
  return null;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}
for (const size of [16, 32, 48, 128]) {
  // Store artwork is 96 px wide with 16 px padding; toolbar artwork keeps its larger footprint.
  const scale = size === 128 ? .8 : 1;
  const inset = size === 128 ? 12.8 : 0;
  const samples = 8;
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const total = [0, 0, 0]; let count = 0;
      for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) {
        const color = colorAt(((x + (sx + .5) / samples) * 128 / size - inset) / scale,
          ((y + (sy + .5) / samples) * 128 / size - inset) / scale);
        if (color) { count++; color.forEach((value, index) => total[index] += value); }
      }
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = count ? Math.round(total[channel] / count) : 0;
      pixels[offset + 3] = Math.round(count / samples ** 2 * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  writeFileSync(`${directory}/icon-${size}.png`, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))
  ]));
}
writeFileSync(`${directory}/icon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <title>Regex Highlighter</title>
  <g transform="translate(12.8 12.8) scale(.8)">
  ${layers.map(layer => layer.svg).join('\n  ')}
  </g>
</svg>\n`);
console.log('Generated SVG and 16, 32, 48, 128 px PNG icons.');
