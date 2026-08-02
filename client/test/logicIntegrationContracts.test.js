import assert from 'node:assert/strict';
import test from 'node:test';

import sharedGameData from '../../shared/game-data.json' with { type: 'json' };
import * as events from '../src/features/events/index.js';
import * as growth from '../src/features/growth/index.js';
import * as minigame from '../src/features/minigame/index.js';
import * as objectives from '../src/features/objectives/index.js';
import * as social from '../src/features/social/index.js';
import { gameReducer, initialGameState } from '../src/state/gameReducer.js';

test('headless feature barrels expose the visual integration surface', () => {
  for (const name of [
    'deriveObjectives',
    'createInitialOnboardingState',
    'onboardingReducer',
    'restoreOnboardingState',
  ]) assert.equal(typeof objectives[name], 'function');

  for (const name of [
    'createInteraction',
    'updateInteraction',
    'completeInteraction',
    'resetInteraction',
    'getCompletedAction',
  ]) assert.equal(typeof events[name], 'function');

  for (const name of [
    'getGrowthStage',
    'getNextMilestone',
    'getGrowthPresentation',
    'getWeatherPresentation',
  ]) assert.equal(typeof growth[name], 'function');

  assert.equal(typeof minigame.normalizeReward, 'function');
  assert.equal(typeof social.helpGarden, 'function');
  assert.equal(typeof social.normalizeHelpResponse, 'function');
});

test('objectives consume the actual server inventory and companion shapes', () => {
  const game = {
    level: 5,
    totalEventsResolved: 1,
    inventory: { unlockedSkins: ['default', 'cherry'] },
    companion: 'butterfly',
  };

  assert.deepEqual(
    objectives.deriveObjectives(game).map(objective => objective.id),
    ['prestige_ready'],
  );
});

test('client weather descriptors read the shared server multiplier source', () => {
  for (const [weather, modifier] of Object.entries(sharedGameData.weatherModifiers)) {
    const presentation = growth.getWeatherPresentation(weather);
    assert.equal(presentation.xpMultiplier, modifier.xpMult);
    assert.equal(presentation.coinMultiplier, modifier.coinMult);
  }
});

test('event completion preserves the frozen server action value', () => {
  const initial = events.createInteraction('WATER', 1000);
  const completed = events.completeInteraction(initial, 3000);

  assert.deepEqual(events.getCompletedAction(completed), {
    eventType: 'WATER',
    archetype: 'hold',
    success: true,
    duration: 2000,
  });
});

test('minigame reward normalization and partial state sync share one response', () => {
  const response = {
    coinsEarned: 200,
    xpEarned: 20,
    gamesRemaining: 2,
    bonus: { type: 'xpBoost', duration: 300000, multiplier: 2 },
    goldenHourUntil: 400000,
    gameState: {
      coins: 250,
      xp: 24,
      level: 3,
      totalXpEarned: 80,
      totalCoinsEarned: 500,
      goldenHourUntil: 400000,
      minigameCount: 1,
      minigameDate: '2026-08-02',
    },
  };

  assert.deepEqual(minigame.normalizeReward(response), {
    coinsEarned: 200,
    xpEarned: 20,
    gamesRemaining: 2,
    bonus: response.bonus,
    goldenHourUntil: 400000,
  });
  assert.deepEqual(
    gameReducer(initialGameState, { type: 'APPLY_MINIGAME_REWARD', data: response }),
    { ...initialGameState, ...response.gameState },
  );
});

test('social response normalization preserves the server-authoritative reward', () => {
  assert.deepEqual(social.normalizeHelpResponse({
    success: true,
    reward: { coins: 50, xp: 10 },
    ownerHelpCount: 3,
  }), {
    success: true,
    reward: { coins: 50, xp: 10 },
    ownerHelpCount: 3,
  });
});
