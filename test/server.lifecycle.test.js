const assert = require('node:assert/strict');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { EventEmitter, once } = require('node:events');
const fsPromises = require('node:fs/promises');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const serverFile = path.join(projectRoot, 'server.js');
const WAIT_TIMEOUT_MS = 5000;
const { attachServerLifecycle, createShutdown } = require('../server');
const { createUserRepository } = require('../server/data/userRepository');

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createShutdownHarness({
  dirty,
  flush,
  server,
  drainTimeoutMs = 100,
  forceTimeoutMs = 100,
}) {
  const calls = { stop: 0, close: 0, flush: 0, logs: [], errors: [], exits: [] };
  const repository = {
    stopAutoSave() { calls.stop += 1; },
    isDirty() { return dirty(); },
    async flush() {
      calls.flush += 1;
      return flush();
    },
  };
  const shutdownServer = server || {
    close(callback) {
      calls.close += 1;
      callback();
    },
  };
  const logger = {
    log(...args) { calls.logs.push(args); },
    error(...args) { calls.errors.push(args); },
  };
  const exit = (code) => { calls.exits.push(code); };
  return {
    shutdown: createShutdown({
      repository,
      server: shutdownServer,
      logger,
      exit,
      drainTimeoutMs,
      forceTimeoutMs,
    }),
    calls,
  };
}

async function createTempDatabase() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'tree-planting-lifecycle-'));
  const dbFile = path.join(tempDir, 'save.json');
  try {
    await writeFile(dbFile, '{}', 'utf8');
    return { tempDir, dbFile };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

async function getFreePort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve, reject) => {
    listener.close((error) => error ? reject(error) : resolve());
  });
  return port;
}

function startChild(port, dbFile) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), DB_FILE: dbFile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const close = new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  return { child, close, output: () => ({ stdout, stderr }) };
}

async function startHealthyChild(dbFile) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const port = await getFreePort();
    const running = startChild(port, dbFile);
    try {
      const health = await waitForHealth(port, running.child);
      return { health, port, running };
    } catch (error) {
      lastError = error;
      await stopChild(running.child, running.close);
      if (!/already in use/i.test(running.output().stderr)) throw error;
    }
  }
  throw lastError;
}

async function waitForClose(close, timeoutMs = WAIT_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      close,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out waiting for server exit')), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stopChild(child, close) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
    try {
      await waitForClose(close);
    } catch {
      child.kill('SIGKILL');
      await waitForClose(close);
    }
  }
  await waitForClose(close);
}

async function waitForHealth(port, child) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Server exited before health check: ${child.exitCode || child.signalCode}`);
    }
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(1000, Math.max(1, deadline - Date.now())),
    );
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: controller.signal,
      });
      if (response.ok) return await response.json();
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
    await delay(50);
  }
  throw new Error(`Timed out waiting for health: ${lastError && lastError.message}`);
}

test('normal startup becomes healthy and the child can be stopped cleanly', async () => {
  const { tempDir, dbFile } = await createTempDatabase();
  let running;
  try {
    const started = await startHealthyChild(dbFile);
    running = started.running;
    const { health } = started;
    assert.equal(health.status, 'ok');
    assert.equal(typeof health.uptime, 'number');
  } finally {
    if (running) await stopChild(running.child, running.close);
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('graceful shutdown persists Admin and Alice before exiting', {
  skip: process.platform === 'win32'
    ? 'Windows child_process signals terminate the process without delivering SIGTERM to Node'
    : false,
}, async () => {
  const { tempDir, dbFile } = await createTempDatabase();
  let running;
  try {
    const started = await startHealthyChild(dbFile);
    running = started.running;
    const { port } = started;
    const response = await fetch(`http://127.0.0.1:${port}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Alice' }),
    });
    assert.equal(response.status, 200);

    assert.equal(running.child.kill('SIGTERM'), true);
    assert.deepEqual(await waitForClose(running.close), { code: 0, signal: null });

    const persisted = JSON.parse(await readFile(dbFile, 'utf8'));
    assert.equal(persisted.Admin.level, 100);
    assert.equal(persisted.Alice.level, 1);
    assert.equal(typeof persisted.Alice.lastTick, 'number');
  } finally {
    if (running) await stopChild(running.child, running.close);
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('EADDRINUSE exits promptly with the established guidance and no orphan process', async () => {
  const { tempDir, dbFile } = await createTempDatabase();
  const blocker = net.createServer();
  // Match app.listen(PORT)'s dual-stack binding so the conflict is portable on Windows.
  blocker.listen(0);
  await once(blocker, 'listening');
  const { port } = blocker.address();
  const running = startChild(port, dbFile);
  try {
    assert.deepEqual(await waitForClose(running.close), { code: 1, signal: null });
    const { stderr } = running.output();
    assert.match(stderr, new RegExp(`Port ${port} is already in use\\.`));
    assert.match(stderr, /Another game server is probably still running\./);
    assert.match(stderr, /Stop the existing process or start this one with a different port/);
  } finally {
    await stopChild(running.child, running.close);
    await new Promise((resolve, reject) => {
      blocker.close((error) => error ? reject(error) : resolve());
    });
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('importing server exposes createShutdown without starting the bootstrap', async () => {
  const { tempDir, dbFile } = await createTempDatabase();
  const port = await getFreePort();
  const child = spawn(process.execPath, [
    '-e',
    "process.stdout.write(typeof require(process.argv[1]).createShutdown);",
    serverFile,
  ], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), DB_FILE: dbFile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const close = new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  let stdout = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  try {
    assert.deepEqual(await waitForClose(close), { code: 0, signal: null });
    assert.equal(stdout, 'function');
  } finally {
    await stopChild(child, close);
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('concurrent shutdown calls share one path and retain the first signal', async () => {
  const closeGate = deferred();
  let dirty = true;
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => { dirty = false; },
    server: {
      close(callback) {
        calls.close += 1;
        void closeGate.promise.then(callback);
      },
    },
  });

  const first = shutdown('SERVER_ERROR', 1);
  const second = shutdown('SIGTERM', 0);
  assert.strictEqual(second, first);
  assert.equal(calls.stop, 1);
  assert.equal(calls.close, 1);
  assert.equal(calls.flush, 0);
  assert.deepEqual(calls.exits, []);
  assert.deepEqual(calls.logs, [['\n[Shutdown] Received SERVER_ERROR. Saving data to disk...']]);

  closeGate.resolve();
  await Promise.all([first, second]);
  assert.equal(calls.stop, 1);
  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.logs, [
    ['\n[Shutdown] Received SERVER_ERROR. Saving data to disk...'],
    ['[Shutdown] Data saved successfully.'],
  ]);
  assert.deepEqual(calls.exits, [1]);
});

test('a later shutdown request raises the shared path exit severity', async () => {
  const closeGate = deferred();
  let dirty = true;
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => { dirty = false; },
    server: {
      close(callback) {
        calls.close += 1;
        void closeGate.promise.then(callback);
      },
    },
  });

  const first = shutdown('SIGTERM', 0);
  const second = shutdown('SERVER_ERROR', 1);
  assert.strictEqual(second, first);
  closeGate.resolve();
  await first;

  assert.equal(calls.close, 1);
  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.logs[0], ['\n[Shutdown] Received SIGTERM. Saving data to disk...']);
  assert.deepEqual(calls.exits, [1]);
});

test('shutdown closes the server before flushing and persists mutations completed during drain', async () => {
  let dirty = false;
  let closeCallback;
  const order = [];
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => {
      order.push('flush');
      dirty = false;
    },
    server: {
      close(callback) {
        calls.close += 1;
        order.push('close');
        closeCallback = callback;
      },
    },
  });

  const completion = shutdown('SIGTERM');
  assert.deepEqual(order, ['close']);
  assert.equal(calls.flush, 0);

  dirty = true;
  closeCallback();
  await completion;

  assert.deepEqual(order, ['close', 'flush']);
  assert.deepEqual(calls.logs.at(-1), ['[Shutdown] Data saved successfully.']);
  assert.deepEqual(calls.exits, [0]);
});

test('shutdown first deadline forces lingering connections but waits for close confirmation', async () => {
  let dirty = true;
  let closeCallback;
  const forced = [];
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => { dirty = false; },
    drainTimeoutMs: 10,
    forceTimeoutMs: 100,
    server: {
      close(callback) {
        calls.close += 1;
        closeCallback = callback;
      },
      closeIdleConnections() { forced.push('idle'); },
      closeAllConnections() { forced.push('all'); },
    },
  });

  const completion = shutdown('SIGTERM');
  await delay(25);

  assert.deepEqual(forced, ['idle', 'all']);
  assert.equal(calls.flush, 0);
  assert.deepEqual(calls.exits, []);

  closeCallback();
  await completion;
  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.exits, [0]);
});

test('shutdown hard deadline logs a close timeout, flushes, and exits nonzero', async () => {
  let dirty = true;
  const forced = [];
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => { dirty = false; },
    drainTimeoutMs: 10,
    forceTimeoutMs: 10,
    server: {
      close() { calls.close += 1; },
      closeIdleConnections() { forced.push('idle'); },
      closeAllConnections() { forced.push('all'); },
    },
  });

  await shutdown('SIGTERM');

  assert.deepEqual(forced, ['idle', 'all']);
  assert.equal(calls.flush, 1);
  assert.equal(calls.errors[0][0], '[Shutdown Error] Failed to close server:');
  assert.match(calls.errors[0][1].message, /timed out waiting for server to close/i);
  assert.deepEqual(calls.exits, [1]);
});

test('connection force errors still attempt every force method and flush before exit one', async () => {
  const forceFailure = new Error('force failed');
  let dirty = true;
  const forced = [];
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => { dirty = false; },
    drainTimeoutMs: 10,
    forceTimeoutMs: 100,
    server: {
      close() { calls.close += 1; },
      closeIdleConnections() {
        forced.push('idle');
        throw forceFailure;
      },
      closeAllConnections() { forced.push('all'); },
    },
  });

  await shutdown('SIGTERM');

  assert.deepEqual(forced, ['idle', 'all']);
  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.errors, [['[Shutdown Error] Failed to close server:', forceFailure]]);
  assert.deepEqual(calls.exits, [1]);
});

test('server close errors still flush and force a nonzero exit', async () => {
  const closeFailure = Object.assign(new Error('close failed'), { code: 'EIO' });
  let dirty = true;
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => { dirty = false; },
    server: {
      close(callback) {
        calls.close += 1;
        callback(closeFailure);
      },
    },
  });

  await shutdown('SIGTERM');

  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.errors, [['[Shutdown Error] Failed to close server:', closeFailure]]);
  assert.deepEqual(calls.exits, [1]);
});

test('ERR_SERVER_NOT_RUNNING is treated as an already closed server', async () => {
  const closeFailure = Object.assign(new Error('not running'), { code: 'ERR_SERVER_NOT_RUNNING' });
  let closeCalls = 0;
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => false,
    flush: async () => {},
    server: {
      close(callback) {
        closeCalls += 1;
        callback(closeFailure);
      },
    },
  });

  await shutdown('SIGTERM');

  assert.equal(closeCalls, 1);
  assert.deepEqual(calls.errors, []);
  assert.deepEqual(calls.exits, [0]);
});

test('real repository composition closes before writing Admin and Alice on every platform', async () => {
  const { tempDir, dbFile } = await createTempDatabase();
  const order = [];
  const repository = createUserRepository({
    dbFile,
    logger: { log() {}, error() {} },
    fsAsync: {
      ...fsPromises,
      open(...args) {
        order.push('write');
        return fsPromises.open(...args);
      },
    },
  });
  const exits = [];
  try {
    repository.initialize();
    repository.ensureUser('Alice');
    const shutdown = createShutdown({
      repository,
      server: {
        close(callback) {
          order.push('close');
          callback();
        },
      },
      logger: { log() {}, error() {} },
      exit: (code) => exits.push(code),
    });

    await shutdown('SIGTERM');

    const persisted = JSON.parse(await readFile(dbFile, 'utf8'));
    assert.equal(persisted.Admin.level, 100);
    assert.equal(persisted.Alice.level, 1);
    assert.deepEqual(order.slice(0, 2), ['close', 'write']);
    assert.deepEqual(exits, [0]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('a fatal server error after listening uses the shared graceful shutdown path', async () => {
  const server = new EventEmitter();
  const calls = { starts: 0, stops: 0, shutdowns: [], errors: [], exits: [] };
  const repository = {
    startAutoSave() { calls.starts += 1; },
    stopAutoSave() { calls.stops += 1; },
  };
  attachServerLifecycle({
    server,
    repository,
    shutdown: async (...args) => { calls.shutdowns.push(args); },
    port: 7777,
    logger: {
      log() {},
      error(...args) { calls.errors.push(args); },
    },
    exit: (code) => calls.exits.push(code),
  });
  const failure = Object.assign(new Error('accept failed'), { code: 'EIO' });

  server.emit('listening');
  server.emit('error', failure);
  await Promise.resolve();

  assert.equal(calls.starts, 1);
  assert.equal(calls.stops, 0);
  assert.deepEqual(calls.errors, [['[Server Error]', failure]]);
  assert.deepEqual(calls.shutdowns, [['SERVER_ERROR', 1]]);
  assert.deepEqual(calls.exits, []);
});

test('EADDRINUSE after listening uses graceful shutdown without startup guidance', async () => {
  const server = new EventEmitter();
  const calls = { shutdowns: [], errors: [], exits: [] };
  attachServerLifecycle({
    server,
    repository: { startAutoSave() {}, stopAutoSave() {} },
    shutdown: async (...args) => { calls.shutdowns.push(args); },
    port: 7777,
    logger: {
      log() {},
      error(...args) { calls.errors.push(args); },
    },
    exit: (code) => calls.exits.push(code),
  });
  const failure = Object.assign(new Error('runtime address failure'), { code: 'EADDRINUSE' });

  server.emit('listening');
  server.emit('error', failure);
  await Promise.resolve();

  assert.deepEqual(calls.errors, [['[Server Error]', failure]]);
  assert.deepEqual(calls.shutdowns, [['SERVER_ERROR', 1]]);
  assert.deepEqual(calls.exits, []);
});

test('clean shutdown joins a deferred flush before logging or exiting', async () => {
  const gate = deferred();
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => false,
    flush: () => gate.promise,
  });

  const completion = shutdown('SIGTERM');
  await Promise.resolve();
  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.exits, []);
  assert.deepEqual(calls.logs, [['\n[Shutdown] Received SIGTERM. Saving data to disk...']]);

  gate.resolve();
  await completion;
  assert.deepEqual(calls.logs.at(-1), ['[Shutdown] No pending changes. Data is safe.']);
  assert.deepEqual(calls.exits, [0]);
});

test('dirty shutdown awaits flush then logs success and exits zero', async () => {
  const gate = deferred();
  let dirty = true;
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => {
      await gate.promise;
      dirty = false;
    },
  });

  const completion = shutdown('SIGINT');
  assert.deepEqual(calls.exits, []);
  gate.resolve();
  await completion;

  assert.deepEqual(calls.logs.at(-1), ['[Shutdown] Data saved successfully.']);
  assert.deepEqual(calls.exits, [0]);
});

test('flush rejection logs the authorized error and exits nonzero', async () => {
  const failure = new Error('disk unavailable');
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => true,
    flush: () => Promise.reject(failure),
  });

  await shutdown('SIGTERM');

  assert.deepEqual(calls.errors, [['[Shutdown Error] Failed to save data:', failure]]);
  assert.deepEqual(calls.exits, [1]);
  assert.equal(calls.logs.some(([message]) => message === '[Shutdown] Data saved successfully.'), false);
});

test('flush that leaves dirty data logs failure and exits nonzero', async () => {
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => true,
    flush: () => Promise.resolve(),
  });

  await shutdown('SIGINT');

  assert.equal(calls.errors.length, 1);
  assert.equal(calls.errors[0][0], '[Shutdown Error] Failed to save data:');
  assert.match(calls.errors[0][1].message, /remains unsaved/);
  assert.deepEqual(calls.exits, [1]);
  assert.equal(calls.logs.some(([message]) => message === '[Shutdown] Data saved successfully.'), false);
});
