const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
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
