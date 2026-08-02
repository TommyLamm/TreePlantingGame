# Logic baseline handoff

This is the Wave 2 handoff for `codex/logic-integration`. It contains logic and contract work only; no JSX, CSS, assets, layout, animation, or translation dictionaries were changed.

## Integration order

1. Event cadence and weather rewards.
2. Minigame reward loop.
3. Social garden help.
4. Onboarding and objectives.
5. Event interaction engine.
6. Growth and weather presentation model.
7. Cross-module contract fixes and tests.

Use the final branch HEAD reported by the integrator as the visual agent's baseline SHA.

## Objectives and onboarding

Import from `client/src/features/objectives/index.js`.

- `deriveObjectives(game)` returns up to three incomplete descriptors in priority order: `{ id, labelKey, descriptionKey, current, target, completed, navigationTarget? }`.
- It consumes the real game shapes `inventory.unlockedSkins: string[]` and `companion: string | null`; legacy `inventory.owned` and object-shaped companions remain tolerated.
- Completed objectives are omitted so later objectives cannot be blocked.
- `createInitialOnboardingState()`, `onboardingReducer(state, action)`, and `restoreOnboardingState(payload)` own the serializable onboarding state.
- Reducer actions: `start`, `next`, `back`, `dismiss`, `complete`, `restore`.

Required objective keys:

- `objFirstEvent`, `objFirstEventDesc`
- `objLevel5`, `objLevel5Desc`
- `objFirstSkin`, `objFirstSkinDesc`
- `objFirstCompanion`, `objFirstCompanionDesc`
- `objPrestigeReady`, `objPrestigeReadyDesc`

Required onboarding keys are the `labelKey` and `descriptionKey` values in `ONBOARDING_STEPS`: welcome, first plant, first event, Level 5, store intro, companion intro, and done.

## Event interaction engine

Import from `client/src/features/events/index.js`.

- Supported event values remain `WATER`, `PEST`, `FERTILIZE`, `PRUNE`, `SUNLIGHT`, `STORM`.
- Archetypes are `hold`, `sequence`, and `timing`.
- Core API: `createInteraction`, `updateInteraction`, `completeInteraction`, `failInteraction`, `cancelInteraction`, `resetInteraction`.
- Renderer selectors include `getStatus`, `getProgress`, `getStep`, `getTotalSteps`, `getInstructionKey`, `canSubmit`, and `getCompletedAction`.
- Statuses to render: `idle`, `active`, `completed`, `failed`, `cancelled`.
- A successful `completedAction.eventType` is passed unchanged to the existing `onAction(eventType)` boundary. No proof or score is sent to the server.
- Reduced-motion behavior uses the deterministic mode flag supplied when creating or resetting an interaction.

Required event keys come from `EVENT_DEFINITIONS`: `eventWaterDesc`, `holdWater`, `eventSunlightDesc`, `holdSunlight`, `eventPestDesc`, `pestStep1`–`pestStep3`, `eventFertilizeDesc`, `fertilizeStep1`–`fertilizeStep2`, `eventPruneDesc`, `timingPrune`, `eventStormDesc`, and `timingStorm`.

## Growth and weather

Import from `client/src/features/growth/index.js`.

- `getGrowthStage(level)` preserves stage boundaries 1, 5, 12, 26, 46, 66, 86.
- `getNextMilestone(level)` returns `{ level, stage, nameKey, isMax }`.
- `getGrowthPresentation(level, context)` returns `{ groundGrowthTier, flowerTier, fruitTier, wildlifeTier }` without CSS or asset references.
- `getWeatherPresentation(weather)` returns `{ nameKey, effectKey, xpMultiplier, coinMultiplier }`.
- `shared/game-data.json.weatherModifiers` is the single multiplier source used by both the server and client model.

Required growth keys are `growthStage1`–`growthStage7`. Weather keys are `weatherSunny`, `weatherCloudy`, `weatherRainy`, `weatherStormy`, `weatherSnowy` and their `weatherEffect*` counterparts.

## Minigame

`POST /api/minigame/reward` keeps request `{ username, gameType, score }`.

Response contract:

```js
{
  coinsEarned,
  xpEarned,
  gamesRemaining,
  bonus: null | { type: 'xpBoost', duration, multiplier },
  goldenHourUntil,
  gameState: {
    coins,
    xp,
    level,
    totalXpEarned,
    totalCoinsEarned,
    goldenHourUntil,
    minigameCount,
    minigameDate,
  },
}
```

- `useGameActions.handleMinigameReward(gameType, score)` returns the complete response or `null` on failure.
- It dispatches `APPLY_MINIGAME_REWARD`; the reducer applies only authoritative fields from `gameState`, avoiding accidental full-state replacement.
- `normalizeReward(result)` and `MINIGAME_RESULT` are exported from `client/src/features/minigame/index.js`.
- Result keys: `minigame.coinsEarned`, `minigame.xpEarned`, `minigame.bonusActive`, `minigame.gamesRemaining`.

## Social garden help

`POST /api/garden/help` request:

```js
{ helperUsername, ownerUsername }
```

Success response:

```js
{ success: true, reward: { coins: 50, xp: 10 }, ownerHelpCount }
```

Import `helpGarden`, `normalizeHelpResponse`, `getHelpErrorDescriptor`, `HELP_ERROR_DESCRIPTORS`, and `HELP_STATE_DESCRIPTORS` from `client/src/features/social/index.js`.

States to render: available, already helped, daily limit reached, garden full, and self-help. Translation keys use the `social.help.*` namespace declared in `socialModel.js`.

## Event timing response

- Heartbeat and action responses may include numeric `nextEventAt` when no event is active and the player can receive another event.
- They may include numeric `eventExpiresAt` for a storm or auto-water event with a deadline.
- Both timestamps are response-only. They are deliberately removed from persisted user objects.
- Client `gameReducer` stores both as `number | null`.

Event balance constants are exported as `EVENT_BALANCE` from `server/config/eventBalance.js`. First normal event: 45–90 seconds; steady-state base: 3 minutes; minimum after prestige reduction: 60 seconds; demo multiplier remains 600×.

## Visual-agent state checklist

- Objectives: 0–3 active items, progress, empty/all-complete state, optional navigation target.
- Onboarding: inactive, active step, back/next, dismissed, completed, restored.
- Events: idle, active by all three archetypes, completed, failed, cancelled, deterministic/reduced-motion.
- Growth: all seven stages, next milestone, max level, all four micro-growth tiers.
- Weather: five known types and sunny fallback, with reward multiplier text.
- Minigame: result, XP, coins, games remaining, bonus active, request failure, daily exhausted.
- Social help: all declared states, success reward, mapped error, unknown error.

## Verification

Run from the repository root:

```powershell
node --test test/*.test.js
node --test client/test/*.test.js
```

Run the client production build from `client`:

```powershell
node node_modules/vite/bin/vite.js build
```
