const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('shared game data preserves the canonical static definitions', () => {
    const filePath = path.join(__dirname, '..', 'shared', 'game-data.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    assert.deepEqual(data.storeItems.map(({ id, price }) => [id, price]), [
        ['xpBuff', 500], ['autoWater', 1000], ['cherry', 2000],
        ['autumn', 2500], ['snow', 3000], ['golden', 5000],
    ]);
    assert.deepEqual(data.companions.map(item => item.id),
        ['butterfly', 'squirrel', 'bird', 'owl', 'deer', 'phoenix']);
    assert.deepEqual(data.prestigeUpgrades.map(item => item.effectPerLevel),
        [0.1, 0.15, 60000, 2, 0.5]);
    assert.deepEqual(data.dailyRewards.map(({ day, coins, xp }) => [day, coins, xp]), [
        [1, 100, 0], [2, 150, 5], [3, 200, 10], [4, 250, 0],
        [5, 300, 15], [6, 400, 0], [7, 500, 25],
    ]);
});
