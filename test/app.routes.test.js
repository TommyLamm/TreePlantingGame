const assert = require('node:assert/strict');
const path = require('node:path');
const { once } = require('node:events');
const { test } = require('node:test');

const { createApp } = require('../server/app');
const { HttpError } = require('../server/http/errors');

function createDependencies(overrides = {}) {
  const user = { username: 'Alice' };
  return {
    repository: {
      size: () => 1,
      listNames: () => ['Alice'],
      ensureUser: () => user,
      getUser: () => user,
    },
    gameStateService: {
      getWeather: () => ({ type: 'sunny' }),
      heartbeat: () => ({ username: 'Alice' }),
    },
    progressionService: {
      toggleWarp: () => ({}),
      updateProfile: () => ({}),
      resolveAction: () => ({}),
      prestige: () => ({}),
      upgradePrestige: () => ({}),
    },
    rewardService: {
      buyItem: () => ({}),
      equipItem: () => ({}),
      claimDailyReward: () => ({}),
      buyCompanion: () => ({}),
      equipCompanion: () => ({}),
      shakeTree: () => ({}),
      claimMinigameReward: () => ({}),
    },
    socialService: {
      getGarden: () => ({}),
      sendGift: () => ({}),
      listUsers: () => [],
      getLeaderboard: () => [],
      getAchievements: () => ({}),
    },
    clientDistPath: path.resolve(__dirname, '..', 'client', 'dist'),
    ...overrides,
  };
}

async function startApp(overrides = {}) {
  const app = createApp(createDependencies(overrides));
  const listener = app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();

  return {
    request: async (pathname, options) => {
      const response = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
      return { status: response.status, body: await response.json() };
    },
    close: () => new Promise((resolve, reject) => {
      listener.close((error) => error ? reject(error) : resolve());
    }),
  };
}

test('POST adapters await Promise service results before sending exact JSON', async () => {
  const expected = { purchased: 'sunflower', coins: 17 };
  const server = await startApp({
    rewardService: {
      ...createDependencies().rewardService,
      buyItem: () => Promise.resolve(expected),
    },
  });

  try {
    const response = await server.request('/api/store/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Alice', itemId: 'sunflower', type: 'skin' }),
    });
    assert.deepEqual(response, { status: 200, body: expected });
  } finally {
    await server.close();
  }
});

test('GET adapters await Promise service results before sending exact JSON', async () => {
  const expected = { type: 'rainy', season: 'spring' };
  const server = await startApp({
    gameStateService: {
      ...createDependencies().gameStateService,
      getWeather: () => Promise.resolve(expected),
    },
  });

  try {
    assert.deepEqual(await server.request('/api/weather'), { status: 200, body: expected });
  } finally {
    await server.close();
  }
});

test('rejected service Promises reach errorMiddleware as generic server errors', async () => {
  const server = await startApp({
    gameStateService: {
      ...createDependencies().gameStateService,
      getWeather: () => Promise.reject(new Error('service failed')),
    },
  });
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    assert.deepEqual(await server.request('/api/weather'), {
      status: 500,
      body: { error: 'Server Error' },
    });
  } finally {
    console.error = originalConsoleError;
    await server.close();
  }
});

test('rejected HttpError Promises preserve their status and message', async () => {
  const server = await startApp({
    rewardService: {
      ...createDependencies().rewardService,
      buyItem: () => Promise.reject(new HttpError(409, 'Promise conflict')),
    },
  });

  try {
    const response = await server.request('/api/store/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Alice', itemId: 'sunflower', type: 'skin' }),
    });
    assert.deepEqual(response, { status: 409, body: { error: 'Promise conflict' } });
  } finally {
    await server.close();
  }
});

test('two createApp instances keep injected service dependencies isolated', async () => {
  const first = await startApp({
    gameStateService: {
      ...createDependencies().gameStateService,
      getWeather: () => Promise.resolve({ app: 'first' }),
    },
  });
  const second = await startApp({
    gameStateService: {
      ...createDependencies().gameStateService,
      getWeather: () => Promise.resolve({ app: 'second' }),
    },
  });

  try {
    assert.deepEqual((await first.request('/api/weather')).body, { app: 'first' });
    assert.deepEqual((await second.request('/api/weather')).body, { app: 'second' });
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});
