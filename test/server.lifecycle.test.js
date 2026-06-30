const assert = require('node:assert/strict');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const serverFile = path.join(projectRoot, 'server.js');
const WAIT_TIMEOUT_MS = 5000;
const { createShutdown } = require('../server');

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

function createShutdownHarness({ dirty, flush }) {
  const calls = { stop: 0, flush: 0, logs: [], errors: [], exits: [] };
  const repository = {
    stopAutoSave() { calls.stop += 1; },
    isDirty() { return dirty(); },
    async flush() {
      calls.flush += 1;
      return flush();
    },
  };
  const logger = {
    log(...args) { calls.logs.push(args); },
    error(...args) { calls.errors.push(args); },
  };
  const exit = (code) => { calls.exits.push(code); };
  return { shutdown: createShutdown({ repository, logger, exit }), calls };
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
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  return { child, output: () => ({ stdout, stderr }) };
}

async function waitForExit(child, timeoutMs = WAIT_TIMEOUT_MS) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode };
  }
  let timer;
  try {
    return await Promise.race([
      once(child, 'exit').then(([code, signal]) => ({ code, signal })),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out waiting for server exit')), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stopChild(child) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
    try {
      await waitForExit(child);
    } catch {
      child.kill('SIGKILL');
      await waitForExit(child);
    }
  }
}

async function waitForHealth(port, child) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Server exited before health check: ${child.exitCode || child.signalCode}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return response.json();
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }
  throw new Error(`Timed out waiting for health: ${lastError && lastError.message}`);
}

test('normal startup becomes healthy and the child can be stopped cleanly', async () => {
  const { tempDir, dbFile } = await createTempDatabase();
  const port = await getFreePort();
  const running = startChild(port, dbFile);
  try {
    const health = await waitForHealth(port, running.child);
    assert.equal(health.status, 'ok');
    assert.equal(typeof health.uptime, 'number');
  } finally {
    await stopChild(running.child);
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('graceful shutdown persists Admin and Alice before exiting', {
  skip: process.platform === 'win32'
    ? 'Windows child_process signals terminate the process without delivering SIGTERM to Node'
    : false,
}, async () => {
  const { tempDir, dbFile } = await createTempDatabase();
  const port = await getFreePort();
  const running = startChild(port, dbFile);
  try {
    await waitForHealth(port, running.child);
    const response = await fetch(`http://127.0.0.1:${port}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Alice' }),
    });
    assert.equal(response.status, 200);

    assert.equal(running.child.kill('SIGTERM'), true);
    assert.deepEqual(await waitForExit(running.child), { code: 0, signal: null });

    const persisted = JSON.parse(await readFile(dbFile, 'utf8'));
    assert.equal(persisted.Admin.level, 100);
    assert.equal(persisted.Alice.level, 1);
    assert.equal(typeof persisted.Alice.lastTick, 'number');
  } finally {
    await stopChild(running.child);
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
    assert.deepEqual(await waitForExit(running.child), { code: 1, signal: null });
    const { stderr } = running.output();
    assert.match(stderr, new RegExp(`Port ${port} is already in use\\.`));
    assert.match(stderr, /Another game server is probably still running\./);
    assert.match(stderr, /Stop the existing process or start this one with a different port/);
  } finally {
    await stopChild(running.child);
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
  let stdout = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  try {
    assert.deepEqual(await waitForExit(child), { code: 0, signal: null });
    assert.equal(stdout, 'function');
  } finally {
    await stopChild(child);
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('concurrent shutdown calls share one path and retain the first signal', async () => {
  const gate = deferred();
  let dirty = true;
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => dirty,
    flush: async () => {
      await gate.promise;
      dirty = false;
    },
  });

  const first = shutdown('SIGINT');
  const second = shutdown('SIGTERM');
  assert.strictEqual(second, first);
  assert.equal(calls.stop, 1);
  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.exits, []);
  assert.deepEqual(calls.logs, [['\n[Shutdown] Received SIGINT. Saving data to disk...']]);

  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(calls.stop, 1);
  assert.equal(calls.flush, 1);
  assert.deepEqual(calls.logs, [
    ['\n[Shutdown] Received SIGINT. Saving data to disk...'],
    ['[Shutdown] Data saved successfully.'],
  ]);
  assert.deepEqual(calls.exits, [0]);
});

test('clean shutdown joins a deferred flush before logging or exiting', async () => {
  const gate = deferred();
  const { shutdown, calls } = createShutdownHarness({
    dirty: () => false,
    flush: () => gate.promise,
  });

  const completion = shutdown('SIGTERM');
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
