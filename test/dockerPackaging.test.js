const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Docker image includes shared game data and its server adapter', () => {
    const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
    const instructions = dockerfile.split(/\r?\n/);

    assert.ok(instructions.includes('COPY server ./server'));
    assert.ok(instructions.includes('COPY shared ./shared'));
});
