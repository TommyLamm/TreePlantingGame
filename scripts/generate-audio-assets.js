const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const TWO_PI = Math.PI * 2;
const OUT_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'audio');

function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0xA7B0E7);

function note(name) {
  const notes = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  const match = name.match(/^([A-G]#?)(\d)$/);
  if (!match) throw new Error(`Invalid note: ${name}`);
  const [, pitch, octave] = match;
  return 440 * Math.pow(2, (notes[pitch] + (Number(octave) - 4) * 12) / 12);
}

function makeBuffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
}

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function addSine(buffer, freq, start, duration, amp, opts = {}) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const endIndex = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  const attack = opts.attack ?? 0.01;
  const release = opts.release ?? 0.1;
  const panTremolo = opts.tremolo ?? 0;
  const vibrato = opts.vibrato ?? 0;
  let phase = opts.phase ?? 0;

  for (let i = startIndex; i < endIndex; i++) {
    const t = (i - startIndex) / SAMPLE_RATE;
    const life = t / duration;
    const attackEnv = attack > 0 ? Math.min(1, t / attack) : 1;
    const releaseEnv = release > 0 ? Math.min(1, (duration - t) / release) : 1;
    const decay = opts.decay ? Math.exp(-opts.decay * life) : 1;
    const trem = panTremolo ? 0.82 + Math.sin(TWO_PI * panTremolo * t) * 0.18 : 1;
    const vib = vibrato ? Math.sin(TWO_PI * 4.2 * t) * vibrato : 0;
    phase += TWO_PI * (freq + vib) / SAMPLE_RATE;
    buffer[i] += Math.sin(phase) * amp * attackEnv * releaseEnv * decay * trem;
  }
}

function addTriangle(buffer, freq, start, duration, amp, opts = {}) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const endIndex = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  const attack = opts.attack ?? 0.005;
  const release = opts.release ?? 0.08;

  for (let i = startIndex; i < endIndex; i++) {
    const t = (i - startIndex) / SAMPLE_RATE;
    const phase = (t * freq) % 1;
    const tri = 4 * Math.abs(phase - 0.5) - 1;
    const attackEnv = Math.min(1, t / attack);
    const releaseEnv = Math.min(1, (duration - t) / release);
    const decay = opts.decay ? Math.exp(-opts.decay * t) : 1;
    buffer[i] += tri * amp * attackEnv * releaseEnv * decay;
  }
}

function addNoise(buffer, start, duration, amp, opts = {}) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const endIndex = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  const attack = opts.attack ?? 0.01;
  const release = opts.release ?? 0.1;
  const cutoff = opts.cutoff ?? 0.08;
  let low = 0;

  for (let i = startIndex; i < endIndex; i++) {
    const t = (i - startIndex) / SAMPLE_RATE;
    const raw = rand() * 2 - 1;
    low += (raw - low) * cutoff;
    const attackEnv = Math.min(1, t / attack);
    const releaseEnv = Math.min(1, (duration - t) / release);
    const decay = opts.decay ? Math.exp(-opts.decay * t) : 1;
    buffer[i] += low * amp * attackEnv * releaseEnv * decay;
  }
}

function addBell(buffer, freq, start, amp, duration = 1.0) {
  addSine(buffer, freq, start, duration, amp, { attack: 0.004, release: duration * 0.55, decay: 5.5 });
  addSine(buffer, freq * 2.01, start + 0.002, duration * 0.8, amp * 0.28, { attack: 0.002, release: duration * 0.45, decay: 7 });
  addSine(buffer, freq * 3.01, start + 0.004, duration * 0.55, amp * 0.1, { attack: 0.001, release: duration * 0.3, decay: 8 });
}

function normalize(buffer, peak = 0.92) {
  let max = 0;
  for (const value of buffer) max = Math.max(max, Math.abs(value));
  if (max === 0) return buffer;
  const scale = peak / max;
  for (let i = 0; i < buffer.length; i++) buffer[i] *= scale;
  return buffer;
}

function fadeEdges(buffer, seconds = 0.02) {
  const count = Math.floor(seconds * SAMPLE_RATE);
  for (let i = 0; i < count && i < buffer.length; i++) {
    const fade = i / count;
    buffer[i] *= fade;
    buffer[buffer.length - 1 - i] *= fade;
  }
}

function writeWav(filename, buffer) {
  const bytesPerSample = 2;
  const dataSize = buffer.length * bytesPerSample;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  wav.writeUInt16LE(bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < buffer.length; i++) {
    wav.writeInt16LE(Math.round(clamp(buffer[i]) * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(OUT_DIR, filename), wav);
}

function makeBgm() {
  const duration = 36;
  const buffer = makeBuffer(duration);
  const chords = [
    ['D3', 'A3', 'D4', 'F#4'],
    ['G3', 'D4', 'A4', 'B4'],
    ['B2', 'F#3', 'A3', 'D4'],
    ['A2', 'E3', 'A3', 'C#4'],
  ];
  const motif = ['D5', 'F#5', 'A5', 'E5', 'G5', 'A5', 'D6', 'B5'];

  for (let t = 0; t < duration; t += 8) {
    const chord = chords[(t / 8) % chords.length];
    chord.forEach((n, idx) => {
      addSine(buffer, note(n), t, 8.5, 0.045 / (idx + 1), {
        attack: 1.4,
        release: 1.8,
        tremolo: 0.08 + idx * 0.02,
        vibrato: 0.35,
      });
      addSine(buffer, note(n) * 2, t + 0.2, 7.6, 0.012, {
        attack: 1.0,
        release: 1.6,
        tremolo: 0.05,
      });
    });
  }

  for (let i = 0; i < 18; i++) {
    const t = i * 2 + (i % 2) * 0.35;
    addBell(buffer, note(motif[i % motif.length]), t, 0.055, 1.6);
  }

  for (let t = 0.8; t < duration; t += 3.2) {
    addNoise(buffer, t, 1.1 + rand() * 0.5, 0.025, { attack: 0.2, release: 0.4, cutoff: 0.025 });
  }

  addNoise(buffer, 0, duration, 0.018, { attack: 2.5, release: 2.5, cutoff: 0.012 });
  fadeEdges(buffer, 0.05);
  return normalize(buffer, 0.82);
}

function makeClick() {
  const buffer = makeBuffer(0.18);
  addTriangle(buffer, 680, 0, 0.08, 0.45, { decay: 26, release: 0.045 });
  addTriangle(buffer, 220, 0.004, 0.12, 0.24, { decay: 20, release: 0.055 });
  addNoise(buffer, 0, 0.08, 0.14, { decay: 28, cutoff: 0.22, release: 0.04 });
  fadeEdges(buffer, 0.003);
  return normalize(buffer, 0.82);
}

function makeWater() {
  const buffer = makeBuffer(1.15);
  addNoise(buffer, 0.03, 0.95, 0.16, { attack: 0.02, release: 0.35, cutoff: 0.11 });
  [0.04, 0.16, 0.31, 0.52, 0.73].forEach((t, i) => {
    addBell(buffer, 880 + i * 85, t, 0.1, 0.34);
    addSine(buffer, 300 - i * 18, t, 0.28, 0.08, { attack: 0.006, release: 0.18, decay: 5 });
  });
  fadeEdges(buffer, 0.01);
  return normalize(buffer, 0.78);
}

function makeFertilize() {
  const buffer = makeBuffer(0.95);
  ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => addBell(buffer, note(n), i * 0.11, 0.18, 0.75));
  addNoise(buffer, 0.18, 0.45, 0.045, { attack: 0.04, release: 0.25, cutoff: 0.045 });
  fadeEdges(buffer, 0.01);
  return normalize(buffer, 0.82);
}

function makePest() {
  const buffer = makeBuffer(0.56);
  for (let t = 0; t < 0.46; t += 0.035) {
    const freq = 145 + Math.sin(t * 28) * 22;
    addTriangle(buffer, freq, t, 0.055, 0.08, { attack: 0.004, release: 0.03, decay: 5 });
  }
  addNoise(buffer, 0, 0.4, 0.055, { attack: 0.01, release: 0.22, cutoff: 0.18 });
  fadeEdges(buffer, 0.008);
  return normalize(buffer, 0.6);
}

function makeAlert() {
  const buffer = makeBuffer(0.9);
  addBell(buffer, note('G5'), 0.02, 0.18, 0.55);
  addBell(buffer, note('E5'), 0.28, 0.13, 0.55);
  addSine(buffer, note('A3'), 0, 0.8, 0.035, { attack: 0.08, release: 0.3 });
  fadeEdges(buffer, 0.01);
  return normalize(buffer, 0.75);
}

function makeLevelUp() {
  const buffer = makeBuffer(1.85);
  ['D5', 'F#5', 'A5', 'D6', 'E6'].forEach((n, i) => addBell(buffer, note(n), i * 0.16, 0.16, 1.1));
  ['D4', 'A4', 'D5', 'F#5'].forEach(n => addSine(buffer, note(n), 0.42, 1.2, 0.055, { attack: 0.15, release: 0.5 }));
  addNoise(buffer, 0.55, 0.75, 0.035, { attack: 0.05, release: 0.45, cutoff: 0.04 });
  fadeEdges(buffer, 0.012);
  return normalize(buffer, 0.86);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const assets = {
  'bgm-garden-loop.wav': makeBgm(),
  'ui-click.wav': makeClick(),
  'water.wav': makeWater(),
  'fertilize.wav': makeFertilize(),
  'pest.wav': makePest(),
  'alert.wav': makeAlert(),
  'level-up.wav': makeLevelUp(),
};

Object.entries(assets).forEach(([filename, buffer]) => writeWav(filename, buffer));

console.log(`Generated ${Object.keys(assets).length} audio assets in ${OUT_DIR}`);
