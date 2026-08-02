const assert = require("node:assert/strict");
const { test } = require("node:test");

const { createDefaultUser } = require("../server/data/userRepository");
const { createRewardService } = require("../server/services/rewardService");

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
    getUser: (name) => cache[name],
    hasUser: (name) => Object.hasOwn(cache, name),
    listNames: () => Object.keys(cache),
    entries: () => Object.entries(cache),
    markDirty: () => {
      dirty += 1;
    },
  };
  const gameStateService = {
    updateUserState(value) {
      updates.push(value);
    },
    toGameResponse: (value) => ({ ...value, weather: "sunny", season: "summer" }),
    getCompanionBonuses: () => bonuses.companion || { xpMult: 1, coinMult: 1, eventXpMult: 1 },
    getPrestigeBonuses: () => bonuses.prestige || { xpMult: 1, coinMult: 1, startLevel: 1, comboCapBonus: 0 },
    getTodayStr: () => "2026-06-30",
  };
  const achievementService = {
    checkAchievements(value) {
      achievementChecks.push(value);
    },
  };
  const dependencies = {
    repository,
    gameStateService,
    achievementService,
    now: () => NOW,
    random: () => values.shift() ?? 0,
    logger: { log: (message) => logs.push(message) },
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
  assert.throws(action, (error) => error.status === status && error.message === message);
}

// ─── Minigame reward tests ─────────────────────────────────────────────────

test("minigame reward returns coins, XP, gamesRemaining, and bonus fields", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-30" });

  const result = service.claimMinigameReward(val, "memory", 10);

  assert.equal(result.coinsEarned, 50);
  assert.equal(result.xpEarned, 5);
  assert.equal(result.gamesRemaining, 2);
  assert.equal(result.bonus, null);
  assert.equal(result.goldenHourUntil, 0);
  assert.equal(val.coins, 50);
  assert.equal(val.xp, 5);
  assert.equal(val.totalCoinsEarned, 50);
  assert.equal(val.totalXpEarned, 5);
  assert.equal(val.minigameCount, 1);
  assert.equal(h.dirty(), 1);
});

test("minigame reward caps coins at 200 and XP at 20", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-30" });

  const result = service.claimMinigameReward(val, "water", 100);

  assert.equal(result.coinsEarned, 200);
  assert.equal(result.xpEarned, 20);
  assert.equal(val.coins, 200);
  assert.equal(val.xp, 20);
});

test("minigame reward triggers bonus at score >= 40", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-30" });

  const result = service.claimMinigameReward(val, "memory", 40);

  assert.equal(result.coinsEarned, 200);
  assert.equal(result.xpEarned, 20);
  assert.ok(result.bonus !== null);
  assert.equal(result.bonus.type, "xpBoost");
  assert.equal(result.bonus.duration, 300000);
  assert.equal(result.bonus.multiplier, 2);
  assert.equal(result.goldenHourUntil, NOW + 300000);
  assert.equal(val.goldenHourUntil, NOW + 300000);
});

test("minigame reward does not trigger bonus below score 40", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-30" });

  const result = service.claimMinigameReward(val, "water", 39);

  assert.equal(result.coinsEarned, 195);
  assert.equal(result.xpEarned, 19);
  assert.equal(result.bonus, null);
  assert.equal(result.goldenHourUntil, 0);
});

test("minigame resets daily counter when date changes", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-29", minigameCount: 3 });

  const result = service.claimMinigameReward(val, "memory", 1);

  assert.equal(result.gamesRemaining, 2);
  assert.equal(val.minigameDate, "2026-06-30");
  assert.equal(val.minigameCount, 1);
});

test("minigame enforces max 3 per day", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);

  assertHttpError(
    () => service.claimMinigameReward(
      user({ minigameDate: "2026-06-30", minigameCount: 3 }),
      "water",
      1,
    ),
    400,
    "Max 3 mini-games per day",
  );
});

test("minigame tracks remaining games correctly", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-30" });

  const r1 = service.claimMinigameReward(val, "memory", 5);
  assert.equal(r1.gamesRemaining, 2);

  const r2 = service.claimMinigameReward(val, "water", 5);
  assert.equal(r2.gamesRemaining, 1);

  const r3 = service.claimMinigameReward(val, "memory", 5);
  assert.equal(r3.gamesRemaining, 0);

  assertHttpError(
    () => service.claimMinigameReward(val, "water", 1),
    400,
    "Max 3 mini-games per day",
  );
});

test("minigame rejects invalid game types before settlement", () => {
  for (const gameType of ["ignored", "", null, undefined, "Memory"]) {
    const h = harness();
    const val = user({ coins: 10, xp: 5, minigameDate: "2026-06-29", minigameCount: 2 });
    assertHttpError(
      () => createRewardService(h.dependencies).claimMinigameReward(val, gameType, 1),
      400,
      "Invalid mini-game",
    );
    assert.equal(val.coins, 10);
    assert.equal(val.xp, 5);
    assert.equal(val.minigameDate, "2026-06-29");
    assert.equal(val.minigameCount, 2);
    assert.equal(h.updates.length, 0);
    assert.equal(h.dirty(), 0);
  }
});

test("minigame rejects invalid scores before settlement", () => {
  for (const score of [-1, Number.NaN, Number.POSITIVE_INFINITY, "1", null, undefined]) {
    const h = harness();
    const val = user({ coins: 10, xp: 5, minigameDate: "2026-06-29", minigameCount: 2 });
    assertHttpError(
      () => createRewardService(h.dependencies).claimMinigameReward(val, "memory", score),
      400,
      "Invalid score",
    );
    assert.equal(val.coins, 10);
    assert.equal(val.xp, 5);
    assert.equal(val.minigameDate, "2026-06-29");
    assert.equal(val.minigameCount, 2);
    assert.equal(h.updates.length, 0);
    assert.equal(h.dirty(), 0);
  }
});

test("minigame preserves both game types", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);

  const memory = user({ minigameDate: "2026-06-30" });
  const mResult = service.claimMinigameReward(memory, "memory", 5);
  assert.equal(mResult.coinsEarned, 25);

  const water = user({ minigameDate: "2026-06-30" });
  const wResult = service.claimMinigameReward(water, "water", 5);
  assert.equal(wResult.coinsEarned, 25);
});

test("minigame reward with zero score", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-30" });

  const result = service.claimMinigameReward(val, "memory", 0);

  assert.equal(result.coinsEarned, 0);
  assert.equal(result.xpEarned, 0);
  assert.equal(result.bonus, null);
  assert.equal(val.coins, 0);
  assert.equal(val.xp, 0);
  assert.equal(val.minigameCount, 1);
});

test("minigame reward with fractional score", () => {
  const h = harness();
  const service = createRewardService(h.dependencies);
  const val = user({ minigameDate: "2026-06-30" });

  const result = service.claimMinigameReward(val, "water", 3.7);

  assert.equal(result.coinsEarned, 18);
  assert.equal(result.xpEarned, 1);
  assert.equal(result.bonus, null);
  assert.equal(val.coins, 18);
  assert.equal(val.xp, 1);
});
