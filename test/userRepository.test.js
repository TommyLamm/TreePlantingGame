const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const fsPromises = require('node:fs/promises');
const { mkdtemp, readFile, readdir, rm, writeFile } = require('node:fs/promises');
const { once } = require('node:events');
const { tmpdir } = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');
const { test } = require('node:test');

const repositoryModule = require('../server/data/userRepository');
const {
  createDefaultUser,
  migrateUser,
  createUserRepository,
} = repositoryModule;

const silentLogger = {
  log() {},
  error() {},
};

async function createTempDirectory(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'tree-user-repository-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitFor(condition, message, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) assert.fail(message);
    await delay(5);
  }
}

async function waitForAsync(condition, message, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() >= deadline) assert.fail(message);
    await delay(10);
  }
}

async function getFreePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => {
    listener.close((error) => error ? reject(error) : resolve());
  });
  return port;
}

test('exports only the public repository API', () => {
  assert.deepEqual(
    Object.keys(repositoryModule).sort(),
    ['createDefaultUser', 'createUserRepository', 'migrateUser'],
  );
});

test('createDefaultUser returns the complete regular and admin schemas', () => {
  const regular = createDefaultUser(false, 1000);
  assert.equal(regular.level, 1);
  assert.equal(regular.coins, 0);
  assert.equal(regular.lastTick, 1000);
  assert.equal(regular.lastEventTime, 1000);
  assert.equal(regular.joinDate, 1000);

  assert.deepEqual(Object.keys(regular), [
    'xp',
    'level',
    'activeEvent',
    'isDemoMode',
    'lastTick',
    'lastEventTime',
    'coins',
    'inventory',
    'joinDate',
    'playTime',
    'interactionCount',
    'profile',
    'achievements',
    'lastLoginDate',
    'loginStreak',
    'maxLoginStreak',
    'dailyRewardClaimed',
    'combo',
    'maxCombo',
    'companion',
    'unlockedCompanions',
    'generation',
    'prestigePoints',
    'prestigeUpgrades',
    'totalXpEarned',
    'totalCoinsEarned',
    'totalEventsResolved',
    'lastOfflineXp',
    'lastOfflineCoins',
    'goldenHourUntil',
    'lastShakeTime',
    'lastGiftDate',
    'minigameCount',
    'minigameDate',
  ]);

  assert.deepEqual(regular.inventory, {
    xpBuff: false,
    autoWater: false,
    treeSkin: 'default',
    unlockedSkins: ['default'],
  });
  assert.deepEqual(regular.profile, { avatar: null, birthday: '', signature: '' });
  assert.deepEqual(regular.achievements, []);
  assert.deepEqual(regular.prestigeUpgrades, {});
  assert.deepEqual(regular.unlockedCompanions, []);

  const admin = createDefaultUser(true, 1000);
  assert.equal(admin.level, 100);
  assert.equal(admin.coins, 10000);
});

test('migrateUser fills only missing top-level defaults and repairs legacy containers', () => {
  const legacy = { level: 12, inventory: null, profile: null };
  const result = migrateUser(legacy, 1000);

  assert.equal(result, legacy);
  assert.equal(legacy.level, 12);
  assert.equal(legacy.lastTick, 1000);
  assert.deepEqual(legacy.inventory.unlockedSkins, ['default']);
  assert.deepEqual(legacy.profile, { avatar: null, birthday: '', signature: '' });
  assert.deepEqual(legacy.achievements, []);
  assert.deepEqual(legacy.prestigeUpgrades, {});
  assert.deepEqual(legacy.unlockedCompanions, []);

  const existingContainers = {
    inventory: { unknownInventoryValue: true },
    profile: { unknownProfileValue: true },
    achievements: ['first_event'],
    prestigeUpgrades: { xpBoost: 2 },
    unlockedCompanions: { legacy: true },
  };
  migrateUser(existingContainers, 1000);
  assert.deepEqual(existingContainers.inventory, { unknownInventoryValue: true });
  assert.deepEqual(existingContainers.profile, { unknownProfileValue: true });
  assert.deepEqual(existingContainers.achievements, ['first_event']);
  assert.deepEqual(existingContainers.prestigeUpgrades, { xpBoost: 2 });
  assert.deepEqual(existingContainers.unlockedCompanions, []);
});

test('migrateUser reports only actual mutations through its optional callback', () => {
  const current = createDefaultUser(false, 1000);
  let unchangedSignals = 0;

  assert.equal(migrateUser(current, 1000, () => { unchangedSignals += 1; }), current);
  assert.equal(unchangedSignals, 0);

  const missingFields = {};
  let missingSignals = 0;
  assert.equal(migrateUser(missingFields, 1000, () => { missingSignals += 1; }), missingFields);
  assert.ok(missingSignals > 0);

  const repairedContainer = createDefaultUser(false, 1000);
  repairedContainer.unlockedCompanions = { legacy: true };
  let repairSignals = 0;
  migrateUser(repairedContainer, 1000, () => { repairSignals += 1; });
  assert.equal(repairSignals, 1);
  assert.deepEqual(repairedContainer.unlockedCompanions, []);
});

test('initialize creates a missing database and Admin account', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const repository = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });

  repository.initialize();

  assert.equal(await readFile(dbFile, 'utf8'), '{}');
  assert.deepEqual(repository.listNames(), ['Admin']);
  assert.equal(repository.getUser('Admin').level, 100);
  assert.equal(repository.getUser('Admin').lastTick, 1000);
  assert.equal(repository.isDirty(), true);
});

test('initialize loads, shallow-migrates, and preserves existing values', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const savedUsers = {
    Alice: {
      level: 12,
      coins: 345,
      inventory: { customSkinState: 'preserved' },
      unknownField: { stays: true },
    },
    Admin: {
      level: 3,
      coins: 777,
      profile: { signature: 'keep me' },
      adminUnknown: 'preserved',
    },
  };
  await writeFile(dbFile, JSON.stringify(savedUsers), 'utf8');
  const repository = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });

  repository.initialize();

  assert.equal(repository.size(), 2);
  assert.equal(repository.getUser('Alice').level, 12);
  assert.equal(repository.getUser('Alice').coins, 345);
  assert.deepEqual(repository.getUser('Alice').inventory, { customSkinState: 'preserved' });
  assert.deepEqual(repository.getUser('Alice').unknownField, { stays: true });
  assert.equal(repository.getUser('Alice').lastTick, 1000);
  assert.equal(repository.getUser('Admin').level, 100);
  assert.equal(repository.getUser('Admin').coins, 777);
  assert.deepEqual(repository.getUser('Admin').profile, { signature: 'keep me' });
  assert.equal(repository.getUser('Admin').adminUnknown, 'preserved');
  assert.equal(repository.isDirty(), true);
});

test('initialize rejects corrupt JSON without overwriting the original file', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const original = '{not valid JSON';
  await writeFile(dbFile, original, 'utf8');
  const repository = createUserRepository({ dbFile, logger: silentLogger });

  assert.throws(() => repository.initialize(), SyntaxError);
  assert.equal(await readFile(dbFile, 'utf8'), original);
  assert.equal(repository.size(), 0);
  assert.equal(repository.isDirty(), false);
});

test('initialize rejects empty existing files without creating or persisting Admin', async (t) => {
  const directory = await createTempDirectory(t);

  for (const [name, original] of [
    ['zero-byte', ''],
    ['whitespace', ' \r\n\t '],
  ]) {
    const dbFile = path.join(directory, `${name}.json`);
    const criticalErrors = [];
    await writeFile(dbFile, original, 'utf8');
    const repository = createUserRepository({
      dbFile,
      logger: {
        log() {},
        error(...args) { criticalErrors.push(args); },
      },
    });

    assert.throws(() => repository.initialize(), SyntaxError, name);
    assert.equal(repository.hasUser('Admin'), false, name);
    assert.equal(repository.size(), 0, name);
    assert.equal(repository.isDirty(), false, name);
    assert.equal(criticalErrors.length, 1, name);
    assert.match(criticalErrors[0][0], /CRITICAL ERROR/, name);

    await repository.flush();
    assert.equal(await readFile(dbFile, 'utf8'), original, name);
    assert.equal(repository.isDirty(), false, name);
  }
});

test('initialize rejects non-object JSON roots without changing the source file', async (t) => {
  const directory = await createTempDirectory(t);

  for (const [name, value] of [
    ['array', []],
    ['null', null],
    ['string', 'users'],
    ['number', 42],
  ]) {
    const dbFile = path.join(directory, `${name}.json`);
    const original = JSON.stringify(value);
    await writeFile(dbFile, original, 'utf8');
    const repository = createUserRepository({ dbFile, logger: silentLogger });

    assert.throws(
      () => repository.initialize(),
      { name: 'TypeError', message: 'Database root must be a non-null, non-array object' },
      name,
    );
    assert.equal(await readFile(dbFile, 'utf8'), original, name);
    assert.equal(repository.size(), 0, name);
    assert.equal(repository.isDirty(), false, name);
  }
});

test('initialize rejects every non-object user record before accepting any cache entries', async (t) => {
  const directory = await createTempDirectory(t);

  for (const [name, value] of [
    ['array', []],
    ['null', null],
    ['string', 'user'],
    ['number', 42],
    ['boolean', true],
  ]) {
    const dbFile = path.join(directory, `${name}-user.json`);
    const original = JSON.stringify({ ValidBeforeIt: { level: 7 }, Alice: value });
    await writeFile(dbFile, original, 'utf8');
    const repository = createUserRepository({ dbFile, logger: silentLogger });

    assert.throws(
      () => repository.initialize(),
      (error) => error instanceof TypeError && /Alice/.test(error.message),
      name,
    );
    assert.equal(repository.size(), 0, name);
    assert.equal(repository.isDirty(), false, name);
    await repository.flush();
    assert.equal(await readFile(dbFile, 'utf8'), original, name);
  }
});

test('initialize rejects malformed mutable user containers without changing the source', async (t) => {
  const directory = await createTempDirectory(t);
  const malformedContainers = [
    ['inventory-array', 'inventory', []],
    ['inventory-string', 'inventory', 'items'],
    ['profile-array', 'profile', []],
    ['prestige-array', 'prestigeUpgrades', []],
    ['achievements-object', 'achievements', { first: true }],
    ['companions-object', 'unlockedCompanions', { fox: true }],
  ];

  for (const [name, field, value] of malformedContainers) {
    const dbFile = path.join(directory, `${name}.json`);
    const original = JSON.stringify({ Alice: { level: 7, [field]: value } });
    await writeFile(dbFile, original, 'utf8');
    const repository = createUserRepository({ dbFile, logger: silentLogger });

    assert.throws(
      () => repository.initialize(),
      (error) => error instanceof TypeError
        && /Alice/.test(error.message)
        && new RegExp(field).test(error.message),
      name,
    );
    assert.equal(repository.size(), 0, name);
    assert.equal(repository.isDirty(), false, name);
    assert.equal(await readFile(dbFile, 'utf8'), original, name);
  }
});

test('initialize still repairs missing and null legacy containers and preserves unknown fields', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'legacy-null-containers.json');
  await writeFile(dbFile, JSON.stringify({
    Alice: {
      inventory: null,
      profile: null,
      achievements: null,
      prestigeUpgrades: null,
      unlockedCompanions: null,
      unknownField: { stays: true },
    },
  }), 'utf8');
  const repository = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });

  repository.initialize();

  const alice = repository.getUser('Alice');
  assert.deepEqual(alice.inventory, createDefaultUser(false, 1000).inventory);
  assert.deepEqual(alice.profile, createDefaultUser(false, 1000).profile);
  assert.deepEqual(alice.achievements, []);
  assert.deepEqual(alice.prestigeUpgrades, {});
  assert.deepEqual(alice.unlockedCompanions, []);
  assert.deepEqual(alice.unknownField, { stays: true });
});

test('ensureUser caches one object and collection accessors expose repository state', async (t) => {
  const directory = await createTempDirectory(t);
  const repository = createUserRepository({
    dbFile: path.join(directory, 'save.json'),
    logger: silentLogger,
    now: () => 1000,
  });
  repository.initialize();

  const alice = repository.ensureUser('Alice');
  const sameAlice = repository.ensureUser('Alice');

  assert.equal(sameAlice, alice);
  assert.equal(repository.getUser('Alice'), alice);
  assert.equal(repository.hasUser('Alice'), true);
  assert.equal(repository.hasUser('Missing'), false);
  assert.deepEqual(repository.listNames(), ['Admin', 'Alice']);
  assert.deepEqual(repository.entries(), [
    ['Admin', repository.getUser('Admin')],
    ['Alice', alice],
  ]);
  assert.equal(repository.size(), 2);
});

test('prototype-like usernames remain ordinary owned and persisted cache entries', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const repository = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });
  repository.initialize();

  const user = repository.ensureUser('__proto__');
  user.coins = 123;
  repository.markDirty();

  assert.equal(repository.hasUser('__proto__'), true);
  assert.equal(repository.getUser('__proto__'), user);
  assert.deepEqual(repository.listNames(), ['Admin', '__proto__']);
  assert.equal(repository.size(), 2);

  await repository.flush();
  const saved = JSON.parse(await readFile(dbFile, 'utf8'));
  assert.equal(Object.hasOwn(saved, '__proto__'), true);
  assert.equal(saved.__proto__.coins, 123);

  const reloaded = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });
  reloaded.initialize();
  assert.equal(reloaded.hasUser('__proto__'), true);
  assert.equal(reloaded.getUser('__proto__').coins, 123);
  assert.equal(reloaded.size(), 2);
});

test('flush persists a newer mutation made while an older snapshot is in flight', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const firstRenameStarted = deferred();
  const releaseFirstRename = deferred();
  let renameCalls = 0;
  let activeRenames = 0;
  let maximumActiveRenames = 0;
  const fsAsync = {
    ...fsPromises,
    async rename(source, destination) {
      renameCalls += 1;
      activeRenames += 1;
      maximumActiveRenames = Math.max(maximumActiveRenames, activeRenames);
      try {
        if (renameCalls === 1) {
          firstRenameStarted.resolve();
          await releaseFirstRename.promise;
        }
        return await fsPromises.rename(source, destination);
      } finally {
        activeRenames -= 1;
      }
    },
  };
  const repository = createUserRepository({
    dbFile,
    fsAsync,
    logger: silentLogger,
    now: () => 1000,
  });
  repository.initialize();
  repository.flushSync();
  const alice = repository.ensureUser('Alice');
  alice.coins = 10;
  repository.markDirty();

  const firstFlush = repository.flush();
  await waitFor(() => renameCalls === 1, 'first atomic rename did not start');
  alice.coins = 20;
  repository.markDirty();
  const secondFlush = repository.flush();
  releaseFirstRename.resolve();

  await Promise.all([firstFlush, secondFlush]);

  assert.equal(renameCalls, 2);
  assert.equal(maximumActiveRenames, 1);
  assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 20);
  assert.equal(repository.isDirty(), false);
});

test('overlapping flush calls share one serialized write for the same generation', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const renameStarted = deferred();
  const releaseRename = deferred();
  let renameCalls = 0;
  const fsAsync = {
    ...fsPromises,
    async rename(source, destination) {
      renameCalls += 1;
      renameStarted.resolve();
      await releaseRename.promise;
      return fsPromises.rename(source, destination);
    },
  };
  const repository = createUserRepository({ dbFile, fsAsync, logger: silentLogger });
  repository.initialize();

  const firstFlush = repository.flush();
  await waitFor(() => renameCalls === 1, 'atomic rename did not start');
  const secondFlush = repository.flush();
  await delay(20);
  assert.equal(renameCalls, 1);
  releaseRename.resolve();

  await Promise.all([firstFlush, secondFlush]);
  assert.equal(renameCalls, 1);
  assert.equal(repository.isDirty(), false);
});

test('flushSync refuses to race an async flush and the async coordinator persists newer data', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const firstRenameStarted = deferred();
  const releaseFirstRename = deferred();
  let renameCalls = 0;
  const fsAsync = {
    ...fsPromises,
    async rename(source, destination) {
      renameCalls += 1;
      if (renameCalls === 1) {
        firstRenameStarted.resolve();
        await releaseFirstRename.promise;
      }
      return fsPromises.rename(source, destination);
    },
  };
  const repository = createUserRepository({
    dbFile,
    fsAsync,
    logger: silentLogger,
    now: () => 1000,
  });
  repository.initialize();
  repository.flushSync();
  assert.equal(repository.isDirty(), false);

  const alice = repository.ensureUser('Alice');
  alice.coins = 10;
  repository.markDirty();
  const asyncFlush = repository.flush();
  await waitFor(() => renameCalls === 1, 'first async rename did not start');
  alice.coins = 20;
  repository.markDirty();

  try {
    assert.throws(
      () => repository.flushSync(),
      {
        name: 'Error',
        message: 'Cannot flush synchronously while an asynchronous flush is in progress',
      },
    );
    assert.equal(repository.isDirty(), true);
  } finally {
    releaseFirstRename.resolve();
    await asyncFlush;
  }

  assert.equal(renameCalls, 2);
  assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 20);
  assert.equal(repository.isDirty(), false);

  alice.coins = 30;
  repository.markDirty();
  repository.flushSync();
  assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 30);
  assert.equal(repository.isDirty(), false);
});

test('flush writes two-space JSON and clears dirty only after successful writes', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const repository = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });
  repository.initialize();
  repository.ensureUser('Alice');
  repository.markDirty();

  await repository.flush();

  const contents = await readFile(dbFile, 'utf8');
  assert.deepEqual(JSON.parse(contents), Object.fromEntries(repository.entries()));
  assert.ok(contents.includes('\n  "Admin": {'));
  assert.equal(repository.isDirty(), false);

  const failingRepository = createUserRepository({
    dbFile: path.join(directory, 'missing-parent', 'save.json'),
    logger: silentLogger,
  });
  failingRepository.markDirty();
  await failingRepository.flush();
  assert.equal(failingRepository.isDirty(), true);
});

test('failed atomic async replacement preserves the original DB and removes its temp file', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const original = JSON.stringify({ Existing: { level: 8, unknown: 'safe' } }, null, 2);
  await writeFile(dbFile, original, 'utf8');
  const fsAsync = {
    ...fsPromises,
    async rename() {
      throw Object.assign(new Error('injected rename failure'), { code: 'EACCES' });
    },
  };
  const repository = createUserRepository({
    dbFile,
    fsAsync,
    logger: silentLogger,
    now: () => 1000,
  });
  repository.initialize();
  repository.ensureUser('Alice');

  await repository.flush();

  assert.equal(await readFile(dbFile, 'utf8'), original);
  assert.equal(repository.isDirty(), true);
  assert.deepEqual(await readdir(directory), ['save.json']);
});

test('flushSync writes pending changes and retains dirty state after failure', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const repository = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });
  repository.initialize();
  repository.ensureUser('Alice');
  repository.markDirty();

  repository.flushSync();

  assert.deepEqual(JSON.parse(await readFile(dbFile, 'utf8')), Object.fromEntries(repository.entries()));
  assert.equal(repository.isDirty(), false);

  const failingRepository = createUserRepository({
    dbFile: path.join(directory, 'missing-parent', 'save.json'),
    logger: silentLogger,
  });
  failingRepository.markDirty();
  failingRepository.flushSync();
  assert.equal(failingRepository.isDirty(), true);
});

test('failed atomic sync replacement preserves the original DB and removes its temp file', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const original = JSON.stringify({ Existing: { level: 8, unknown: 'safe' } }, null, 2);
  await writeFile(dbFile, original, 'utf8');
  const fsSync = Object.create(fs);
  fsSync.renameSync = () => {
    throw Object.assign(new Error('injected rename failure'), { code: 'EACCES' });
  };
  const repository = createUserRepository({
    dbFile,
    fsSync,
    logger: silentLogger,
    now: () => 1000,
  });
  repository.initialize();
  repository.ensureUser('Alice');

  repository.flushSync();

  assert.equal(await readFile(dbFile, 'utf8'), original);
  assert.equal(repository.isDirty(), true);
  assert.deepEqual(await readdir(directory), ['save.json']);
});

test('flushSync persists each marked generation before clearing dirty state', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const repository = createUserRepository({ dbFile, logger: silentLogger, now: () => 1000 });
  repository.initialize();
  const alice = repository.ensureUser('Alice');
  alice.coins = 10;
  repository.markDirty();

  repository.flushSync();
  assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 10);
  assert.equal(repository.isDirty(), false);

  alice.coins = 20;
  repository.markDirty();
  repository.flushSync();
  assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 20);
  assert.equal(repository.isDirty(), false);
});

test('auto-save persists a dirty generation before it is stopped', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const repository = createUserRepository({
    dbFile,
    saveIntervalMs: 10,
    logger: silentLogger,
    now: () => 1000,
  });
  repository.initialize();
  repository.ensureUser('Alice').coins = 321;
  repository.markDirty();
  repository.startAutoSave();

  await waitFor(() => !repository.isDirty(), 'auto-save did not persist the dirty generation');
  repository.stopAutoSave();

  assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 321);
});

test('one auto-save activation writes only one snapshot when mutations continue during the write', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const firstRenameStarted = deferred();
  const firstRenameFinished = deferred();
  const releaseFirstRename = deferred();
  let renameCalls = 0;
  const fsAsync = {
    ...fsPromises,
    async rename(source, destination) {
      renameCalls += 1;
      if (renameCalls === 1) {
        firstRenameStarted.resolve();
        await releaseFirstRename.promise;
      }
      const result = await fsPromises.rename(source, destination);
      if (renameCalls === 1) firstRenameFinished.resolve();
      return result;
    },
  };
  const repository = createUserRepository({ dbFile, fsAsync, logger: silentLogger, now: () => 1000 });
  repository.initialize();
  repository.flushSync();
  const alice = repository.ensureUser('Alice');
  alice.coins = 10;
  repository.markDirty();

  let timerCallback;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  global.setInterval = (callback) => {
    timerCallback = callback;
    return { fakeTimer: true };
  };
  global.clearInterval = () => {};
  try {
    repository.startAutoSave();
    timerCallback();
    await firstRenameStarted.promise;
    alice.coins = 20;
    repository.markDirty();
    alice.coins = 30;
    repository.markDirty();
    releaseFirstRename.resolve();

    await firstRenameFinished.promise;
    await delay(20);
    assert.equal(renameCalls, 1);
    assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 10);
    assert.equal(repository.isDirty(), true);

    timerCallback();
    await waitFor(() => !repository.isDirty(), 'next periodic activation did not make progress');
    assert.equal(renameCalls, 2);
    assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 30);
  } finally {
    releaseFirstRename.resolve();
    repository.stopAutoSave();
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  }
});

test('public flush upgrades an in-flight one-shot auto-save to drain the newest generation', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const firstRenameStarted = deferred();
  const releaseFirstRename = deferred();
  let renameCalls = 0;
  const fsAsync = {
    ...fsPromises,
    async rename(source, destination) {
      renameCalls += 1;
      if (renameCalls === 1) {
        firstRenameStarted.resolve();
        await releaseFirstRename.promise;
      }
      return fsPromises.rename(source, destination);
    },
  };
  const repository = createUserRepository({ dbFile, fsAsync, logger: silentLogger, now: () => 1000 });
  repository.initialize();
  repository.flushSync();
  const alice = repository.ensureUser('Alice');
  alice.coins = 10;
  repository.markDirty();

  let timerCallback;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  global.setInterval = (callback) => {
    timerCallback = callback;
    return { fakeTimer: true };
  };
  global.clearInterval = () => {};
  try {
    repository.startAutoSave();
    timerCallback();
    await firstRenameStarted.promise;
    alice.coins = 20;
    repository.markDirty();

    const shutdownFlush = repository.flush();
    releaseFirstRename.resolve();
    await shutdownFlush;

    assert.equal(renameCalls, 2);
    assert.equal(JSON.parse(await readFile(dbFile, 'utf8')).Alice.coins, 20);
    assert.equal(repository.isDirty(), false);
  } finally {
    releaseFirstRename.resolve();
    repository.stopAutoSave();
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  }
});

test('startAutoSave and stopAutoSave are idempotent and stopping clears the timer', async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const repository = createUserRepository({
    dbFile,
    saveIntervalMs: 20,
    logger: silentLogger,
    now: () => 1000,
  });
  repository.initialize();
  repository.startAutoSave();
  repository.startAutoSave();
  repository.stopAutoSave();
  repository.stopAutoSave();
  repository.ensureUser('Alice');
  repository.markDirty();

  await delay(70);

  assert.equal(repository.isDirty(), true);
  assert.equal(await readFile(dbFile, 'utf8'), '{}');
  repository.flushSync();
});

test('SIGTERM waits for an in-flight save and persists the final generation', {
  skip: process.platform === 'win32'
    ? 'Windows child.kill uses TerminateProcess and cannot exercise Node signal handlers'
    : false,
}, async (t) => {
  const directory = await createTempDirectory(t);
  const dbFile = path.join(directory, 'save.json');
  const preloadFile = path.join(directory, 'delay-rename.cjs');
  const renameMarker = path.join(directory, 'rename-started');
  const releaseMarker = path.join(directory, 'release-rename');
  const port = await getFreePort();
  const projectRoot = path.resolve(__dirname, '..');
  await writeFile(dbFile, '{}', 'utf8');
  await writeFile(preloadFile, `
const fsPromises = require('node:fs/promises');
const originalRename = fsPromises.rename.bind(fsPromises);
const originalSetInterval = global.setInterval;
global.setInterval = (callback, milliseconds, ...args) =>
  originalSetInterval(callback, Math.min(milliseconds, 10), ...args);
fsPromises.rename = async (...args) => {
  await fsPromises.writeFile(process.env.RENAME_MARKER, 'started', 'utf8');
  while (true) {
    try {
      await fsPromises.access(process.env.RELEASE_MARKER);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  return originalRename(...args);
};
`, 'utf8');

  const child = spawn(process.execPath, ['--require', preloadFile, 'server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_FILE: dbFile,
      RENAME_MARKER: renameMarker,
      RELEASE_MARKER: releaseMarker,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const exitPromise = once(child, 'exit');

  try {
    await waitForAsync(async () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        assert.fail(`server exited during startup:\n${output}`);
      }
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        await response.arrayBuffer();
        return response.ok;
      } catch {
        return false;
      }
    }, `server did not start:\n${output}`);
    await waitForAsync(async () => {
      try {
        await fsPromises.access(renameMarker);
        return true;
      } catch {
        return false;
      }
    }, 'background atomic rename did not enter the injected gate');

    const heartbeat = await fetch(`http://127.0.0.1:${port}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Alice' }),
    });
    assert.equal(heartbeat.status, 200);
    await heartbeat.arrayBuffer();

    child.kill('SIGTERM');
    await delay(100);
    assert.equal(child.exitCode, null, `server exited before the in-flight save completed:\n${output}`);

    await writeFile(releaseMarker, 'release', 'utf8');
    const [exitCode, signal] = await exitPromise;
    assert.equal(exitCode, 0, output);
    assert.equal(signal, null, output);

    const saved = JSON.parse(await readFile(dbFile, 'utf8'));
    assert.equal(saved.Alice.level, 1);
    assert.equal(
      (await readdir(directory)).some((name) => name.startsWith('.save.json.')),
      false,
    );
  } finally {
    await writeFile(releaseMarker, 'release', 'utf8').catch(() => {});
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exitPromise.catch(() => {});
  }
});
