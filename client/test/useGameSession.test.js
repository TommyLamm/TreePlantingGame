import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  createHeartbeatScheduler,
  useGameSession,
  useLatest,
} from '../src/hooks/useGameSession.js';

function createDeferred() {
  let resolve;
  const promise = new Promise(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createSchedulerHarness({ poll, hidden = false }) {
  const queuedTasks = [];
  const timers = new Map();
  const allTimers = new Map();
  const clearedTimers = [];
  let nextTimerId = 1;
  let documentHidden = hidden;

  const scheduler = createHeartbeatScheduler({
    poll,
    isHidden: () => documentHidden,
    queueTask: task => queuedTasks.push(task),
    setTimer: (task, delay) => {
      const id = nextTimerId;
      nextTimerId += 1;
      const timer = { task, delay };
      timers.set(id, timer);
      allTimers.set(id, timer);
      return id;
    },
    clearTimer: id => {
      clearedTimers.push(id);
      timers.delete(id);
    },
  });

  return {
    scheduler,
    queuedTasks,
    timers,
    allTimers,
    clearedTimers,
    setHidden(value) {
      documentHidden = value;
    },
    runTimer(id) {
      const timer = timers.get(id);
      assert.ok(timer, `Expected active timer ${id}`);
      timers.delete(id);
      timer.task();
    },
  };
}

test('heartbeat scheduler cancels a discarded setup before its initial task', () => {
  let pollCount = 0;
  const harness = createSchedulerHarness({
    poll: () => {
      pollCount += 1;
      return Promise.resolve();
    },
  });

  harness.scheduler.start();
  harness.scheduler.stop();
  assert.equal(harness.queuedTasks.length, 1);

  harness.queuedTasks.shift()();

  assert.equal(pollCount, 0);
  assert.equal(harness.timers.size, 0);
});

test('heartbeat scheduler starts one immediate poll for a surviving setup', async () => {
  let pollCount = 0;
  const harness = createSchedulerHarness({
    poll: () => {
      pollCount += 1;
      return Promise.resolve();
    },
  });

  harness.scheduler.start();
  harness.queuedTasks.shift()();
  await Promise.resolve();

  assert.equal(pollCount, 1);
  assert.equal(harness.timers.size, 1);
  harness.scheduler.stop();
});

test('heartbeat scheduler serializes polls and schedules from the latest visibility', async () => {
  const polls = [];
  const harness = createSchedulerHarness({
    poll: () => {
      const deferred = createDeferred();
      polls.push(deferred);
      return deferred.promise;
    },
  });

  harness.scheduler.start();
  harness.queuedTasks.shift()();
  harness.scheduler.reschedule();
  assert.equal(polls.length, 1);
  assert.equal(harness.timers.size, 0);

  polls[0].resolve();
  await Promise.resolve();
  assert.deepEqual([...harness.timers.values()].map(timer => timer.delay), [5000]);

  const visibleTimerId = [...harness.timers.keys()][0];
  const visibleTimerTask = harness.allTimers.get(visibleTimerId).task;
  harness.runTimer(visibleTimerId);
  visibleTimerTask();
  harness.scheduler.reschedule();
  assert.equal(polls.length, 2);
  assert.equal(harness.timers.size, 0);

  harness.setHidden(true);
  harness.scheduler.reschedule();
  polls[1].resolve();
  await Promise.resolve();

  assert.equal(harness.timers.size, 1);
  assert.deepEqual([...harness.timers.values()].map(timer => timer.delay), [30000]);
  harness.scheduler.stop();
});

test('heartbeat scheduler replaces a pending timer on visibility change and cancels it on stop', async () => {
  const harness = createSchedulerHarness({ poll: () => Promise.resolve() });

  harness.scheduler.start();
  harness.queuedTasks.shift()();
  await Promise.resolve();

  const visibleTimerId = [...harness.timers.keys()][0];
  assert.equal(harness.timers.get(visibleTimerId).delay, 5000);

  harness.setHidden(true);
  harness.scheduler.reschedule();
  const hiddenTimerId = [...harness.timers.keys()][0];

  assert.deepEqual(harness.clearedTimers, [visibleTimerId]);
  assert.notEqual(hiddenTimerId, visibleTimerId);
  assert.equal(harness.timers.get(hiddenTimerId).delay, 30000);

  harness.scheduler.stop();
  assert.deepEqual(harness.clearedTimers, [visibleTimerId, hiddenTimerId]);
  assert.equal(harness.timers.size, 0);
});

test('useLatest updates its current value without changing ref identity', () => {
  const refs = [];
  const values = [];

  function Probe() {
    const [value, setValue] = React.useState('first');
    const latest = useLatest(value);
    refs.push(latest);
    values.push(latest.current);

    if (value === 'first') setValue('second');
    return React.createElement('div');
  }

  renderToStaticMarkup(React.createElement(Probe));

  assert.deepEqual(values, ['first', 'second']);
  assert.strictEqual(refs[0], refs[1]);
});

test('useGameSession initializes identity and exposes session handlers', () => {
  const originalLocalStorage = globalThis.localStorage;
  const values = new Map([['zenUser', 'Alder']]);
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };

  let result;

  function Probe() {
    result = useGameSession({
      dispatch: () => {},
      t: key => key,
      addLog: () => {},
      enqueueAchievements: () => {},
      onFirstOfflineEarnings: () => {},
      onFirstDailyReward: () => {},
      resetUi: () => {},
    });

    return React.createElement('div');
  }

  try {
    renderToStaticMarkup(React.createElement(Probe));

    assert.equal(result.currentUser, 'Alder');
    assert.equal(result.serverStatus, 'unknown');
    assert.deepEqual(result.existingUsers, []);
    assert.equal(result.isLoading, true);
    assert.equal(typeof result.handleLogin, 'function');
    assert.equal(typeof result.handleLogout, 'function');
  } finally {
    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalLocalStorage;
    }
  }
});
