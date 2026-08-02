import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getGrowthStage,
  getNextMilestone,
  getGrowthPresentation,
  getWeatherPresentation,
} from '../src/features/growth/index.js';

// ──────────────────────────────────────────────
//  getGrowthStage
// ──────────────────────────────────────────────

test('getGrowthStage — stage 1 at level 1', () => {
  assert.equal(getGrowthStage(1), 1);
});

test('getGrowthStage — stage 2 at level 5', () => {
  assert.equal(getGrowthStage(5), 2);
});

test('getGrowthStage — stage 3 at level 12', () => {
  assert.equal(getGrowthStage(12), 3);
});

test('getGrowthStage — stage 4 at level 26', () => {
  assert.equal(getGrowthStage(26), 4);
});

test('getGrowthStage — stage 5 at level 46', () => {
  assert.equal(getGrowthStage(46), 5);
});

test('getGrowthStage — stage 6 at level 66', () => {
  assert.equal(getGrowthStage(66), 6);
});

test('getGrowthStage — stage 7 at level 86', () => {
  assert.equal(getGrowthStage(86), 7);
});

test('getGrowthStage — stage 7 at level 100', () => {
  assert.equal(getGrowthStage(100), 7);
});

test('getGrowthStage — stage boundaries (level just below threshold)', () => {
  assert.equal(getGrowthStage(4), 1, 'level 4 should be stage 1');
  assert.equal(getGrowthStage(11), 2, 'level 11 should be stage 2');
  assert.equal(getGrowthStage(25), 3, 'level 25 should be stage 3');
  assert.equal(getGrowthStage(45), 4, 'level 45 should be stage 4');
  assert.equal(getGrowthStage(65), 5, 'level 65 should be stage 5');
  assert.equal(getGrowthStage(85), 6, 'level 85 should be stage 6');
});

test('getGrowthStage — NaN returns 1', () => {
  assert.equal(getGrowthStage(NaN), 1);
});

test('getGrowthStage — Infinity treated as max level', () => {
  assert.equal(getGrowthStage(Infinity), 7);
});

test('getGrowthStage — -Infinity returns 1', () => {
  assert.equal(getGrowthStage(-Infinity), 1);
});

test('getGrowthStage — string level parses correctly', () => {
  assert.equal(getGrowthStage('5'), 2);
  assert.equal(getGrowthStage('86'), 7);
});

test('getGrowthStage — non-numeric string returns 1', () => {
  assert.equal(getGrowthStage('abc'), 1);
  assert.equal(getGrowthStage(''), 1);
});

test('getGrowthStage — null / undefined returns 1', () => {
  assert.equal(getGrowthStage(null), 1);
  assert.equal(getGrowthStage(undefined), 1);
});

test('getGrowthStage — negative level returns 1', () => {
  assert.equal(getGrowthStage(-5), 1);
});

test('getGrowthStage — fractional level floors correctly', () => {
  assert.equal(getGrowthStage(5.9), 2);
  assert.equal(getGrowthStage(11.1), 2);
  assert.equal(getGrowthStage(25.999), 3);
});

// ──────────────────────────────────────────────
//  getNextMilestone
// ──────────────────────────────────────────────

test('getNextMilestone — level 1 returns next milestone 5', () => {
  const m = getNextMilestone(1);
  assert.equal(m.level, 5);
  assert.equal(m.stage, 2);
  assert.equal(m.nameKey, 'growthStage2');
  assert.equal(m.isMax, false);
});

test('getNextMilestone — level 4 returns milestone 5', () => {
  const m = getNextMilestone(4);
  assert.equal(m.level, 5);
  assert.equal(m.stage, 2);
  assert.equal(m.isMax, false);
});

test('getNextMilestone — level 5 returns milestone 12', () => {
  const m = getNextMilestone(5);
  assert.equal(m.level, 12);
  assert.equal(m.stage, 3);
  assert.equal(m.isMax, false);
});

test('getNextMilestone — level 85 returns milestone 86', () => {
  const m = getNextMilestone(85);
  assert.equal(m.level, 86);
  assert.equal(m.stage, 7);
  assert.equal(m.isMax, false);
});

test('getNextMilestone — level 86 returns isMax', () => {
  const m = getNextMilestone(86);
  assert.equal(m.level, 100);
  assert.equal(m.stage, 7);
  assert.equal(m.isMax, true);
});

test('getNextMilestone — level 100 returns isMax', () => {
  const m = getNextMilestone(100);
  assert.equal(m.level, 100);
  assert.equal(m.stage, 7);
  assert.equal(m.isMax, true);
});

test('getNextMilestone — NaN returns fallback', () => {
  const m = getNextMilestone(NaN);
  assert.equal(m.level, 1);
  assert.equal(m.stage, 1);
  assert.equal(m.isMax, false);
});

test('getNextMilestone — Infinity returns max milestone', () => {
  const m = getNextMilestone(Infinity);
  assert.equal(m.level, 100);
  assert.equal(m.stage, 7);
  assert.equal(m.isMax, true);
});

test('getNextMilestone — string level works', () => {
  const m = getNextMilestone('12');
  assert.equal(m.level, 26);
  assert.equal(m.stage, 4);
  assert.equal(m.isMax, false);
});

// ──────────────────────────────────────────────
//  getGrowthPresentation — micro-growth descriptors
// ──────────────────────────────────────────────

test('getGrowthPresentation — level 1 baseline', () => {
  const d = getGrowthPresentation(1);
  assert.equal(d.groundGrowthTier, 1);
  assert.equal(d.flowerTier, 0);
  assert.equal(d.fruitTier, 0);
  assert.equal(d.wildlifeTier, 0);
});

test('getGrowthPresentation — level 5 (first micro-growth tick)', () => {
  const d = getGrowthPresentation(5);
  assert.equal(d.groundGrowthTier, 1);
  assert.equal(d.flowerTier, 0);
  assert.equal(d.fruitTier, 0);
  assert.equal(d.wildlifeTier, 0);
});

test('getGrowthPresentation — level 10 (flower tier starts)', () => {
  const d = getGrowthPresentation(10);
  assert.equal(d.flowerTier, 1, 'flowerTier should be 1 starting at level 10');
});

test('getGrowthPresentation — level 20 (fruit tier starts)', () => {
  const d = getGrowthPresentation(20);
  assert.equal(d.groundGrowthTier, 1);
  assert.equal(d.flowerTier, 1);
  assert.equal(d.fruitTier, 1, 'fruitTier should be 1 starting at level 20');
  assert.equal(d.wildlifeTier, 0);
});

test('getGrowthPresentation — level 30 (wildlife tier starts)', () => {
  const d = getGrowthPresentation(30);
  assert.equal(d.groundGrowthTier, 2, 'groundGrowthTier should be 2 at level 30');
  assert.equal(d.flowerTier, 2, 'flowerTier should be 2 at level 30');
  assert.equal(d.fruitTier, 1);
  assert.equal(d.wildlifeTier, 1, 'wildlifeTier should be 1 at level 30');
});

test('getGrowthPresentation — level 46 (stage 5 milestone)', () => {
  const d = getGrowthPresentation(46);
  assert.equal(d.groundGrowthTier, 3, 'groundGrowthTier should be 3 at level 46');
  assert.equal(d.flowerTier, 3, 'flowerTier should be 3 at level 46');
  assert.equal(d.fruitTier, 2, 'fruitTier should be 2 at level 46');
  assert.equal(d.wildlifeTier, 1);
});

test('getGrowthPresentation — level 100 max', () => {
  const d = getGrowthPresentation(100);
  assert.equal(d.groundGrowthTier, 4);
  assert.equal(d.flowerTier, 3);
  assert.equal(d.fruitTier, 3);
  assert.equal(d.wildlifeTier, 3);
});

test('getGrowthPresentation — deterministic across same level', () => {
  const a = getGrowthPresentation(42);
  const b = getGrowthPresentation(42);
  assert.deepEqual(a, b);
});

test('getGrowthPresentation — NaN returns safe defaults', () => {
  const d = getGrowthPresentation(NaN);
  assert.equal(d.groundGrowthTier, 1);
  assert.equal(d.flowerTier, 0);
  assert.equal(d.fruitTier, 0);
  assert.equal(d.wildlifeTier, 0);
});

test('getGrowthPresentation — Infinity treated as max level', () => {
  const d = getGrowthPresentation(Infinity);
  assert.equal(d.groundGrowthTier, 4);
  assert.equal(d.flowerTier, 3);
  assert.equal(d.fruitTier, 3);
  assert.equal(d.wildlifeTier, 3);
});

test('getGrowthPresentation — string level works', () => {
  const d = getGrowthPresentation('30');
  assert.equal(d.groundGrowthTier, 2);
  assert.equal(d.flowerTier, 2);
  assert.equal(d.wildlifeTier, 1);
});

test('getGrowthPresentation — non-numeric string returns safe defaults', () => {
  const d = getGrowthPresentation('xyz');
  assert.equal(d.groundGrowthTier, 1);
  assert.equal(d.flowerTier, 0);
});

test('getGrowthPresentation — context parameter accepted but unused', () => {
  const d = getGrowthPresentation(25, { season: 'spring' });
  assert.equal(d.groundGrowthTier, 2);
  assert.equal(d.flowerTier, 2);
  assert.equal(d.fruitTier, 1);
  assert.equal(d.wildlifeTier, 0);
});

// ──────────────────────────────────────────────
//  getWeatherPresentation
// ──────────────────────────────────────────────

test('getWeatherPresentation — sunny', () => {
  const w = getWeatherPresentation('sunny');
  assert.equal(w.nameKey, 'weatherSunny');
  assert.equal(w.effectKey, 'weatherEffectSunny');
  assert.equal(w.xpMultiplier, 1.2);
  assert.equal(w.coinMultiplier, 1.0);
});

test('getWeatherPresentation — cloudy', () => {
  const w = getWeatherPresentation('cloudy');
  assert.equal(w.nameKey, 'weatherCloudy');
  assert.equal(w.xpMultiplier, 1.0);
  assert.equal(w.coinMultiplier, 1.0);
});

test('getWeatherPresentation — rainy', () => {
  const w = getWeatherPresentation('rainy');
  assert.equal(w.nameKey, 'weatherRainy');
  assert.equal(w.xpMultiplier, 1.3);
  assert.equal(w.coinMultiplier, 0.9);
});

test('getWeatherPresentation — stormy', () => {
  const w = getWeatherPresentation('stormy');
  assert.equal(w.nameKey, 'weatherStormy');
  assert.equal(w.xpMultiplier, 0.8);
  assert.equal(w.coinMultiplier, 1.3);
});

test('getWeatherPresentation — snowy', () => {
  const w = getWeatherPresentation('snowy');
  assert.equal(w.nameKey, 'weatherSnowy');
  assert.equal(w.xpMultiplier, 1.0);
  assert.equal(w.coinMultiplier, 1.2);
});

test('getWeatherPresentation — unknown weather falls back to sunny', () => {
  const w = getWeatherPresentation('foggy');
  assert.equal(w.nameKey, 'weatherSunny');
  assert.equal(w.xpMultiplier, 1.2);
  assert.equal(w.coinMultiplier, 1.0);
});

test('getWeatherPresentation — case insensitive', () => {
  const w = getWeatherPresentation('Stormy');
  assert.equal(w.nameKey, 'weatherStormy');
  assert.equal(w.xpMultiplier, 0.8);
});

test('getWeatherPresentation — null falls back to sunny', () => {
  const w = getWeatherPresentation(null);
  assert.equal(w.nameKey, 'weatherSunny');
});

test('getWeatherPresentation — undefined falls back to sunny', () => {
  const w = getWeatherPresentation(undefined);
  assert.equal(w.nameKey, 'weatherSunny');
});

test('getWeatherPresentation — number falls back to sunny', () => {
  const w = getWeatherPresentation(42);
  assert.equal(w.nameKey, 'weatherSunny');
});

test('getWeatherPresentation — returns a fresh copy each call', () => {
  const a = getWeatherPresentation('sunny');
  const b = getWeatherPresentation('sunny');
  assert.notEqual(a, b, 'should return independent objects');
  assert.deepEqual(a, b);
});

// ──────────────────────────────────────────────
//  Integration — stage + presentation consistency
// ──────────────────────────────────────────────

test('stage milestones align with growth presentation tiers', () => {
  const checks = [
    { level: 5,  stage: 2, ground: 1, flower: 0, fruit: 0, wildlife: 0 },
    { level: 12, stage: 3, ground: 1, flower: 1, fruit: 0, wildlife: 0 },
    { level: 26, stage: 4, ground: 2, flower: 2, fruit: 1, wildlife: 0 },
    { level: 46, stage: 5, ground: 3, flower: 3, fruit: 2, wildlife: 1 },
    { level: 66, stage: 6, ground: 4, flower: 3, fruit: 3, wildlife: 2 },
    { level: 86, stage: 7, ground: 4, flower: 3, fruit: 3, wildlife: 3 },
  ];
  for (const c of checks) {
    const stage = getGrowthStage(c.level);
    assert.equal(stage, c.stage, `level ${c.level} should be stage ${c.stage}`);
    const d = getGrowthPresentation(c.level);
    assert.equal(d.groundGrowthTier, c.ground, `level ${c.level} groundGrowthTier`);
    assert.equal(d.flowerTier, c.flower, `level ${c.level} flowerTier`);
    assert.equal(d.fruitTier, c.fruit, `level ${c.level} fruitTier`);
    assert.equal(d.wildlifeTier, c.wildlife, `level ${c.level} wildlifeTier`);
  }
});
