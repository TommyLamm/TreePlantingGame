const test = require('node:test');
const assert = require('node:assert/strict');

const { EVENT_BALANCE } = require('../server/config/eventBalance');
const gameData = require('../server/config/gameData');
const { createDefaultUser } = require('../server/data/userRepository');
const { createAchievementService } = require('../server/services/achievementService');
const { createGameStateService } = require('../server/services/gameStateService');
const { createProgressionService } = require('../server/services/progressionService');

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

// ---------- Event Balance constants ----------

test('eventBalance exports all required constants', () => {
  assert.equal(EVENT_BALANCE.FIRST_EVENT_MIN_MS, 45 * 1000);
  assert.equal(EVENT_BALANCE.FIRST_EVENT_MAX_MS, 90 * 1000);
  assert.equal(EVENT_BALANCE.EVENT_BASE_INTERVAL_MS, 3 * 60 * 1000);
  assert.equal(EVENT_BALANCE.EVENT_MIN_INTERVAL_MS, 60 * 1000);
  assert.equal(EVENT_BALANCE.STORM_TIMEOUT_MS, 2 * 60 * 1000);
  assert.equal(EVENT_BALANCE.STORM_PENALTY_XP, 10);
});

// ---------- First Event ----------
// The first-event interval is computed once (based on lastEventTime) and stored.
// createGameStateService consumes 1 random value during weather init.

test('first event spawns within 45-90s window', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, { lastLoginDate: '2026-03-15' });
  const firstInterval = 45000 + (harness.now() % 45001);
  assert.ok(firstInterval >= EVENT_BALANCE.FIRST_EVENT_MIN_MS);
  assert.ok(firstInterval <= EVENT_BALANCE.FIRST_EVENT_MAX_MS);

  harness.setNow(harness.now() + firstInterval - 1);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, null, 'should not spawn before interval');

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.notEqual(user.activeEvent, null, 'should spawn at interval boundary');
  assert.equal(user.hasHadFirstEvent, true);
  assert.equal(user.eventSpawnedAt, harness.now());
});

test('first event spawns at a different time for a different start time', () => {
  const start1 = localTime(2026, 3, 15);
  const start2 = localTime(2026, 7, 4);
  const h1 = createHarness({ start: start1, randomValues: [0, 0.5] });
  const h2 = createHarness({ start: start2, randomValues: [0, 0.5] });
  const interval1 = 45000 + (start1 % 45001);
  const interval2 = 45000 + (start2 % 45001);
  assert.ok(interval1 !== interval2 || (start1 % 45001 === start2 % 45001));
  assert.ok(interval1 >= EVENT_BALANCE.FIRST_EVENT_MIN_MS);
  assert.ok(interval1 <= EVENT_BALANCE.FIRST_EVENT_MAX_MS);
  assert.ok(interval2 >= EVENT_BALANCE.FIRST_EVENT_MIN_MS);
  assert.ok(interval2 <= EVENT_BALANCE.FIRST_EVENT_MAX_MS);
});

test('first event uses the injected random for event type and logs the spawned event', () => {
  const harness = createHarness({ randomValues: [0, 0.61] });
  const user = createUser(harness, { lastLoginDate: '2026-03-15' });
  const firstInterval = 45000 + (harness.now() % 45001);
  harness.setNow(harness.now() + firstInterval);
  harness.service.updateUserState(user);
  // random=0.61 => Math.floor(0.61*6)=3 => PRUNE
  assert.equal(user.activeEvent, 'PRUNE');
  assert.deepEqual(harness.logs, ['[Game Logic] Spawned PRUNE']);
});

// ---------- Steady-state event interval ----------

test('steady-state event uses 3 min base interval', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, {
    hasHadFirstEvent: true,
    lastLoginDate: '2026-03-15',
    lastEventTime: harness.now(),
  });
  // 3 min = 180000ms
  harness.setNow(harness.now() + 179999);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, null, 'should not spawn before 3 min');

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.notEqual(user.activeEvent, null, 'should spawn at 3 min');
});

test('steady-state event respects prestige reduction', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, {
    hasHadFirstEvent: true,
    lastLoginDate: '2026-03-15',
    lastEventTime: harness.now(),
    prestigeUpgrades: { eventFreq: 1 },
  });
  // 3 min - 60000 = 2 min = 120000ms
  harness.setNow(harness.now() + 119999);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, null);

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.notEqual(user.activeEvent, null);
});

test('prestige reduction respects minimum interval of 60s', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, {
    hasHadFirstEvent: true,
    lastLoginDate: '2026-03-15',
    lastEventTime: harness.now(),
    prestigeUpgrades: { eventFreq: 3 },
  });
  // 3 min - 180000 = 0, clamped to 60000ms
  harness.setNow(harness.now() + 59999);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, null);

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.notEqual(user.activeEvent, null);
});

// ---------- Demo mode ----------

test('demo mode scales first event interval by 600x', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, {
    isDemoMode: true,
    lastLoginDate: '2026-03-15',
  });
  const firstInterval = 45000 + (harness.now() % 45001);
  const scaled = Math.ceil(firstInterval / 600);
  // Not yet time
  harness.setNow(harness.now() + scaled - 1);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, null);

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.notEqual(user.activeEvent, null);
});

test('demo mode scales steady-state interval by 600x', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, {
    isDemoMode: true,
    hasHadFirstEvent: true,
    lastLoginDate: '2026-03-15',
    lastEventTime: harness.now(),
  });
  // 3 min / 600 = 300ms (exact integer division)
  harness.setNow(harness.now() + 299);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, null);

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.notEqual(user.activeEvent, null);
});

// ---------- Weather multiplier on manual event rewards ----------

test('weather multiplier applies to manual event reward (sunny 1.2x XP)', () => {
  const h = createHarness({ randomValues: [0, 0, 0] });
  const progressionService = createProgressionService({
    repository: h.repository,
    gameStateService: h.service,
    achievementService: createAchievementService({ achievements: gameData.ACHIEVEMENTS }),
    now: h.now,
    random: () => 0,
    logger: { log: () => {} },
  });
  const user = createUser(h, {
    level: 100,
    activeEvent: 'WATER',
    eventSpawnedAt: h.now() - 100,
    inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
    lastLoginDate: '2026-03-15',
  });

  // Sunny weather: xpMult=1.2, coinMult=1.0
  // WATER: xpMin=3, xpMax=10, coinMin=10, coinMax=20
  // random=0 => xp=3, coin=10
  // totalEventXpMult = 1 * 1 * 1 * 1 * 1 * 1 * 1.2 = 1.2
  // reward = 3 * 1.2 = 3.6
  // coinReward = 10 * 1 * 1 * 1.0 = 10
  progressionService.resolveAction(user, 'WATER', 'Alice');

  assertClose(user.xp, 3.6);
  assert.equal(user.coins, 10);
  assert.equal(user.lastReward, 3.6);
  assert.equal(user.lastCoinReward, 10);
});

test('weather multiplier applies to manual event reward (rainy 1.3x XP, 0.9x coins)', () => {
  // Force weather to rainy: WEATHER_TYPES[Math.floor(0.5 * 5)] = WEATHER_TYPES[2] = 'rainy'
  const start = localTime(2026, 3, 15);
  const h = createHarness({ start, randomValues: [0, 0.5, 0, 0] });
  h.setNow(start + 2 * 3600000);
  h.service.getWeather(); // triggers weather update, consumes random value 0.5
  const weather = h.service.getWeather();
  assert.equal(weather.type, 'rainy');

  const progressionService = createProgressionService({
    repository: h.repository,
    gameStateService: h.service,
    achievementService: createAchievementService({ achievements: gameData.ACHIEVEMENTS }),
    now: h.now,
    random: () => 0,
    logger: { log: () => {} },
  });
  const user = createUser(h, {
    level: 100,
    activeEvent: 'WATER',
    eventSpawnedAt: h.now() - 100,
    inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
    lastLoginDate: '2026-03-15',
  });

  // Rainy: xpMult=1.3, coinMult=0.9
  // totalEventXpMult = 1 * 1 * 1 * 1 * 1 * 1 * 1.3 = 1.3
  // reward = 3 * 1.3 = 3.9
  // coinReward = 10 * 1 * 1 * 0.9 = 9
  progressionService.resolveAction(user, 'WATER', 'Alice');

  assertClose(user.xp, 3.9);
  assert.equal(user.coins, 9);
  assert.equal(user.lastReward, 3.9);
  assert.equal(user.lastCoinReward, 9);
});

test('stormy weather applies 0.8x XP and 1.3x coins to manual event rewards', () => {
  // Force weather to stormy: WEATHER_TYPES[Math.floor(0.6 * 5)] = WEATHER_TYPES[3] = 'stormy'
  const start = localTime(2026, 3, 15);
  const h = createHarness({ start, randomValues: [0, 0.6, 0, 0] });
  h.setNow(start + 2 * 3600000);
  h.service.getWeather();
  const weather = h.service.getWeather();
  assert.equal(weather.type, 'stormy');

  const progressionService = createProgressionService({
    repository: h.repository,
    gameStateService: h.service,
    achievementService: createAchievementService({ achievements: gameData.ACHIEVEMENTS }),
    now: h.now,
    random: () => 0,
    logger: { log: () => {} },
  });
  const user = createUser(h, {
    level: 100,
    activeEvent: 'FERTILIZE',
    eventSpawnedAt: h.now() - 100,
    inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
    lastLoginDate: '2026-03-15',
  });

  // Stormy: xpMult=0.8, coinMult=1.3
  // FERTILIZE: xpMin=5, xpMax=15, coinMin=20, coinMax=40
  // random=0 => xp=5, coin=20
  // totalEventXpMult = 1 * 1 * 1 * 1 * 1 * 1 * 0.8 = 0.8
  // reward = 5 * 0.8 = 4
  // coinReward = 20 * 1 * 1 * 1.3 = 26
  progressionService.resolveAction(user, 'FERTILIZE', 'Alice');

  assertClose(user.xp, 4);
  assert.equal(user.coins, 26);
  assert.equal(user.lastReward, 4);
  assert.equal(user.lastCoinReward, 26);
});

test('weather multiplier does not double-apply to auto-water reward in updateUserState', () => {
  // In updateUserState, auto-water reward uses totalXpMultiplier which already includes weather.
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
  assert.equal(user.lastEventResolved, true);
  // totalXpMultiplier includes weather=1.2 (sunny), so reward = 3 * 1.2 * 1 * 1 = 3.6
  assert.equal(user.lastReward, 3.6);
  assert.equal(user.combo, 1);
});

// ---------- Storm timeout ----------

test('storm timeout uses constant from eventBalance and deducts penalty XP', () => {
  const harness = createHarness();
  const user = createUser(harness, {
    level: 100, // disable passive earnings
    xp: 5,
    combo: 4,
    activeEvent: 'STORM',
    eventSpawnedAt: harness.now(),
    lastLoginDate: '2026-03-15',
  });
  harness.setNow(harness.now() + EVENT_BALANCE.STORM_TIMEOUT_MS - 1);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, 'STORM', 'should not expire before timeout');

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.equal(user.xp, 0); // 5 - 10 = -5 clamped to 0
  assert.equal(user.activeEvent, null);
  assert.equal(user.eventSpawnedAt, null);
  assert.equal(user.combo, 0);
  assert.equal(user.stormPenalty, true);
  assert.deepEqual(harness.logs, ['[Game Logic] STORM penalty — user lost 10 XP']);
});

test('storm timeout works in demo mode with 600x speed', () => {
  const harness = createHarness();
  const user = createUser(harness, {
    level: 100, // disable passive earnings
    isDemoMode: true,
    xp: 20,
    combo: 4,
    activeEvent: 'STORM',
    eventSpawnedAt: harness.now(),
    lastLoginDate: '2026-03-15',
  });
  // 120000 / 600 = 200ms
  harness.setNow(harness.now() + 199);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, 'STORM', 'should not expire before timeout');

  harness.setNow(harness.now() + 1);
  harness.service.updateUserState(user);
  assert.equal(user.xp, 10); // 20 - 10 = 10
  assert.equal(user.activeEvent, null);
  assert.equal(user.combo, 0);
});

// ---------- nextEventAt / eventExpiresAt optional timestamps ----------

test('heartbeat response includes nextEventAt when no active event', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, {
    hasHadFirstEvent: true,
    lastLoginDate: '2026-03-15',
  });
  // Steady-state: 3 min interval, so nextEventAt = lastEventTime + 180000
  const expectedNextEvent = Math.floor(harness.now() + EVENT_BALANCE.EVENT_BASE_INTERVAL_MS);
  const response = harness.service.heartbeat(user);
  assert.equal(typeof response.nextEventAt, 'number');
  assert.equal(response.nextEventAt, expectedNextEvent);
});

test('heartbeat response includes eventExpiresAt for STORM event', () => {
  const harness = createHarness();
  const user = createUser(harness, {
    activeEvent: 'STORM',
    eventSpawnedAt: harness.now(),
    lastLoginDate: '2026-03-15',
  });
  const response = harness.service.heartbeat(user);
  assert.equal(typeof response.eventExpiresAt, 'number');
  assert.equal(response.eventExpiresAt, Math.floor(harness.now() + EVENT_BALANCE.STORM_TIMEOUT_MS));
  assert.equal(response.nextEventAt, Math.floor(harness.now()));
});

test('nextEventAt and eventExpiresAt are present on user state after heartbeat', () => {
  // They are left on the user object as ephemeral fields (not persisted as required fields)
  const harness = createHarness();
  const user = createUser(harness, {
    activeEvent: 'STORM',
    eventSpawnedAt: harness.now(),
    lastLoginDate: '2026-03-15',
  });
  harness.service.heartbeat(user);
  assert.equal(typeof user.nextEventAt, 'number');
  assert.equal(typeof user.eventExpiresAt, 'number');
});

test('resolveAction response includes nextEventAt and eventExpiresAt', () => {
  const h = createHarness({ randomValues: [0, 0, 0] });
  const progressionService = createProgressionService({
    repository: h.repository,
    gameStateService: h.service,
    achievementService: createAchievementService({ achievements: gameData.ACHIEVEMENTS }),
    now: h.now,
    random: () => 0,
    logger: { log: () => {} },
  });
  const user = createUser(h, {
    level: 100,
    activeEvent: 'WATER',
    eventSpawnedAt: h.now() - 100,
    inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
    lastLoginDate: '2026-03-15',
  });
  const result = progressionService.resolveAction(user, 'WATER', 'Alice');
  // After resolve, activeEvent is null, so nextEventAt should be computed
  assert.equal(typeof result.nextEventAt, 'number');
  // eventExpiresAt should be undefined since no active event
  assert.equal(result.eventExpiresAt, undefined);
});

// ---------- Level 100 does not spawn events ----------

test('level 100 does not spawn events (first event not triggered)', () => {
  const harness = createHarness({ randomValues: [0, 0.5] });
  const user = createUser(harness, {
    level: 100,
    lastLoginDate: '2026-03-15',
  });
  harness.setNow(harness.now() + 120000);
  harness.service.updateUserState(user);
  assert.equal(user.activeEvent, null);
  assert.equal(user.hasHadFirstEvent, undefined);
});

// ---------- Bad numeric state is handled gracefully ----------

test('updateUserState handles missing lastEventTime gracefully', () => {
  const harness = createHarness();
  const user = createUser(harness, { lastLoginDate: '2026-03-15', lastEventTime: undefined });
  harness.service.updateUserState(user);
  assert.equal(typeof user.lastEventTime, 'number');
  assert.ok(Number.isFinite(user.lastEventTime));
});