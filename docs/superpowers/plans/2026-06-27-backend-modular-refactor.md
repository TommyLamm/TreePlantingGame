# Backend Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic backend with tested repository, service, HTTP, route, and bootstrap modules while preserving every API and save-file contract.

**Architecture:** Keep CommonJS and Express 4. Static definitions shared with the Vite client live in one JSON file; repository code owns persistence, services own mutations, route modules adapt HTTP, and `server.js` only assembles and starts the process.

**Tech Stack:** Node.js built-in test runner, CommonJS, Express 4, JSON persistence, React/Vite compatibility build

---

## File map

| Path | Responsibility |
| --- | --- |
| `shared/game-data.json` | Single source of store, companion, prestige, and daily reward definitions |
| `server/config/gameData.js` | Shared JSON plus server-only achievements, weather, and event rewards |
| `server/data/userRepository.js` | Defaults, migrations, cache ownership, dirty tracking, timed and final persistence |
| `server/http/errors.js` | `HttpError`, async wrapper, and final Express error middleware |
| `server/http/userContext.js` | Username validation and existing-user lookup |
| `server/services/achievementService.js` | Achievement mutation only |
| `server/services/gameStateService.js` | Clock/weather updates, heartbeat state settlement, transient response fields |
| `server/services/progressionService.js` | Event actions, time warp, profile update, prestige mutations |
| `server/services/rewardService.js` | Store, daily reward, companion, shake, and minigame mutations |
| `server/services/socialService.js` | Garden, gifts, user list, leaderboard, and achievement reads |
| `server/routes/*.js` | Existing HTTP paths grouped by responsibility; no gameplay calculations |
| `server/app.js` | Express middleware, route mounting, static hosting, final error middleware |
| `server.js` | Repository/service assembly, listen, server error handling, graceful shutdown |
| `test/helpers/serverHarness.js` | Starts the real server with a temporary `DB_FILE` |
| `test/*.test.js` | Contract, repository, service, and shared-data protection |

### Task 1: Add an isolated API characterization harness

**Files:**
- Modify: `package.json`
- Create: `test/helpers/serverHarness.js`
- Create: `test/server.contract.test.js`

- [ ] **Step 1: Add the root test command**

Change the scripts object to:

```json
"scripts": {
  "start": "node server.js",
  "test": "node --test"
}
```

- [ ] **Step 2: Create the real-process test harness**

`test/helpers/serverHarness.js` must export `startServer(initialData = {})`. It must obtain a free loopback port with `node:net`, create a temporary directory with `mkdtemp`, write `save.json`, spawn `node server.js` with `PORT` and `DB_FILE`, poll `/api/health` for at most five seconds, and return this interface:

```js
{
  baseUrl,
  dbFile,
  request(pathname, options),
  async stop()
}
```

Use this request implementation so JSON encoding and error inspection are identical in every test:

```js
async function request(pathname, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  return { status: response.status, headers: response.headers, body: json };
}
```

`stop()` must call `child.kill()`, await the `exit` event if the process is still running, then remove only the harness-created temporary directory.

- [ ] **Step 3: Capture public and validation contracts**

Create `test/server.contract.test.js` with one server in `before`/`after` hooks and these assertions:

```js
test('public metadata endpoints retain their shapes', async () => {
  const health = await server.request('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');
  assert.equal(typeof health.body.uptime, 'number');
  assert.equal(typeof health.body.users, 'number');

  const db = await server.request('/api/db');
  assert.deepEqual(Object.keys(db.body).sort(), ['userCount', 'users']);
  assert.equal(db.headers.get('cache-control'), 'no-store');

  const weather = await server.request('/api/weather');
  assert.deepEqual(Object.keys(weather.body).sort(), ['changedAt', 'nextChangeAt', 'season', 'type']);
});

test('heartbeat keeps its unique validation messages and creates users', async () => {
  assert.deepEqual(await post('/api/heartbeat', {}), {
    status: 400,
    body: { error: 'Username required' },
  });
  assert.deepEqual(await post('/api/heartbeat', { username: '!' }), {
    status: 400,
    body: { error: 'Invalid username. 2-16 chars, letters/numbers/underscore/Chinese only.' },
  });
  const created = await post('/api/heartbeat', { username: 'Alice' });
  assert.equal(created.status, 200);
  for (const key of ['xp', 'level', 'coins', 'inventory', 'profile', 'weather', 'season', 'dailyRewardAvailable']) {
    assert.ok(Object.hasOwn(created.body, key), key);
  }
});

test('username-protected routes retain the common validation contract', async () => {
  const cases = [
    ['/api/toggle-warp', {}],
    ['/api/action', { action: 'WATER' }],
    ['/api/profile/update', {}],
    ['/api/store/buy', {}],
    ['/api/store/equip', {}],
    ['/api/daily-reward/claim', {}],
    ['/api/companion/buy', {}],
    ['/api/companion/equip', {}],
    ['/api/prestige', {}],
    ['/api/prestige/upgrade', {}],
    ['/api/shake', {}],
    ['/api/minigame/reward', {}],
  ];
  for (const [path, body] of cases) {
    assert.deepEqual(await post(path, body), { status: 400, body: { error: 'Invalid username' } }, path);
  }
});
```

Define `post` locally as:

```js
async function post(pathname, body) {
  const result = await server.request(pathname, { method: 'POST', body });
  return { status: result.status, body: result.body };
}
```

Also assert `GET /api/users`, `GET /api/leaderboard`, `GET /api/garden/missing`, `GET /api/achievements/missing`, self-gift, and missing sender/recipient errors.

- [ ] **Step 4: Run the characterization suite**

Run: `npm test`

Expected: all tests pass against the original monolith; the real `save.json` remains byte-for-byte unchanged.

- [ ] **Step 5: Commit the contract baseline**

```powershell
git add package.json test/helpers/serverHarness.js test/server.contract.test.js
git commit -m "test: characterize backend api contracts"
```

### Task 2: Establish one shared static-data source

**Files:**
- Create: `shared/game-data.json`
- Create: `server/config/gameData.js`
- Modify: `server.js:15-53`
- Modify: `client/src/constants.js:3-72`
- Create: `test/sharedGameData.test.js`

- [ ] **Step 1: Write the shared-data assertions**

Read `shared/game-data.json` with `JSON.parse(readFileSync(...))` and assert the exact IDs and prices/costs:

```js
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
```

- [ ] **Step 2: Run the new test to verify the source is absent**

Run: `node --test test/sharedGameData.test.js`

Expected: FAIL with `ENOENT` for `shared/game-data.json`.

- [ ] **Step 3: Create the shared JSON**

Create this complete file; do not add event rewards, achievements, or weather modifiers:

```json
{
  "storeItems": [
    { "id": "xpBuff", "type": "buff", "price": 500, "icon": "🌟", "nameKey": "itemXpBuff", "descKey": "descXpBuff" },
    { "id": "autoWater", "type": "auto", "price": 1000, "icon": "🤖", "nameKey": "itemAutoWater", "descKey": "descAutoWater" },
    { "id": "cherry", "type": "skin", "price": 2000, "icon": "🌸", "nameKey": "itemCherrySkin", "descKey": "descCherrySkin" },
    { "id": "autumn", "type": "skin", "price": 2500, "icon": "🍂", "nameKey": "itemAutumnSkin", "descKey": "descAutumnSkin" },
    { "id": "snow", "type": "skin", "price": 3000, "icon": "❄️", "nameKey": "itemSnowSkin", "descKey": "descSnowSkin" },
    { "id": "golden", "type": "skin", "price": 5000, "icon": "✨", "nameKey": "itemGoldenSkin", "descKey": "descGoldenSkin" }
  ],
  "companions": [
    { "id": "butterfly", "price": 0, "unlockLevel": 1, "bonus": { "type": "xp", "value": 0.05 }, "icon": "🦋", "nameKey": "companionButterfly", "descKey": "companionButterflyDesc" },
    { "id": "squirrel", "price": 1500, "unlockLevel": 10, "bonus": { "type": "coins", "value": 0.1 }, "icon": "🐿️", "nameKey": "companionSquirrel", "descKey": "companionSquirrelDesc" },
    { "id": "bird", "price": 3000, "unlockLevel": 25, "bonus": { "type": "eventXp", "value": 0.15 }, "icon": "🐦", "nameKey": "companionBird", "descKey": "companionBirdDesc" },
    { "id": "owl", "price": 5000, "unlockLevel": 50, "bonus": { "type": "coins", "value": 0.2 }, "icon": "🦉", "nameKey": "companionOwl", "descKey": "companionOwlDesc" },
    { "id": "deer", "price": 8000, "unlockLevel": 75, "bonus": { "type": "allBonus", "value": 0.1 }, "icon": "🦌", "nameKey": "companionDeer", "descKey": "companionDeerDesc" },
    { "id": "phoenix", "price": 15000, "unlockLevel": 0, "bonus": { "type": "allBonus", "value": 0.2 }, "icon": "🔥", "nameKey": "companionPhoenix", "descKey": "companionPhoenixDesc", "prestigeOnly": true }
  ],
  "prestigeUpgrades": [
    { "id": "xpBoost", "maxLevel": 5, "costPerLevel": 1, "effectPerLevel": 0.1, "icon": "⚡", "nameKey": "prestigeXpBoost", "descKey": "prestigeXpBoostDesc" },
    { "id": "coinBoost", "maxLevel": 5, "costPerLevel": 1, "effectPerLevel": 0.15, "icon": "💰", "nameKey": "prestigeCoinBoost", "descKey": "prestigeCoinBoostDesc" },
    { "id": "eventFreq", "maxLevel": 3, "costPerLevel": 2, "effectPerLevel": 60000, "icon": "⏰", "nameKey": "prestigeEventFreq", "descKey": "prestigeEventFreqDesc" },
    { "id": "startLevel", "maxLevel": 5, "costPerLevel": 3, "effectPerLevel": 2, "icon": "🚀", "nameKey": "prestigeStartLevel", "descKey": "prestigeStartLevelDesc" },
    { "id": "comboBonus", "maxLevel": 3, "costPerLevel": 2, "effectPerLevel": 0.5, "icon": "🔥", "nameKey": "prestigeComboBonus", "descKey": "prestigeComboBonusDesc" }
  ],
  "dailyRewards": [
    { "day": 1, "coins": 100, "xp": 0, "special": null, "icon": "🪙" },
    { "day": 2, "coins": 150, "xp": 5, "special": null, "icon": "🪙" },
    { "day": 3, "coins": 200, "xp": 10, "special": null, "icon": "💫" },
    { "day": 4, "coins": 250, "xp": 0, "special": null, "icon": "🪙" },
    { "day": 5, "coins": 300, "xp": 15, "special": "luckyBuff", "icon": "🍀" },
    { "day": 6, "coins": 400, "xp": 0, "special": null, "icon": "🪙" },
    { "day": 7, "coins": 500, "xp": 25, "special": "rareItem", "icon": "🎁" }
  ]
}
```

- [ ] **Step 4: Add stable server and client adapters**

In `server/config/gameData.js`:

```js
const shared = require('../../shared/game-data.json');

module.exports = {
  STORE_ITEMS: shared.storeItems,
  COMPANIONS: shared.companions,
  PRESTIGE_UPGRADES: shared.prestigeUpgrades,
  DAILY_REWARDS: shared.dailyRewards,
};
```

In `client/src/constants.js` import the JSON and retain the current named exports:

```js
import gameData from '../../shared/game-data.json';

export const STORE_ITEMS = gameData.storeItems;
export const DAILY_REWARDS = gameData.dailyRewards;
export const COMPANIONS = gameData.companions;
export const PRESTIGE_UPGRADES = gameData.prestigeUpgrades;
```

Replace the four server literals with a destructuring `require('./server/config/gameData')`. Leave event rewards, weather, achievements, milestones, and all behavior-specific data where they are.

- [ ] **Step 5: Verify both consumers**

Run: `npm test`

Run: `npm run build --prefix client`

Expected: tests pass and Vite produces `client/dist` without import errors.

- [ ] **Step 6: Commit the shared source**

```powershell
git add shared/game-data.json server/config/gameData.js server.js client/src/constants.js test/sharedGameData.test.js
git commit -m "refactor: share static game definitions"
```

### Task 3: Extract user persistence and migrations

**Files:**
- Create: `server/data/userRepository.js`
- Create: `test/userRepository.test.js`
- Modify: `server.js:5-8,135-312`

- [ ] **Step 1: Write repository unit tests**

Test these exported names: `createDefaultUser`, `migrateUser`, and `createUserRepository`. Use a temporary file and assert:

```js
const regular = createDefaultUser(false, 1000);
assert.equal(regular.level, 1);
assert.equal(regular.coins, 0);
assert.equal(regular.lastTick, 1000);

const admin = createDefaultUser(true, 1000);
assert.equal(admin.level, 100);
assert.equal(admin.coins, 10000);

const legacy = { level: 12, inventory: null, profile: null };
migrateUser(legacy, 1000);
assert.equal(legacy.level, 12);
assert.deepEqual(legacy.inventory.unlockedSkins, ['default']);
assert.deepEqual(legacy.prestigeUpgrades, {});
```

For `createUserRepository`, assert `initialize()` creates/normalizes Admin, `ensureUser('Alice')` creates one user, `markDirty()` followed by `flush()` writes parseable JSON, `listNames()` returns cache keys, and `stopAutoSave()` clears the timer.

- [ ] **Step 2: Run repository tests to verify the module is absent**

Run: `node --test test/userRepository.test.js`

Expected: FAIL with `MODULE_NOT_FOUND` for `server/data/userRepository.js`.

- [ ] **Step 3: Implement the repository interface**

Export exactly:

```js
module.exports = {
  createDefaultUser,
  migrateUser,
  createUserRepository,
};
```

`createUserRepository({ dbFile, saveIntervalMs = 5000, logger = console, now = Date.now })` must close over `cache`, `dirty`, and `saveTimer`, and return:

```js
{
  initialize,
  getUser: username => cache[username],
  hasUser: username => Object.hasOwn(cache, username),
  ensureUser,
  listNames: () => Object.keys(cache),
  entries: () => Object.entries(cache),
  size: () => Object.keys(cache).length,
  markDirty: () => { dirty = true; },
  isDirty: () => dirty,
  startAutoSave,
  stopAutoSave,
  flush,
  flushSync,
}
```

Move the full current default-user object without renaming or removing fields. Preserve shallow migration semantics, Admin level/coin defaults, two-space JSON formatting, five-second default save interval, and the existing initialization/error log text. `initialize()` performs startup migration and Admin enforcement. `flush()` writes only when dirty and clears dirty only after a successful write.

- [ ] **Step 4: Replace direct cache/persistence access in the monolith**

Create one repository at startup:

```js
const repository = createUserRepository({ dbFile: DB_FILE });
repository.initialize();
repository.startAutoSave();
```

Mechanically map `dbCache[name]` to `repository.getUser(name)`, `Object.keys(dbCache)` to `repository.listNames()`, `Object.entries(dbCache)` to `repository.entries()`, and every `isDirty = true` to `repository.markDirty()`. Heartbeat creation uses `repository.ensureUser(username, username === 'Admin')`. Shutdown calls `repository.stopAutoSave()` and `repository.flushSync()`.

- [ ] **Step 5: Verify repository and API contracts**

Run: `npm test`

Expected: repository tests and all characterization tests pass.

- [ ] **Step 6: Commit persistence extraction**

```powershell
git add server/data/userRepository.js server.js test/userRepository.test.js
git commit -m "refactor: isolate user persistence"
```

### Task 4: Centralize HTTP errors and user lookup

**Files:**
- Create: `server/http/errors.js`
- Create: `server/http/userContext.js`
- Create: `test/httpHelpers.test.js`

- [ ] **Step 1: Write helper tests**

Assert these contracts:

```js
assert.equal(isValidUsername('Alice_中文'), true);
assert.equal(isValidUsername('!'), false);
assert.throws(() => requireValidUsername(undefined),
  error => error.status === 400 && error.message === 'Invalid username');
assert.throws(() => requireExistingUser({ getUser: () => undefined }, 'Alice'),
  error => error.status === 404 && error.message === 'User not found');
```

Also test `errorMiddleware(new HttpError(409, 'Conflict'), req, res, next)` emits status 409/body `{ error: 'Conflict' }`, while a normal `Error` emits status 500/body `{ error: 'Server Error' }`.

- [ ] **Step 2: Run helper tests to verify failure**

Run: `node --test test/httpHelpers.test.js`

Expected: FAIL because both helper modules are absent.

- [ ] **Step 3: Implement the helpers**

`server/http/errors.js`:

```js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function errorMiddleware(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  return res.status(500).json({ error: 'Server Error' });
}

module.exports = { HttpError, asyncHandler, errorMiddleware };
```

`server/http/userContext.js`:

```js
const { HttpError } = require('./errors');
const USERNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fff]{2,16}$/;

const isValidUsername = name => typeof name === 'string' && USERNAME_REGEX.test(name);

function requireValidUsername(username, message = 'Invalid username') {
  if (!isValidUsername(username)) throw new HttpError(400, message);
  return username;
}

function requireExistingUser(repository, username, message = 'User not found') {
  const user = repository.getUser(username);
  if (!user) throw new HttpError(404, message);
  return user;
}

module.exports = { isValidUsername, requireValidUsername, requireExistingUser };
```

- [ ] **Step 4: Verify and commit**

Run: `node --test test/httpHelpers.test.js`

Expected: all helper tests pass.

```powershell
git add server/http test/httpHelpers.test.js
git commit -m "refactor: centralize http errors and user lookup"
```

### Task 5: Extract achievements and state settlement

**Files:**
- Expand: `server/config/gameData.js`
- Create: `server/services/achievementService.js`
- Create: `server/services/gameStateService.js`
- Create: `test/gameStateService.test.js`
- Modify: `server.js:55-127,201-237,314-518`

- [ ] **Step 1: Write deterministic service tests**

Create a repository spy whose `markDirty` increments a counter. Instantiate the service with injected `now` and `random` functions. Assert:

```js
const user = createDefaultUser(false, 1_000_000);
const response = service.heartbeat(user);
assert.equal(response.weather, 'sunny');
assert.equal(typeof response.season, 'string');
assert.equal(response.dailyRewardAvailable, true);
assert.equal(user.lastTick, 1_000_000);
```

Advance `now` by one hour and assert XP/coins increase according to the unchanged multipliers. Set `interactionCount = 1` and assert `checkAchievements` adds `first_event` once. Set a transient `justLeveledUp` flag and assert the returned heartbeat contains it while the stored user has it cleared.

- [ ] **Step 2: Run the service test to verify the modules are absent**

Run: `node --test test/gameStateService.test.js`

Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Complete server-only configuration**

Move `EVENT_REWARDS`, `WEATHER_TYPES`, `WEATHER_MODIFIERS`, and `ACHIEVEMENTS` unchanged into `server/config/gameData.js`. Keep achievement condition functions executable in this CommonJS file. Export all eight definitions from one object.

- [ ] **Step 4: Implement service factories**

`achievementService.js` exports:

```js
function createAchievementService({ achievements }) {
  function checkAchievements(user) {
    if (!user.achievements) user.achievements = [];
    const newlyUnlocked = achievements
      .filter(item => !user.achievements.includes(item.id) && item.condition(user))
      .map(item => item.id);
    if (newlyUnlocked.length === 0) return false;
    user.achievements.push(...newlyUnlocked);
    user.newAchievements = newlyUnlocked;
    return true;
  }
  return { checkAchievements };
}

module.exports = { createAchievementService };
```

`gameStateService.js` exports `createGameStateService({ repository, achievementService, now = Date.now, random = Math.random, logger = console })`. Move `getCompanionBonuses`, `getPrestigeBonuses`, daily-login logic, season logic, weather state/update, and `updateUserState` without changing formulas or transient fields. Return:

```js
{
  heartbeat,
  updateUserState,
  getCompanionBonuses,
  getPrestigeBonuses,
  getWeather: () => ({ ...globalWeather, season: getSeason() }),
  getSeason,
  getTodayStr,
  toGameResponse,
}
```

`toGameResponse(user, { dailyReward = false } = {})` adds weather/season and conditionally `dailyRewardAvailable`; `heartbeat` calls `updateUserState`, snapshots the response, then clears the same heartbeat transient flags as today and marks dirty when persistent state changed.

- [ ] **Step 5: Adapt the monolith to call the services**

Construct both service factories after repository initialization. Replace the `/api/weather` body with `gameStateService.getWeather()`, heartbeat state/response logic with `gameStateService.heartbeat(user)`, and all remaining calls to the moved helpers with service method calls.

- [ ] **Step 6: Verify and commit**

Run: `npm test`

Expected: deterministic service tests and API contracts pass.

```powershell
git add server/config/gameData.js server/services/achievementService.js server/services/gameStateService.js server.js test/gameStateService.test.js
git commit -m "refactor: extract game state services"
```

### Task 6: Extract gameplay mutation services

**Files:**
- Create: `server/services/progressionService.js`
- Create: `server/services/rewardService.js`
- Create: `server/services/socialService.js`
- Create: `test/gameServices.test.js`
- Modify: `server.js:593-1119`

- [ ] **Step 1: Write mutation contract tests**

Use fixed `now`/`random`, real default users, and a repository spy. Assert the following exact outcomes and errors:

```js
assert.equal(progression.toggleWarp(user).isDemoMode, true);
assert.throws(() => progression.prestige({ ...user, level: 49 }),
  error => error.status === 400 && error.message === 'Must be at least level 50 to prestige');
assert.throws(() => rewards.buyItem(user, 'missing', 'skin'),
  error => error.status === 400 && error.message === 'Item not found');
assert.throws(() => rewards.claimDailyReward({ ...user, dailyRewardClaimed: true }),
  error => error.status === 400 && error.message === 'Already claimed today');
assert.throws(() => social.sendGift('Alice', 'Alice'),
  error => error.status === 400 && error.message === 'Cannot gift yourself');
```

Also cover a successful store buy, companion buy/equip, prestige upgrade, shake cooldown, capped minigame reward, garden response shape, 50-coin gift, leaderboard ordering by generation/level/XP, and Admin exclusion.

- [ ] **Step 2: Run tests to verify the services are absent**

Run: `node --test test/gameServices.test.js`

Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the exact service interfaces**

Export one factory per file:

```js
createProgressionService({ repository, gameStateService, achievementService, now, random })
// methods: toggleWarp, resolveAction, updateProfile, prestige, upgradePrestige

createRewardService({ repository, gameStateService, achievementService, now, random })
// methods: buyItem, equipItem, claimDailyReward, buyCompanion,
//          equipCompanion, shakeTree, claimMinigameReward

createSocialService({ repository, gameStateService })
// methods: getGarden, sendGift, listUsers, getLeaderboard, getAchievements
```

Move each corresponding route's calculation into the named method. Methods accept domain values, never `req`/`res`, throw `HttpError` using the exact existing messages, call `gameStateService.updateUserState` at the same point as the current route, and call `repository.markDirty()` at the same successful mutation points. Preserve ignored `gameType`, ignored client store price, reward caps, sorting, field rounding, and all response-only fields.

- [ ] **Step 4: Make the monolith routes thin adapters**

Each route retains username validation and lookup but delegates all gameplay work. The target route shape is:

```js
app.post('/api/store/buy', (req, res, next) => {
  try {
    const username = requireValidUsername(req.body.username);
    const user = requireExistingUser(repository, username);
    res.json(rewardService.buyItem(user, req.body.itemId, req.body.type));
  } catch (error) {
    next(error);
  }
});
```

Add `errorMiddleware` after all routes so exceptions preserve known messages and unexpected errors preserve `{ error: 'Server Error' }`.

- [ ] **Step 5: Verify and commit**

Run: `npm test`

Expected: all mutation and HTTP contract tests pass.

```powershell
git add server/services server.js test/gameServices.test.js
git commit -m "refactor: isolate gameplay services"
```

### Task 7: Split and mount route groups

**Files:**
- Create: `server/routes/metaRoutes.js`
- Create: `server/routes/sessionRoutes.js`
- Create: `server/routes/progressionRoutes.js`
- Create: `server/routes/storeRoutes.js`
- Create: `server/routes/socialRoutes.js`
- Create: `server/app.js`
- Modify: `server.js`

- [ ] **Step 1: Add a route-manifest contract**

Extend `test/server.contract.test.js` with a table that sends the existing method/path pair for every endpoint and asserts none returns 404:

```js
const routes = [
  ['GET', '/api/health'], ['GET', '/api/db'], ['GET', '/api/weather'],
  ['POST', '/api/heartbeat'], ['POST', '/api/toggle-warp'], ['POST', '/api/action'],
  ['POST', '/api/profile/update'], ['POST', '/api/store/buy'], ['POST', '/api/store/equip'],
  ['POST', '/api/daily-reward/claim'], ['POST', '/api/companion/buy'], ['POST', '/api/companion/equip'],
  ['POST', '/api/prestige'], ['POST', '/api/prestige/upgrade'], ['POST', '/api/shake'],
  ['GET', '/api/garden/missing'], ['POST', '/api/gift'], ['POST', '/api/minigame/reward'],
  ['GET', '/api/users'], ['GET', '/api/leaderboard'], ['GET', '/api/achievements/missing'],
];
for (const [method, path] of routes) {
  const result = await server.request(path, { method, body: method === 'POST' ? {} : undefined });
  assert.notEqual(result.status, 404, `${method} ${path}`);
}
```

- [ ] **Step 2: Run the manifest against the monolith**

Run: `node --test test/server.contract.test.js`

Expected: pass before any route moves.

- [ ] **Step 3: Create route factories and assign endpoints**

Every route file exports `createXRoutes(dependencies)` and returns an Express router. Use this exact grouping:

```text
meta:        health, db, weather
session:     heartbeat, toggle-warp, profile/update
progression: action, prestige, prestige/upgrade
store:       store/buy, store/equip, daily-reward/claim,
             companion/buy, companion/equip, shake, minigame/reward
social:      garden/:username, gift, users, leaderboard, achievements
```

Use `asyncHandler` for every adapter and `requireValidUsername`/`requireExistingUser` for identity. Preserve heartbeat's two distinct validation messages by checking missing input first:

```js
if (!username) throw new HttpError(400, 'Username required');
requireValidUsername(username,
  'Invalid username. 2-16 chars, letters/numbers/underscore/Chinese only.');
```

- [ ] **Step 4: Implement the Express composition root**

`server/app.js` exports `createApp({ repository, gameStateService, progressionService, rewardService, socialService, clientDistPath })` and contains:

```js
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(clientDistPath));
app.use('/api', createMetaRoutes(dependencies));
app.use('/api', createSessionRoutes(dependencies));
app.use('/api', createProgressionRoutes(dependencies));
app.use('/api', createStoreRoutes(dependencies));
app.use('/api', createSocialRoutes(dependencies));
app.use(errorMiddleware);
return app;
```

Route-local paths omit `/api`; the mount point restores the unchanged public URL.

- [ ] **Step 5: Verify and commit**

Run: `npm test`

Run: `node --check server/app.js`

Expected: the full manifest and response contracts pass.

```powershell
git add server/routes server/app.js server.js test/server.contract.test.js
git commit -m "refactor: split backend route modules"
```

### Task 8: Reduce `server.js` to lifecycle bootstrap

**Files:**
- Modify: `server.js`
- Create: `test/server.lifecycle.test.js`

- [ ] **Step 1: Add graceful lifecycle coverage**

Start the server through the existing harness, create `Alice` with heartbeat, stop the process, parse its temporary database, and assert both `Admin` and `Alice` were flushed. Add a second child on a reserved port and assert the process attempting the same port exits non-zero and writes `Port <port> is already in use.` to stderr.

- [ ] **Step 2: Run lifecycle coverage before final cleanup**

Run: `node --test test/server.lifecycle.test.js`

Expected: pass with the current lifecycle behavior.

- [ ] **Step 3: Leave only assembly and process lifecycle in `server.js`**

The final file must follow this shape:

```js
const path = require('path');
const { createApp } = require('./server/app');
const { createUserRepository } = require('./server/data/userRepository');
// service/config imports

const PORT = process.env.PORT || 7777;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'save.json');

const repository = createUserRepository({ dbFile: DB_FILE });
repository.initialize();
repository.startAutoSave();

// construct achievement, state, progression, reward, and social services
const app = createApp({
  repository,
  gameStateService,
  progressionService,
  rewardService,
  socialService,
  clientDistPath: path.join(__dirname, 'client/dist'),
});

const server = app.listen(PORT, () => {
  console.log(`\n🌱 Zen Arboretum Server running on http://localhost:${PORT}`);
});
```

Retain the current `EADDRINUSE` wording. A shared async shutdown handler must stop autosave, call `flushSync()`, and exit zero for both `SIGINT` and `SIGTERM`.

- [ ] **Step 4: Run complete backend verification**

Run: `npm test`

Run: `Get-ChildItem server -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }`

Run: `node --check server.js`

Run: `npm run build --prefix client`

Expected: every command exits 0.

- [ ] **Step 5: Check structural constraints**

Run:

```powershell
(Get-Content server.js).Count
Select-String -Path server\routes\*.js -Pattern 'writeFile|markDirty'
Select-String -Path server\services\*.js -Pattern '\breq\b|\bres\b|express'
Select-String -Path server.js,client\src\constants.js -Pattern "id: 'xpBuff'|id: 'butterfly'"
git diff --check
```

Expected: `server.js` is under 120 lines; the three searches produce no matches; `git diff --check` is clean.

- [ ] **Step 6: Commit final backend composition**

```powershell
git add server.js server test/server.lifecycle.test.js
git commit -m "refactor: reduce server entrypoint to bootstrap"
```

### Task 9: Backend compatibility review checkpoint

**Files:**
- Review only: all files changed by Tasks 1-8

- [ ] **Step 1: Inspect the complete backend diff**

Run: `git diff HEAD~8 --stat`

Run: `git diff HEAD~8 -- server.js server shared test package.json client/src/constants.js`

Confirm there are no changes to endpoint paths, error strings, status decisions, game formulas, `PORT`, `DB_FILE`, JSON indentation, default-user field names, or `client/dist` hosting.

- [ ] **Step 2: Run final evidence commands**

Run: `npm test`

Run: `npm run build --prefix client`

Run: `git status --short`

Expected: tests and build pass; status is clean after committed implementation.
