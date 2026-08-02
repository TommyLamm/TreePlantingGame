/**
 * rewardModel.js — Normalizes/describes server minigame reward result.
 * This module never recomputes rewards; the server is the authority.
 *
 * Semantic result keys for the visual agent:
 *   MINIGAME_RESULT.COINS_EARNED  — coins earned this round
 *   MINIGAME_RESULT.XP_EARNED     — XP earned this round
 *   MINIGAME_RESULT.BONUS_ACTIVE  — bonus was triggered (xpBoost)
 *   MINIGAME_RESULT.GAMES_REMAINING — games left today
 */

export const MINIGAME_RESULT = {
  COINS_EARNED: "minigame.coinsEarned",
  XP_EARNED: "minigame.xpEarned",
  BONUS_ACTIVE: "minigame.bonusActive",
  GAMES_REMAINING: "minigame.gamesRemaining",
};

/**
 * normalizeReward — Accepts the raw server response from claimMinigameReward
 * and returns a clean descriptor. Returns null for invalid/missing responses.
 *
 * @param {object|null|undefined} serverResult
 * @returns {{ coinsEarned: number, xpEarned: number, gamesRemaining: number, bonus: object|null, goldenHourUntil: number }|null}
 */
export function normalizeReward(serverResult) {
  if (!serverResult || typeof serverResult !== "object") {
    return null;
  }

  return {
    coinsEarned: Number.isFinite(serverResult.coinsEarned)
      ? serverResult.coinsEarned
      : 0,
    xpEarned: Number.isFinite(serverResult.xpEarned)
      ? serverResult.xpEarned
      : 0,
    gamesRemaining: Number.isFinite(serverResult.gamesRemaining)
      ? serverResult.gamesRemaining
      : 0,
    bonus: serverResult.bonus && typeof serverResult.bonus === "object"
      ? { type: serverResult.bonus.type, duration: serverResult.bonus.duration, multiplier: serverResult.bonus.multiplier }
      : null,
    goldenHourUntil: Number.isFinite(serverResult.goldenHourUntil)
      ? serverResult.goldenHourUntil
      : 0,
  };
}
