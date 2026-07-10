import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { useGameActions } from '../src/hooks/useGameActions.js';

const handlerNames = [
  'handleAction',
  'toggleDemoState',
  'toggleCollection',
  'handleOpenLeaderboard',
  'handleBuy',
  'handleEquip',
  'handleProfileSave',
  'handleClaimDailyReward',
  'handlePrestige',
  'handlePrestigeUpgrade',
  'handleBuyCompanion',
  'handleEquipCompanion',
  'handleShakeTree',
  'handleVisitGarden',
  'handleSendGift',
  'handleMinigameReward',
  'handleOfflineClose',
];

test('useGameActions exposes the initial transient state and action handlers', () => {
  let result;

  function Probe() {
    result = useGameActions({
      currentUser: 'Alder',
      game: { activeEvent: null, dailyRewardAvailable: false },
      dispatch: () => {},
      t: key => key,
      modals: {
        visibility: { collection: false },
        openModal: () => {},
        closeModal: () => {},
        setLeaderboardData: () => {},
        setGardenVisitData: () => {},
        setGiftError: () => {},
      },
      addLog: () => {},
      enqueueAchievements: () => {},
    });

    return React.createElement('div');
  }

  renderToStaticMarkup(React.createElement(Probe));

  assert.equal(result.localActiveEvent, null);
  assert.deepEqual(result.actionBursts, []);
  assert.equal(result.shakeAnim, false);
  assert.deepEqual(
    Object.keys(result).filter(name => typeof result[name] === 'function'),
    handlerNames,
  );
});
