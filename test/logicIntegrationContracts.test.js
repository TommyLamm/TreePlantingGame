const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const express = require('express');

const { errorMiddleware } = require('../server/http/errors');
const { createSocialRoutes } = require('../server/routes/socialRoutes');

test('garden help route preserves the client/server request and response contract', async () => {
  const calls = [];
  const expected = {
    success: true,
    reward: { coins: 50, xp: 10 },
    ownerHelpCount: 1,
  };
  const app = express();
  app.use(express.json());
  app.use('/api', createSocialRoutes({
    socialService: {
      helpGarden: (helperUsername, ownerUsername) => {
        calls.push({ helperUsername, ownerUsername });
        return expected;
      },
    },
  }));
  app.use(errorMiddleware);

  const listener = app.listen(0, '127.0.0.1');
  await once(listener, 'listening');

  try {
    const { port } = listener.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/garden/help`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ helperUsername: 'Alice', ownerUsername: 'Bob' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
    assert.deepEqual(calls, [{ helperUsername: 'Alice', ownerUsername: 'Bob' }]);
  } finally {
    await new Promise((resolve, reject) => {
      listener.close(error => error ? reject(error) : resolve());
    });
  }
});
