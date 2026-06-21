import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const root = join(process.cwd(), 'client', 'public', 'assets');
const manifest = [];

function makeCanvas(width, height, color = [0, 0, 0, 0]) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color[3];
  }
  return { width, height, data };
}

function parseHex(hex, alpha = 255) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    alpha,
  ];
}

function blendPixel(canvas, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const i = (y * canvas.width + x) * 4;
  const a = color[3] / 255;
  const inv = 1 - a;
  canvas.data[i] = Math.round(color[0] * a + canvas.data[i] * inv);
  canvas.data[i + 1] = Math.round(color[1] * a + canvas.data[i + 1] * inv);
  canvas.data[i + 2] = Math.round(color[2] * a + canvas.data[i + 2] * inv);
  canvas.data[i + 3] = Math.min(255, Math.round(color[3] + canvas.data[i + 3] * inv));
}

function rect(canvas, x, y, w, h, color) {
  for (let yy = Math.floor(y); yy < y + h; yy++) {
    for (let xx = Math.floor(x); xx < x + w; xx++) blendPixel(canvas, xx, yy, color);
  }
}

function ellipse(canvas, cx, cy, rx, ry, color) {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) blendPixel(canvas, x, y, color);
    }
  }
}

function circle(canvas, cx, cy, r, color) {
  ellipse(canvas, cx, cy, r, r, color);
}

function line(canvas, x1, y1, x2, y2, color, width = 2) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    circle(canvas, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
  }
}

function polygon(canvas, points, color) {
  const ys = points.map((p) => p[1]);
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if ((yi > y) !== (yj > y)) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) blendPixel(canvas, x, y, color);
    }
  }
}

function curve(canvas, points, color, width = 2) {
  let last = points[0];
  for (let t = 0.03; t <= 1.001; t += 0.03) {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    const x = a * points[0][0] + b * points[1][0] + c * points[2][0];
    const y = a * points[0][1] + b * points[1][1] + c * points[2][1];
    line(canvas, last[0], last[1], x, y, color, width);
    last = [x, y];
  }
}

function gradient(canvas, top, bottom) {
  for (let y = 0; y < canvas.height; y++) {
    const t = y / Math.max(1, canvas.height - 1);
    const c = top.map((v, i) => Math.round(v + (bottom[i] - v) * t));
    rect(canvas, 0, y, canvas.width, 1, c);
  }
}

function writePng(canvas, relPath) {
  const raw = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    const row = y * (canvas.width * 4 + 1);
    raw[row] = 0;
    Buffer.from(canvas.data.buffer, y * canvas.width * 4, canvas.width * 4).copy(raw, row + 1);
  }
  const chunks = [];
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const crcTable = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const name = Buffer.from(type);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    name.copy(out, 4);
    data.copy(out, 8);
    out.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
    chunks.push(out);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.width, 0);
  ihdr.writeUInt32BE(canvas.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  chunk('IHDR', ihdr);
  chunk('IDAT', deflateSync(raw, { level: 9 }));
  chunk('IEND', Buffer.alloc(0));
  const outPath = join(root, relPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.concat([sig, ...chunks]));
  manifest.push({ path: `/assets/${relPath.replaceAll('\\', '/')}`, width: canvas.width, height: canvas.height });
}

function drawHills(c, night = false) {
  const w = c.width;
  const h = c.height;
  const back = night ? ['#315f6d', '#244a58', '#183746'] : ['#b8d99e', '#82bd74', '#4e9157'];
  for (let i = 0; i < 3; i++) {
    const y = h * (0.55 + i * 0.11);
    const color = parseHex(back[i], i === 0 ? 150 : 220);
    polygon(c, [
      [0, h],
      [0, y + 70],
      [w * 0.15, y],
      [w * 0.35, y + 45],
      [w * 0.55, y - 35],
      [w * 0.75, y + 25],
      [w, y - 20],
      [w, h],
    ], color);
  }
}

function makeEnvironment(name, night = false) {
  const c = makeCanvas(1600, 900);
  gradient(c, parseHex(night ? '#10213f' : '#91d6ff'), parseHex(night ? '#1d3f4d' : '#dff4c7'));
  if (night) {
    circle(c, 450, 135, 46, parseHex('#f4f7ff', 235));
    circle(c, 480, 120, 40, parseHex('#10213f', 190));
    for (let i = 0; i < 80; i++) circle(c, (i * 137) % 1600, 40 + ((i * 97) % 320), 1 + (i % 3), parseHex('#ffffff', 120 + (i % 4) * 25));
  } else {
    circle(c, 1210, 150, 82, parseHex('#ffe783', 160));
    circle(c, 1210, 150, 42, parseHex('#fff4b0', 210));
  }
  drawHills(c, night);
  for (const x of [120, 210, 1320, 1440]) {
    const y = night ? 640 + (x % 2) * 20 : 625 + (x % 2) * 30;
    const col = parseHex(night ? '#19333a' : '#2f663c', 190);
    polygon(c, [[x, y - 90], [x - 34, y], [x + 34, y]], col);
    polygon(c, [[x, y - 60], [x - 42, y + 35], [x + 42, y + 35]], col);
    rect(c, x - 6, y + 15, 12, 50, parseHex(night ? '#1c272a' : '#5c3b27', 160));
  }
  writePng(c, join('environments', `${name}.png`));
}

const palettes = {
  default: ['#3a2419', '#6f4529', '#0f3b18', '#1e6b2c', '#58a647'],
  cherry: ['#4a2b24', '#7a4938', '#8b1649', '#df4f8d', '#ffd3e4'],
  autumn: ['#4d2415', '#8a4a24', '#9a2e12', '#e8751a', '#ffca3a'],
  snow: ['#3b3f46', '#75808a', '#527181', '#c7d6df', '#f8fbff'],
  golden: ['#57320f', '#9a5b16', '#f29f05', '#ffd64d', '#fff1a8'],
};

function drawTreeAsset(skin, stage) {
  const c = makeCanvas(512, 512);
  const [barkDark, bark, leafDark, leaf, leafLight] = palettes[skin];
  ellipse(c, 256, 445, 145 + stage * 8, 24, parseHex('#1d3c1e', 80));
  ellipse(c, 256, 438, 98 + stage * 11, 15, parseHex('#3e7d46', 120));
  if (stage === 1) {
    ellipse(c, 256, 410, 38, 15, parseHex('#654321', 210));
    line(c, 256, 410, 256, 352, parseHex(bark), 11);
    line(c, 251, 403, 251, 360, parseHex(barkDark, 150), 3);
    line(c, 260, 395, 272, 372, parseHex(barkDark, 130), 4);
    ellipse(c, 230, 352, 35, 17, parseHex(leafLight), 220);
    ellipse(c, 286, 344, 40, 18, parseHex(leaf), 220);
    writePng(c, join('trees', `${skin}-stage-${stage}.png`));
    return;
  }
  const trunkW = 26 + stage * 8;
  const layers = Math.min(6, stage + 1);
  const canopyBottom = 332 + stage * 4;
  const canopyTop = Math.max(118, 238 - stage * 17);
  for (let i = 0; i < layers; i++) {
    const t = i / Math.max(1, layers - 1);
    const baseY = canopyBottom - t * (canopyBottom - canopyTop);
    const rw = 150 + stage * 12 - t * (72 + stage * 6);
    const layerH = 50 + stage * 6 - t * 16;
    polygon(c, [[256, baseY - layerH - 34], [256 - rw, baseY], [256 + rw, baseY]], parseHex(i % 2 ? leaf : leafDark, 235));
    ellipse(c, 256, baseY - layerH * 0.18, rw * 0.66, layerH * 0.34, parseHex(leafLight, 48));
  }
  const visibleTrunkTop = canopyBottom + 4;
  const visibleTrunkBottom = 438;
  const visibleTrunkBottomW = trunkW * 0.82;
  const visibleTrunkTopW = trunkW * 0.46;
  polygon(c, [
    [256 - visibleTrunkBottomW / 2, visibleTrunkBottom],
    [256 - visibleTrunkTopW / 2, visibleTrunkTop],
    [256 + visibleTrunkTopW / 2, visibleTrunkTop],
    [256 + visibleTrunkBottomW / 2, visibleTrunkBottom],
  ], parseHex(bark, 235));
  line(c, 249, visibleTrunkBottom - 8, 250, visibleTrunkTop + 14, parseHex(barkDark, 130), Math.max(3, stage));
  line(c, 264, visibleTrunkBottom - 18, 271, visibleTrunkTop + 28, parseHex('#f2c17a', 70), Math.max(2, stage - 1));
  line(c, 256 - trunkW * 0.12, visibleTrunkTop + 28, 224 - stage * 3, visibleTrunkTop + 55, parseHex(barkDark, 150), Math.max(4, stage));
  line(c, 256 + trunkW * 0.12, visibleTrunkTop + 18, 289 + stage * 3, visibleTrunkTop + 48, parseHex(barkDark, 140), Math.max(4, stage - 1));
  if (skin === 'snow') {
    for (let i = 0; i < layers; i++) ellipse(c, 256, 325 - i * 35, 90 - i * 8, 12, parseHex('#ffffff', 130));
  }
  if (stage === 7) {
    polygon(c, [[256, 46], [267, 72], [296, 73], [273, 90], [282, 118], [256, 101], [230, 118], [239, 90], [216, 73], [245, 72]], parseHex('#ffd54f', 230));
  }
  writePng(c, join('trees', `${skin}-stage-${stage}.png`));
}

function preserveOrDrawTreeAsset(skin, stage) {
  const relPath = join('trees', `${skin}-stage-${stage}.png`);
  if (!existsSync(join(root, relPath))) {
    drawTreeAsset(skin, stage);
    return;
  }
  manifest.push({ path: `/assets/${relPath.replaceAll('\\', '/')}`, width: 512, height: 512 });
}

function preserveOrDrawAsset(relPath, width, height, draw) {
  if (!existsSync(join(root, relPath))) {
    draw();
    return;
  }
  manifest.push({ path: `/assets/${relPath.replaceAll('\\', '/')}`, width, height });
}

function preserveAsset(relPath, width, height) {
  if (existsSync(join(root, relPath))) {
    manifest.push({ path: `/assets/${relPath.replaceAll('\\', '/')}`, width, height });
  }
}

function drawGroundPatch() {
  const c = makeCanvas(320, 120);
  ellipse(c, 160, 84, 132, 24, parseHex('#376f3d', 140));
  for (let i = 0; i < 36; i++) {
    const x = 30 + (i * 37) % 260;
    const y = 84 + (i % 5);
    line(c, x, y, x + ((i % 3) - 1) * 8, y - 18 - (i % 7), parseHex(i % 2 ? '#4c944c' : '#2f6b35', 210), 2);
  }
  for (const [x, color] of [[78, '#ffd166'], [142, '#f8bbd0'], [220, '#f59e0b']]) circle(c, x, 70, 5, parseHex(color, 210));
  writePng(c, join('decor', 'ground-patch.png'));
}

function drawPerson() {
  const c = makeCanvas(80, 160);
  circle(c, 40, 24, 15, parseHex('#f1c27d'));
  rect(c, 30, 42, 20, 55, parseHex('#3b82f6'));
  line(c, 28, 50, 14, 82, parseHex('#f1c27d'), 7);
  line(c, 52, 50, 66, 82, parseHex('#f1c27d'), 7);
  line(c, 34, 94, 27, 145, parseHex('#374151'), 9);
  line(c, 46, 94, 55, 145, parseHex('#374151'), 9);
  writePng(c, join('decor', 'person.png'));
}

function drawHouse() {
  const c = makeCanvas(160, 140);
  rect(c, 36, 58, 88, 62, parseHex('#d99b52'));
  polygon(c, [[28, 64], [80, 20], [132, 64]], parseHex('#a63f2d'));
  rect(c, 70, 82, 22, 38, parseHex('#69412d'));
  rect(c, 44, 72, 20, 18, parseHex('#9dd9ff', 225));
  rect(c, 98, 72, 20, 18, parseHex('#9dd9ff', 225));
  writePng(c, join('decor', 'house.png'));
}

function drawCompanion(name) {
  const c = makeCanvas(160, 160);
  const dark = parseHex('#2f4665');
  if (name === 'butterfly') {
    ellipse(c, 58, 72, 28, 44, parseHex('#8cc8ff', 225));
    ellipse(c, 102, 72, 28, 44, parseHex('#b7a4ff', 225));
    ellipse(c, 62, 106, 22, 28, parseHex('#f6b5d7', 220));
    ellipse(c, 98, 106, 22, 28, parseHex('#9adae3', 220));
    line(c, 80, 54, 80, 126, dark, 11);
    circle(c, 80, 48, 10, dark);
  } else if (name === 'squirrel') {
    ellipse(c, 106, 92, 34, 52, parseHex('#9a5d30'));
    ellipse(c, 74, 100, 35, 38, parseHex('#b9783e'));
    circle(c, 62, 62, 25, parseHex('#c78548'));
    circle(c, 50, 48, 9, parseHex('#9a5d30'));
    circle(c, 74, 48, 9, parseHex('#9a5d30'));
    circle(c, 70, 60, 4, parseHex('#2b1d14'));
    ellipse(c, 64, 108, 16, 21, parseHex('#e2b071', 220));
  } else if (name === 'bird') {
    ellipse(c, 72, 88, 42, 29, parseHex('#69a7d8'));
    circle(c, 110, 73, 23, parseHex('#7fc4ea'));
    polygon(c, [[129, 72], [150, 65], [133, 84]], parseHex('#f5a524'));
    polygon(c, [[52, 88], [14, 70], [16, 105]], parseHex('#4e89bd'));
    circle(c, 116, 66, 4, parseHex('#102a43'));
  } else if (name === 'owl') {
    polygon(c, [[42, 58], [58, 28], [74, 58], [88, 58], [104, 28], [120, 58], [110, 132], [80, 148], [50, 132]], parseHex('#76523b'));
    circle(c, 66, 78, 20, parseHex('#f7e4a7'));
    circle(c, 94, 78, 20, parseHex('#f7e4a7'));
    circle(c, 66, 78, 8, parseHex('#161b22'));
    circle(c, 94, 78, 8, parseHex('#161b22'));
    polygon(c, [[80, 86], [70, 104], [90, 104]], parseHex('#f5a524'));
  } else if (name === 'deer') {
    ellipse(c, 78, 100, 48, 26, parseHex('#b87943'));
    circle(c, 118, 76, 23, parseHex('#c98c55'));
    line(c, 118, 54, 100, 26, parseHex('#7a4a24'), 5);
    line(c, 124, 54, 145, 26, parseHex('#7a4a24'), 5);
    circle(c, 126, 73, 4, parseHex('#1f2933'));
    line(c, 52, 120, 44, 150, parseHex('#6b3e24'), 7);
    line(c, 92, 122, 92, 150, parseHex('#6b3e24'), 7);
  } else {
    polygon(c, [[80, 138], [48, 88], [72, 50], [96, 88]], parseHex('#ff7a1a'));
    polygon(c, [[80, 132], [62, 90], [88, 54], [105, 92]], parseHex('#ffd166', 230));
    polygon(c, [[72, 82], [35, 38], [48, 18], [84, 82]], parseHex('#f04438'));
    polygon(c, [[88, 82], [126, 38], [110, 18], [76, 82]], parseHex('#ffb020'));
    circle(c, 82, 54, 18, parseHex('#ff8f1f'));
    polygon(c, [[98, 54], [130, 46], [104, 68]], parseHex('#ffd166'));
    circle(c, 90, 48, 4, parseHex('#3b1d0b'));
  }
  writePng(c, join('companions', `${name}.png`));
}

function icon(name) {
  const c = makeCanvas(96, 96);
  const ink = parseHex('#334155');
  const blue = parseHex('#38bdf8');
  const green = parseHex('#22c55e');
  const amber = parseHex('#f59e0b');
  const red = parseHex('#ef4444');
  const purple = parseHex('#a855f7');
  const white = parseHex('#ffffff');
  if (name.includes('cloud')) {
    ellipse(c, 44, 52, 28, 18, name === 'cloud-lightning' ? purple : blue);
    ellipse(c, 62, 52, 22, 16, name === 'cloud-off' ? parseHex('#94a3b8') : blue);
    if (name === 'cloud-check') line(c, 36, 58, 48, 70, green, 7), line(c, 48, 70, 70, 38, green, 7);
    if (name === 'cloud-off') line(c, 20, 20, 76, 76, red, 7);
    if (name === 'cloud-lightning') polygon(c, [[52, 58], [38, 86], [54, 78], [46, 94], [74, 60]], amber);
  } else if (name === 'sun' || name === 'sun-medium') {
    circle(c, 48, 48, 18, amber);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      line(c, 48 + Math.cos(a) * 28, 48 + Math.sin(a) * 28, 48 + Math.cos(a) * 42, 48 + Math.sin(a) * 42, amber, 6);
    }
  } else if (name === 'moon') {
    circle(c, 45, 45, 28, parseHex('#e5e7eb'));
    circle(c, 58, 34, 28, parseHex('#000000', 0));
  } else if (name === 'bug') {
    ellipse(c, 48, 53, 17, 25, red);
    line(c, 31, 45, 14, 35, ink, 4); line(c, 65, 45, 82, 35, ink, 4);
    line(c, 31, 62, 14, 72, ink, 4); line(c, 65, 62, 82, 72, ink, 4);
  } else if (name === 'droplets') {
    polygon(c, [[35, 18], [18, 56], [35, 76], [52, 56]], blue);
    polygon(c, [[62, 28], [48, 62], [62, 80], [78, 62]], parseHex('#60a5fa'));
  } else if (name === 'coins') {
    circle(c, 38, 42, 23, parseHex('#facc15'));
    circle(c, 58, 58, 23, parseHex('#eab308', 215));
  } else if (name === 'shopping-cart') {
    line(c, 18, 24, 28, 24, ink, 6); line(c, 28, 24, 38, 62, ink, 6); line(c, 38, 62, 74, 62, ink, 6); line(c, 35, 36, 80, 36, ink, 6);
    circle(c, 42, 76, 5, ink); circle(c, 72, 76, 5, ink);
  } else if (name === 'book-open') {
    rect(c, 16, 22, 29, 52, parseHex('#86efac')); rect(c, 51, 22, 29, 52, parseHex('#bbf7d0')); line(c, 48, 22, 48, 78, ink, 4);
  } else if (name === 'user') {
    circle(c, 48, 33, 17, parseHex('#60a5fa')); ellipse(c, 48, 74, 31, 24, parseHex('#3b82f6'));
  } else if (name === 'clock') {
    circle(c, 48, 48, 35, parseHex('#e2e8f0')); line(c, 48, 48, 48, 25, ink, 5); line(c, 48, 48, 66, 57, ink, 5);
  } else if (name === 'shovel') {
    line(c, 62, 18, 30, 50, ink, 8); polygon(c, [[24, 54], [42, 72], [24, 90], [6, 72]], parseHex('#94a3b8'));
  } else if (name === 'scissors') {
    circle(c, 30, 32, 11, ink); circle(c, 30, 66, 11, ink); line(c, 42, 42, 78, 18, ink, 5); line(c, 42, 56, 78, 78, ink, 5);
  } else if (name === 'trophy') {
    rect(c, 34, 24, 28, 34, parseHex('#fbbf24')); rect(c, 43, 58, 10, 18, amber); rect(c, 28, 76, 40, 8, amber);
  } else if (name === 'zap') {
    polygon(c, [[54, 8], [24, 54], [48, 54], [42, 88], [72, 42], [50, 42]], amber);
  } else if (name === 'lock') {
    rect(c, 24, 44, 48, 36, parseHex('#94a3b8')); line(c, 34, 44, 34, 32, ink, 7); line(c, 62, 44, 62, 32, ink, 7); line(c, 34, 32, 62, 32, ink, 7);
  } else if (name === 'close') {
    line(c, 26, 26, 70, 70, ink, 8); line(c, 70, 26, 26, 70, ink, 8);
  } else if (name === 'volume-x' || name === 'volume-2') {
    polygon(c, [[16, 40], [32, 40], [52, 24], [52, 72], [32, 56], [16, 56]], ink);
    if (name === 'volume-x') line(c, 68, 36, 84, 60, red, 6), line(c, 84, 36, 68, 60, red, 6);
    else curve(c, [[62, 34], [78, 48], [62, 62]], blue, 5), curve(c, [[70, 24], [92, 48], [70, 72]], blue, 5);
  } else {
    polygon(c, [[48, 12], [38, 42], [12, 48], [38, 56], [48, 84], [58, 56], [84, 48], [58, 42]], green);
  }
  writePng(c, join('icons', `${name}.png`));
}

preserveOrDrawAsset(join('environments', 'day-forest.png'), 1600, 900, () => makeEnvironment('day-forest', false));
preserveOrDrawAsset(join('environments', 'night-garden.png'), 1600, 900, () => makeEnvironment('night-garden', true));
for (const skin of Object.keys(palettes)) for (let stage = 1; stage <= 7; stage++) preserveOrDrawTreeAsset(skin, stage);
preserveOrDrawAsset(join('decor', 'ground-patch.png'), 320, 120, drawGroundPatch);
preserveOrDrawAsset(join('decor', 'person.png'), 80, 160, drawPerson);
preserveOrDrawAsset(join('decor', 'house.png'), 160, 140, drawHouse);
for (const name of ['butterfly', 'squirrel', 'bird', 'owl', 'deer', 'phoenix']) {
  preserveOrDrawAsset(join('companions', `${name}.png`), 160, 160, () => drawCompanion(name));
}
for (const name of [
  'cloud-rain', 'bug', 'sun', 'moon', 'zap', 'shovel', 'droplets', 'sparkles', 'clock',
  'volume-2', 'volume-x', 'leaf', 'user', 'cloud-check', 'cloud-off', 'book-open', 'lock',
  'coins', 'shopping-cart', 'scissors', 'sun-medium', 'cloud-lightning', 'trophy', 'close',
  'calendar', 'paw', 'recycle', 'gamepad', 'stats', 'gift', 'star', 'robot', 'blossom',
  'maple-leaf', 'snowflake', 'gold-sparkle', 'sprout', 'mature-tree', 'mountain',
  'handshake', 'wizard-hat',
]) {
  preserveOrDrawAsset(join('icons', `${name}.png`), 96, 96, () => icon(name));
}
for (const [name, width, height] of [
  ['action-active.png', 360, 150],
  ['action-disabled.png', 360, 150],
  ['button-primary.png', 360, 150],
  ['panel-day.png', 640, 360],
  ['panel-night.png', 640, 360],
  ['badge-gold.png', 256, 160],
]) {
  preserveAsset(join('ui', name), width, height);
}

writeFileSync(join(root, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Generated ${manifest.length} PNG assets in ${root}`);
