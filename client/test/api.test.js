import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { api } from '../src/utils/api.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('GET and POST methods construct the expected requests', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return jsonResponse({ ok: true });
  };

  await api.getUsers();
  assert.equal(calls[0][0], '/api/users');
  assert.equal(calls[0][1].method, 'GET');

  await api.sendAction('Alice', 'WATER');
  assert.equal(calls[1][0], '/api/action');
  assert.equal(calls[1][1].method, 'POST');
  assert.equal(
    calls[1][1].body,
    JSON.stringify({ username: 'Alice', action: 'WATER' }),
  );
});

test('JSON error responses throw the server message', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Tree not found' }, 404);

  await assert.rejects(api.getUsers(), new Error('Tree not found'));
});

test('invalid error JSON throws the request failed fallback', async () => {
  globalThis.fetch = async () => new Response('not JSON', {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(api.getUsers(), new Error('Request failed'));
});

test('username path segments are URL encoded', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return jsonResponse({ ok: true });
  };

  await api.getAchievements('Alice / Bob');
  await api.visitGarden('Alice / Bob');

  assert.equal(calls[0][0], '/api/achievements/Alice%20%2F%20Bob');
  assert.equal(calls[1][0], '/api/garden/Alice%20%2F%20Bob');
});

test('api exposes the public methods in the established order', () => {
  assert.deepEqual(Object.keys(api), [
    'getUsers', 'heartbeat', 'toggleWarp', 'sendAction', 'updateProfile',
    'buyItem', 'equipItem', 'getLeaderboard', 'getAchievements', 'health',
    'getWeather', 'claimDailyReward', 'buyCompanion', 'equipCompanion',
    'prestige', 'prestigeUpgrade', 'shakeTree', 'visitGarden', 'sendGift',
    'claimMinigameReward',
  ]);
});
