const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gameData = require('../server/config/gameData');
const { createDefaultUser } = require('../server/data/userRepository');
const { createAchievementService } = require('../server/services/achievementService');
const { createGameStateService } = require('../server/services/gameStateService');

function localTime(year, month, day, hour = 12) {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

function createHarness({ start = localTime(2026, 3, 15), randomValues = [0] } = {}) {
  let currentTime = start;
  let dirtyCount = 0;
  const values = [...randomValues];
  const logs = [];
  const repository = {
    markDirty() {
      dirtyCount += 1;
    },
  };
  const achievementService = createAchievementService({ achievements: gameData.ACHIEVEMENTS });
  const service = createGameStateService({
    repository,
    achievementService,
    now: () => currentTime,
    random: () => values.shift() ?? 0,
    logger: { log: message => logs.push(message) },
  });

  return {
    service,
    repository,
    logs,
    now: () => currentTime,
    setNow(value) {
      currentTime = value;
    },
    dirtyCount: () => dirtyCount,
  };
}

function createUser(harness, overrides = {}) {
  const user = createDefaultUser(false, harness.now());
  Object.assign(user, overrides);
  return user;
}

function assertClose(actual, expected, epsilon = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not close to ${expected}`);
}

test('game data exports all server definitions while preserving daily reward projection', () => {
  assert.deepEqual(Object.keys(gameData).sort(), [
    'ACHIEVEMENTS',
    'COMPANIONS',
    'DAILY_REWARDS',
    'EVENT_REWARDS',
    'PRESTIGE_UPGRADES',
    'STORE_ITEMS',
    'WEATHER_MODIFIERS',
    'WEATHER_TYPES',
  ]);
  assert.deepEqual(gameData.DAILY_REWARDS[4], { day: 5, coins: 300, xp: 15 });
  assert.equal(gameData.EVENT_REWARDS.STORM.xpMax, 30);
  assert.deepEqual(gameData.WEATHER_TYPES, ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy']);
  assert.equal(typeof gameData.ACHIEVEMENTS[0].condition, 'function');
});

test('achievement service unlocks first_event once and exposes its transient flag', () => {
  const service = createAchievementService({ achievements: gameData.ACHIEVEMENTS });
  const user = { interactionCount: 1, level: 1, coins: 0 };

  assert.equal(service.checkAchievements(user), true);
  assert.deepEqual(user.achievements, ['first_event']);
  assert.deepEqual(user.newAchievements, ['first_event']);

  assert.equal(service.checkAchievements(user), false);
  assert.deepEqual(user.achievements, ['first_event']);
});

test('regular heartbeat returns the fixed weather, season, daily reward state, and response additions', () => {
  const harness = createHarness();
  const user = createUser(harness);

  const response = harness.service.heartbeat(user);

  assert.equal(response.weather, 'sunny');
  assert.equal(response.season, 'spring');
  assert.equal(response.dailyRewardAvailable, true);
  assert.equal(response.lastTick, harness.now());
  assert.deepEqual(
    Object.keys(response).filter(key => !Object.hasOwn(user, key)).sort(),
    ['dailyRewardAvailable', 'season', 'weather'],
  );
  assert.equal(harness.dirtyCount(), 1);
});

test('one sunny offline hour settles passive earnings and total counters exactly', () => {
  const harness = createHarness();
  const user = createUser(harness, { lastLoginDate: '2026-03-15' });
  harness.setNow(harness.now() + 3600000);

  harness.service.updateUserState(user);

  assert.equal(user.xp, 1.2);
  assert.equal(user.coins, 50);
  assert.equal(user.totalXpEarned, 1.2);
  assert.equal(user.totalCoinsEarned, 50);
  assert.equal(user.lastOfflineXp, 1.2);
  assert.equal(user.lastOfflineCoins, 50);
  assert.equal(user.level, 1);
  assert.equal(user.lastTick, harness.now());
  assert.equal(harness.dirtyCount(), 1);
});

test('demo mode retains its 600x settlement multiplier and one-level-per-tick rule', () => {
  const harness = createHarness();
  const user = createUser(harness, {
    isDemoMode: true,
    lastLoginDate: '2026-03-15',
    lastEventTime: harness.now() + 86400000,
  });
  harness.setNow(harness.now() + 3600000);

  harness.service.updateUserState(user);

  assert.equal(user.level, 2);
  assert.equal(user.xp, 709);
  assert.equal(user.coins, 30000);
  assert.equal(user.totalXpEarned, 720);
  assert.equal(user.lastOfflineXp, 720);
  assert.equal(user.lastOfflineCoins, 30000);
});

test('daily login handles first, consecutive, same-day, and broken streaks while retaining max', () => {
  const start = localTime(2026, 3, 15);
  const harness = createHarness({ start });
  const user = createUser(harness, { level: 100 });

  harness.service.updateUserState(user);
  assert.equal(user.lastLoginDate, '2026-03-15');
  assert.equal(user.loginStreak, 1);
  assert.equal(user.maxLoginStreak, 1);
  assert.equal(user.dailyRewardClaimed, false);

  user.dailyRewardClaimed = true;
  harness.service.updateUserState(user);
  assert.equal(user.loginStreak, 1);
  assert.equal(user.dailyRewardClaimed, true);

  harness.setNow(localTime(2026, 3, 16));
  user.lastTick = harness.now();
  harness.service.updateUserState(user);
  assert.equal(user.loginStreak, 2);
  assert.equal(user.maxLoginStreak, 2);
  assert.equal(user.dailyRewardClaimed, false);

  user.dailyRewardClaimed = true;
  harness.setNow(localTime(2026, 3, 20));
  user.lastTick = harness.now();
  harness.service.updateUserState(user);
  assert.equal(user.loginStreak, 1);
  assert.equal(user.maxLoginStreak, 2);
  assert.equal(user.dailyRewardClaimed, false);
});

test('heartbeat snapshots transient flags before clearing and marks the clear dirty', () => {
  const harness = createHarness();
  const user = createUser(harness, {
    achievements: ['first_event'],
    interactionCount: 1,
    lastLoginDate: '2026-03-15',
    justLeveledUp: true,
    newAchievements: ['first_event'],
    stormPenalty: true,
  });

  const response = harness.service.heartbeat(user);

  assert.equal(response.justLeveledUp, true);
  assert.deepEqual(response.newAchievements, ['first_event']);
  assert.equal(response.stormPenalty, true);
  assert.equal(user.justLeveledUp, false);
  assert.equal(Object.hasOwn(user, 'newAchievements'), false);
  assert.equal(Object.hasOwn(user, 'stormPenalty'), false);
  assert.equal(harness.dirtyCount(), 1);
});

test('companion bonuses cover every bonus type and neutral missing companions', () => {
  const { service } = createHarness();
  const neutral = { xpMult: 1, coinMult: 1, eventXpMult: 1 };
  assert.deepEqual(service.getCompanionBonuses({}), neutral);
  assert.deepEqual(service.getCompanionBonuses({ companion: 'missing' }), neutral);
  assert.deepEqual(service.getCompanionBonuses({ companion: 'butterfly' }), { xpMult: 1.05, coinMult: 1, eventXpMult: 1 });
  assert.deepEqual(service.getCompanionBonuses({ companion: 'squirrel' }), { xpMult: 1, coinMult: 1.1, eventXpMult: 1 });
  assert.deepEqual(service.getCompanionBonuses({ companion: 'bird' }), { xpMult: 1, coinMult: 1, eventXpMult: 1.15 });
  assert.deepEqual(service.getCompanionBonuses({ companion: 'owl' }), { xpMult: 1, coinMult: 1.2, eventXpMult: 1 });
  assert.deepEqual(service.getCompanionBonuses({ companion: 'deer' }), { xpMult: 1.1, coinMult: 1.1, eventXpMult: 1.1 });
  assert.deepEqual(service.getCompanionBonuses({ companion: 'phoenix' }), { xpMult: 1.2, coinMult: 1.2, eventXpMult: 1.2 });
});

test('prestige bonuses apply every upgrade type and retain neutral defaults', () => {
  const { service } = createHarness();
  assert.deepEqual(service.getPrestigeBonuses({}), {
    xpMult: 1,
    coinMult: 1,
    eventFreqReduction: 0,
    startLevel: 1,
    comboCapBonus: 0,
  });
  assert.deepEqual(service.getPrestigeBonuses({
    prestigeUpgrades: {
      xpBoost: 2,
      coinBoost: 2,
      eventFreq: 2,
      startLevel: 2,
      comboBonus: 2,
    },
  }), {
    xpMult: 1.2,
    coinMult: 1.3,
    eventFreqReduction: 120000,
    startLevel: 5,
    comboCapBonus: 1,
  });
});

test('weather transition uses injected randomness and preserves the public shape', () => {
  const start = localTime(2026, 3, 15);
  const harness = createHarness({ start, randomValues: [0, 0.61, 0.5] });
  assert.deepEqual(harness.service.getWeather(), {
    type: 'sunny',
    season: 'spring',
    changedAt: start,
    nextChangeAt: start + 2 * 3600000,
  });

  harness.setNow(start + 2 * 3600000);
  assert.deepEqual(harness.service.getWeather(), {
    type: 'stormy',
    season: 'spring',
    changedAt: start + 2 * 3600000,
    nextChangeAt: start + 5 * 3600000,
  });
  assert.deepEqual(harness.logs, ['[Weather] Changed to stormy']);
});

test('event spawn occurs at the deterministic interval boundary', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, { lastLoginDate: '2026-03-15' });
  harness.setNow(harness.now() + 10 * 60000);

  harness.service.updateUserState(user);

  assert.equal(user.activeEvent, 'PRUNE');
  assert.equal(user.eventSpawnedAt, harness.now());
  assert.deepEqual(harness.logs, ['[Game Logic] Spawned PRUNE']);
});

test('auto-water resolves at its timeout boundary with deterministic minimum rewards', () => {
  const harness = createHarness({ randomValues: [0, 0, 0] });
  const user = createUser(harness, {
    activeEvent: 'WATER',
    eventSpawnedAt: harness.now(),
    inventory: { xpBuff: false, autoWater: true, treeSkin: 'default', unlockedSkins: ['default'] },
    lastLoginDate: '2026-03-15',
  });
  harness.setNow(harness.now() + 5000);

  harness.service.updateUserState(user);

  assert.equal(user.activeEvent, null);
  assert.equal(user.eventSpawnedAt, null);
  assert.equal(user.lastEventResolved, true);
  assert.equal(user.lastReward, 3.6);
  assert.equal(user.interactionCount, 1);
  assert.equal(user.totalEventsResolved, 1);
  assert.equal(user.combo, 1);
  assertClose(user.xp, 3.6 + (5000 / 3600000) * 1.2);
  assertClose(user.coins, 10 + (5000 / 3600000) * 50);
  assert.deepEqual(user.newAchievements, ['first_event']);
});

test('storm timeout applies at the exact boundary and breaks the combo', () => {
  const harness = createHarness();
  const user = createUser(harness, {
    xp: 5,
    combo: 4,
    activeEvent: 'STORM',
    eventSpawnedAt: harness.now(),
    lastLoginDate: '2026-03-15',
  });
  harness.setNow(harness.now() + 2 * 60000);

  harness.service.updateUserState(user);

  assert.equal(user.xp, 0);
  assert.equal(user.activeEvent, null);
  assert.equal(user.eventSpawnedAt, null);
  assert.equal(user.lastEventTime, harness.now());
  assert.equal(user.combo, 0);
  assert.equal(user.stormPenalty, true);
  assert.deepEqual(harness.logs, ['[Game Logic] STORM penalty — user lost 10 XP']);
});

test('state settlement migrates old user records before applying game logic', () => {
  const harness = createHarness();
  const user = { xp: 0, level: 1, lastTick: harness.now(), lastLoginDate: '2026-03-15' };

  harness.service.updateUserState(user);

  assert.deepEqual(user.inventory, {
    xpBuff: false,
    autoWater: false,
    treeSkin: 'default',
    unlockedSkins: ['default'],
  });
  assert.deepEqual(user.achievements, []);
  assert.deepEqual(user.prestigeUpgrades, {});
  assert.equal(harness.dirtyCount(), 1);
});

test('state and achievement services have no Express request/response dependency', () => {
  for (const relativePath of [
    '../server/services/achievementService.js',
    '../server/services/gameStateService.js',
  ]) {
    const source = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
    assert.doesNotMatch(source, /require\(['"]express['"]\)/);
    assert.doesNotMatch(source, /\b(req|res)\b/);
  }
});
