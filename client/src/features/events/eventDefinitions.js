/**
 * eventDefinitions.js
 *
 * Maps the 6 event types to 3 interaction archetypes:
 *   hold     – user holds/interacts for a sustained duration
 *   sequence – user performs a series of steps in order
 *   timing   – user acts at the correct moment within a window
 *
 * All config values are plain numbers / strings – no runtime dependencies.
 */

/** @type {'hold'|'sequence'|'timing'} */
export const ARCHETYPE_HOLD = 'hold';
export const ARCHETYPE_SEQUENCE = 'sequence';
export const ARCHETYPE_TIMING = 'timing';

/** Map event type → archetype */
export const EVENT_ARCHETYPES = {
  WATER:     ARCHETYPE_HOLD,
  SUNLIGHT:  ARCHETYPE_HOLD,
  PEST:      ARCHETYPE_SEQUENCE,
  FERTILIZE: ARCHETYPE_SEQUENCE,
  PRUNE:     ARCHETYPE_TIMING,
  STORM:     ARCHETYPE_TIMING,
};

/** All recognised event type strings */
export const EVENT_TYPES = Object.keys(EVENT_ARCHETYPES);

/**
 * Per-event config.
 *
 * Semantic keys (instructionKey, step instructionKeys) are NOT i18n
 * translations – they are descriptors that the visual agent maps to
 * actual translation entries.
 */
export const EVENT_DEFINITIONS = {
  WATER: {
    archetype: ARCHETYPE_HOLD,
    durationMs: 2000,
    instructionKey: 'eventWaterDesc',
    progressKey: 'holdWater',
  },
  SUNLIGHT: {
    archetype: ARCHETYPE_HOLD,
    durationMs: 3000,
    instructionKey: 'eventSunlightDesc',
    progressKey: 'holdSunlight',
  },
  PEST: {
    archetype: ARCHETYPE_SEQUENCE,
    steps: [
      { instructionKey: 'pestStep1' },
      { instructionKey: 'pestStep2' },
      { instructionKey: 'pestStep3' },
    ],
    instructionKey: 'eventPestDesc',
  },
  FERTILIZE: {
    archetype: ARCHETYPE_SEQUENCE,
    steps: [
      { instructionKey: 'fertilizeStep1' },
      { instructionKey: 'fertilizeStep2' },
    ],
    instructionKey: 'eventFertilizeDesc',
  },
  PRUNE: {
    archetype: ARCHETYPE_TIMING,
    windowStartMs: 500,
    windowEndMs: 2500,
    totalWindowMs: 3000,
    instructionKey: 'eventPruneDesc',
    timingKey: 'timingPrune',
  },
  STORM: {
    archetype: ARCHETYPE_TIMING,
    windowStartMs: 300,
    windowEndMs: 2000,
    totalWindowMs: 3000,
    instructionKey: 'eventStormDesc',
    timingKey: 'timingStorm',
  },
};

/**
 * Return the definition for a given event type.
 * Throws if the event type is unknown.
 */
export function getEventDefinition(eventType) {
  const def = EVENT_DEFINITIONS[eventType];
  if (!def) {
    throw new Error(`Unknown event type: "${eventType}". Valid types: ${EVENT_TYPES.join(', ')}`);
  }
  return def;
}

/**
 * Return the archetype for a given event type.
 */
export function getArchetype(eventType) {
  return EVENT_ARCHETYPES[eventType] || null;
}

/**
 * Return the number of steps for a sequence archetype event.
 * Returns 0 for non-sequence events.
 */
export function getStepCount(eventType) {
  const def = EVENT_DEFINITIONS[eventType];
  if (def && def.archetype === ARCHETYPE_SEQUENCE) {
    return def.steps.length;
  }
  return 0;
}
