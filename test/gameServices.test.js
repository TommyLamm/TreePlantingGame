const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const { createDefaultUser } = require('../server/data/userRepository');
const { createProgressionService } = require('../server/services/progressionService');
const { createRewardService } = require('../server/services/rewardService');
const { createSocialService } = require('../server/services/socialService');

const NOW = new Date(2026, 5, 30, 12, 0, 0, 0).getTime();

function user(overrides = {}) {
  return Object.assign(createDefaultUser(false, NOW), overrides);
}

function harness({ users = {}, randomValues = [0], bonuses = {} } = {}) {
  let dirty = 0;
  const updates = [];
  const achievementChecks = [];
  const logs = [];
  const values = [...randomValues];
  const cache = { ...users };
  const repository = {
    getUser: name => cache[name],
    hasUser: name => Object.hasOwn(cache, name),
    listNames: () => Object.keys(cache),
    entries: () => Object.entries(cache),
    markDirty: () => { dirty += 1; },
  };
  const gameStateService = {
    updateUserState(value) { updates.push(value); },
    toGameResponse: value => ({ ...value, weather: 'sunny', season: 'summer' }),
    getCompanionBonuses: () => bonuses.companion || { xpMult: 1, coinMult: 1, eventXpMult: 1 },
    getPrestigeBonuses: () => bonuses.prestige || { xpMult: 1, coinMult: 1, startLevel: 1, comboCapBonus: 0 },
    getTodayStr: () => '2026-06-30',
  };
  const achievementService = {
    checkAchievements(value) { achievementChecks.push(value); },
  };
  const dependencies = {
    repository,
    gameStateService,
    achievementService,
    now: () => NOW,
    random: () => values.shift() ?? 0,
    logger: { log: message => logs.push(message) },
  };
  return {
    repository,
    gameStateService,
    achievementService,
    dependencies,
    updates,
    achievementChecks,
    logs,
    dirty: () => dirty,
  };
}

function assertHttpError(action, status, message) {
  assert.throws(action, error => error.status === status && error.message === message);
}

function assertClose(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not close to ${expected}`);
}

test('progression toggle settles, toggles, snapshots transients, and marks dirty', () => {
  const h = harness();
  const service = createProgressionService(h.dependencies);
  const value = user({ isDemoMode: false, justLeveledUp: true, newAchievements: ['first_event'] });

  const result = service.toggleWarp(value);

  assert.equal(h.updates.length, 1);
  assert.equal(value.isDemoMode, true);
  assert.equal(result.isDemoMode, true);
  assert.equal(result.justLeveledUp, true);
  assert.deepEqual(result.newAchievements, ['first_event']);
  assert.equal(value.justLeveledUp, false);
  assert.equal(Object.hasOwn(value, 'newAchievements'), false);
  assert.equal(h.dirty(), 1);
});

test('successful action retains exact multipliers, rounding, counters, response, and transient clearing', () => {
  const h = harness({
    randomValues: [0, 0],
    bonuses: {
      companion: { xpMult: 1.1, coinMult: 1.2, eventXpMult: 1.15 },
      prestige: { xpMult: 1.2, coinMult: 1.3, startLevel: 1, comboCapBonus: 0 },
    },
  });
  const service = createProgressionService(h.dependencies);
  const value = user({
    level: 100,
    activeEvent: 'WATER',
    eventSpawnedAt: NOW - 100,
    inventory: { xpBuff: true, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
    combo: 2,
    maxCombo: 2,
    goldenHourUntil: NOW + 1,
    newAchievements: ['first_event'],
    goldenHourTriggered: true,
  });

  const result = service.resolveAction(value, 'WATER', 'Alice');

  assertClose(value.xp, 16.3944);
  assert.equal(value.coins, 15);
  assertClose(value.totalXpEarned, 16.3944);
  assert.equal(value.totalCoinsEarned, 15);
  assert.equal(value.interactionCount, 1);
  assert.equal(value.totalEventsResolved, 1);
  assert.equal(value.combo, 3);
  assert.equal(value.maxCombo, 3);
  assert.equal(value.activeEvent, null);
  assert.equal(value.eventSpawnedAt, null);
  assert.equal(value.lastEventResolved, true);
  assert.equal(value.lastReward, 16.3);
  assert.equal(value.lastCoinReward, 15);
  assert.equal(value.lastEventTime, NOW);
  assert.equal(result.weather, 'sunny');
  assert.equal(result.season, 'summer');
  assert.deepEqual(result.newAchievements, ['first_event']);
  assert.equal(result.goldenHourTriggered, true);
  assert.equal(Object.hasOwn(value, 'newAchievements'), false);
  assert.equal(Object.hasOwn(value, 'goldenHourTriggered'), false);
  assert.equal(h.achievementChecks.length, 1);
  assert.equal(h.dirty(), 1);
  assert.deepEqual(h.logs, ['[Game Logic] Alice solved WATER. Combo: 3']);
});

test('wrong action breaks combo while preserving the active event', () => {
  const h = harness();
  const service = createProgressionService(h.dependencies);
  const value = user({ activeEvent: 'WATER', combo: 7 });

  const result = service.resolveAction(value, 'PEST', 'Alice');

  assert.equal(value.activeEvent, 'WATER');
  assert.equal(value.lastEventResolved, false);
  assert.equal(value.combo, 0);
  assert.equal(result.lastEventResolved, false);
  assert.equal(h.achievementChecks.length, 0);
  assert.equal(h.dirty(), 1);
});

test('an unknown action matching the active event uses the legacy fallback reward', () => {
  const h = harness({ randomValues: [0, 0] });
  const service = createProgressionService(h.dependencies);
  const value = user({ activeEvent: 'UNKNOWN' });

  service.resolveAction(value, 'UNKNOWN', 'Alice');

  assert.equal(value.xp, 3);
  assert.equal(value.coins, 10);
  assert.equal(value.lastReward, 3);
  assert.equal(value.lastCoinReward, 10);
});

test('SUNLIGHT starts a five-minute golden hour and exposes its response-only trigger', () => {
  const h = harness({ randomValues: [0, 0] });
  const service = createProgressionService(h.dependencies);
  const value = user({ activeEvent: 'SUNLIGHT' });

  const result = service.resolveAction(value, 'SUNLIGHT', 'Alice');

  assert.equal(value.goldenHourUntil, NOW + 5 * 60 * 1000);
  assert.equal(result.goldenHourTriggered, true);
  assert.equal(Object.hasOwn(value, 'goldenHourTriggered'), false);
});

test('successful action applies the one-level rule and snapshots the level-up transient', () => {
  const h = harness({ randomValues: [0, 0] });
  const service = createProgressionService(h.dependencies);
  const value = user({ level: 1, xp: 10, activeEvent: 'WATER' });

  const result = service.resolveAction(value, 'WATER', 'Alice');

  assert.equal(value.level, 2);
  assert.equal(value.xp, 2);
  assert.equal(result.justLeveledUp, true);
  assert.equal(value.justLeveledUp, false);
});

test('profile updates only supplied fields, permits no profile body, and rejects oversized avatars', () => {
  const h = harness();
  const service = createProgressionService(h.dependencies);
  const value = user({ profile: { avatar: 'old', birthday: 'old-day', signature: 'old-sig' } });

  assert.equal(service.updateProfile(value, { signature: 'new-sig' }), value);
  assert.deepEqual(value.profile, { avatar: 'old', birthday: 'old-day', signature: 'new-sig' });
  assert.equal(service.updateProfile(value), value);
  assert.equal(h.dirty(), 2);
  assert.equal(h.updates.length, 2);

  assertHttpError(
    () => service.updateProfile(value, { avatar: 'x'.repeat(700001) }),
    400,
    'Avatar too large. Must be under 500KB.',
  );
  assert.equal(h.updates.length, 3);
  assert.equal(h.dirty(), 2);
});

test('prestige enforces level 50 then resets progression while retaining owned data', () => {
  const h = harness({ bonuses: { prestige: { startLevel: 5 } } });
  const service = createProgressionService(h.dependencies);
  assertHttpError(
    () => service.prestige(user({ level: 49 })),
    400,
    'Must be at least level 50 to prestige',
  );
  assert.equal(h.dirty(), 0);

  const profile = { avatar: 'a', birthday: 'b', signature: 's' };
  const inventory = { xpBuff: true, autoWater: true, treeSkin: 'cherry', unlockedSkins: ['default', 'cherry'] };
  const value = user({
    level: 59,
    xp: 42,
    generation: 2,
    prestigePoints: 4,
    activeEvent: 'PEST',
    eventSpawnedAt: NOW - 1,
    combo: 9,
    goldenHourUntil: NOW + 10,
    profile,
    inventory,
    achievements: ['first_event'],
    unlockedCompanions: ['butterfly'],
    prestigeUpgrades: { startLevel: 2 },
  });
  const result = service.prestige(value);

  assert.equal(result.pointsEarned, 5);
  assert.equal(value.generation, 3);
  assert.equal(value.prestigePoints, 9);
  assert.equal(value.level, 5);
  assert.equal(value.xp, 0);
  assert.equal(value.activeEvent, null);
  assert.equal(value.eventSpawnedAt, null);
  assert.equal(value.lastEventTime, NOW);
  assert.equal(value.combo, 0);
  assert.equal(value.goldenHourUntil, 0);
  assert.equal(value.profile, profile);
  assert.equal(value.inventory, inventory);
  assert.deepEqual(value.unlockedCompanions, ['butterfly']);
  assert.deepEqual(value.prestigeUpgrades, { startLevel: 2 });
  assert.equal(h.achievementChecks.length, 1);
  assert.equal(h.dirty(), 1);
});

test('prestige upgrades preserve missing, max, points, and success behavior', () => {
  const h = harness();
  const service = createProgressionService(h.dependencies);
  assertHttpError(() => service.upgradePrestige(user(), 'missing'), 400, 'Upgrade not found');
  assertHttpError(
    () => service.upgradePrestige(user({ prestigeUpgrades: { xpBoost: 5 } }), 'xpBoost'),
    400,
    'Already at max level',
  );
  assertHttpError(
    () => service.upgradePrestige(user({ prestigePoints: 1 }), 'eventFreq'),
    400,
    'Not enough prestige points',
  );
  const value = user({ prestigePoints: 3, prestigeUpgrades: {} });
  assert.equal(service.upgradePrestige(value, 'eventFreq'), value);
  assert.equal(value.prestigePoints, 1);
  assert.equal(value.prestigeUpgrades.eventFreq, 1);
  assert.equal(h.dirty(), 1);
  assert.equal(h.updates.length, 4);
});

test('store purchase validates configured id/type and funds before mutating', () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  assertHttpError(() => service.buyItem(user(), 'missing', 'skin'), 400, 'Item not found');
  assertHttpError(() => service.buyItem(user({ coins: 499 }), 'xpBuff', 'buff'), 400, 'Not enough coins');
  assert.equal(h.dirty(), 0);

  const buff = user({ coins: 500 });
  service.buyItem(buff, 'xpBuff', 'buff');
  assert.equal(buff.coins, 0);
  assert.equal(buff.inventory.xpBuff, true);

  const automatic = user({ coins: 1000 });
  service.buyItem(automatic, 'autoWater', 'auto');
  assert.equal(automatic.inventory.autoWater, true);

  const skin = user({ coins: 99999, inventory: { xpBuff: false, autoWater: false, treeSkin: 'default' } });
  service.buyItem(skin, 'cherry', 'skin');
  assert.equal(skin.coins, 97999);
  assert.deepEqual(skin.inventory.unlockedSkins, ['default', 'cherry']);
  assert.equal(skin.inventory.treeSkin, 'cherry');
  assert.equal(h.achievementChecks.length, 3);
  assert.equal(h.dirty(), 3);
});

test('skin equip mutates owned/default skins and leaves unowned equip as a successful no-op', () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const value = user({ inventory: { xpBuff: false, autoWater: false, treeSkin: 'cherry', unlockedSkins: ['default', 'cherry'] } });

  assert.equal(service.equipItem(value, 'snow'), value);
  assert.equal(value.inventory.treeSkin, 'cherry');
  assert.equal(h.dirty(), 0);
  service.equipItem(value, 'default');
  service.equipItem(value, 'cherry');
  assert.equal(value.inventory.treeSkin, 'cherry');
  assert.equal(h.dirty(), 2);
});

test('daily reward rejects duplicate claims and returns the exact three-field configured reward', () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  assertHttpError(
    () => service.claimDailyReward(user({ dailyRewardClaimed: true })),
    400,
    'Already claimed today',
  );
  const value = user({ loginStreak: 9, coins: 10, xp: 2 });
  const result = service.claimDailyReward(value);
  assert.deepEqual(result.claimedReward, { day: 2, coins: 150, xp: 5 });
  assert.equal(result.dayIndex, 1);
  assert.equal(value.coins, 160);
  assert.equal(value.xp, 7);
  assert.equal(value.totalCoinsEarned, 150);
  assert.equal(value.totalXpEarned, 5);
  assert.equal(value.dailyRewardClaimed, true);
  assert.equal(h.dirty(), 1);
});

test('companion purchase preserves every validation and auto-equips success', () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  assertHttpError(() => service.buyCompanion(user(), 'missing'), 400, 'Companion not found');
  assertHttpError(() => service.buyCompanion(user({ coins: 20000 }), 'phoenix'), 400, 'Requires at least 1 prestige');
  assertHttpError(() => service.buyCompanion(user({ level: 9, coins: 2000 }), 'squirrel'), 400, 'Requires level 10');
  assertHttpError(() => service.buyCompanion(user({ unlockedCompanions: ['butterfly'] }), 'butterfly'), 400, 'Already owned');
  assertHttpError(() => service.buyCompanion(user({ level: 10, coins: 1499 }), 'squirrel'), 400, 'Not enough coins');

  const value = user({ level: 10, coins: 1500 });
  assert.equal(service.buyCompanion(value, 'squirrel'), value);
  assert.equal(value.coins, 0);
  assert.deepEqual(value.unlockedCompanions, ['squirrel']);
  assert.equal(value.companion, 'squirrel');
  assert.equal(h.dirty(), 1);
  assert.equal(h.achievementChecks.length, 1);
});

test('companion equip rejects unowned, equips owned, and permits null unequip', () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const value = user({ companion: 'butterfly', unlockedCompanions: ['butterfly', 'squirrel'] });
  assertHttpError(() => service.equipCompanion(value, 'owl'), 400, 'Companion not owned');
  assert.equal(h.dirty(), 0);
  service.equipCompanion(value, 'squirrel');
  assert.equal(value.companion, 'squirrel');
  service.equipCompanion(value, null);
  assert.equal(value.companion, null);
  assert.equal(h.dirty(), 2);
});

test('tree shake preserves cooldown, no-drop, drop, and deterministic boundaries', () => {
  const cooldownHarness = harness();
  const cooldownService = createRewardService(cooldownHarness.dependencies);
  assert.deepEqual(
    cooldownService.shakeTree(user({ lastShakeTime: NOW - 29999 })),
    { coins: 0, cooldown: true, remainingMs: 1 },
  );
  assert.equal(cooldownHarness.dirty(), 0);

  const noDropHarness = harness({ randomValues: [0.3] });
  const noDrop = user({ coins: 2, lastShakeTime: NOW - 30000 });
  assert.deepEqual(createRewardService(noDropHarness.dependencies).shakeTree(noDrop), { coins: 0, cooldown: false });
  assert.equal(noDrop.lastShakeTime, NOW);
  assert.equal(noDropHarness.dirty(), 1);

  const dropHarness = harness({ randomValues: [0.299999, 0.999999] });
  const drop = user({ coins: 2, lastShakeTime: NOW - 30000 });
  assert.deepEqual(createRewardService(dropHarness.dependencies).shakeTree(drop), { coins: 5, cooldown: false });
  assert.equal(drop.coins, 7);
  assert.equal(drop.totalCoinsEarned, 5);
  assert.equal(dropHarness.dirty(), 1);
});

test('minigame resets dates, enforces three per day, caps rewards, and retains legacy score coercion', () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const reset = user({ minigameDate: '2026-06-29', minigameCount: 3 });
  assert.deepEqual(service.claimMinigameReward(reset, 'ignored', 50), { coinsEarned: 200, gamesRemaining: 2 });
  assert.equal(reset.minigameDate, '2026-06-30');
  assert.equal(reset.minigameCount, 1);

  assertHttpError(
    () => service.claimMinigameReward(user({ minigameDate: '2026-06-30', minigameCount: 3 }), 'anything', 1),
    400,
    'Max 3 mini-games per day',
  );

  const negative = user({ coins: 10, minigameDate: '2026-06-30' });
  assert.deepEqual(service.claimMinigameReward(negative, 'x', -2), { coinsEarned: -10, gamesRemaining: 2 });
  assert.equal(negative.coins, 0);

  const nonNumeric = user({ coins: 10, minigameDate: '2026-06-30' });
  const result = service.claimMinigameReward(nonNumeric, 'x', 'nope');
  assert.equal(Number.isNaN(result.coinsEarned), true);
  assert.equal(Number.isNaN(nonNumeric.coins), true);
  assert.equal(result.gamesRemaining, 2);
});

test('garden returns the established projection and rejects missing users', () => {
  const alice = user({
    level: 0,
    generation: 2,
    inventory: { treeSkin: 'cherry' },
    companion: 'butterfly',
    achievements: ['first_event'],
    joinDate: 123,
  });
  const h = harness({ users: { Alice: alice } });
  const service = createSocialService(h.dependencies);
  assertHttpError(() => service.getGarden('Missing'), 404, 'User not found');
  assert.deepEqual(service.getGarden('Alice'), {
    username: 'Alice',
    level: 1,
    generation: 2,
    treeSkin: 'cherry',
    companion: 'butterfly',
    achievements: ['first_event'],
    joinDate: 123,
  });
});

test('gift preserves self, missing, daily, funds, transfer, and response contracts', () => {
  const sender = user({ coins: 49 });
  const receiver = user({ coins: 10 });
  const h = harness({ users: { Alice: sender, Bob: receiver } });
  const service = createSocialService(h.dependencies);
  assertHttpError(() => service.sendGift('Alice', 'Alice'), 400, 'Cannot gift yourself');
  assertHttpError(() => service.sendGift('Missing', 'Bob'), 404, 'Sender not found');
  assertHttpError(() => service.sendGift('Alice', 'Missing'), 404, 'Recipient not found');
  sender.lastGiftDate = '2026-06-30';
  assertHttpError(() => service.sendGift('Alice', 'Bob'), 400, 'Already sent a gift today');
  sender.lastGiftDate = null;
  assertHttpError(() => service.sendGift('Alice', 'Bob'), 400, 'Not enough coins');
  sender.coins = 100.9;

  assert.deepEqual(service.sendGift('Alice', 'Bob'), { success: true, amount: 50, senderCoins: 50 });
  assert.equal(sender.coins, 50.900000000000006);
  assert.equal(sender.lastGiftDate, '2026-06-30');
  assert.equal(receiver.coins, 60);
  assert.equal(receiver.totalCoinsEarned, 50);
  assert.equal(h.dirty(), 1);
});

test('social lists users and sorts the top 20 leaderboard by generation, level, then XP without Admin', () => {
  const users = {
    Admin: user({ level: 100, generation: 99 }),
    Low: user({ level: 99, xp: 99, generation: 0 }),
    Xp: user({ level: 2, xp: 8, generation: 1 }),
    Level: user({ level: 3, xp: 0, generation: 1, companion: 'bird' }),
    Generation: user({ level: 1, xp: 0, generation: 2, inventory: { treeSkin: 'snow' } }),
  };
  for (let index = 0; index < 20; index += 1) users[`Extra${index}`] = user();
  const h = harness({ users });
  const service = createSocialService(h.dependencies);

  assert.deepEqual(service.listUsers(), Object.keys(users));
  const board = service.getLeaderboard();
  assert.equal(board.length, 20);
  assert.deepEqual(board.slice(0, 4).map(entry => entry.username), ['Generation', 'Level', 'Xp', 'Low']);
  assert.equal(board.some(entry => entry.username === 'Admin'), false);
  assert.deepEqual(board[0], {
    username: 'Generation', level: 1, xp: 0, treeSkin: 'snow', generation: 2, companion: null,
  });
});

test('achievements rejects missing users and returns the exact wrapper', () => {
  const h = harness({ users: { Alice: user({ achievements: ['first_event'] }), Empty: user({ achievements: null }) } });
  const service = createSocialService(h.dependencies);
  assertHttpError(() => service.getAchievements('Missing'), 404, 'User not found');
  assert.deepEqual(service.getAchievements('Alice'), { achievements: ['first_event'] });
  assert.deepEqual(service.getAchievements('Empty'), { achievements: [] });
});

test('gameplay service modules export only factories and have no Express request/response dependency', () => {
  const modules = [
    ['progressionService.js', require('../server/services/progressionService'), 'createProgressionService'],
    ['rewardService.js', require('../server/services/rewardService'), 'createRewardService'],
    ['socialService.js', require('../server/services/socialService'), 'createSocialService'],
  ];
  for (const [filename, exports, factory] of modules) {
    assert.deepEqual(Object.keys(exports), [factory]);
    const source = fs.readFileSync(path.join(__dirname, '../server/services', filename), 'utf8');
    assert.doesNotMatch(source, /require\(['"]express['"]\)/);
    assert.doesNotMatch(source, /\b(req|res)\b/);
  }
});
