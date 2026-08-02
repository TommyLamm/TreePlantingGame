import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OBJECTIVE_DEFS,
  getObjectiveCurrent,
  isObjectiveCompleted,
  deriveObjectives,
  ONBOARDING_STEPS,
  createInitialOnboardingState,
  onboardingReducer,
  restoreOnboardingState,
} from '../src/features/objectives/index.js';

// ──────────────────────────────────────────────
//  objectiveDefinitions
// ──────────────────────────────────────────────

test('OBJECTIVE_DEFS has exactly 5 definitions in priority order', () => {
  assert.equal(OBJECTIVE_DEFS.length, 5);
  assert.equal(OBJECTIVE_DEFS[0].id, 'first_event');
  assert.equal(OBJECTIVE_DEFS[1].id, 'level_5');
  assert.equal(OBJECTIVE_DEFS[2].id, 'first_skin');
  assert.equal(OBJECTIVE_DEFS[3].id, 'first_companion');
  assert.equal(OBJECTIVE_DEFS[4].id, 'prestige_ready');
});

test('each OBJECTIVE_DEF has required fields', () => {
  for (const def of OBJECTIVE_DEFS) {
    assert.ok(typeof def.id === 'string' && def.id.length > 0, `def ${def.id} missing id`);
    assert.ok(typeof def.labelKey === 'string' && def.labelKey.length > 0, `def ${def.id} missing labelKey`);
    assert.ok(typeof def.descriptionKey === 'string' && def.descriptionKey.length > 0, `def ${def.id} missing descriptionKey`);
    assert.equal(typeof def.target, 'number', `def ${def.id} target must be number`);
    assert.ok(def.target > 0, `def ${def.id} target must be positive`);
  }
});

test('getObjectiveCurrent — first_event', () => {
  assert.equal(getObjectiveCurrent({ totalEventsResolved: 0 }, OBJECTIVE_DEFS[0]), 0);
  assert.equal(getObjectiveCurrent({ totalEventsResolved: 1 }, OBJECTIVE_DEFS[0]), 1);
  assert.equal(getObjectiveCurrent({ totalEventsResolved: 5 }, OBJECTIVE_DEFS[0]), 5);
});

test('getObjectiveCurrent — level_5 / prestige_ready', () => {
  assert.equal(getObjectiveCurrent({ level: 1 }, OBJECTIVE_DEFS[1]), 1);
  assert.equal(getObjectiveCurrent({ level: 5 }, OBJECTIVE_DEFS[1]), 5);
  assert.equal(getObjectiveCurrent({ level: 50 }, OBJECTIVE_DEFS[4]), 50);
});

test('getObjectiveCurrent — first_skin counts owned skin items', () => {
  assert.equal(getObjectiveCurrent({ inventory: { owned: [] } }, OBJECTIVE_DEFS[2]), 0);
  assert.equal(getObjectiveCurrent({ inventory: { owned: ['xpBuff'] } }, OBJECTIVE_DEFS[2]), 0);
  assert.equal(getObjectiveCurrent({ inventory: { owned: ['cherry'] } }, OBJECTIVE_DEFS[2]), 1);
  assert.equal(getObjectiveCurrent({ inventory: { owned: ['cherry', 'autumn'] } }, OBJECTIVE_DEFS[2]), 2);
  assert.equal(getObjectiveCurrent({ inventory: { owned: ['cherry', 'autumn', 'snow', 'golden'] } }, OBJECTIVE_DEFS[2]), 4);
});

test('getObjectiveCurrent — first_companion', () => {
  assert.equal(getObjectiveCurrent({ companion: null }, OBJECTIVE_DEFS[3]), 0);
  assert.equal(getObjectiveCurrent({ companion: { id: 'fox' } }, OBJECTIVE_DEFS[3]), 1);
  assert.equal(getObjectiveCurrent({ companion: {} }, OBJECTIVE_DEFS[3]), 0);
});

test('getObjectiveCurrent — safe with null / missing / malformed fields', () => {
  assert.equal(getObjectiveCurrent(null, OBJECTIVE_DEFS[0]), 0);
  assert.equal(getObjectiveCurrent(undefined, OBJECTIVE_DEFS[0]), 0);
  assert.equal(getObjectiveCurrent('not-object', OBJECTIVE_DEFS[0]), 0);

  // missing inventory
  assert.equal(getObjectiveCurrent({}, OBJECTIVE_DEFS[2]), 0);
  assert.equal(getObjectiveCurrent({ inventory: null }, OBJECTIVE_DEFS[2]), 0);
  assert.equal(getObjectiveCurrent({ inventory: { owned: null } }, OBJECTIVE_DEFS[2]), 0);

  // missing companion
  assert.equal(getObjectiveCurrent({}, OBJECTIVE_DEFS[3]), 0);

  // string numeric values
  assert.equal(getObjectiveCurrent({ level: '5' }, OBJECTIVE_DEFS[1]), 5);
  assert.equal(getObjectiveCurrent({ totalEventsResolved: '3' }, OBJECTIVE_DEFS[0]), 3);

  // negative / NaN
  assert.equal(getObjectiveCurrent({ level: -1 }, OBJECTIVE_DEFS[1]), 0);
  assert.equal(getObjectiveCurrent({ level: NaN }, OBJECTIVE_DEFS[1]), 0);
  assert.equal(getObjectiveCurrent({ level: 'abc' }, OBJECTIVE_DEFS[1]), 0);
});

test('isObjectiveCompleted', () => {
  assert.equal(isObjectiveCompleted({ totalEventsResolved: 0 }, OBJECTIVE_DEFS[0]), false);
  assert.equal(isObjectiveCompleted({ totalEventsResolved: 1 }, OBJECTIVE_DEFS[0]), true);
  assert.equal(isObjectiveCompleted({ level: 4 }, OBJECTIVE_DEFS[1]), false);
  assert.equal(isObjectiveCompleted({ level: 5 }, OBJECTIVE_DEFS[1]), true);
  assert.equal(isObjectiveCompleted({ level: 6 }, OBJECTIVE_DEFS[1]), true);
  assert.equal(isObjectiveCompleted({ level: 49 }, OBJECTIVE_DEFS[4]), false);
  assert.equal(isObjectiveCompleted({ level: 50 }, OBJECTIVE_DEFS[4]), true);
  assert.equal(isObjectiveCompleted({ level: 99 }, OBJECTIVE_DEFS[4]), true);
});

// ──────────────────────────────────────────────
//  deriveObjectives
// ──────────────────────────────────────────────

test('deriveObjectives — returns at most 3 objectives', () => {
  const result = deriveObjectives({
    level: 1,
    totalEventsResolved: 0,
    inventory: { owned: [] },
    companion: null,
  });
  assert.ok(result.length <= 3);
  assert.ok(result.length > 0);
});

test('deriveObjectives — includes completed objectives so they are visible', () => {
  // All objectives completed → all 5 are returned (because we include all, capped at 3)
  const result = deriveObjectives({
    level: 99,
    totalEventsResolved: 10,
    inventory: { owned: ['cherry', 'autumn'] },
    companion: { id: 'fox' },
  });
  // We return definitions in order but capped at 3
  assert.equal(result.length, 3);
  assert.ok(result[0].completed);
  assert.ok(result[1].completed);
  assert.ok(result[2].completed);
});

test('deriveObjectives — returns all objectives in priority order (capped at 3)', () => {
  const result = deriveObjectives({
    level: 1,
    totalEventsResolved: 0,
    inventory: { owned: [] },
    companion: null,
  });
  assert.equal(result.length, 3);
  assert.equal(result[0].id, 'first_event');
  assert.equal(result[1].id, 'level_5');
  assert.equal(result[2].id, 'first_skin');
  assert.equal(result[0].completed, false);
  assert.equal(result[1].completed, false);
  assert.equal(result[2].completed, false);
});

test('deriveObjectives — each descriptor has the required fields', () => {
  const result = deriveObjectives({
    level: 1,
    totalEventsResolved: 0,
    inventory: { owned: [] },
    companion: null,
  });
  for (const obj of result) {
    assert.ok(typeof obj.id === 'string');
    assert.ok(typeof obj.labelKey === 'string');
    assert.ok(typeof obj.descriptionKey === 'string');
    assert.equal(typeof obj.current, 'number');
    assert.equal(typeof obj.target, 'number');
    assert.equal(typeof obj.completed, 'boolean');
    assert.ok(obj.current >= 0);
    assert.ok(obj.target > 0);
  }
});

test('deriveObjectives — deterministic: same input always returns same output', () => {
  const game = {
    level: 3,
    totalEventsResolved: 0,
    inventory: { owned: [] },
    companion: null,
  };
  const a = deriveObjectives(game);
  const b = deriveObjectives(game);
  assert.deepEqual(a, b);
});

test('deriveObjectives — safe with null / undefined game', () => {
  assert.deepEqual(deriveObjectives(null), []);
  assert.deepEqual(deriveObjectives(undefined), []);
  assert.deepEqual(deriveObjectives('bad'), []);
});

test('deriveObjectives — handles partial game state', () => {
  // Missing fields should not crash
  const result = deriveObjectives({});
  assert.ok(Array.isArray(result));
  assert.equal(result.length, 3);
});

// ──────────────────────────────────────────────
//  onboardingState — createInitialOnboardingState
// ──────────────────────────────────────────────

test('createInitialOnboardingState returns default inactive state', () => {
  const state = createInitialOnboardingState();
  assert.equal(state.active, false);
  assert.equal(state.step, 0);
  assert.equal(state.stepCount, ONBOARDING_STEPS.length);
  assert.equal(state.completed, false);
  assert.equal(state.dismissed, false);
});

test('ONBOARDING_STEPS has the expected steps', () => {
  const ids = ONBOARDING_STEPS.map(s => s.id);
  assert.deepEqual(ids, [
    'welcome',
    'first_plant',
    'first_event',
    'level_5',
    'store_intro',
    'companion_intro',
    'done',
  ]);
});

// ──────────────────────────────────────────────
//  onboardingState — reducer actions
// ──────────────────────────────────────────────

test('onboardingReducer — start activates the flow', () => {
  const initial = createInitialOnboardingState();
  const result = onboardingReducer(initial, { type: 'start' });
  assert.equal(result.active, true);
  assert.equal(result.step, 0);
  assert.equal(result.completed, false);
  assert.equal(result.dismissed, false);
});

test('onboardingReducer — next advances the step', () => {
  let state = onboardingReducer(createInitialOnboardingState(), { type: 'start' });
  assert.equal(state.step, 0);

  state = onboardingReducer(state, { type: 'next' });
  assert.equal(state.step, 1);
  assert.equal(state.active, true);
  assert.equal(state.completed, false);
});

test('onboardingReducer — next on penultimate step marks completed', () => {
  const steps = ONBOARDING_STEPS.length; // 7
  let state = { ...createInitialOnboardingState(), active: true, step: steps - 2 };

  state = onboardingReducer(state, { type: 'next' });
  assert.equal(state.step, steps - 1);
  assert.equal(state.completed, true);
  assert.equal(state.active, false);
});

test('onboardingReducer — next on last step stays at last step', () => {
  const steps = ONBOARDING_STEPS.length;
  let state = { ...createInitialOnboardingState(), active: true, step: steps - 1 };

  state = onboardingReducer(state, { type: 'next' });
  assert.equal(state.step, steps - 1);
  assert.equal(state.completed, true);
  assert.equal(state.active, false);
});

test('onboardingReducer — back goes to previous step', () => {
  let state = { ...createInitialOnboardingState(), active: true, step: 2 };
  state = onboardingReducer(state, { type: 'back' });
  assert.equal(state.step, 1);
});

test('onboardingReducer — back at step 0 stays at 0', () => {
  let state = { ...createInitialOnboardingState(), active: true, step: 0 };
  state = onboardingReducer(state, { type: 'back' });
  assert.equal(state.step, 0);
});

test('onboardingReducer — dismiss deactivates and marks dismissed', () => {
  let state = { ...createInitialOnboardingState(), active: true, step: 3 };
  state = onboardingReducer(state, { type: 'dismiss' });
  assert.equal(state.active, false);
  assert.equal(state.dismissed, true);
  assert.equal(state.completed, false);
});

test('onboardingReducer — complete marks finished', () => {
  let state = { ...createInitialOnboardingState(), active: true, step: 2 };
  state = onboardingReducer(state, { type: 'complete' });
  assert.equal(state.active, false);
  assert.equal(state.completed, true);
  assert.equal(state.step, ONBOARDING_STEPS.length - 1);
});

test('onboardingReducer — restore replaces state', () => {
  const payload = {
    active: true,
    step: 3,
    stepCount: 10,
    completed: false,
    dismissed: false,
  };
  const result = onboardingReducer(createInitialOnboardingState(), { type: 'restore', payload });
  assert.equal(result.active, true);
  assert.equal(result.step, 3);
  assert.equal(result.stepCount, 10);
  assert.equal(result.completed, false);
  assert.equal(result.dismissed, false);
});

test('onboardingReducer — unknown action preserves state identity', () => {
  const state = createInitialOnboardingState();
  assert.strictEqual(onboardingReducer(state, { type: 'UNKNOWN' }), state);
});

test('onboardingReducer — null/undefined state is handled gracefully', () => {
  const result = onboardingReducer(null, { type: 'start' });
  assert.equal(result.active, true);
  assert.equal(result.step, 0);
});

// ──────────────────────────────────────────────
//  onboardingState — serialisation / restore
// ──────────────────────────────────────────────

test('restoreOnboardingState — valid payload round-trips', () => {
  const payload = {
    active: true,
    step: 2,
    stepCount: 7,
    completed: false,
    dismissed: false,
  };
  const restored = restoreOnboardingState(payload);
  assert.deepEqual(restored, payload);
});

test('restoreOnboardingState — null payload returns initial state', () => {
  const restored = restoreOnboardingState(null);
  assert.deepEqual(restored, createInitialOnboardingState());
});

test('restoreOnboardingState — invalid payload returns initial state', () => {
  assert.deepEqual(restoreOnboardingState('bad'), createInitialOnboardingState());
  assert.deepEqual(restoreOnboardingState(123), createInitialOnboardingState());
  assert.deepEqual(restoreOnboardingState(undefined), createInitialOnboardingState());
});

test('restoreOnboardingState — clamps out-of-range step', () => {
  const below = restoreOnboardingState({ active: true, step: -5, stepCount: 7, completed: false, dismissed: false });
  assert.equal(below.step, 0);

  const above = restoreOnboardingState({ active: true, step: 99, stepCount: 7, completed: false, dismissed: false });
  assert.equal(above.step, 6);
});

test('restoreOnboardingState — stepCount defaults to ONBOARDING_STEPS length', () => {
  const restored = restoreOnboardingState({ active: false, step: 0, completed: false, dismissed: false });
  assert.equal(restored.stepCount, ONBOARDING_STEPS.length);
});

// ──────────────────────────────────────────────
//  Integration: onboarding + objectives work together
// ──────────────────────────────────────────────

test('integration — deriveObjectives and onboardingReducer are independent pure functions', () => {
  const game = {
    level: 1,
    totalEventsResolved: 0,
    inventory: { owned: [] },
    companion: null,
  };

  const objectives = deriveObjectives(game);
  assert.equal(objectives.length, 3);

  let onboarding = createInitialOnboardingState();
  onboarding = onboardingReducer(onboarding, { type: 'start' });
  assert.equal(onboarding.step, 0);

  // Step through whole flow
  for (let i = 0; i < ONBOARDING_STEPS.length - 1; i++) {
    onboarding = onboardingReducer(onboarding, { type: 'next' });
  }
  assert.equal(onboarding.completed, true);
  assert.equal(onboarding.active, false);

  // Objectives untouched
  const objectives2 = deriveObjectives(game);
  assert.deepEqual(objectives, objectives2);
});

// ──────────────────────────────────────────────
//  Determinism guarantees
// ──────────────────────────────────────────────

test('all functions are deterministic (no Date, Math.random, or DOM)', () => {
  // Run each function twice with the same input and assert deep equality
  const game = {
    level: 12,
    totalEventsResolved: 3,
    inventory: { owned: ['xpBuff', 'cherry'] },
    companion: { id: 'butterfly' },
    achievements: ['first_event'],
  };

  const a1 = deriveObjectives(game);
  const a2 = deriveObjectives(game);
  assert.deepEqual(a1, a2);

  const s1 = createInitialOnboardingState();
  const s2 = createInitialOnboardingState();
  assert.deepEqual(s1, s2);

  const r1 = onboardingReducer(s1, { type: 'start' });
  const r2 = onboardingReducer(s2, { type: 'start' });
  assert.deepEqual(r1, r2);
});

// ──────────────────────────────────────────────
//  JSON serialisation round-trip
// ──────────────────────────────────────────────

test('onboarding state survives JSON round-trip', () => {
  let state = createInitialOnboardingState();
  state = onboardingReducer(state, { type: 'start' });
  state = onboardingReducer(state, { type: 'next' });
  state = onboardingReducer(state, { type: 'next' });

  const serialized = JSON.stringify(state);
  const parsed = JSON.parse(serialized);
  const restored = restoreOnboardingState(parsed);

  assert.deepEqual(restored, state);
});

test('deriveObjectives result survives JSON round-trip', () => {
  const game = {
    level: 3,
    totalEventsResolved: 0,
    inventory: { owned: [] },
    companion: null,
  };
  const objectives = deriveObjectives(game);
  const serialized = JSON.stringify(objectives);
  const parsed = JSON.parse(serialized);
  assert.deepEqual(parsed, objectives);
});
