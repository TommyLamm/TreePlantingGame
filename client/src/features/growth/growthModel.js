// ──────────────────────────────────────────────
// Growth Model — growth stages, milestones, and micro-growth descriptors
// ──────────────────────────────────────────────

// Stage thresholds: 1, 5, 12, 26, 46, 66, 86
const STAGES = [
  { level: 1,  stage: 1, nameKey: 'growthStage1' },
  { level: 5,  stage: 2, nameKey: 'growthStage2' },
  { level: 12, stage: 3, nameKey: 'growthStage3' },
  { level: 26, stage: 4, nameKey: 'growthStage4' },
  { level: 46, stage: 5, nameKey: 'growthStage5' },
  { level: 66, stage: 6, nameKey: 'growthStage6' },
  { level: 86, stage: 7, nameKey: 'growthStage7' },
];

const MAX_STAGE = 7;
const MAX_LEVEL = 100;

/**
 * Normalize a raw level value to a safe clamped integer in [1, MAX_LEVEL].
 * Returns NaN for truly non-numeric values (null, undefined, non-numeric strings, NaN, -Infinity).
 * Returns MAX_LEVEL for +Infinity.
 */
function toSafeLevel(raw) {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return raw > 0 ? MAX_LEVEL : NaN;
    }
    return Math.max(1, Math.min(MAX_LEVEL, Math.floor(raw)));
  }
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(1, Math.min(MAX_LEVEL, Math.floor(n)));
  }
  return NaN;
}

/**
 * Get the current growth stage (1–7) for a given level.
 * @param {number|string} rawLevel
 * @returns {number} stage (1–7)
 */
export function getGrowthStage(rawLevel) {
  const level = toSafeLevel(rawLevel);
  if (isNaN(level)) return 1;
  let stage = 1;
  for (const s of STAGES) {
    if (level >= s.level) stage = s.stage;
  }
  return Math.min(stage, MAX_STAGE);
}

/**
 * Get the next milestone for a given level.
 * @param {number|string} rawLevel
 * @returns {{ level: number, stage: number, nameKey: string, isMax: boolean }}
 */
export function getNextMilestone(rawLevel) {
  const level = toSafeLevel(rawLevel);
  if (isNaN(level)) {
    return { level: 1, stage: 1, nameKey: 'growthStage1', isMax: false };
  }
  for (const s of STAGES) {
    if (level < s.level) {
      return { level: s.level, stage: s.stage, nameKey: s.nameKey, isMax: false };
    }
  }
  // Past all defined milestones
  return { level: MAX_LEVEL, stage: MAX_STAGE, nameKey: STAGES[STAGES.length - 1].nameKey, isMax: true };
}

/**
 * Get deterministic micro-growth descriptors for a given level.
 * Every 5-level bucket produces a deterministic tier combination.
 *
 * @param {number|string} rawLevel
 * @param {object} [_context] — reserved for future contextual modifiers
 * @returns {{ groundGrowthTier: number, flowerTier: number, fruitTier: number, wildlifeTier: number }}
 */
export function getGrowthPresentation(rawLevel, _context = {}) {
  const level = toSafeLevel(rawLevel);
  if (isNaN(level)) {
    return { groundGrowthTier: 1, flowerTier: 0, fruitTier: 0, wildlifeTier: 0 };
  }

  // groundGrowthTier: 1 at level 1, increments every 20 levels, max 4
  const groundGrowthTier = Math.min(4, 1 + Math.floor(Math.max(0, level - 1) / 20));

  // flowerTier: starts at 1 at level 10, increments every 15 levels, max 3
  const flowerTier = level >= 10
    ? Math.min(3, 1 + Math.floor((level - 10) / 15))
    : 0;

  // fruitTier: starts at 1 at level 20, increments every 20 levels, max 3
  const fruitTier = level >= 20
    ? Math.min(3, 1 + Math.floor((level - 20) / 20))
    : 0;

  // wildlifeTier: starts at 1 at level 30, increments every 25 levels, max 3
  const wildlifeTier = level >= 30
    ? Math.min(3, 1 + Math.floor((level - 30) / 25))
    : 0;

  return { groundGrowthTier, flowerTier, fruitTier, wildlifeTier };
}
