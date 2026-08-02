// Plan 01 — Onboarding state machine (pure reducer).
// Serialisable, no side effects, no localStorage access.

/**
 * @typedef {Object} OnboardingState
 * @property {boolean} active    — Whether the onboarding flow is currently shown
 * @property {number}  step      — Current step index (0-based)
 * @property {number}  stepCount — Total number of steps
 * @property {boolean} completed — Whether the user has finished all steps
 * @property {boolean} dismissed — Whether the user dismissed the onboarding
 */

/**
 * Default onboarding steps (semantic keys only).
 * Visual agent maps these to actual UI content.
 */
export const ONBOARDING_STEPS = [
  { id: 'welcome',         labelKey: 'onboardingWelcome',     descriptionKey: 'onboardingWelcomeDesc' },
  { id: 'first_plant',     labelKey: 'onboardingFirstPlant',  descriptionKey: 'onboardingFirstPlantDesc' },
  { id: 'first_event',     labelKey: 'onboardingFirstEvent',  descriptionKey: 'onboardingFirstEventDesc' },
  { id: 'level_5',         labelKey: 'onboardingLevel5',      descriptionKey: 'onboardingLevel5Desc' },
  { id: 'store_intro',     labelKey: 'onboardingStoreIntro',  descriptionKey: 'onboardingStoreIntroDesc' },
  { id: 'companion_intro', labelKey: 'onboardingCompanionIntro', descriptionKey: 'onboardingCompanionIntroDesc' },
  { id: 'done',            labelKey: 'onboardingDone',        descriptionKey: 'onboardingDoneDesc' },
];

/** @returns {OnboardingState} */
export function createInitialOnboardingState() {
  return {
    active: false,
    step: 0,
    stepCount: ONBOARDING_STEPS.length,
    completed: false,
    dismissed: false,
  };
}

/**
 * Supported action types:
 *   start    — Begin the onboarding flow (sets active=true, step=0)
 *   next     — Advance one step (caps at last step)
 *   back     — Go back one step (floors at 0)
 *   dismiss  — Silently dismiss (sets dismissed=true, active=false)
 *   complete — Mark fully complete (sets completed=true, active=false)
 *   restore  — Replace entire state with the given payload (for deserialisation)
 *
 * @param {OnboardingState} state
 * @param {Object}          action  — { type: string, [payload]: any }
 * @returns {OnboardingState}
 */
export function onboardingReducer(state, action) {
  if (!state || typeof state !== 'object') {
    state = createInitialOnboardingState();
  }

  switch (action.type) {
    case 'start':
      return {
        ...state,
        active: true,
        step: 0,
        completed: false,
        dismissed: false,
      };

    case 'next': {
      const nextStep = Math.min(state.step + 1, state.stepCount - 1);
      const isLast = nextStep >= state.stepCount - 1;
      return {
        ...state,
        step: nextStep,
        completed: isLast,
        active: !isLast,
      };
    }

    case 'back':
      return {
        ...state,
        step: Math.max(state.step - 1, 0),
      };

    case 'dismiss':
      return {
        ...state,
        active: false,
        dismissed: true,
      };

    case 'complete':
      return {
        ...state,
        active: false,
        completed: true,
        step: state.stepCount - 1,
      };

    case 'restore':
      return restoreOnboardingState(action.payload);

    default:
      return state;
  }
}

/**
 * Safely restore an OnboardingState from a serialised payload.
 * Invalid / missing fields fall back to the initial state values.
 *
 * @param {any} payload
 * @returns {OnboardingState}
 */
export function restoreOnboardingState(payload) {
  if (!payload || typeof payload !== 'object') {
    return createInitialOnboardingState();
  }

  const stepCount = Number.isFinite(payload.stepCount)
    ? Math.max(1, Math.floor(payload.stepCount))
    : ONBOARDING_STEPS.length;
  const requestedStep = Number(payload.step);

  return {
    active: !!payload.active,
    step: Number.isFinite(requestedStep) ? clamp(requestedStep, 0, stepCount - 1) : 0,
    stepCount,
    completed: !!payload.completed,
    dismissed: !!payload.dismissed,
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Math.floor(v)));
}
