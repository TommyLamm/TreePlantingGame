const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createDefaultUser } = require('../server/data/userRepository');
const { createSocialService } = require('../server/services/socialService');

const NOW = new Date(2026, 5, 30, 12, 0, 0, 0).getTime();

function user(overrides = {}) {
  return Object.assign(createDefaultUser(false, NOW), overrides);
}

function harness({ users = {} } = {}) {
  let dirty = 0;
  const cache = { ...users };
  const repository = {
    getUser: name => cache[name],
    hasUser: name => Object.hasOwn(cache, name),
    listNames: () => Object.keys(cache),
    entries: () => Object.entries(cache),
    markDirty: () => { dirty += 1; },
  };
  const gameStateService = {
    getTodayStr: () => '2026-06-30',
  };
  const dependencies = { repository, gameStateService };
  return { repository, dependencies, dirty: () => dirty };
}

function assertHttpError(action, status, message) {
  assert.throws(action, error => error.status === status && error.message === message);
}

// ── helpGarden unit tests ──────────────────────────────────────────

test('helpGarden rejects self-help', () => {
  const h = harness({ users: { Alice: user() } });
  const service = createSocialService(h.dependencies);
  assertHttpError(
    () => service.helpGarden('Alice', 'Alice'),
    400,
    'Cannot help your own garden',
  );
  assert.equal(h.dirty(), 0);
});

test('helpGarden rejects missing helper', () => {
  const h = harness({ users: { Bob: user() } });
  const service = createSocialService(h.dependencies);
  assertHttpError(
    () => service.helpGarden('Missing', 'Bob'),
    404,
    'Helper not found',
  );
  assert.equal(h.dirty(), 0);
});

test('helpGarden rejects missing owner', () => {
  const h = harness({ users: { Alice: user() } });
  const service = createSocialService(h.dependencies);
  assertHttpError(
    () => service.helpGarden('Alice', 'Missing'),
    404,
    'Owner not found',
  );
  assert.equal(h.dirty(), 0);
});

test('helpGarden rejects duplicate daily help', () => {
  const alice = user({ lastGardenHelpDate: '2026-06-30' });
  const bob = user();
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);
  assertHttpError(
    () => service.helpGarden('Alice', 'Bob'),
    400,
    'Already helped a garden today',
  );
  assert.equal(alice.lastGardenHelpDate, '2026-06-30');
  assert.equal(h.dirty(), 0);
});

test('helpGarden rejects invalid coin balances before mutation', () => {
  const invalidCases = [
    { helperCoins: Number.NaN, ownerCoins: 10 },
    { helperCoins: 10, ownerCoins: Number.POSITIVE_INFINITY },
    { helperCoins: -1, ownerCoins: 10 },
    { helperCoins: 10, ownerCoins: null },
    { helperCoins: '100', ownerCoins: 10 },
  ];

  for (const { helperCoins, ownerCoins } of invalidCases) {
    const alice = user({ coins: helperCoins });
    const bob = user({ coins: ownerCoins });
    const h = harness({ users: { Alice: alice, Bob: bob } });
    const service = createSocialService(h.dependencies);
    assertHttpError(
      () => service.helpGarden('Alice', 'Bob'),
      400,
      'Invalid coin balance',
    );
    assert.equal(alice.lastGardenHelpDate, undefined);
    assert.equal(alice.coins, helperCoins);
    assert.equal(h.dirty(), 0);
  }
});

test('helpGarden rejects invalid XP balances before mutation', () => {
  const invalidCases = [
    { helperXp: Number.NaN, ownerXp: 10 },
    { helperXp: 10, ownerXp: Number.NEGATIVE_INFINITY },
    { helperXp: -1, ownerXp: 10 },
    { helperXp: null, ownerXp: 10 },
  ];

  for (const { helperXp, ownerXp } of invalidCases) {
    const alice = user({ xp: helperXp });
    const bob = user({ xp: ownerXp });
    const h = harness({ users: { Alice: alice, Bob: bob } });
    const service = createSocialService(h.dependencies);
    assertHttpError(
      () => service.helpGarden('Alice', 'Bob'),
      400,
      'Invalid XP balance',
    );
    assert.equal(alice.lastGardenHelpDate, undefined);
    assert.equal(h.dirty(), 0);
  }
});

test('helpGarden rejects garden at full capacity', () => {
  const alice = user();
  const bob = user({
    gardenHelp: {
      date: '2026-06-30',
      helpers: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10'],
    },
  });
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);
  assertHttpError(
    () => service.helpGarden('Alice', 'Bob'),
    400,
    'Garden help is full for today',
  );
  assert.equal(alice.lastGardenHelpDate, undefined);
  assert.equal(h.dirty(), 0);
});

test('helpGarden rejects already helped this garden', () => {
  const alice = user();
  const bob = user({
    gardenHelp: {
      date: '2026-06-30',
      helpers: ['Alice'],
    },
  });
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);
  assertHttpError(
    () => service.helpGarden('Alice', 'Bob'),
    400,
    'Already helped this garden today',
  );
  assert.equal(alice.lastGardenHelpDate, undefined);
  assert.equal(h.dirty(), 0);
});

test('helpGarden succeeds with fixed reward and updates both users', () => {
  const alice = user({ coins: 100, xp: 50, totalCoinsEarned: 200, totalXpEarned: 100 });
  const bob = user({ coins: 30, xp: 20 });
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);

  const result = service.helpGarden('Alice', 'Bob');

  assert.deepEqual(result, { success: true, reward: { coins: 50, xp: 10 }, ownerHelpCount: 1 });
  assert.equal(alice.coins, 150);
  assert.equal(alice.xp, 60);
  assert.equal(alice.totalCoinsEarned, 250);
  assert.equal(alice.totalXpEarned, 110);
  assert.equal(alice.lastGardenHelpDate, '2026-06-30');
  assert.deepEqual(bob.gardenHelp, { date: '2026-06-30', helpers: ['Alice'] });
  assert.equal(h.dirty(), 1);
});

test('helpGarden handles zero balances correctly', () => {
  const alice = user({ coins: 0, xp: 0, totalCoinsEarned: 0, totalXpEarned: 0 });
  const bob = user({ coins: 0, xp: 0 });
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);

  const result = service.helpGarden('Alice', 'Bob');

  assert.equal(result.success, true);
  assert.equal(alice.coins, 50);
  assert.equal(alice.xp, 10);
  assert.equal(alice.totalCoinsEarned, 50);
  assert.equal(alice.totalXpEarned, 10);
  assert.equal(h.dirty(), 1);
});

test('helpGarden resets stale gardenHelp date', () => {
  const alice = user();
  const bob = user({
    gardenHelp: {
      date: '2026-06-29',
      helpers: ['Charlie', 'Dave'],
    },
  });
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);

  service.helpGarden('Alice', 'Bob');

  assert.deepEqual(bob.gardenHelp, { date: '2026-06-30', helpers: ['Alice'] });
  assert.equal(h.dirty(), 1);
});

test('helpGarden initializes missing gardenHelp on owner', () => {
  const alice = user();
  const bob = user();
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);

  service.helpGarden('Alice', 'Bob');

  assert.deepEqual(bob.gardenHelp, { date: '2026-06-30', helpers: ['Alice'] });
  assert.equal(h.dirty(), 1);
});

test('helpGarden accumulates multiple helpers', () => {
  const alice = user();
  const bob = user();
  const charlie = user();
  const h = harness({ users: { Alice: alice, Bob: bob, Charlie: charlie } });
  const service = createSocialService(h.dependencies);

  service.helpGarden('Alice', 'Bob');
  service.helpGarden('Charlie', 'Bob');

  assert.deepEqual(bob.gardenHelp, { date: '2026-06-30', helpers: ['Alice', 'Charlie'] });
  assert.equal(alice.lastGardenHelpDate, '2026-06-30');
  assert.equal(charlie.lastGardenHelpDate, '2026-06-30');
  assert.equal(alice.coins, 50);
  assert.equal(charlie.coins, 50);
  assert.equal(h.dirty(), 2);
});

// ── getGarden optional help summary ────────────────────────────────

test('getGarden returns optional help summary when present', () => {
  const bob = user({
    level: 5,
    gardenHelp: { date: '2026-06-30', helpers: ['Alice', 'Charlie'] },
  });
  const h = harness({ users: { Bob: bob } });
  const service = createSocialService(h.dependencies);

  const result = service.getGarden('Bob');

  assert.equal(result.username, 'Bob');
  assert.equal(result.level, 5);
  assert.deepEqual(result.helpers, ['Alice', 'Charlie']);
  assert.equal(result.helpCount, 2);
});

test('getGarden omits help summary when no gardenHelp exists', () => {
  const bob = user({ level: 5 });
  const h = harness({ users: { Bob: bob } });
  const service = createSocialService(h.dependencies);

  const result = service.getGarden('Bob');

  assert.equal(result.username, 'Bob');
  assert.equal(result.level, 5);
  assert.equal(Object.hasOwn(result, 'helpers'), false);
  assert.equal(Object.hasOwn(result, 'helpCount'), false);
});

test('getGarden omits help summary when gardenHelp has no helpers array', () => {
  const bob = user({ gardenHelp: { date: '2026-06-30' } });
  const h = harness({ users: { Bob: bob } });
  const service = createSocialService(h.dependencies);

  const result = service.getGarden('Bob');

  assert.equal(Object.hasOwn(result, 'helpers'), false);
  assert.equal(Object.hasOwn(result, 'helpCount'), false);
});

// ── legacy data safety ─────────────────────────────────────────────

test('helpGarden does not corrupt legacy user data without gardenHelp', () => {
  const alice = user({ coins: 100, xp: 50 });
  const bob = user({ coins: 30, xp: 20 });
  const h = harness({ users: { Alice: alice, Bob: bob } });
  const service = createSocialService(h.dependencies);

  service.helpGarden('Alice', 'Bob');

  assert.equal(Object.hasOwn(bob, 'gardenHelp'), true);
  assert.equal(alice.level, 1);
  assert.equal(alice.generation, 0);
  assert.equal(alice.companion, null);
  assert.equal(bob.level, 1);
  assert.equal(bob.generation, 0);
});

test('social service module exports only the factory', () => {
  const exports = require('../server/services/socialService');
  assert.deepEqual(Object.keys(exports), ['createSocialService']);
});
