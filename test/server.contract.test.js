const assert = require('node:assert/strict');
const path = require('node:path');
const { readFile } = require('node:fs/promises');
const { after, before, test } = require('node:test');

const { startServer } = require('./helpers/serverHarness');

const realDbFile = path.resolve(__dirname, '..', 'save.json');

let realDbBefore;
let server;

async function readIfPresent(file) {
  try {
    return await readFile(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function post(pathname, body = {}) {
  const response = await server.request(pathname, { method: 'POST', body });
  return { status: response.status, body: response.body };
}

before(async () => {
  realDbBefore = await readIfPresent(realDbFile);
  server = await startServer();
});

after(async () => {
  if (server) await server.stop();
  assert.deepEqual(await readIfPresent(realDbFile), realDbBefore);
});

test('public metadata endpoints expose their established contracts', async () => {
  const health = await server.request('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');
  assert.equal(typeof health.body.uptime, 'number');
  assert.equal(typeof health.body.users, 'number');

  const db = await server.request('/api/db');
  assert.equal(db.status, 200);
  assert.deepEqual(Object.keys(db.body).sort(), ['userCount', 'users']);
  assert.equal(db.headers.get('cache-control'), 'no-store');

  const weather = await server.request('/api/weather');
  assert.equal(weather.status, 200);
  assert.deepEqual(
    Object.keys(weather.body).sort(),
    ['changedAt', 'nextChangeAt', 'season', 'type'],
  );
});

test('heartbeat validates usernames and returns the established user shape', async () => {
  assert.deepEqual(await post('/api/heartbeat'), {
    status: 400,
    body: { error: 'Username required' },
  });
  assert.deepEqual(await post('/api/heartbeat', { username: '!' }), {
    status: 400,
    body: {
      error: 'Invalid username. 2-16 chars, letters/numbers/underscore/Chinese only.',
    },
  });

  const valid = await post('/api/heartbeat', { username: 'Alice' });
  assert.equal(valid.status, 200);
  for (const key of [
    'xp',
    'level',
    'coins',
    'inventory',
    'profile',
    'weather',
    'season',
    'dailyRewardAvailable',
  ]) {
    assert.ok(Object.hasOwn(valid.body, key), `missing heartbeat key: ${key}`);
  }
});

test('username-protected POST routes reject a missing username', async () => {
  const routes = [
    '/api/toggle-warp',
    '/api/action',
    '/api/profile/update',
    '/api/store/buy',
    '/api/store/equip',
    '/api/daily-reward/claim',
    '/api/companion/buy',
    '/api/companion/equip',
    '/api/prestige',
    '/api/prestige/upgrade',
    '/api/shake',
    '/api/minigame/reward',
  ];

  for (const route of routes) {
    assert.deepEqual(await post(route), {
      status: 400,
      body: { error: 'Invalid username' },
    }, route);
  }
});

test('public user collection endpoints expose arrays', async () => {
  const users = await server.request('/api/users');
  assert.equal(users.status, 200);
  assert.ok(Array.isArray(users.body));
  assert.deepEqual(users.body, ['Admin', 'Alice']);

  const leaderboard = await server.request('/api/leaderboard');
  assert.equal(leaderboard.status, 200);
  assert.ok(Array.isArray(leaderboard.body));
  assert.equal(leaderboard.body.length, 1);
  assert.equal(leaderboard.body[0].username, 'Alice');
  assert.deepEqual(
    Object.keys(leaderboard.body[0]).sort(),
    ['companion', 'generation', 'level', 'treeSkin', 'username', 'xp'],
  );
});

test('missing garden and achievement users return the established errors', async () => {
  const garden = await server.request('/api/garden/missing');
  assert.deepEqual(
    { status: garden.status, body: garden.body },
    { status: 404, body: { error: 'User not found' } },
  );

  const achievements = await server.request('/api/achievements/missing');
  assert.deepEqual(
    { status: achievements.status, body: achievements.body },
    { status: 404, body: { error: 'User not found' } },
  );
});

test('gift rejects self-gifts and distinguishes missing senders and recipients', async () => {
  assert.equal((await post('/api/heartbeat', { username: 'GiftSender' })).status, 200);
  assert.equal((await post('/api/heartbeat', { username: 'GiftRecipient' })).status, 200);

  assert.deepEqual(await post('/api/gift', {
    fromUsername: 'GiftSender',
    toUsername: 'GiftSender',
  }), {
    status: 400,
    body: { error: 'Cannot gift yourself' },
  });

  assert.deepEqual(await post('/api/gift', {
    fromUsername: 'AbsentSender',
    toUsername: 'GiftRecipient',
  }), {
    status: 404,
    body: { error: 'Sender not found' },
  });

  assert.deepEqual(await post('/api/gift', {
    fromUsername: 'GiftSender',
    toUsername: 'AbsentRecipient',
  }), {
    status: 404,
    body: { error: 'Recipient not found' },
  });
});
