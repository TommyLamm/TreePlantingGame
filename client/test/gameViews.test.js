import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('game modal and header views render through their prop boundaries', async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const [{ GameModals }, { GameHeader }] = await Promise.all([
      vite.ssrLoadModule('/src/components/game/GameModals.jsx'),
      vite.ssrLoadModule('/src/components/game/GameHeader.jsx'),
    ]);

    const modalMarkup = renderToStaticMarkup(React.createElement(GameModals, {
      visibility: {
        collection: false,
        store: false,
        profile: false,
        leaderboard: false,
        dailyReward: false,
        offlineEarnings: false,
        prestige: false,
        stats: false,
        miniGames: false,
        companions: false,
        gardenVisit: false,
      },
    }));
    assert.equal(modalMarkup, '');

    const headerMarkup = renderToStaticMarkup(React.createElement(GameHeader, {
      game: {
        coins: 42,
        combo: 3,
        dailyRewardAvailable: true,
        generation: 2,
        isDemoMode: false,
        profileData: {},
        season: 'spring',
        weather: 'clear',
      },
      currentUser: 'Alder',
      serverStatus: 'connected',
      isDay: true,
      goldenHourActive: false,
      companionAssetId: null,
      isMuted: true,
      t: key => key,
      onCycleLang() {},
      onOpenModal() {},
      onToggleCollection() {},
      onOpenLeaderboard() {},
      onToggleMute() {},
      onToggleDemoState() {},
    }));

    assert.match(headerMarkup, /hud-environment/);
    assert.match(headerMarkup, /hud-resources/);
    assert.match(headerMarkup, /hud-tools/);
    assert.match(headerMarkup, /aria-label="gameTools"/);
    assert.equal((headerMarkup.match(/class="hud-tool-button/g) || []).length, 5);
    assert.match(headerMarkup, />store</);
    assert.match(headerMarkup, />collection</);
    assert.match(headerMarkup, />companions</);
    assert.match(headerMarkup, />reward</);
    assert.match(headerMarkup, />more</);
    assert.match(headerMarkup, /hud-notification-dot/);
    assert.doesNotMatch(headerMarkup, /🔥|☀️/);
    assert.match(headerMarkup, />42</);
  } finally {
    await vite.close();
  }
});

test('game stage and action panel render through their prop boundaries', async () => {
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const [{ GameStage }, { ActionPanel }] = await Promise.all([
      vite.ssrLoadModule('/src/components/game/GameStage.jsx'),
      vite.ssrLoadModule('/src/components/game/ActionPanel.jsx'),
    ]);

    const game = {
      level: 12,
      xp: 7,
      combo: 2,
      generation: 1,
      activeEvent: 'WATER',
      inventory: { treeSkin: 'cherry' },
      season: 'spring',
      weather: 'rainy',
      companion: 'butterfly',
    };
    const stageTranslations = {
      burstWater: 'Splash!',
      companionButterfly: 'Butterfly',
      companionLabel: '{0} companion',
      shakeTree: 'Shake tree',
      treeLevel: 'Tree level {0}',
    };
    const stageT = (key, ...args) => args.reduce(
      (value, arg, index) => value.replace(`{${index}}`, arg),
      stageTranslations[key] || key,
    );
    const stageMarkup = renderToStaticMarkup(React.createElement(GameStage, {
      actionBursts: [{ id: 'burst-1', type: 'WATER', x: '50%', y: '40%' }],
      shakeAnim: true,
      game,
      isDay: true,
      t: stageT,
      onShakeTree() {},
    }));

    assert.match(stageMarkup, /Splash!/);
    assert.match(stageMarkup, /Tree level 12/);
    assert.match(stageMarkup, /Butterfly companion/);
    assert.match(stageMarkup, /animate-wiggle/);
    assert.match(stageMarkup, /scene-ground-layer/);
    assert.match(stageMarkup, /scene-focus-layer/);
    assert.match(stageMarkup, /scene-support-layer/);
    assert.match(stageMarkup, /scene-companion-layer/);
    assert.doesNotMatch(stageMarkup, /💧|🐛|🍂|✂️|✨|⚡/);
    assert.match(stageMarkup, /action-burst-label/);
    assert.match(stageMarkup, /role="button"/);
    assert.match(stageMarkup, /tabindex="0"/);

    const panelMarkup = renderToStaticMarkup(React.createElement(ActionPanel, {
      game,
      isDay: true,
      goldenHourActive: false,
      localActiveEvent: 'WATER',
      xpRequired: 20,
      progress: 35,
      t: key => `translated:${key}`,
      onAction() {},
    }));

    assert.match(panelMarkup, /translated:level 12/);
    assert.match(panelMarkup, /7 \/ 20 XP/);
    assert.match(panelMarkup, /translated:water/);
    assert.match(panelMarkup, /action-btn-active/);
    assert.match(panelMarkup, /game-status-panel/);
    assert.match(panelMarkup, /status-progress/);
    assert.match(panelMarkup, /event-actions/);
    assert.doesNotMatch(panelMarkup, /border-dashed/);

    const stormPanelMarkup = renderToStaticMarkup(React.createElement(ActionPanel, {
      game,
      isDay: false,
      goldenHourActive: false,
      localActiveEvent: 'STORM',
      xpRequired: 20,
      progress: 35,
      t: key => key === 'stormWarning' ? '⚡ Storm approaching' : `translated:${key}`,
      onAction() {},
    }));

    assert.match(stormPanelMarkup, /Storm approaching/);
    assert.doesNotMatch(stormPanelMarkup, /⚡/);
  } finally {
    await vite.close();
  }
});
