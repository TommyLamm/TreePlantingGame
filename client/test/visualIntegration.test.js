import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const t = (key, ...args) => args.reduce((value, arg, index) => value.replace(`{${index}}`, arg), key);

test('Plan 08 visual surfaces expose the logic contracts', async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const [{ ObjectiveRail }, { GrowthRoadmap }, { OnboardingOverlay }, { GardenVisitModal }, { MiniGameModal }] = await Promise.all([
      vite.ssrLoadModule('/src/components/game/ObjectiveRail.jsx'),
      vite.ssrLoadModule('/src/components/game/GrowthRoadmap.jsx'),
      vite.ssrLoadModule('/src/components/game/OnboardingOverlay.jsx'),
      vite.ssrLoadModule('/src/components/GardenVisitModal.jsx'),
      vite.ssrLoadModule('/src/components/MiniGameModal.jsx'),
    ]);

    const objectives = renderToStaticMarkup(React.createElement(ObjectiveRail, {
      objectives: [{
        id: 'first_event',
        labelKey: 'objFirstEvent',
        descriptionKey: 'objFirstEventDesc',
        current: 0,
        target: 1,
        navigationTarget: 'event',
      }],
      t,
      onNavigate() {},
    }));
    assert.match(objectives, /objectives-rail/);
    assert.match(objectives, /objective-progress/);

    const growth = renderToStaticMarkup(React.createElement(GrowthRoadmap, { level: 30, season: 'summer', t }));
    assert.match(growth, /growth-roadmap/);
    assert.match(growth, /growth-milestone/);
    assert.match(growth, /wildlifeTier/);

    const onboarding = renderToStaticMarkup(React.createElement(OnboardingOverlay, {
      state: { active: true, step: 0, stepCount: 7, completed: false, dismissed: false },
      t,
      onBack() {},
      onNext() {},
      onDismiss() {},
      onComplete() {},
    }));
    assert.match(onboarding, /role="dialog"/);
    assert.match(onboarding, /onboarding-progress/);

    const garden = renderToStaticMarkup(React.createElement(GardenVisitModal, {
      visitData: { username: 'Rowan', level: 12, generation: 1, treeSkin: 'default', companion: null, achievements: [], helpCount: 2, helpers: [] },
      currentUser: 'Alder',
      onGift() {},
      giftError: null,
      onClose() {},
      t,
    }));
    assert.match(garden, /garden-help-card/);
    assert.match(garden, /garden-help-button/);

    const minigame = renderToStaticMarkup(React.createElement(MiniGameModal, {
      gamesRemaining: 0,
      onReward: async () => null,
      onClose() {},
      t,
    }));
    assert.match(minigame, /mini-game-empty-mark/);
    assert.doesNotMatch(minigame, /🎮|💧|🎉/u);
  } finally {
    await vite.close();
  }
});
