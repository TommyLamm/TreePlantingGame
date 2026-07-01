const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const { once } = require('node:events');

const STARTUP_TIMEOUT_MS = 5000;
const OUTPUT_LIMIT = 64 * 1024;

async function getFreePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });

  const address = listener.address();
  const port = address.port;
  await new Promise((resolve, reject) => {
    listener.close((error) => error ? reject(error) : resolve());
  });
  return port;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function capture(stream, append) {
  stream.setEncoding('utf8');
  stream.on('data', append);
}

async function startServer(initialData = {}, portAttempt = 0) {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const port = await getFreePort();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'tree-planting-game-'));
  const dbFile = path.join(tempDir, 'save.json');

  try {
    await writeFile(dbFile, JSON.stringify(initialData, null, 2), 'utf8');
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }

  const child = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_FILE: dbFile,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closePromise = new Promise((resolve) => {
    child.once('close', (...args) => resolve(args));
  });

  let output = '';
  let spawnError;
  let stopPromise;
  const appendOutput = (chunk) => {
    output = (output + chunk).slice(-OUTPUT_LIMIT);
  };

  capture(child.stdout, appendOutput);
  capture(child.stderr, appendOutput);
  child.once('error', (error) => {
    spawnError = error;
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(pathname, { method = 'GET', body } = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json();
    return { status: response.status, headers: response.headers, body: json };
  }

  async function stop() {
    if (!stopPromise) {
      stopPromise = (async () => {
        if (child.pid && child.exitCode === null && child.signalCode === null) {
          child.kill();
        }
        await closePromise;
        await rm(tempDir, { recursive: true, force: true });
      })();
    }
    return stopPromise;
  }

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError;

  while (Date.now() < deadline) {
    if (spawnError || child.exitCode !== null || child.signalCode !== null) break;

    const controller = new AbortController();
    const abortTimer = setTimeout(
      () => controller.abort(),
      Math.min(1000, Math.max(1, deadline - Date.now())),
    );
    try {
      try {
        const response = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
        await response.arrayBuffer();
        if (response.ok) {
          return { baseUrl, dbFile, request, stop };
        }
        lastError = new Error(`Health check returned HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    } finally {
      clearTimeout(abortTimer);
    }

    await delay(Math.min(50, Math.max(0, deadline - Date.now())));
  }

  const details = [
    spawnError && `Spawn error: ${spawnError.message}`,
    lastError && `Last health check error: ${lastError.message}`,
    `Exit code: ${child.exitCode}`,
    `Signal: ${child.signalCode}`,
    output && `Server output:\n${output}`,
  ].filter(Boolean).join('\n');

  await stop();
  if (/already in use/i.test(output) && portAttempt < 2) {
    return startServer(initialData, portAttempt + 1);
  }
  throw new Error(`Server failed to become healthy within five seconds.\n${details}`);
}

module.exports = { startServer };
