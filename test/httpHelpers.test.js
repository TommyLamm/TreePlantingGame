const assert = require('node:assert/strict');
const { test } = require('node:test');

const { HttpError, asyncHandler, errorMiddleware } = require('../server/http/errors');
const {
  isValidUsername,
  requireValidUsername,
  requireExistingUser,
} = require('../server/http/userContext');

function createResponseSpy(jsonResult) {
  const calls = { statuses: [], bodies: [] };
  const response = {
    status(status) {
      calls.statuses.push(status);
      return response;
    },
    json(body) {
      calls.bodies.push(body);
      return jsonResult;
    },
  };
  return { response, calls };
}

test('HttpError carries its status and message and inherits from Error', () => {
  const error = new HttpError(418, 'Teapot');

  assert.ok(error instanceof Error);
  assert.ok(error instanceof HttpError);
  assert.equal(error.status, 418);
  assert.equal(error.message, 'Teapot');
});

test('isValidUsername accepts the supported characters and length bounds', () => {
  assert.equal(isValidUsername('Alice_中文'), true);
  assert.equal(isValidUsername('a1_中文'), true);
  assert.equal(isValidUsername('ab'), true);
  assert.equal(isValidUsername('a'.repeat(16)), true);
});

test('isValidUsername rejects unsupported lengths, punctuation, and non-strings', () => {
  assert.equal(isValidUsername('!'), false);
  assert.equal(isValidUsername('a'), false);
  assert.equal(isValidUsername('a'.repeat(17)), false);
  assert.equal(isValidUsername('Alice-name'), false);
  assert.equal(isValidUsername('Alice name'), false);
  assert.equal(isValidUsername(undefined), false);
  assert.equal(isValidUsername(null), false);
  assert.equal(isValidUsername(12), false);
  assert.equal(isValidUsername({}), false);
});

test('requireValidUsername returns valid input and throws the default validation error', () => {
  assert.equal(requireValidUsername('Alice_中文'), 'Alice_中文');
  assert.throws(
    () => requireValidUsername(undefined),
    error => error.status === 400 && error.message === 'Invalid username',
  );
});

test('requireValidUsername supports a custom error message', () => {
  assert.throws(
    () => requireValidUsername('!', 'Choose another name'),
    error => error.status === 400 && error.message === 'Choose another name',
  );
});

test('requireExistingUser returns the repository user by identity', () => {
  const user = { name: 'Alice' };
  const repository = { getUser: username => username === 'Alice' ? user : undefined };

  assert.equal(requireExistingUser(repository, 'Alice'), user);
});

test('requireExistingUser throws default and custom not-found errors', () => {
  const repository = { getUser: () => undefined };

  assert.throws(
    () => requireExistingUser(repository, 'Alice'),
    error => error.status === 404 && error.message === 'User not found',
  );
  assert.throws(
    () => requireExistingUser(repository, 'Alice', 'Player missing'),
    error => error.status === 404 && error.message === 'Player missing',
  );
});

test('asyncHandler forwards synchronous throws to next', async () => {
  const error = new Error('sync failure');
  const forwarded = [];
  const wrapped = asyncHandler(() => {
    throw error;
  });

  await wrapped({}, {}, value => forwarded.push(value));

  assert.deepEqual(forwarded, [error]);
});

test('asyncHandler forwards rejected promises to next', async () => {
  const error = new Error('async failure');
  const forwarded = [];
  const wrapped = asyncHandler(() => Promise.reject(error));

  await wrapped({}, {}, value => forwarded.push(value));

  assert.deepEqual(forwarded, [error]);
});

test('asyncHandler normalizes an undefined rejection before forwarding it', async () => {
  const forwarded = [];
  const wrapped = asyncHandler(() => Promise.reject(undefined));

  await wrapped({}, {}, value => forwarded.push(value));

  assert.equal(forwarded.length, 1);
  assert.ok(forwarded[0] instanceof Error);
  assert.notEqual(forwarded[0], undefined);
  assert.equal(forwarded[0].message, 'Unknown handler error');
});

test('asyncHandler normalizes a null rejection before forwarding it', async () => {
  const forwarded = [];
  const wrapped = asyncHandler(() => Promise.reject(null));

  await wrapped({}, {}, value => forwarded.push(value));

  assert.equal(forwarded.length, 1);
  assert.ok(forwarded[0] instanceof Error);
  assert.notEqual(forwarded[0], null);
  assert.equal(forwarded[0].message, 'Unknown handler error');
});

test('asyncHandler normalizes an Express-special string rejection before forwarding it', async () => {
  const forwarded = [];
  const wrapped = asyncHandler(() => Promise.reject('route'));

  await wrapped({}, {}, value => forwarded.push(value));

  assert.equal(forwarded.length, 1);
  assert.ok(forwarded[0] instanceof Error);
  assert.notEqual(forwarded[0], 'route');
  assert.equal(forwarded[0].message, 'route');
});

test('asyncHandler preserves HttpError rejection identity', async () => {
  const error = new HttpError(422, 'Invalid tree');
  const forwarded = [];
  const wrapped = asyncHandler(() => Promise.reject(error));

  await wrapped({}, {}, value => forwarded.push(value));

  assert.deepEqual(forwarded, [error]);
});

test('asyncHandler passes handler arguments and successful results through', async () => {
  const req = { id: 'request' };
  const res = { id: 'response' };
  const next = () => assert.fail('next should not be called');
  const wrapped = asyncHandler((actualReq, actualRes, actualNext) => {
    assert.equal(actualReq, req);
    assert.equal(actualRes, res);
    assert.equal(actualNext, next);
    return 'handled';
  });

  assert.equal(await wrapped(req, res, next), 'handled');
});

test('errorMiddleware serializes HttpError without logging or calling next', () => {
  const result = { sent: true };
  const { response, calls } = createResponseSpy(result);
  let nextCalls = 0;

  const actualResult = errorMiddleware(
    new HttpError(409, 'Conflict'),
    {},
    response,
    () => { nextCalls += 1; },
  );

  assert.equal(actualResult, result);
  assert.deepEqual(calls.statuses, [409]);
  assert.deepEqual(calls.bodies, [{ error: 'Conflict' }]);
  assert.equal(nextCalls, 0);
});

test('errorMiddleware delegates errors when response headers were already sent', () => {
  const error = new HttpError(409, 'Conflict');
  const nextResult = { delegated: true };
  const { response, calls } = createResponseSpy({ sent: true });
  const forwarded = [];
  response.headersSent = true;

  const actualResult = errorMiddleware(error, {}, response, value => {
    forwarded.push(value);
    return nextResult;
  });

  assert.equal(actualResult, nextResult);
  assert.deepEqual(forwarded, [error]);
  assert.deepEqual(calls.statuses, []);
  assert.deepEqual(calls.bodies, []);
});

test('errorMiddleware logs unknown errors once and returns a generic 500 response', () => {
  const error = new Error('private detail');
  const result = { sent: true };
  const { response, calls } = createResponseSpy(result);
  const logged = [];
  let nextCalls = 0;
  const originalConsoleError = console.error;
  console.error = value => logged.push(value);

  let actualResult;
  try {
    actualResult = errorMiddleware(error, {}, response, () => { nextCalls += 1; });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(actualResult, result);
  assert.deepEqual(calls.statuses, [500]);
  assert.deepEqual(calls.bodies, [{ error: 'Server Error' }]);
  assert.deepEqual(logged, [error]);
  assert.equal(nextCalls, 0);
});
