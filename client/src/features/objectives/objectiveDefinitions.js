// Plan 01 — Objective Definitions
// Semantic keys for the visual agent to consume; translations belong in i18n.js.

/**
 * @typedef {Object} ObjectiveDef
 * @property {string} id            — Unique key, e.g. "first_event"
 * @property {string} labelKey      — i18n key for the objective title
 * @property {string} descriptionKey — i18n key for the objective description
 * @property {number} target        — Value needed to complete
 * @property {string} [navigationTarget] — Optional screen route hint
 */

/** All objective definitions in priority order. */
export const OBJECTIVE_DEFS = [
  {
    id: 'first_event',
    labelKey: 'objFirstEvent',
    descriptionKey: 'objFirstEventDesc',
    target: 1,
    navigationTarget: 'event',
  },
  {
    id: 'level_5',
    labelKey: 'objLevel5',
    descriptionKey: 'objLevel5Desc',
    target: 5,
    navigationTarget: 'game',
  },
  {
    id: 'first_skin',
    labelKey: 'objFirstSkin',
    descriptionKey: 'objFirstSkinDesc',
    target: 1,
    navigationTarget: 'store',
  },
  {
    id: 'first_companion',
    labelKey: 'objFirstCompanion',
    descriptionKey: 'objFirstCompanionDesc',
    target: 1,
    navigationTarget: 'companions',
  },
  {
    id: 'prestige_ready',
    labelKey: 'objPrestigeReady',
    descriptionKey: 'objPrestigeReadyDesc',
    target: 50,
    navigationTarget: 'prestige',
  },
];

/** IDs of store items whose type is "skin" (non-default). */
const SKIN_ITEM_IDS = new Set(['cherry', 'autumn', 'snow', 'golden']);

/**
 * Read the current progress for a given objective from the game state.
 * Returns a safe number, never NaN or null.
 *
 * @param {Object} game
 * @param {ObjectiveDef} def
 * @returns {number}
 */
export function getObjectiveCurrent(game, def) {
  if (!game || typeof game !== 'object') return 0;

  switch (def.id) {
    case 'first_event':
      return safeNumber(game.totalEventsResolved);
    case 'level_5':
      return safeNumber(game.level);
    case 'first_skin': {
      const inv = game.inventory;
      if (!inv || typeof inv !== 'object') return 0;
      const unlockedSkins = Array.isArray(inv.unlockedSkins)
        ? inv.unlockedSkins
        : Array.isArray(inv.owned)
          ? inv.owned
          : [];
      return unlockedSkins.filter(id => SKIN_ITEM_IDS.has(id)).length;
    }
    case 'first_companion': {
      const companion = game.companion;
      if (typeof companion === 'string') return companion.length > 0 ? 1 : 0;
      return companion && typeof companion === 'object' && companion.id ? 1 : 0;
    }
    case 'prestige_ready':
      return safeNumber(game.level);
    default:
      return 0;
  }
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Check whether an objective is completed.
 * @param {Object} game
 * @param {ObjectiveDef} def
 * @returns {boolean}
 */
export function isObjectiveCompleted(game, def) {
  return getObjectiveCurrent(game, def) >= def.target;
}
