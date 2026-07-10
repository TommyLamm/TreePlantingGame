import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { useGameModals } from '../src/hooks/useGameModals.js';

const initialVisibility = {
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
};

test('useGameModals manages visibility and selected data independently', () => {
  const snapshots = [];
  const leaderboardData = [{ username: 'Alder', level: 12 }];
  const gardenVisitData = { username: 'Birch', level: 8 };
  const giftError = 'Gift failed';
  const functionNames = [
    'openModal',
    'closeModal',
    'resetModals',
    'setLeaderboardData',
    'setGardenVisitData',
    'setGiftError',
  ];

  function Probe() {
    const result = useGameModals();
    const [phase, setPhase] = React.useState(0);

    snapshots.push({
      phase,
      visibility: { ...result.visibility },
      leaderboardData: result.leaderboardData,
      gardenVisitData: result.gardenVisitData,
      giftError: result.giftError,
      functions: Object.fromEntries(
        functionNames.map(name => [name, result[name]]),
      ),
    });

    if (phase === 0) {
      result.openModal('collection');
      setPhase(1);
    } else if (phase === 1) {
      result.openModal('store');
      setPhase(2);
    } else if (phase === 2) {
      result.closeModal('collection');
      setPhase(3);
    } else if (phase === 3) {
      result.setLeaderboardData(leaderboardData);
      result.setGardenVisitData(gardenVisitData);
      result.setGiftError(giftError);
      setPhase(4);
    } else if (phase === 4) {
      result.resetModals();
      setPhase(5);
    }

    return React.createElement('div');
  }

  renderToStaticMarkup(React.createElement(Probe));

  assert.deepEqual(snapshots.map(snapshot => snapshot.phase), [0, 1, 2, 3, 4, 5]);

  assert.deepEqual(snapshots[0].visibility, initialVisibility);
  assert.deepEqual(snapshots[0].leaderboardData, []);
  assert.equal(snapshots[0].gardenVisitData, null);
  assert.equal(snapshots[0].giftError, null);

  assert.deepEqual(snapshots[1].visibility, {
    ...initialVisibility,
    collection: true,
  });
  assert.deepEqual(snapshots[2].visibility, {
    ...initialVisibility,
    collection: true,
    store: true,
  });
  assert.deepEqual(snapshots[3].visibility, {
    ...initialVisibility,
    store: true,
  });

  assert.strictEqual(snapshots[4].leaderboardData, leaderboardData);
  assert.strictEqual(snapshots[4].gardenVisitData, gardenVisitData);
  assert.equal(snapshots[4].giftError, giftError);

  assert.deepEqual(snapshots[5].visibility, initialVisibility);
  assert.strictEqual(snapshots[5].leaderboardData, leaderboardData);
  assert.strictEqual(snapshots[5].gardenVisitData, gardenVisitData);
  assert.equal(snapshots[5].giftError, giftError);

  for (const name of functionNames) {
    assert.equal(typeof snapshots[0].functions[name], 'function');
    for (const snapshot of snapshots.slice(1)) {
      assert.strictEqual(snapshot.functions[name], snapshots[0].functions[name]);
    }
  }
});
