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

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

test('bootstrap starts autosave only after listening and guards one shutdown path', async () => {
  const source = await readFile(serverFile, 'utf8');
  const listenIndex = source.indexOf('const server = app.listen');
  const autosaveIndex = source.indexOf('repository.startAutoSave()');
  const shutdownStart = source.indexOf('async function shutdown');
  const shutdownEnd = source.indexOf("process.on('SIGINT'", shutdownStart);
  const shutdownSource = source.slice(shutdownStart, shutdownEnd);
  assert.ok(listenIndex >= 0 && autosaveIndex > listenIndex, 'autosave must start in the listen callback');
  assert.match(source, /let shutdownPromise;/);
  assert.match(shutdownSource, /if \(!shutdownPromise\)[\s\S]*shutdownPromise = \(async \(\) =>/);
  assert.match(shutdownSource, /\[Shutdown Error\] Failed to save data:/);
  assert.match(shutdownSource, /process\.exit\(1\)/);
});
