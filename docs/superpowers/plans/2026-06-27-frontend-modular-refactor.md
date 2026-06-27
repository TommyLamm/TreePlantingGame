# Frontend Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce frontend request and UI orchestration redundancy, leaving `App.jsx` as a composition component with unchanged rendering and user-visible behavior.

**Architecture:** Keep React 18, plain JavaScript, and current CSS/components. Pure state moves first under Node tests, API boilerplate moves behind small request helpers, then hooks isolate session/actions/modals and four presentational components receive props without calling APIs.

**Tech Stack:** React 18 hooks, Vite 5, Node.js built-in test runner, ES modules

---

## Dependency

Execute this plan after `2026-06-27-backend-modular-refactor.md`; it consumes `shared/game-data.json` and the unchanged API contracts established there.

## File map

| Path | Responsibility |
| --- | --- |
| `client/src/state/gameReducer.js` | Initial game state and pure server-sync transitions |
| `client/src/hooks/useGameSession.js` | User persistence, initial users fetch, heartbeat polling, visibility recovery |
| `client/src/hooks/useGameActions.js` | API-backed user actions, audio, bursts, and shake animation |
| `client/src/hooks/useGameModals.js` | Modal visibility and selected leaderboard/garden/error data |
| `client/src/components/game/GameHeader.jsx` | Weather/status/menu HUD |
| `client/src/components/game/GameStage.jsx` | Effects, tree, companion, and shake click surface |
| `client/src/components/game/ActionPanel.jsx` | Level progress and event action buttons |
| `client/src/components/game/GameModals.jsx` | Existing modal composition only |
| `client/src/utils/api.js` | Shared JSON request helpers and unchanged public API methods |
| `client/src/App.jsx` | Translation/theme derivation, hook wiring, and page composition |

### Task 1: Extract and characterize the reducer

**Files:**
- Modify: `client/package.json`
- Create: `client/src/state/gameReducer.js`
- Create: `client/test/gameReducer.test.js`
- Modify: `client/src/App.jsx:29-120`

- [ ] **Step 1: Add the client test command**

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "node --test"
}
```

- [ ] **Step 2: Write pure reducer tests**

Import `initialGameState` and `gameReducer`. Assert `SYNC_SERVER` coerces XP/level/coins to numbers, maps every existing server field, and supplies the current fallbacks. Also assert:

```js
assert.equal(gameReducer(initialGameState, { type: 'SET_DEMO', value: true }).isDemoMode, true);
assert.equal(gameReducer(initialGameState, { type: 'SET_COINS', value: 42 }).coins, 42);
assert.deepEqual(gameReducer({ ...initialGameState, level: 99 }, { type: 'RESET' }), initialGameState);
assert.strictEqual(gameReducer(initialGameState, { type: 'UNKNOWN' }), initialGameState);
```

For `SYNC_SERVER`, include all fields currently assigned on `App.jsx:68-104` in one fixture so omissions fail explicitly.

- [ ] **Step 3: Run the test to verify the module is absent**

Run: `npm test --prefix client`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `state/gameReducer.js`.

- [ ] **Step 4: Move the reducer without behavior changes**

Export this complete state object and reducer:

```js
export const initialGameState = {
  xp: 0,
  level: 1,
  coins: 0,
  inventory: null,
  profileData: null,
  joinDate: null,
  playTimeMs: 0,
  interactions: 0,
  achievements: [],
  activeEvent: null,
  isDemoMode: false,
  weather: 'sunny',
  season: 'spring',
  combo: 0,
  maxCombo: 0,
  companion: null,
  unlockedCompanions: [],
  generation: 0,
  prestigePoints: 0,
  prestigeUpgrades: {},
  loginStreak: 0,
  maxLoginStreak: 0,
  dailyRewardClaimed: false,
  dailyRewardAvailable: false,
  totalXpEarned: 0,
  totalCoinsEarned: 0,
  totalEventsResolved: 0,
  lastOfflineXp: 0,
  lastOfflineCoins: 0,
  goldenHourUntil: 0,
  minigameCount: 0,
  minigameDate: null,
};

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SYNC_SERVER':
      return {
        ...state,
        xp: Number(action.data.xp),
        level: Number(action.data.level),
        coins: Number(action.data.coins),
        inventory: action.data.inventory,
        joinDate: action.data.joinDate,
        playTimeMs: action.data.playTime,
        interactions: action.data.interactionCount,
        achievements: action.data.achievements || [],
        profileData: action.data.profile,
        activeEvent: action.data.activeEvent,
        isDemoMode: action.data.isDemoMode,
        weather: action.data.weather || 'sunny',
        season: action.data.season || 'spring',
        combo: action.data.combo || 0,
        maxCombo: action.data.maxCombo || 0,
        companion: action.data.companion || null,
        unlockedCompanions: action.data.unlockedCompanions || [],
        generation: action.data.generation || 0,
        prestigePoints: action.data.prestigePoints || 0,
        prestigeUpgrades: action.data.prestigeUpgrades || {},
        loginStreak: action.data.loginStreak || 0,
        maxLoginStreak: action.data.maxLoginStreak || 0,
        dailyRewardClaimed: action.data.dailyRewardClaimed || false,
        dailyRewardAvailable: action.data.dailyRewardAvailable || false,
        totalXpEarned: action.data.totalXpEarned || 0,
        totalCoinsEarned: action.data.totalCoinsEarned || 0,
        totalEventsResolved: action.data.totalEventsResolved || 0,
        lastOfflineXp: action.data.lastOfflineXp || 0,
        lastOfflineCoins: action.data.lastOfflineCoins || 0,
        goldenHourUntil: action.data.goldenHourUntil || 0,
        minigameCount: action.data.minigameCount || 0,
        minigameDate: action.data.minigameDate || null,
      };
    case 'SET_DEMO': return { ...state, isDemoMode: action.value };
    case 'SET_COINS': return { ...state, coins: action.value };
    case 'SET_INVENTORY': return { ...state, inventory: action.value };
    case 'SET_PROFILE': return { ...state, profileData: action.value };
    case 'SET_EVENT': return { ...state, activeEvent: action.value };
    case 'RESET': return { ...initialGameState };
    default: return state;
  }
}
```

Import both names into `App.jsx` and remove the local definitions.

- [ ] **Step 5: Verify and commit**

Run: `npm test --prefix client`

Run: `npm run build --prefix client`

Expected: reducer tests and Vite build pass.

```powershell
git add client/package.json client/src/state/gameReducer.js client/test/gameReducer.test.js client/src/App.jsx
git commit -m "refactor: extract frontend game reducer"
```

### Task 2: Remove repeated API request construction

**Files:**
- Modify: `client/src/utils/api.js`
- Create: `client/test/api.test.js`

- [ ] **Step 1: Write request-helper tests**

Stub `globalThis.fetch`, call representative GET and POST public methods, and assert exact arguments:

```js
await api.getUsers();
assert.equal(calls[0][0], '/api/users');
assert.equal(calls[0][1].method, 'GET');

await api.sendAction('Alice', 'WATER');
assert.equal(calls[1][0], '/api/action');
assert.equal(calls[1][1].method, 'POST');
assert.equal(calls[1][1].body, JSON.stringify({ username: 'Alice', action: 'WATER' }));
```

Test a JSON error response produces `new Error(serverMessage)`, invalid error JSON produces `new Error('Request failed')`, and usernames in `getAchievements`/`visitGarden` are URL encoded. Restore the original fetch in `afterEach`.

- [ ] **Step 2: Run tests against the existing client**

Run: `npm test --prefix client`

Expected: GET expectation initially fails because the current helper leaves `method` undefined; this demonstrates the new helper boundary before implementation.

- [ ] **Step 3: Implement common GET and POST helpers**

Use this complete core:

```js
const API_BASE = '';

export async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const get = path => request(path, { method: 'GET' });
export const post = (path, body) => request(path, {
  method: 'POST',
  body: JSON.stringify(body),
});
```

Rewrite every public method as a one-line `get` or `post` call while preserving every method name, argument order, path, request-body key, and encoding. For example:

```js
heartbeat: username => post('/api/heartbeat', { username }),
sendAction: (username, action) => post('/api/action', { username, action }),
visitGarden: username => get(`/api/garden/${encodeURIComponent(username)}`),
sendGift: (fromUsername, toUsername) => post('/api/gift', { fromUsername, toUsername }),
```

- [ ] **Step 4: Verify every public method remains present**

Add this assertion:

```js
assert.deepEqual(Object.keys(api), [
  'getUsers', 'heartbeat', 'toggleWarp', 'sendAction', 'updateProfile',
  'buyItem', 'equipItem', 'getLeaderboard', 'getAchievements', 'health',
  'getWeather', 'claimDailyReward', 'buyCompanion', 'equipCompanion',
  'prestige', 'prestigeUpgrade', 'shakeTree', 'visitGarden', 'sendGift',
  'claimMinigameReward',
]);
```

Run: `npm test --prefix client`

Run: `npm run build --prefix client`

Expected: all pass.

- [ ] **Step 5: Commit API deduplication**

```powershell
git add client/src/utils/api.js client/test/api.test.js
git commit -m "refactor: deduplicate frontend api requests"
```

### Task 3: Consolidate modal state

**Files:**
- Create: `client/src/hooks/useGameModals.js`
- Modify: `client/src/App.jsx:140-158,322-338,539-681`

- [ ] **Step 1: Implement one modal hook**

Use one visibility object and keep selected data separate:

```js
const initialVisibility = {
  collection: false, store: false, profile: false, leaderboard: false,
  dailyReward: false, offlineEarnings: false, prestige: false, stats: false,
  miniGames: false, companions: false, gardenVisit: false,
};

export function useGameModals() {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [gardenVisitData, setGardenVisitData] = useState(null);
  const [giftError, setGiftError] = useState(null);

  const openModal = useCallback(name =>
    setVisibility(current => ({ ...current, [name]: true })), []);
  const closeModal = useCallback(name =>
    setVisibility(current => ({ ...current, [name]: false })), []);
  const resetModals = useCallback(() => setVisibility(initialVisibility), []);

  return {
    visibility, openModal, closeModal, resetModals,
    leaderboardData, setLeaderboardData,
    gardenVisitData, setGardenVisitData,
    giftError, setGiftError,
  };
}
```

- [ ] **Step 2: Replace boolean setters mechanically**

Map `setShowStore(true)` to `openModal('store')`, `setShowStore(false)` to `closeModal('store')`, and the other ten names to their `initialVisibility` keys. Logout calls `resetModals()`. Do not change audio calls, opening order, or the offline-earnings-to-daily-reward 300 ms delay.

- [ ] **Step 3: Verify and commit**

Run: `npm run build --prefix client`

Expected: Vite build passes.

```powershell
git add client/src/hooks/useGameModals.js client/src/App.jsx
git commit -m "refactor: consolidate game modal state"
```

### Task 4: Extract session polling and identity lifecycle

**Files:**
- Create: `client/src/hooks/useGameSession.js`
- Modify: `client/src/App.jsx:126-131,158,180-261,306-338`

- [ ] **Step 1: Define the hook contract**

Implement:

```js
export function useGameSession({
  dispatch,
  t,
  addLog,
  enqueueAchievements,
  onFirstOfflineEarnings,
  onFirstDailyReward,
  resetUi,
})
```

Return:

```js
{
  currentUser,
  serverStatus,
  existingUsers,
  isLoading,
  handleLogin,
  handleLogout,
}
```

Initialize `currentUser` from `zenUser`; fetch users once; poll immediately and every five seconds while visible/every thirty seconds while hidden; attach/remove `visibilitychange`; dispatch `SYNC_SERVER`; preserve level-up, achievement, storm, golden-hour, offline-earnings, and daily-reward side effects. Store first-load state in a ref so polling does not recreate intervals when it changes.

- [ ] **Step 2: Preserve exact login/logout behavior**

`handleLogin(name)` resumes suspended audio, writes `zenUser`, starts loading, resets the first-load ref, and plays click. `handleLogout()` removes `zenUser`, clears user/list state, dispatches `RESET`, calls `resetUi()`, resets first-load, plays click, then refreshes users while swallowing refresh errors.

- [ ] **Step 3: Replace the corresponding `App.jsx` effects and state**

Keep the cross-cutting `logs` and `achievementQueue` state in App so both session notifications and action notifications have one owner. Define and pass these stable callbacks:

```js
const addLog = useCallback(message => {
  setLogs(current => [message, ...current].slice(0, 2));
}, []);

const enqueueAchievements = useCallback(ids => {
  const definitions = ids
    .map(id => ACHIEVEMENT_DEFS.find(item => item.id === id))
    .filter(Boolean);
  setAchievementQueue(current => [...current, ...definitions]);
}, []);
```

The session hook must be the only module calling `api.heartbeat` and `api.getUsers` after this task.

- [ ] **Step 4: Verify lifecycle imports and build**

Run:

```powershell
Select-String -Path client\src\App.jsx -Pattern 'api\.heartbeat|api\.getUsers|visibilitychange|setInterval'
npm run build --prefix client
```

Expected: search has no matches; build passes.

- [ ] **Step 5: Commit session extraction**

```powershell
git add client/src/hooks/useGameSession.js client/src/App.jsx
git commit -m "refactor: extract game session lifecycle"
```

### Task 5: Extract API-backed actions and transient effects

**Files:**
- Create: `client/src/hooks/useGameActions.js`
- Modify: `client/src/App.jsx:138-141,160-163,263-522`

- [ ] **Step 1: Define action-hook inputs and outputs**

Implement:

```js
export function useGameActions({
  currentUser,
  game,
  dispatch,
  t,
  modals,
  addLog,
  enqueueAchievements,
})
```

The hook owns `localActiveEvent`, `actionBursts`, and `shakeAnim`. App owns `logs` and `achievementQueue`; the hook calls the two injected callbacks for both. It returns its three states plus the existing handlers named:

```text
handleAction, toggleDemoState, toggleCollection, handleOpenLeaderboard,
handleBuy, handleEquip, handleProfileSave,
handleClaimDailyReward, handlePrestige, handlePrestigeUpgrade,
handleBuyCompanion, handleEquipCompanion, handleShakeTree,
handleVisitGarden, handleSendGift, handleMinigameReward, handleOfflineClose
```

- [ ] **Step 2: Move handlers without changing side effects**

Extract the callback bodies currently between `handleAction` and `handleOfflineClose` into the hook. Replace both repeated achievement mapping blocks with `enqueueAchievements(data.newAchievements)`. Preserve burst coordinates/duration, logs, audio choices, optimistic event clearing/restoration, gift error messages, garden/leaderboard close-open order, shake duration, and daily reward delay. `handleBuy` keeps the unused `price` argument because existing `StoreModal` calls that signature.

Use the modal API only through `modals.openModal`, `modals.closeModal`, data setters, and error setter. Keep the synchronization effect:

```js
useEffect(() => {
  setLocalActiveEvent(game.activeEvent);
}, [game.activeEvent]);
```

- [ ] **Step 3: Wire the hook into App**

App creates `addLog` and `enqueueAchievements` before calling either custom hook. Pass both callbacks to `useGameSession` and `useGameActions`; then pass the session's `currentUser` to `useGameActions`. This fixed ownership prevents hook cycles and neither custom hook imports the other.

- [ ] **Step 4: Verify ownership and build**

Run:

```powershell
Select-String -Path client\src\App.jsx -Pattern 'api\.'
npm run build --prefix client
```

Expected: App has no direct API calls; build passes.

- [ ] **Step 5: Commit action extraction**

```powershell
git add client/src/hooks/useGameActions.js client/src/App.jsx
git commit -m "refactor: extract game action hooks"
```

### Task 6: Extract modal composition and top HUD

**Files:**
- Create: `client/src/components/game/GameModals.jsx`
- Create: `client/src/components/game/GameHeader.jsx`
- Modify: `client/src/App.jsx:539-733`

- [ ] **Step 1: Create `GameModals` as a pure view**

Move the eleven conditional modal render blocks unchanged. Accept one props object with:

```js
{
  visibility, game, currentUser, t, leaderboardData, gardenVisitData, giftError,
  gamesRemaining,
  onClose, onLogout, onBuy, onEquip, onProfileSave, onVisitGarden, onGift,
  onClaimDailyReward, onOfflineClose, onPrestige, onPrestigeUpgrade,
  onMinigameReward, onBuyCompanion, onEquipCompanion,
}
```

`onClose(name)` is supplied by App and retains the current per-modal click audio behavior. The component imports existing modal components only and performs no API calls or state updates. Omit the current `companion: companionEmoji` stats property: `StatsModal` never reads `stats.companion`, and the identifier has no definition in `App.jsx`; removing that dead property prevents the existing Stats opening exception without altering rendered output.

- [ ] **Step 2: Create `GameHeader` as a pure view**

Move weather display, online status, coins/combo/golden-hour pills, unified menu, time warp button, and user/rate line. Accept state values and callbacks instead of importing API/audio. Keep every class string, title, icon, image path, and button order unchanged.

- [ ] **Step 3: Replace both JSX regions in App**

Render:

```jsx
<GameModals {...modalProps} />
<GameHeader {...headerProps} />
```

Do not move `AchievementToast`, environment, particles, or main panel in this task.

- [ ] **Step 4: Verify and commit**

Run: `npm run build --prefix client`

Expected: build passes with no unresolved icons or modal props.

```powershell
git add client/src/components/game/GameModals.jsx client/src/components/game/GameHeader.jsx client/src/App.jsx
git commit -m "refactor: extract game overlays and header"
```

### Task 7: Extract the stage and action panel

**Files:**
- Create: `client/src/components/game/GameStage.jsx`
- Create: `client/src/components/game/ActionPanel.jsx`
- Modify: `client/src/App.jsx:735-837`

- [ ] **Step 1: Create `GameStage`**

Move the action burst mapping and clickable tree region. Define `MemoizedTree = memo(TreeVisual)` in this module. Props are:

```js
{ actionBursts, shakeAnim, game, isDay, onShakeTree }
```

Keep every action-to-icon/text/class mapping, particle loop, tree prop, and companion prop unchanged.

- [ ] **Step 2: Create `ActionPanel`**

Move the full glass bottom panel. Props are:

```js
{
  game, isDay, goldenHourActive, localActiveEvent,
  xpRequired, progress, t, onAction,
}
```

Define `eventIcons` and `eventLabels` inside `ActionPanel` from its imported icons and `t`, then keep status text, max/generation markers, progress bar, storm styling, peaceful state, action order, and `ActionButton` props unchanged.

- [ ] **Step 3: Replace the main-panel internals**

App renders both components inside the existing `game-main-panel` wrapper so layout stacking and CSS selectors remain compatible.

- [ ] **Step 4: Verify and commit**

Run: `npm run build --prefix client`

Expected: build passes.

```powershell
git add client/src/components/game/GameStage.jsx client/src/components/game/ActionPanel.jsx client/src/App.jsx
git commit -m "refactor: extract game stage and action panel"
```

### Task 8: Finish `App.jsx` as composition

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Remove obsolete imports and calculations**

App retains only React hooks it directly uses, translator/audio setup, login/loading views, environment/particles/toast, the reducer, three custom hooks, and four game components. Remove all stale setters, API imports, modal imports, tree imports, and action icon imports; the event icon/label maps now belong exclusively to `ActionPanel`.

- [ ] **Step 2: Keep top-level derivations explicit**

App continues to calculate:

```js
const xpRequired = Math.max(1, Math.floor(10 + Math.pow(game.level, 1.6)));
const progress = Math.min(100, (game.xp / xpRequired) * 100);
const goldenHourActive = Date.now() < (game.goldenHourUntil || 0);
const isDay = isClockDay || goldenHourActive;
const today = new Date().toISOString().slice(0, 10);
const gamesRemaining = game.minigameDate === today
  ? Math.max(0, 3 - (game.minigameCount || 0))
  : 3;
```

Keep `isMuted`/`lang`, their localStorage behavior, audio synchronization, translation memoization, and login/loading gates unchanged.

- [ ] **Step 3: Run full frontend tests and build**

Run: `npm test --prefix client`

Run: `npm run build --prefix client`

Expected: both exit 0.

- [ ] **Step 4: Check structural constraints**

Run:

```powershell
(Get-Content client\src\App.jsx).Count
Select-String -Path client\src\components\game\*.jsx -Pattern 'api\.'
Select-String -Path client\src\App.jsx -Pattern 'fetch\(|setInterval|visibilitychange'
git diff --check
```

Expected: `App.jsx` is under 300 lines; all searches return no matches; diff check is clean.

- [ ] **Step 5: Commit final composition**

```powershell
git add client/src/App.jsx
git commit -m "refactor: reduce app to game composition"
```

### Task 9: Full-system verification and compatibility review

**Files:**
- Review only: all backend and frontend refactor files

- [ ] **Step 1: Run all automated evidence commands**

Run:

```powershell
npm test
npm test --prefix client
npm run build --prefix client
node --check server.js
Get-ChildItem server -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Confirm redundancy and boundaries**

Run:

```powershell
Select-String -Path client\src\utils\api.js -Pattern "method: 'POST'"
Select-String -Path server.js,client\src\constants.js -Pattern "id: 'xpBuff'|id: 'butterfly'"
Select-String -Path server\routes\*.js -Pattern 'writeFile|markDirty'
Select-String -Path server\services\*.js -Pattern '\breq\b|\bres\b|express'
```

Expected: API file has one POST helper match; other searches have no matches.

- [ ] **Step 3: Review final diff against the approved specification**

Confirm API names and paths, save schema, gameplay formulas, visible strings, JSX classes/order, asset paths, polling intervals, localStorage keys, and modal/action behavior are unchanged. Confirm no TypeScript, dependency, design, authentication, rate-limit, database, or deployment changes entered the diff.

- [ ] **Step 4: Record the final state**

Run: `git status --short`

Expected: clean status after all planned commits.
