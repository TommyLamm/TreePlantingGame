/**
 * eventInteractionSelectors.js
 *
 * Pure selectors that derive renderer-friendly semantic data from an
 * interaction state.  Every selector returns a plain value – no React
 * hooks, no layout data.
 *
 * Semantic keys returned by instructionKey-related selectors are
 * descriptors; the visual agent maps them to i18n entries.
 */

import {
  ARCHETYPE_HOLD,
  ARCHETYPE_SEQUENCE,
  ARCHETYPE_TIMING,
  getEventDefinition,
  getStepCount,
} from './eventDefinitions.js';

import { STATUS_IDLE, STATUS_ACTIVE, STATUS_COMPLETED, STATUS_FAILED, STATUS_CANCELLED } from './eventInteractionEngine.js';

/* Internal guard flag – must match the engine */
const COMPLETED_FLAG = '__completed';

/* ── Basic state accessors ─────────────────────────────────────── */

/** @returns {'idle'|'active'|'completed'|'failed'|'cancelled'} */
export function getStatus(state) {
  if (!state) return STATUS_IDLE;
  return state.status;
}

/** @returns {boolean} */
export function isActive(state) {
  if (!state) return false;
  return state.status === STATUS_ACTIVE;
}

/** @returns {boolean} */
export function isComplete(state) {
  if (!state) return false;
  return state.status === STATUS_COMPLETED;
}

/** @returns {boolean} */
export function isFailed(state) {
  if (!state) return false;
  return state.status === STATUS_FAILED;
}

/** @returns {boolean} */
export function isCancelled(state) {
  if (!state) return false;
  return state.status === STATUS_CANCELLED;
}

/** @returns {boolean} true when the interaction is in a terminal state */
export function isTerminal(state) {
  if (!state) return false;
  return state.status === STATUS_COMPLETED
    || state.status === STATUS_FAILED
    || state.status === STATUS_CANCELLED;
}

/* ── Progress & step ────────────────────────────────────────────── */

/**
 * Normalised progress 0–1.
 * - hold:     elapsed / durationMs
 * - sequence: completedSteps / totalSteps
 * - timing:   elapsed / windowStartMs (capped at 1)
 */
export function getProgress(state) {
  if (!state) return 0;
  return state.progress;
}

/**
 * Current step index (0-based). Only meaningful for sequence archetype.
 */
export function getStep(state) {
  if (!state) return 0;
  return state.step;
}

/**
 * Total number of steps (0 for non-sequence archetypes).
 */
export function getTotalSteps(state) {
  if (!state) return 0;
  return getStepCount(state.eventType);
}

/**
 * Whether the current step is the last step (for sequence archetype).
 */
export function isLastStep(state) {
  if (!state) return false;
  if (state.archetype !== ARCHETYPE_SEQUENCE) return false;
  return state.step >= getStepCount(state.eventType) - 1;
}

/* ── Instruction key ────────────────────────────────────────────── */

/**
 * Return the semantic instruction key that the renderer should display.
 *
 * The returned key depends on the current archetype and state:
 * - idle:      the event-level instruction key (e.g. 'eventWaterDesc')
 * - active:    archetype-specific key (e.g. 'holdWater', 'pestStep1')
 * - completed: 'eventResolved'
 * - failed:    'eventFailed'
 * - cancelled: null (dismissed, no instruction)
 */
export function getInstructionKey(state) {
  if (!state) return null;

  const def = getEventDefinition(state.eventType);

  if (state.status === STATUS_IDLE) {
    return def.instructionKey;
  }

  if (state.status === STATUS_COMPLETED) {
    return 'eventResolved';
  }

  if (state.status === STATUS_FAILED) {
    return 'eventFailed';
  }

  if (state.status === STATUS_CANCELLED) {
    return null;
  }

  // Active
  switch (state.archetype) {
    case ARCHETYPE_HOLD:
      return def.progressKey || def.instructionKey;

    case ARCHETYPE_SEQUENCE:
      if (state.step < def.steps.length) {
        return def.steps[state.step].instructionKey;
      }
      return def.instructionKey;

    case ARCHETYPE_TIMING:
      return def.timingKey || def.instructionKey;

    default:
      return def.instructionKey;
  }
}

/* ── Submit eligibility ────────────────────────────────────────── */

/**
 * Whether the user can submit / complete the interaction right now.
 *
 * - hold:     progress >= 1 (held long enough)
 * - sequence: all steps completed
 * - timing:   always true (user can always attempt, but timing determines outcome)
 */
export function canSubmit(state) {
  if (!state) return false;
  if (state[COMPLETED_FLAG]) return false;

  switch (state.archetype) {
    case ARCHETYPE_HOLD:
      return state.progress >= 1;
    case ARCHETYPE_SEQUENCE:
      return state.step >= getStepCount(state.eventType);
    case ARCHETYPE_TIMING:
      return true;
    default:
      return false;
  }
}

/* ── Completed action ──────────────────────────────────────────── */

/**
 * Return the completed action record, or null if the interaction hasn't
 * been completed yet.
 *
 * The completed action always includes the original event type so that
 * the visual layer can call onAction(completedAction.eventType) once.
 */
export function getCompletedAction(state) {
  if (!state) return null;
  if (!state[COMPLETED_FLAG]) return null;
  return state.completedAction;
}

/* ── Deterministic mode ────────────────────────────────────────── */

export function getDeterministicMode(state) {
  if (!state) return false;
  return state.deterministicMode;
}

/* ── Archetype ─────────────────────────────────────────────────── */

export function getArchetype(state) {
  if (!state) return null;
  return state.archetype;
}

export function getEventType(state) {
  if (!state) return null;
  return state.eventType;
}

/* ── Elapsed time ──────────────────────────────────────────────── */

export function getElapsed(state) {
  if (!state) return 0;
  return state.elapsed;
}
