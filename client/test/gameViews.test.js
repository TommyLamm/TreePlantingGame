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

    assert.match(headerMarkup, /top-hud-weather/);
    assert.match(headerMarkup, /top-hud-actions/);
    assert.match(headerMarkup, />42</);
  } finally {
    await vite.close();
  }
});
