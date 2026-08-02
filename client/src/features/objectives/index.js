// Plan 01 — Barrel exports

export { OBJECTIVE_DEFS, getObjectiveCurrent, isObjectiveCompleted } from './objectiveDefinitions.js';
export { deriveObjectives } from './deriveObjectives.js';
export {
  ONBOARDING_STEPS,
  createInitialOnboardingState,
  onboardingReducer,
  restoreOnboardingState,
} from './onboardingState.js';
