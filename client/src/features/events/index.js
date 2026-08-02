/**
 * events – Event Interaction State Machine
 *
 * Public API barrel. Everything exported here is the contract for
 * the visual layer and the integration agent.
 */

export {
  EVENT_TYPES,
  EVENT_ARCHETYPES,
  EVENT_DEFINITIONS,
  ARCHETYPE_HOLD,
  ARCHETYPE_SEQUENCE,
  ARCHETYPE_TIMING,
  getEventDefinition,
  getArchetype,
  getStepCount,
} from './eventDefinitions.js';

export {
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
} from './eventInteractionEngine.js';

export {
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
  getArchetype as getStateArchetype,
  getEventType as getStateEventType,
  getElapsed,
} from './eventInteractionSelectors.js';
