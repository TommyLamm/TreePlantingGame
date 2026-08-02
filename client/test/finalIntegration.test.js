import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createTranslator, TRANSLATIONS } from '../src/utils/i18n.js';

const source = async relativePath => readFile(
  fileURLToPath(new URL(`../src/${relativePath}`, import.meta.url)),
  'utf8',
);

test('every supported language exposes the complete final integration key set', () => {
  const languages = Object.keys(TRANSLATIONS);
  const canonicalKeys = Object.keys(TRANSLATIONS.en).sort();
  const required = [
    'avatarAlt', 'burstFertilize', 'burstPest', 'burstPrune', 'burstStorm',
    'burstSunlight', 'burstWater', 'coinsValue', 'companionLabel', 'daysValue',
    'free', 'gameStatusTools', 'offline', 'online', 'playerResources', 'treeLevel',
  ];

  for (const language of languages) {
    assert.deepEqual(Object.keys(TRANSLATIONS[language]).sort(), canonicalKeys);
    const t = createTranslator(language);
    for (const key of required) assert.notEqual(t(key, 3), key);
  }
});

test('modal focus management covers open focus, Escape, trap, and return focus', async () => {
  const [focusHook, gameModals, onboarding] = await Promise.all([
    source('hooks/useModalFocus.js'),
    source('components/game/GameModals.jsx'),
    source('components/game/OnboardingOverlay.jsx'),
  ]);

  assert.match(focusHook, /dialog\.focus\(\{ preventScroll: true \}\)/);
  assert.match(focusHook, /event\.key === 'Escape'/);
  assert.match(focusHook, /event\.key !== 'Tab'/);
  assert.match(focusHook, /event\.shiftKey/);
  assert.match(focusHook, /opener\?\.isConnected/);
  assert.match(focusHook, /aria-modal/);
  assert.match(gameModals, /const focusTarget = focusSuspended \? null : activeModal/);
  assert.match(gameModals, /useModalFocus\(\{ activeKey: focusTarget/);
  assert.match(onboarding, /useModalFocus\(\{ activeKey:/);
});

test('primary tree interaction and status updates expose keyboard and live-region contracts', async () => {
  const [stage, eventPanel, app] = await Promise.all([
    source('components/game/GameStage.jsx'),
    source('components/game/EventInteractionPanel.jsx'),
    source('App.jsx'),
  ]);

  assert.match(stage, /role="button"/);
  assert.match(stage, /tabIndex="0"/);
  assert.match(stage, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(eventPanel, /role="status" aria-live="polite"/);
  assert.match(app, /role="status" aria-live="polite" aria-atomic="true"/);
});
