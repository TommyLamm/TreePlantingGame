import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeReward, MINIGAME_RESULT } from "../src/features/minigame/rewardModel.js";

test("MINIGAME_RESULT exports semantic keys as strings", () => {
  assert.equal(typeof MINIGAME_RESULT.COINS_EARNED, "string");
  assert.equal(typeof MINIGAME_RESULT.XP_EARNED, "string");
  assert.equal(typeof MINIGAME_RESULT.BONUS_ACTIVE, "string");
  assert.equal(typeof MINIGAME_RESULT.GAMES_REMAINING, "string");
  assert.ok(MINIGAME_RESULT.COINS_EARNED.startsWith("minigame."));
  assert.ok(MINIGAME_RESULT.XP_EARNED.startsWith("minigame."));
  assert.ok(MINIGAME_RESULT.BONUS_ACTIVE.startsWith("minigame."));
  assert.ok(MINIGAME_RESULT.GAMES_REMAINING.startsWith("minigame."));
});

test("normalizeReward returns null for null/undefined/non-object", () => {
  assert.equal(normalizeReward(null), null);
  assert.equal(normalizeReward(undefined), null);
  assert.equal(normalizeReward("string"), null);
  assert.equal(normalizeReward(42), null);
});

test("normalizeReward returns clean descriptor for valid server response", () => {
  const result = normalizeReward({
    coinsEarned: 150,
    xpEarned: 12,
    gamesRemaining: 1,
    bonus: null,
    goldenHourUntil: 0,
  });

  assert.deepEqual(result, {
    coinsEarned: 150,
    xpEarned: 12,
    gamesRemaining: 1,
    bonus: null,
    goldenHourUntil: 0,
  });
});

test("normalizeReward returns clean descriptor with bonus", () => {
  const result = normalizeReward({
    coinsEarned: 200,
    xpEarned: 20,
    gamesRemaining: 2,
    bonus: { type: "xpBoost", duration: 300000, multiplier: 2 },
    goldenHourUntil: 123456789,
  });

  assert.deepEqual(result, {
    coinsEarned: 200,
    xpEarned: 20,
    gamesRemaining: 2,
    bonus: { type: "xpBoost", duration: 300000, multiplier: 2 },
    goldenHourUntil: 123456789,
  });
});

test("normalizeReward defaults missing numeric fields to 0", () => {
  const result = normalizeReward({});

  assert.equal(result.coinsEarned, 0);
  assert.equal(result.xpEarned, 0);
  assert.equal(result.gamesRemaining, 0);
  assert.equal(result.bonus, null);
  assert.equal(result.goldenHourUntil, 0);
});

test("normalizeReward sanitizes non-finite numeric values and preserves valid ones", () => {
  const result = normalizeReward({
    coinsEarned: Number.NaN,
    xpEarned: Number.POSITIVE_INFINITY,
    gamesRemaining: 0,
    bonus: null,
    goldenHourUntil: null,
  });

  assert.equal(result.coinsEarned, 0);
  assert.equal(result.xpEarned, 0);
  assert.equal(result.gamesRemaining, 0);
  assert.equal(result.bonus, null);
  assert.equal(result.goldenHourUntil, 0);
});

test("normalizeReward preserves bonus shape", () => {
  const result = normalizeReward({
    coinsEarned: 100,
    xpEarned: 10,
    gamesRemaining: 2,
    bonus: { type: "xpBoost", duration: 300000, multiplier: 2 },
    goldenHourUntil: 0,
  });

  assert.equal(result.bonus.type, "xpBoost");
  assert.equal(result.bonus.duration, 300000);
  assert.equal(result.bonus.multiplier, 2);
});

test("normalizeReward treats non-object bonus as null", () => {
  const result = normalizeReward({
    coinsEarned: 100,
    xpEarned: 10,
    gamesRemaining: 2,
    bonus: "string_bonus",
    goldenHourUntil: 0,
  });

  assert.equal(result.bonus, null);
});
