const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('shared game data preserves the canonical static definitions', () => {
    const filePath = path.join(__dirname, '..', 'shared', 'game-data.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    assert.deepEqual(data.storeItems, [
        { id: 'xpBuff', type: 'buff', price: 500, icon: '🌟', nameKey: 'itemXpBuff', descKey: 'descXpBuff' },
        { id: 'autoWater', type: 'auto', price: 1000, icon: '🤖', nameKey: 'itemAutoWater', descKey: 'descAutoWater' },
        { id: 'cherry', type: 'skin', price: 2000, icon: '🌸', nameKey: 'itemCherrySkin', descKey: 'descCherrySkin' },
        { id: 'autumn', type: 'skin', price: 2500, icon: '🍂', nameKey: 'itemAutumnSkin', descKey: 'descAutumnSkin' },
        { id: 'snow', type: 'skin', price: 3000, icon: '❄️', nameKey: 'itemSnowSkin', descKey: 'descSnowSkin' },
        { id: 'golden', type: 'skin', price: 5000, icon: '✨', nameKey: 'itemGoldenSkin', descKey: 'descGoldenSkin' },
    ]);
    assert.deepEqual(data.companions, [
        { id: 'butterfly', price: 0, unlockLevel: 1, bonus: { type: 'xp', value: 0.05 }, icon: '🦋', nameKey: 'companionButterfly', descKey: 'companionButterflyDesc' },
        { id: 'squirrel', price: 1500, unlockLevel: 10, bonus: { type: 'coins', value: 0.1 }, icon: '🐿️', nameKey: 'companionSquirrel', descKey: 'companionSquirrelDesc' },
        { id: 'bird', price: 3000, unlockLevel: 25, bonus: { type: 'eventXp', value: 0.15 }, icon: '🐦', nameKey: 'companionBird', descKey: 'companionBirdDesc' },
        { id: 'owl', price: 5000, unlockLevel: 50, bonus: { type: 'coins', value: 0.2 }, icon: '🦉', nameKey: 'companionOwl', descKey: 'companionOwlDesc' },
        { id: 'deer', price: 8000, unlockLevel: 75, bonus: { type: 'allBonus', value: 0.1 }, icon: '🦌', nameKey: 'companionDeer', descKey: 'companionDeerDesc' },
        { id: 'phoenix', price: 15000, unlockLevel: 0, bonus: { type: 'allBonus', value: 0.2 }, icon: '🔥', nameKey: 'companionPhoenix', descKey: 'companionPhoenixDesc', prestigeOnly: true },
    ]);
    assert.deepEqual(data.prestigeUpgrades, [
        { id: 'xpBoost', maxLevel: 5, costPerLevel: 1, effectPerLevel: 0.1, icon: '⚡', nameKey: 'prestigeXpBoost', descKey: 'prestigeXpBoostDesc' },
        { id: 'coinBoost', maxLevel: 5, costPerLevel: 1, effectPerLevel: 0.15, icon: '💰', nameKey: 'prestigeCoinBoost', descKey: 'prestigeCoinBoostDesc' },
        { id: 'eventFreq', maxLevel: 3, costPerLevel: 2, effectPerLevel: 60000, icon: '⏰', nameKey: 'prestigeEventFreq', descKey: 'prestigeEventFreqDesc' },
        { id: 'startLevel', maxLevel: 5, costPerLevel: 3, effectPerLevel: 2, icon: '🚀', nameKey: 'prestigeStartLevel', descKey: 'prestigeStartLevelDesc' },
        { id: 'comboBonus', maxLevel: 3, costPerLevel: 2, effectPerLevel: 0.5, icon: '🔥', nameKey: 'prestigeComboBonus', descKey: 'prestigeComboBonusDesc' },
    ]);
    assert.deepEqual(data.dailyRewards, [
        { day: 1, coins: 100, xp: 0, special: null, icon: '🪙' },
        { day: 2, coins: 150, xp: 5, special: null, icon: '🪙' },
        { day: 3, coins: 200, xp: 10, special: null, icon: '💫' },
        { day: 4, coins: 250, xp: 0, special: null, icon: '🪙' },
        { day: 5, coins: 300, xp: 15, special: 'luckyBuff', icon: '🍀' },
        { day: 6, coins: 400, xp: 0, special: null, icon: '🪙' },
        { day: 7, coins: 500, xp: 25, special: 'rareItem', icon: '🎁' },
    ]);
    assert.deepEqual(data.weatherModifiers, {
        sunny: { xpMult: 1.2, coinMult: 1.0 },
        cloudy: { xpMult: 1.0, coinMult: 1.0 },
        rainy: { xpMult: 1.3, coinMult: 0.9 },
        stormy: { xpMult: 0.8, coinMult: 1.3 },
        snowy: { xpMult: 1.0, coinMult: 1.2 },
    });
});

test('prestige modal renders the shared prestige upgrade definitions', () => {
    const modalPath = path.join(__dirname, '..', 'client', 'src', 'components', 'PrestigeModal.jsx');
    const source = fs.readFileSync(modalPath, 'utf8');
    const prestigeIds = require('../shared/game-data.json').prestigeUpgrades.map(({ id }) => id);

    assert.match(source, /import\s*{\s*PRESTIGE_UPGRADES\s*}\s*from\s*['"]\.\.\/constants['"]/);
    assert.match(source, /PRESTIGE_UPGRADES\.map\s*\(/);
    assert.doesNotMatch(source, /const\s+UPGRADES\b/);
    for (const id of prestigeIds) {
        assert.doesNotMatch(source, new RegExp(`['"]${id}['"]`));
    }
});

test('server adapter wires shared rules and projects daily reward fields', () => {
    const shared = require('../shared/game-data.json');
    const serverData = require('../server/config/gameData');

    assert.strictEqual(serverData.STORE_ITEMS, shared.storeItems);
    assert.strictEqual(serverData.COMPANIONS, shared.companions);
    assert.strictEqual(serverData.PRESTIGE_UPGRADES, shared.prestigeUpgrades);
    assert.strictEqual(serverData.WEATHER_MODIFIERS, shared.weatherModifiers);
    assert.deepEqual(serverData.WEATHER_TYPES, Object.keys(shared.weatherModifiers));
    assert.deepEqual(serverData.DAILY_REWARDS, shared.dailyRewards.map(({ day, coins, xp }) => ({
        day,
        coins,
        xp,
    })));
});
