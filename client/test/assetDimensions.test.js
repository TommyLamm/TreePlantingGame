import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const assetsRoot = fileURLToPath(new URL('../public/assets/', import.meta.url));

async function readPngHeader(relativePath) {
  const file = await readFile(`${assetsRoot}${relativePath}`);
  assert.equal(file.toString('ascii', 1, 4), 'PNG');
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
    colorType: file[25],
  };
}

test('tree assets keep one predictable transparent canvas', async () => {
  for (const skin of ['default', 'cherry', 'autumn', 'snow', 'golden']) {
    for (let stage = 1; stage <= 7; stage += 1) {
      const header = await readPngHeader(`trees/${skin}-stage-${stage}.png`);
      assert.deepEqual(header, { width: 512, height: 512, colorType: 6 });
    }
  }
});

test('supporting scene assets keep stable dimensions', async () => {
  const expected = {
    'decor/ground-patch.png': [320, 120],
    'decor/person.png': [80, 160],
    'decor/house.png': [160, 140],
    'companions/butterfly.png': [160, 160],
    'companions/squirrel.png': [160, 160],
    'companions/bird.png': [160, 160],
    'companions/owl.png': [160, 160],
    'companions/deer.png': [160, 160],
    'companions/phoenix.png': [160, 160],
  };

  for (const [path, [width, height]] of Object.entries(expected)) {
    const header = await readPngHeader(path);
    assert.deepEqual(header, { width, height, colorType: 6 });
  }
});
