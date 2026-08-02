// Plan 01 — Derive active objectives from game state.
// Returns at most 3 incomplete objectives, highest-priority first.

import { OBJECTIVE_DEFS, getObjectiveCurrent, isObjectiveCompleted } from './objectiveDefinitions.js';

/**
 * @typedef {Object} ActiveObjective
 * @property {string}  id
 * @property {string}  labelKey
 * @property {string}  descriptionKey
 * @property {number}  current
 * @property {number}  target
 * @property {boolean} completed
 * @property {string}  [navigationTarget]
 */

/**
 * Derive at most 3 active objectives from the given game state.
 *
 * @param {Object} game — The full game state object (may be partial / null / missing fields).
 * @returns {ActiveObjective[]} 0–3 descriptors, sorted by priority.
 */
export function deriveObjectives(game) {
  if (!game || typeof game !== 'object') return [];

  const active = [];

  for (const def of OBJECTIVE_DEFS) {
    if (active.length >= 3) break;

    if (isObjectiveCompleted(game, def)) continue;

    const current = getObjectiveCurrent(game, def);

    active.push({
      id: def.id,
      labelKey: def.labelKey,
      descriptionKey: def.descriptionKey,
      current,
      target: def.target,
      completed: false,
      ...(def.navigationTarget ? { navigationTarget: def.navigationTarget } : {}),
    });
  }

  return active;
}
