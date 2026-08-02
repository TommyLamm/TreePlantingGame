/**
 * Normalize the garden help API response into a consistent shape.
 * @param {object} raw - The raw JSON response from POST /api/garden/help
 * @returns {{ success: boolean, reward: { coins: number, xp: number }, ownerHelpCount: number }}
 */
export function normalizeHelpResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    return { success: false, reward: { coins: 0, xp: 0 }, ownerHelpCount: 0 };
  }
  return {
    success: !!raw.success,
    reward: {
      coins: typeof raw.reward?.coins === 'number' ? raw.reward.coins : 0,
      xp: typeof raw.reward?.xp === 'number' ? raw.reward.xp : 0,
    },
    ownerHelpCount: typeof raw.ownerHelpCount === 'number' ? raw.ownerHelpCount : 0,
  };
}

/**
 * Semantic error descriptors for garden help.
 * Keys map to server error messages for UI-friendly display.
 */
export const HELP_ERROR_DESCRIPTORS = {
  'Cannot help your own garden': { type: 'self_help', messageKey: 'social.help.errorSelf' },
  'Helper not found': { type: 'helper_not_found', messageKey: 'social.help.errorHelperNotFound' },
  'Owner not found': { type: 'owner_not_found', messageKey: 'social.help.errorOwnerNotFound' },
  'Already helped a garden today': { type: 'daily_limit', messageKey: 'social.help.errorDailyLimit' },
  'Garden help is full for today': { type: 'garden_full', messageKey: 'social.help.errorGardenFull' },
  'Already helped this garden today': { type: 'already_helped', messageKey: 'social.help.errorAlreadyHelped' },
  'Invalid coin balance': { type: 'invalid_balance', messageKey: 'social.help.errorInvalidBalance' },
  'Invalid XP balance': { type: 'invalid_balance', messageKey: 'social.help.errorInvalidBalance' },
};

/**
 * Derive a semantic error descriptor from a garden help error.
 * @param {Error} error
 * @returns {{ type: string, messageKey: string }}
 */
export function getHelpErrorDescriptor(error) {
  if (!error || !error.message) {
    return { type: 'unknown', messageKey: 'social.help.errorUnknown' };
  }
  const descriptor = HELP_ERROR_DESCRIPTORS[error.message];
  if (descriptor) return descriptor;
  return { type: 'unknown', messageKey: 'social.help.errorUnknown' };
}

/**
 * Semantic state descriptors for garden help status.
 */
export const HELP_STATE_DESCRIPTORS = {
  available: { type: 'available', messageKey: 'social.help.stateAvailable', canHelp: true },
  alreadyHelped: { type: 'already_helped', messageKey: 'social.help.stateAlreadyHelped', canHelp: false },
  dailyLimitReached: { type: 'daily_limit', messageKey: 'social.help.stateDailyLimit', canHelp: false },
  gardenFull: { type: 'garden_full', messageKey: 'social.help.stateGardenFull', canHelp: false },
  selfHelp: { type: 'self_help', messageKey: 'social.help.stateSelfHelp', canHelp: false },
};
