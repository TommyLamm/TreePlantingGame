/**
 * eventInteractionEngine.test.js
 *
 * Comprehensive tests for the event interaction state machine.
 * Covers all 3 archetypes: hold, sequence, timing.
 *
 * Tests per archetype: success, failure, cancel, reset, disabled
 * (double-completion guard), and deterministic mode.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInteraction,
  updateInteraction,
  completeInteraction,
  failInteraction,
  cancelInteraction,
  resetInteraction,
  STATUS_IDLE,
  STATUS_ACTIVE,
  STATUS_COMPLETED,
  STATUS_FAILED,
  STATUS_CANCELLED,
} from '../src/features/events/eventInteractionEngine.js';

import {
  getStatus,
  isActive,
  isComplete,
  isFailed,
  isCancelled,
  isTerminal,
  getProgress,
  getStep,
  getTotalSteps,
  isLastStep,
  getInstructionKey,
  canSubmit,
  getCompletedAction,
  getDeterministicMode,
  getElapsed,
} from '../src/features/events/eventInteractionSelectors.js';

import {
  EVENT_TYPES,
  EVENT_ARCHETYPES,
  ARCHETYPE_HOLD,
  ARCHETYPE_SEQUENCE,
  ARCHETYPE_TIMING,
  getEventDefinition,
  getArchetype,
  getStepCount,
} from '../src/features/events/eventDefinitions.js';

/* ── Helpers ───────────────────────────────────────────────────── */

const COMPLETED_FLAG = '__completed';

const T0 = 1000;
const t = (offset) => T0 + offset;

function assertComplete(state, eventType, elapsed) {
  assert.equal(state.status, STATUS_COMPLETED);
  assert.equal(state[COMPLETED_FLAG], true);
  assert.ok(state.completedAction);
  assert.equal(state.completedAction.eventType, eventType);
  assert.equal(state.completedAction.success, true);
  assert.equal(state.completedAction.duration, elapsed);
  assert.equal(state.eventType, eventType);
}

function assertFailed(state, eventType) {
  assert.equal(state.status, STATUS_FAILED);
  assert.equal(state[COMPLETED_FLAG], true);
  assert.ok(state.completedAction);
  assert.equal(state.completedAction.eventType, eventType);
  assert.equal(state.completedAction.success, false);
}

/* ── Event Definitions ─────────────────────────────────────────── */

test('eventDefinitions: all 6 event types are mapped to the 3 archetypes', () => {
  assert.equal(EVENT_TYPES.length, 6);
  assert.deepEqual(EVENT_ARCHETYPES, {
    WATER:     ARCHETYPE_HOLD,
    SUNLIGHT:  ARCHETYPE_HOLD,
    PEST:      ARCHETYPE_SEQUENCE,
    FERTILIZE: ARCHETYPE_SEQUENCE,
    PRUNE:     ARCHETYPE_TIMING,
    STORM:     ARCHETYPE_TIMING,
  });
});

test('eventDefinitions: getEventDefinition returns per-event config', () => {
  const waterDef = getEventDefinition('WATER');
  assert.equal(waterDef.archetype, ARCHETYPE_HOLD);
  assert.equal(waterDef.durationMs, 2000);
  assert.equal(waterDef.instructionKey, 'eventWaterDesc');

  const pestDef = getEventDefinition('PEST');
  assert.equal(pestDef.archetype, ARCHETYPE_SEQUENCE);
  assert.equal(pestDef.steps.length, 3);

  const stormDef = getEventDefinition('STORM');
  assert.equal(stormDef.archetype, ARCHETYPE_TIMING);
  assert.equal(stormDef.windowStartMs, 300);
  assert.equal(stormDef.windowEndMs, 2000);
});

test('eventDefinitions: getEventDefinition throws for unknown type', () => {
  assert.throws(() => getEventDefinition('UNKNOWN'), /Unknown event type/);
});

test('eventDefinitions: getArchetype returns correct archetype', () => {
  assert.equal(getArchetype('WATER'), ARCHETYPE_HOLD);
  assert.equal(getArchetype('PEST'), ARCHETYPE_SEQUENCE);
  assert.equal(getArchetype('STORM'), ARCHETYPE_TIMING);
  assert.equal(getArchetype('UNKNOWN'), null);
});

test('eventDefinitions: getStepCount returns 0 for non-sequence events', () => {
  assert.equal(getStepCount('WATER'), 0);
  assert.equal(getStepCount('PRUNE'), 0);
  assert.equal(getStepCount('PEST'), 3);
  assert.equal(getStepCount('FERTILIZE'), 2);
});

/* ── createInteraction ─────────────────────────────────────────── */

test('createInteraction: creates state with correct defaults', () => {
  const state = createInteraction('WATER', T0);
  assert.equal(state.eventType, 'WATER');
  assert.equal(state.archetype, ARCHETYPE_HOLD);
  assert.equal(state.status, STATUS_IDLE);
  assert.equal(state.progress, 0);
  assert.equal(state.step, 0);
  assert.equal(state.startedAt, T0);
  assert.equal(state.updatedAt, T0);
  assert.equal(state.elapsed, 0);
  assert.equal(state.completedAction, null);
  assert.equal(state[COMPLETED_FLAG], false);
  assert.equal(state.deterministicMode, false);
});

test('createInteraction: accepts deterministicMode option', () => {
  const state = createInteraction('STORM', T0, { deterministicMode: true });
  assert.equal(state.deterministicMode, true);
});

test('createInteraction: throws for unknown event type', () => {
  assert.throws(() => createInteraction('UNKNOWN', T0), /Unknown event type/);
});

/* ── HOLD Archetype ────────────────────────────────────────────── */

test('hold: progresses through hold duration', () => {
  const state = createInteraction('WATER', T0);
  const s1 = updateInteraction(state, { elapsed: 500 }, t(500));
  assert.equal(s1.status, STATUS_ACTIVE);
  assert.equal(s1.progress, 0.25);
  assert.equal(s1.step, 0);

  const s2 = updateInteraction(s1, { elapsed: 1000 }, t(1000));
  assert.equal(s2.progress, 0.5);

  const s3 = updateInteraction(s2, { elapsed: 1500 }, t(1500));
  assert.equal(s3.progress, 0.75);
});

test('hold: completes when progress reaches 1.0', () => {
  const state = createInteraction('WATER', T0);
  const result = updateInteraction(state, { elapsed: 2000 }, t(2000));
  assert.equal(result.status, STATUS_COMPLETED);
  assert.equal(result.completedAction.success, true);
  assert.equal(result.completedAction.eventType, 'WATER');
});

test('hold: fails when released before completion', () => {
  const state = createInteraction('WATER', T0);
  const s1 = updateInteraction(state, { elapsed: 500 }, t(500));
  const result = updateInteraction(s1, { elapsed: 500, released: true }, t(500));
  assertFailed(result, 'WATER');
  assert.equal(result.progress, 0.25);
});

test('hold: double completion guard prevents second completion', () => {
  const state = createInteraction('WATER', T0);
  const s1 = updateInteraction(state, { elapsed: 2000 }, t(2000));
  assert.equal(s1.status, STATUS_COMPLETED);

  // Second update should be a no-op
  const s2 = updateInteraction(s1, { elapsed: 3000 }, t(3000));
  assert.equal(s2, s1); // same reference
});

test('hold: cancelInteraction works', () => {
  const state = createInteraction('SUNLIGHT', T0);
  const s1 = updateInteraction(state, { elapsed: 500 }, t(500));
  const result = cancelInteraction(s1, t(500));
  assert.equal(result.status, STATUS_CANCELLED);
  assert.equal(result.completedAction.success, false);
  assert.equal(result.completedAction.eventType, 'SUNLIGHT');
});

test('hold: resetInteraction creates fresh state for new event type', () => {
  const state = createInteraction('WATER', T0);
  const s1 = updateInteraction(state, { elapsed: 500 }, t(500));
  const reset = resetInteraction(s1, 'SUNLIGHT', t(600));
  assert.equal(reset.eventType, 'SUNLIGHT');
  assert.equal(reset.status, STATUS_IDLE);
  assert.equal(reset.progress, 0);
  assert.equal(reset.startedAt, t(600));
});

test('hold: deterministic mode completes on first update', () => {
  const state = createInteraction('WATER', T0, { deterministicMode: true });
  const result = updateInteraction(state, { elapsed: 1 }, t(1));
  assert.equal(result.status, STATUS_COMPLETED);
  assert.equal(result.completedAction.success, true);
});

test('hold: SUNLIGHT has 3000ms duration', () => {
  const state = createInteraction('SUNLIGHT', T0);
  const s1 = updateInteraction(state, { elapsed: 1500 }, t(1500));
  assert.equal(s1.progress, 0.5);
  const result = updateInteraction(s1, { elapsed: 3000 }, t(3000));
  assert.equal(result.status, STATUS_COMPLETED);
});

/* ── SEQUENCE Archetype ────────────────────────────────────────── */

test('sequence: advances through steps in order', () => {
  const state = createInteraction('PEST', T0);
  const s1 = updateInteraction(state, { stepIndex: 0 }, t(100));
  assert.equal(s1.status, STATUS_ACTIVE);
  assert.equal(s1.step, 1);
  assert.equal(s1.progress, 1 / 3);

  const s2 = updateInteraction(s1, { stepIndex: 1 }, t(200));
  assert.equal(s2.step, 2);
  assert.equal(s2.progress, 2 / 3);

  const s3 = updateInteraction(s2, { stepIndex: 2 }, t(300));
  assert.equal(s3.status, STATUS_COMPLETED);
  assert.equal(s3.completedAction.success, true);
  assert.equal(s3.completedAction.eventType, 'PEST');
});

test('sequence: wrong step fails the interaction', () => {
  const state = createInteraction('PEST', T0);
  const s1 = updateInteraction(state, { stepIndex: 0 }, t(100));
  assert.equal(s1.step, 1);

  const result = updateInteraction(s1, { stepIndex: 2 }, t(200)); // expected 1, got 2
  assertFailed(result, 'PEST');
});

test('sequence: FERTILIZE has only 2 steps', () => {
  const state = createInteraction('FERTILIZE', T0);
  const s1 = updateInteraction(state, { stepIndex: 0 }, t(100));
  assert.equal(s1.step, 1);

  const result = updateInteraction(s1, { stepIndex: 1 }, t(200));
  assert.equal(result.status, STATUS_COMPLETED);
});

test('sequence: double completion guard', () => {
  const state = createInteraction('PEST', T0);
  const s1 = updateInteraction(state, { stepIndex: 0 }, t(100));
  const s2 = updateInteraction(s1, { stepIndex: 1 }, t(200));
  const s3 = updateInteraction(s2, { stepIndex: 2 }, t(300));
  assert.equal(s3.status, STATUS_COMPLETED);

  // Repeating step 2 should be a no-op
  const s4 = updateInteraction(s3, { stepIndex: 2 }, t(400));
  assert.equal(s4, s3);
});

test('sequence: failInteraction force-fails', () => {
  const state = createInteraction('PEST', T0);
  const s1 = updateInteraction(state, { stepIndex: 0 }, t(100));
  const result = failInteraction(s1, t(200));
  assertFailed(result, 'PEST');
});

test('sequence: cancelInteraction cancels', () => {
  const state = createInteraction('FERTILIZE', T0);
  const result = cancelInteraction(state, t(50));
  assert.equal(result.status, STATUS_CANCELLED);
});

test('sequence: deterministic mode completes on first step', () => {
  const state = createInteraction('PEST', T0, { deterministicMode: true });
  const result = updateInteraction(state, { stepIndex: 0 }, t(100));
  assert.equal(result.status, STATUS_COMPLETED);
  assert.equal(result.completedAction.success, true);
});

test('sequence: resetInteraction', () => {
  const state = createInteraction('PEST', T0);
  const s1 = updateInteraction(state, { stepIndex: 0 }, t(100));
  const reset = resetInteraction(s1, 'FERTILIZE', t(200));
  assert.equal(reset.eventType, 'FERTILIZE');
  assert.equal(reset.step, 0);
  assert.equal(reset.status, STATUS_IDLE);
});

/* ── TIMING Archetype ──────────────────────────────────────────── */

test('timing: progresses within the window', () => {
  const state = createInteraction('PRUNE', T0);
  const s1 = updateInteraction(state, { elapsed: 250 }, t(250));
  assert.equal(s1.status, STATUS_ACTIVE);
  assert.equal(s1.progress, 0.5); // 250 / 500
});

test('timing: fails when elapsed exceeds totalWindowMs without action', () => {
  const state = createInteraction('PRUNE', T0);
  const result = updateInteraction(state, { elapsed: 3001 }, t(3001));
  assert.equal(result.status, STATUS_FAILED);
  assert.equal(result.completedAction.success, false);
});

test('timing: completeInteraction force-completes within window', () => {
  const state = createInteraction('STORM', T0);
  const s1 = updateInteraction(state, { elapsed: 500 }, t(500));
  const result = completeInteraction(s1, t(500));
  assert.equal(result.status, STATUS_COMPLETED);
  assert.equal(result.completedAction.success, true);
  assert.equal(result.completedAction.eventType, 'STORM');
});

test('timing: double completion guard', () => {
  const state = createInteraction('PRUNE', T0);
  const s1 = completeInteraction(state, t(100));
  assert.equal(s1.status, STATUS_COMPLETED);

  const s2 = completeInteraction(s1, t(200));
  assert.equal(s2, s1);
});

test('timing: cancelInteraction', () => {
  const state = createInteraction('STORM', T0);
  const s1 = updateInteraction(state, { elapsed: 500 }, t(500));
  const result = cancelInteraction(s1, t(500));
  assert.equal(result.status, STATUS_CANCELLED);
});

test('timing: deterministic mode completes on first update', () => {
  const state = createInteraction('STORM', T0, { deterministicMode: true });
  const result = updateInteraction(state, { elapsed: 1 }, t(1));
  assert.equal(result.status, STATUS_COMPLETED);
  assert.equal(result.completedAction.success, true);
});

/* ── Selectors ─────────────────────────────────────────────────── */

test('selectors: getStatus and status helpers', () => {
  const idle = createInteraction('WATER', T0);
  assert.equal(getStatus(idle), STATUS_IDLE);
  assert.equal(isActive(idle), false);
  assert.equal(isComplete(idle), false);
  assert.equal(isFailed(idle), false);
  assert.equal(isCancelled(idle), false);
  assert.equal(isTerminal(idle), false);

  const active = updateInteraction(idle, { elapsed: 500 }, t(500));
  assert.equal(isActive(active), true);

  const done = updateInteraction(active, { elapsed: 2000 }, t(2000));
  assert.equal(isComplete(done), true);
  assert.equal(isTerminal(done), true);

  const failed = failInteraction(active, t(1000));
  assert.equal(isFailed(failed), true);
  assert.equal(isTerminal(failed), true);

  const cancelled = cancelInteraction(active, t(1000));
  assert.equal(isCancelled(cancelled), true);
  assert.equal(isTerminal(cancelled), true);
});

test('selectors: getProgress', () => {
  assert.equal(getProgress(null), 0);
  const state = createInteraction('WATER', T0);
  assert.equal(getProgress(state), 0);
  const s1 = updateInteraction(state, { elapsed: 1000 }, t(1000));
  assert.equal(getProgress(s1), 0.5);
});

test('selectors: getStep / getTotalSteps / isLastStep', () => {
  assert.equal(getStep(null), 0);
  assert.equal(getTotalSteps(null), 0);

  const state = createInteraction('PEST', T0);
  assert.equal(getStep(state), 0);
  assert.equal(getTotalSteps(state), 3);
  assert.equal(isLastStep(state), false);

  const s1 = updateInteraction(state, { stepIndex: 0 }, t(100));
  assert.equal(getStep(s1), 1);
  assert.equal(isLastStep(s1), false);

  const s2 = updateInteraction(s1, { stepIndex: 1 }, t(200));
  assert.equal(getStep(s2), 2);
  assert.equal(isLastStep(s2), true);

  // For non-sequence
  const holdState = createInteraction('WATER', T0);
  assert.equal(getTotalSteps(holdState), 0);
  assert.equal(isLastStep(holdState), false);
});

test('selectors: getInstructionKey', () => {
  // Idle → event-level instruction
  const water = createInteraction('WATER', T0);
  assert.equal(getInstructionKey(water), 'eventWaterDesc');

  // Active hold → progress key
  const activeWater = updateInteraction(water, { elapsed: 500 }, t(500));
  assert.equal(getInstructionKey(activeWater), 'holdWater');

  // Completed → eventResolved
  const doneWater = updateInteraction(activeWater, { elapsed: 2000 }, t(2000));
  assert.equal(getInstructionKey(doneWater), 'eventResolved');

  // Failed → eventFailed
  const failWater = failInteraction(water, t(500));
  assert.equal(getInstructionKey(failWater), 'eventFailed');

  // Cancelled → null
  const cancelWater = cancelInteraction(water, t(500));
  assert.equal(getInstructionKey(cancelWater), null);

  // Sequence: active step
  const pest = createInteraction('PEST', T0);
  assert.equal(getInstructionKey(pest), 'eventPestDesc');
  const pestStep1 = updateInteraction(pest, { stepIndex: 0 }, t(100));
  assert.equal(getInstructionKey(pestStep1), 'pestStep2');

  // Timing: active
  const prune = createInteraction('PRUNE', T0);
  assert.equal(getInstructionKey(prune), 'eventPruneDesc');
  const activePrune = updateInteraction(prune, { elapsed: 250 }, t(250));
  assert.equal(getInstructionKey(activePrune), 'timingPrune');
});

test('selectors: canSubmit', () => {
  // Hold: not ready until progress >= 1
  const water = createInteraction('WATER', T0);
  assert.equal(canSubmit(water), false);
  const halfWater = updateInteraction(water, { elapsed: 1000 }, t(1000));
  assert.equal(canSubmit(halfWater), false);
  const fullWater = updateInteraction(halfWater, { elapsed: 2000 }, t(2000));
  assert.equal(canSubmit(fullWater), false); // already completed

  // Sequence: ready when all steps done
  const pest = createInteraction('PEST', T0);
  assert.equal(canSubmit(pest), false);
  const p1 = updateInteraction(pest, { stepIndex: 0 }, t(100));
  assert.equal(canSubmit(p1), false);
  const p2 = updateInteraction(p1, { stepIndex: 1 }, t(200));
  assert.equal(canSubmit(p2), false);
  const p3 = updateInteraction(p2, { stepIndex: 2 }, t(300));
  assert.equal(canSubmit(p3), false); // already completed

  // Timing: always true
  const prune = createInteraction('PRUNE', T0);
  assert.equal(canSubmit(prune), true);
  const activePrune = updateInteraction(prune, { elapsed: 250 }, t(250));
  assert.equal(canSubmit(activePrune), true);
});

test('selectors: getCompletedAction', () => {
  const state = createInteraction('WATER', T0);
  assert.equal(getCompletedAction(state), null);

  const done = completeInteraction(state, t(1500));
  const action = getCompletedAction(done);
  assert.ok(action);
  assert.equal(action.eventType, 'WATER');
  assert.equal(action.archetype, ARCHETYPE_HOLD);
  assert.equal(action.success, true);
});

test('selectors: getDeterministicMode', () => {
  assert.equal(getDeterministicMode(null), false);
  const normal = createInteraction('WATER', T0);
  assert.equal(getDeterministicMode(normal), false);
  const det = createInteraction('WATER', T0, { deterministicMode: true });
  assert.equal(getDeterministicMode(det), true);
});

test('selectors: getElapsed', () => {
  assert.equal(getElapsed(null), 0);
  const state = createInteraction('WATER', T0);
  assert.equal(getElapsed(state), 0);
  const s1 = updateInteraction(state, { elapsed: 500 }, t(500));
  assert.equal(getElapsed(s1), 500);
});

/* ── Edge cases ────────────────────────────────────────────────── */

test('edge: resetInteraction keeps deterministicMode from old state', () => {
  const state = createInteraction('WATER', T0, { deterministicMode: true });
  const reset = resetInteraction(state, 'STORM', t(500));
  assert.equal(reset.deterministicMode, true);
});

test('edge: resetInteraction can override deterministicMode', () => {
  const state = createInteraction('WATER', T0, { deterministicMode: true });
  const reset = resetInteraction(state, 'STORM', t(500), { deterministicMode: false });
  assert.equal(reset.deterministicMode, false);
});

test('edge: completeInteraction on idle state', () => {
  const state = createInteraction('PEST', T0);
  const result = completeInteraction(state, t(100));
  assert.equal(result.status, STATUS_COMPLETED);
  assert.equal(result.completedAction.success, true);
});

test('edge: failInteraction on idle state', () => {
  const state = createInteraction('SUNLIGHT', T0);
  const result = failInteraction(state, t(100));
  assert.equal(result.status, STATUS_FAILED);
  assert.equal(result.completedAction.success, false);
});

test('edge: cancelInteraction on idle state', () => {
  const state = createInteraction('STORM', T0);
  const result = cancelInteraction(state, t(100));
  assert.equal(result.status, STATUS_CANCELLED);
});

test('edge: force transitions are no-ops after terminal state', () => {
  const state = createInteraction('WATER', T0);
  const done = completeInteraction(state, t(100));

  const fail = failInteraction(done, t(200));
  assert.equal(fail, done);

  const cancel = cancelInteraction(done, t(300));
  assert.equal(cancel, done);

  const complete2 = completeInteraction(done, t(400));
  assert.equal(complete2, done);
});

test('edge: createInteraction for all 6 event types', () => {
  for (const eventType of EVENT_TYPES) {
    const state = createInteraction(eventType, T0);
    assert.equal(state.eventType, eventType);
    assert.equal(state.archetype, EVENT_ARCHETYPES[eventType]);
  }
});

test('edge: completedAction includes original eventType for onAction() call', () => {
  // For each event type, verify the completedAction.eventType is preserved
  for (const eventType of EVENT_TYPES) {
    const state = createInteraction(eventType, T0);
    const done = completeInteraction(state, t(100));
    assert.equal(done.completedAction.eventType, eventType,
      `completedAction should preserve eventType ${eventType}`);
  }
});

/* ── Integration: selectors on null/undefined ──────────────────── */

test('selectors: all return safe defaults for null/undefined state', () => {
  assert.equal(getStatus(null), STATUS_IDLE);
  assert.equal(getStatus(undefined), STATUS_IDLE);
  assert.equal(isActive(null), false);
  assert.equal(isComplete(null), false);
  assert.equal(isFailed(null), false);
  assert.equal(isCancelled(null), false);
  assert.equal(isTerminal(null), false);
  assert.equal(getProgress(null), 0);
  assert.equal(getStep(null), 0);
  assert.equal(getTotalSteps(null), 0);
  assert.equal(isLastStep(null), false);
  assert.equal(getInstructionKey(null), null);
  assert.equal(canSubmit(null), false);
  assert.equal(getCompletedAction(null), null);
  assert.equal(getDeterministicMode(null), false);
  assert.equal(getElapsed(null), 0);
});
