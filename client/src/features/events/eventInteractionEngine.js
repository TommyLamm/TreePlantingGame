/**
 * eventInteractionEngine.js
 *
 * Pure-logic state machine for event micro-interactions.
 *
 * All functions are deterministic: timestamps and elapsed values are
 * provided by the caller (never read from Date.now()).
 *
 * State is always serializable and never mutated in place – every
 * function returns a new state object (or self on no-op).
 */

import {
  ARCHETYPE_HOLD,
  ARCHETYPE_SEQUENCE,
  ARCHETYPE_TIMING,
  EVENT_DEFINITIONS,
  EVENT_TYPES,
  getEventDefinition,
  getStepCount,
} from './eventDefinitions.js';

/* ── Status constants ──────────────────────────────────────────── */

export const STATUS_IDLE = 'idle';
export const STATUS_ACTIVE = 'active';
export const STATUS_COMPLETED = 'completed';
export const STATUS_FAILED = 'failed';
export const STATUS_CANCELLED = 'cancelled';

/* ── Internal guard flag ───────────────────────────────────────── */

const COMPLETED_FLAG = '__completed';

/* ── Factory ───────────────────────────────────────────────────── */

/**
 * Create a fresh interaction state.
 *
 * @param {string}  eventType   One of EVENT_TYPES
 * @param {number}  timestamp   Caller-provided monotonic timestamp (ms)
 * @param {object}  [options]
 * @param {boolean} [options.deterministicMode=false]
 *        When true, the engine favours instant completion suitable for
 *        reduced-motion / accessibility scenarios.
 * @returns {object} New interaction state
 */
export function createInteraction(eventType, timestamp, options = {}) {
  if (!EVENT_TYPES.includes(eventType)) {
    throw new Error(`Unknown event type: "${eventType}". Valid types: ${EVENT_TYPES.join(', ')}`);
  }

  const definition = getEventDefinition(eventType);
  const deterministicMode = Boolean(options.deterministicMode);

  return {
    eventType,
    archetype: definition.archetype,
    status: STATUS_IDLE,
    progress: 0,
    step: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
    elapsed: 0,
    completedAction: null,
    [COMPLETED_FLAG]: false,
    deterministicMode,
  };
}

/* ── Update (archetype-specific input) ─────────────────────────── */

/**
 * Advance the interaction with user input.
 *
 * Input shape depends on archetype:
 *   hold     { elapsed: number }  – elapsed ms since start
 *   sequence { stepIndex: number } – the step the user performed
 *   timing   { elapsed: number }  – elapsed ms at which the user acted
 *
 * Returns a new state. If the interaction is already completed/failed/
 * cancelled, returns the same state reference (guard).
 *
 * @param {object} state  Current interaction state
 * @param {object} input  Archetype-specific input
 * @param {number} timestamp  Caller-provided timestamp
 * @returns {object} New state (or same reference if guarded)
 */
export function updateInteraction(state, input, timestamp) {
  if (state[COMPLETED_FLAG]) {
    return state;
  }

  const definition = getEventDefinition(state.eventType);
  const elapsed = state.deterministicMode
    ? definition.durationMs || 1
    : (input.elapsed != null ? input.elapsed : state.elapsed);

  switch (state.archetype) {
    case ARCHETYPE_HOLD:
      return updateHold(state, definition, input, elapsed, timestamp);
    case ARCHETYPE_SEQUENCE:
      return updateSequence(state, definition, input, timestamp);
    case ARCHETYPE_TIMING:
      return updateTiming(state, definition, input, elapsed, timestamp);
    default:
      return state;
  }
}

/* ── Force transitions ─────────────────────────────────────────── */

/**
 * Force-complete the interaction. Records the completed action.
 * No-op if already completed/failed/cancelled.
 */
export function completeInteraction(state, timestamp) {
  if (state[COMPLETED_FLAG]) return state;
  return produceCompleted(state, timestamp, true);
}

/**
 * Force-fail the interaction.
 * No-op if already completed/failed/cancelled.
 */
export function failInteraction(state, timestamp) {
  if (state[COMPLETED_FLAG]) return state;
  return {
    ...state,
    status: STATUS_FAILED,
    progress: state.progress,
    step: state.step,
    updatedAt: timestamp,
    elapsed: timestamp - state.startedAt,
    [COMPLETED_FLAG]: true,
    completedAction: {
      eventType: state.eventType,
      archetype: state.archetype,
      success: false,
      duration: timestamp - state.startedAt,
    },
  };
}

/**
 * Cancel the interaction (user dismissed it).
 * No-op if already completed/failed/cancelled.
 */
export function cancelInteraction(state, timestamp) {
  if (state[COMPLETED_FLAG]) return state;
  return {
    ...state,
    status: STATUS_CANCELLED,
    updatedAt: timestamp,
    elapsed: timestamp - state.startedAt,
    [COMPLETED_FLAG]: true,
    completedAction: {
      eventType: state.eventType,
      archetype: state.archetype,
      success: false,
      duration: timestamp - state.startedAt,
    },
  };
}

/**
 * Reset the interaction for a (potentially new) event type.
 * Returns a fresh interaction state via createInteraction.
 */
export function resetInteraction(state, eventType, timestamp, options = {}) {
  return createInteraction(eventType, timestamp, {
    deterministicMode: options.deterministicMode != null
      ? options.deterministicMode
      : state.deterministicMode,
  });
}

/* ── Internal archetype updaters ───────────────────────────────── */

function updateHold(state, definition, input, elapsed, timestamp) {
  const progress = Math.min(elapsed / definition.durationMs, 1);

  // In deterministic mode, complete immediately on first update
  if (state.deterministicMode && !state[COMPLETED_FLAG] && progress > 0) {
    return produceCompleted(
      { ...state, progress: 1, updatedAt: timestamp, elapsed },
      timestamp,
      true,
    );
  }

  // Auto-complete when progress reaches 1.0
  if (progress >= 1) {
    return produceCompleted(
      { ...state, progress: 1, updatedAt: timestamp, elapsed },
      timestamp,
      true,
    );
  }

  // User released before completing → fail
  if (input.released === true) {
    return {
      ...state,
      status: STATUS_FAILED,
      progress,
      step: 0,
      updatedAt: timestamp,
      elapsed,
      [COMPLETED_FLAG]: true,
      completedAction: {
        eventType: state.eventType,
        archetype: state.archetype,
        success: false,
        duration: elapsed,
      },
    };
  }

  return {
    ...state,
    status: STATUS_ACTIVE,
    progress,
    updatedAt: timestamp,
    elapsed,
  };
}

function updateSequence(state, definition, input, timestamp) {
  const stepIndex = input.stepIndex;
  if (typeof stepIndex !== 'number') {
    // No step input provided – just stay active
    return {
      ...state,
      status: STATUS_ACTIVE,
      updatedAt: timestamp,
    };
  }

  const expectedStep = state.step;

  // In deterministic mode, any valid stepIndex completes all steps
  if (state.deterministicMode) {
    const totalSteps = getStepCount(state.eventType);
    return produceCompleted(
      { ...state, step: totalSteps, updatedAt: timestamp },
      timestamp,
      true,
    );
  }

  if (stepIndex === expectedStep) {
    const nextStep = expectedStep + 1;
    const totalSteps = getStepCount(state.eventType);

    if (nextStep >= totalSteps) {
      // All steps done – complete
      return produceCompleted(
        { ...state, step: nextStep, updatedAt: timestamp, progress: 1 },
        timestamp,
        true,
      );
    }

    return {
      ...state,
      status: STATUS_ACTIVE,
      step: nextStep,
      progress: nextStep / totalSteps,
      updatedAt: timestamp,
    };
  }

  // Wrong step → fail
  return {
    ...state,
    status: STATUS_FAILED,
    step: state.step,
    progress: state.progress,
    updatedAt: timestamp,
    elapsed: timestamp - state.startedAt,
    [COMPLETED_FLAG]: true,
    completedAction: {
      eventType: state.eventType,
      archetype: state.archetype,
      success: false,
      duration: timestamp - state.startedAt,
    },
  };
}

function updateTiming(state, definition, input, elapsed, timestamp) {
  // In deterministic mode, act immediately on first update
  if (state.deterministicMode && !state[COMPLETED_FLAG]) {
    return produceCompleted(
      { ...state, updatedAt: timestamp, elapsed: 1 },
      timestamp,
      true,
    );
  }

  if (elapsed > definition.totalWindowMs) {
    // Past the window – fail
    return {
      ...state,
      status: STATUS_FAILED,
      progress: 1,
      updatedAt: timestamp,
      elapsed,
      [COMPLETED_FLAG]: true,
      completedAction: {
        eventType: state.eventType,
        archetype: state.archetype,
        success: false,
        duration: elapsed,
      },
    };
  }

  // User hasn't acted yet – report progress
  const progress = Math.min(elapsed / definition.windowStartMs, 1);

  return {
    ...state,
    status: STATUS_ACTIVE,
    progress,
    updatedAt: timestamp,
    elapsed,
  };
}

/* ── Shared completed-state builder ─────────────────────────────── */

function produceCompleted(state, timestamp, success) {
  return {
    ...state,
    status: STATUS_COMPLETED,
    progress: 1,
    updatedAt: timestamp,
    elapsed: timestamp - state.startedAt,
    [COMPLETED_FLAG]: true,
    completedAction: {
      eventType: state.eventType,
      archetype: state.archetype,
      success,
      duration: timestamp - state.startedAt,
    },
  };
}
