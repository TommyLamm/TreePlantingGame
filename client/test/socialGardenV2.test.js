import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { helpGarden } from '../src/features/social/socialApi.js';
import {
  normalizeHelpResponse,
  getHelpErrorDescriptor,
  HELP_ERROR_DESCRIPTORS,
  HELP_STATE_DESCRIPTORS,
} from '../src/features/social/socialModel.js';

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

// ── socialApi tests ────────────────────────────────────────────────

test('helpGarden posts to /api/garden/help with helperUsername and ownerUsername', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return jsonResponse({ success: true, reward: { coins: 50, xp: 10 }, ownerHelpCount: 1 });
  };

  const result = await helpGarden('Alice', 'Bob');

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/garden/help');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(
    calls[0][1].body,
    JSON.stringify({ helperUsername: 'Alice', ownerUsername: 'Bob' }),
  );
  assert.deepEqual(result, { success: true, reward: { coins: 50, xp: 10 }, ownerHelpCount: 1 });
});

test('helpGarden propagates server error messages', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Cannot help your own garden' }, 400);

  await assert.rejects(helpGarden('Alice', 'Alice'), new Error('Cannot help your own garden'));
});

test('helpGarden propagates missing helper error', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Helper not found' }, 404);

  await assert.rejects(helpGarden('Missing', 'Bob'), new Error('Helper not found'));
});

test('helpGarden propagates daily limit error', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Already helped a garden today' }, 400);

  await assert.rejects(helpGarden('Alice', 'Bob'), new Error('Already helped a garden today'));
});

test('helpGarden propagates garden full error', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Garden help is full for today' }, 400);

  await assert.rejects(helpGarden('Alice', 'Bob'), new Error('Garden help is full for today'));
});

test('helpGarden propagates already helped this garden error', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Already helped this garden today' }, 400);

  await assert.rejects(helpGarden('Alice', 'Bob'), new Error('Already helped this garden today'));
});

test('helpGarden propagates invalid coin balance error', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Invalid coin balance' }, 400);

  await assert.rejects(helpGarden('Alice', 'Bob'), new Error('Invalid coin balance'));
});

test('helpGarden propagates invalid XP balance error', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'Invalid XP balance' }, 400);

  await assert.rejects(helpGarden('Alice', 'Bob'), new Error('Invalid XP balance'));
});

// ── normalizeHelpResponse tests ────────────────────────────────────

test('normalizeHelpResponse returns normalized shape for valid response', () => {
  const raw = { success: true, reward: { coins: 50, xp: 10 }, ownerHelpCount: 1 };
  assert.deepEqual(normalizeHelpResponse(raw), {
    success: true,
    reward: { coins: 50, xp: 10 },
    ownerHelpCount: 1,
  });
});

test('normalizeHelpResponse handles null/undefined gracefully', () => {
  assert.deepEqual(normalizeHelpResponse(null), {
    success: false, reward: { coins: 0, xp: 0 }, ownerHelpCount: 0,
  });
  assert.deepEqual(normalizeHelpResponse(undefined), {
    success: false, reward: { coins: 0, xp: 0 }, ownerHelpCount: 0,
  });
});

test('normalizeHelpResponse handles missing reward fields', () => {
  assert.deepEqual(normalizeHelpResponse({ success: true }), {
    success: true, reward: { coins: 0, xp: 0 }, ownerHelpCount: 0,
  });
});

// ── getHelpErrorDescriptor tests ───────────────────────────────────

test('getHelpErrorDescriptor maps known server errors', () => {
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Cannot help your own garden')),
    { type: 'self_help', messageKey: 'social.help.errorSelf' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Helper not found')),
    { type: 'helper_not_found', messageKey: 'social.help.errorHelperNotFound' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Owner not found')),
    { type: 'owner_not_found', messageKey: 'social.help.errorOwnerNotFound' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Already helped a garden today')),
    { type: 'daily_limit', messageKey: 'social.help.errorDailyLimit' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Garden help is full for today')),
    { type: 'garden_full', messageKey: 'social.help.errorGardenFull' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Already helped this garden today')),
    { type: 'already_helped', messageKey: 'social.help.errorAlreadyHelped' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Invalid coin balance')),
    { type: 'invalid_balance', messageKey: 'social.help.errorInvalidBalance' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Invalid XP balance')),
    { type: 'invalid_balance', messageKey: 'social.help.errorInvalidBalance' },
  );
});

test('getHelpErrorDescriptor falls back to unknown for unmapped errors', () => {
  assert.deepEqual(
    getHelpErrorDescriptor(new Error('Some other error')),
    { type: 'unknown', messageKey: 'social.help.errorUnknown' },
  );
});

test('getHelpErrorDescriptor handles null/undefined error', () => {
  assert.deepEqual(
    getHelpErrorDescriptor(null),
    { type: 'unknown', messageKey: 'social.help.errorUnknown' },
  );
  assert.deepEqual(
    getHelpErrorDescriptor(undefined),
    { type: 'unknown', messageKey: 'social.help.errorUnknown' },
  );
});

// ── Semantic descriptors tests ─────────────────────────────────────

test('HELP_ERROR_DESCRIPTORS covers all known server error messages', () => {
  const expectedErrors = [
    'Cannot help your own garden',
    'Helper not found',
    'Owner not found',
    'Already helped a garden today',
    'Garden help is full for today',
    'Already helped this garden today',
    'Invalid coin balance',
    'Invalid XP balance',
  ];
  for (const msg of expectedErrors) {
    assert.ok(Object.hasOwn(HELP_ERROR_DESCRIPTORS, msg), `Missing descriptor: ${msg}`);
  }
});

test('HELP_STATE_DESCRIPTORS provides correct semantic keys', () => {
  assert.equal(HELP_STATE_DESCRIPTORS.available.canHelp, true);
  assert.equal(HELP_STATE_DESCRIPTORS.available.type, 'available');
  assert.equal(HELP_STATE_DESCRIPTORS.selfHelp.canHelp, false);
  assert.equal(HELP_STATE_DESCRIPTORS.dailyLimitReached.canHelp, false);
  assert.equal(HELP_STATE_DESCRIPTORS.gardenFull.canHelp, false);
  assert.equal(HELP_STATE_DESCRIPTORS.alreadyHelped.canHelp, false);
});

// ── barrel export tests ────────────────────────────────────────────

test('social features index exports all expected symbols', async () => {
  const mod = await import('../src/features/social/index.js');
  assert.equal(typeof mod.helpGarden, 'function');
  assert.equal(typeof mod.normalizeHelpResponse, 'function');
  assert.equal(typeof mod.getHelpErrorDescriptor, 'function');
  assert.ok(Object.hasOwn(mod, 'HELP_ERROR_DESCRIPTORS'));
  assert.ok(Object.hasOwn(mod, 'HELP_STATE_DESCRIPTORS'));
});
