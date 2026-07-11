import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const port = Number(process.env.CHROME_DEBUG_PORT || 9223);
const appUrl = process.env.VISUAL_QA_URL || 'http://127.0.0.1:5173';
const outputDir = resolve(process.env.VISUAL_QA_OUTPUT || 'artifacts/visual-qa');
const debugBase = `http://127.0.0.1:${port}`;

const scenarios = [
  { name: 'desktop-day-peaceful', width: 1440, height: 900, user: 'VisualDay', hour: 10 },
  { name: 'desktop-night-companion-event', width: 1440, height: 900, user: 'VisualEvent', hour: 22 },
  { name: 'tablet-day-event', width: 768, height: 1024, user: 'VisualEvent', hour: 10 },
  { name: 'mobile-day-peaceful', width: 375, height: 812, user: 'VisualDay', hour: 10 },
  { name: 'mobile-night-storm', width: 375, height: 812, user: 'VisualEvent', hour: 22 },
];

const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.socket.addEventListener('open', resolveReady, { once: true });
      this.socket.addEventListener('error', rejectReady, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params);
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId;
    this.nextId += 1;
    const result = new Promise((resolveResult, rejectResult) => {
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

async function waitFor(client, expression, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    if (result.result.value) return result.result.value;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function captureScenario(scenario) {
  const targetResponse = await fetch(`${debugBase}/json/new?about:blank`, { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Could not create Chrome target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  const failures = [];
  const consoleErrors = [];

  client.on('Network.loadingFailed', event => failures.push({
    url: event.url,
    errorText: event.errorText,
    type: event.type,
  }));
  client.on('Runtime.exceptionThrown', event => {
    consoleErrors.push(event.exceptionDetails?.text || 'Runtime exception');
  });

  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Network.enable'),
  ]);
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: scenario.width,
    height: scenario.height,
    deviceScaleFactor: 1,
    mobile: scenario.width <= 640,
  });

  const fixedTime = `2026-07-11T${String(scenario.hour).padStart(2, '0')}:00:00+08:00`;
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('zenUser', ${JSON.stringify(scenario.user)});
      localStorage.setItem('zenMuted', 'true');
      localStorage.setItem('zenLang', 'en');
      const NativeDate = Date;
      const fixedTimestamp = new NativeDate(${JSON.stringify(fixedTime)}).getTime();
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [fixedTimestamp])); }
        static now() { return fixedTimestamp; }
      };
    `,
  });
  await client.send('Page.navigate', { url: appUrl });
  await waitFor(client, `document.readyState === 'complete'`);
  await waitFor(client, `Boolean(document.querySelector('.game-shell .game-status-panel'))`);
  await sleep(1200);

  const metricsResult = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect() || null;
      const plain = value => value && ({
        left: Math.round(value.left),
        top: Math.round(value.top),
        right: Math.round(value.right),
        bottom: Math.round(value.bottom),
        width: Math.round(value.width),
        height: Math.round(value.height),
      });
      const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      const tools = [...document.querySelectorAll('.hud-tool-button')].map(element => element.getBoundingClientRect());
      const status = rect('.game-status-panel');
      const tree = rect('.raster-tree-wrap');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        minToolWidth: Math.round(Math.min(...tools.map(item => item.width))),
        minToolHeight: Math.round(Math.min(...tools.map(item => item.height))),
        status: plain(status),
        tree: plain(tree),
        statusTreeOverlap: intersects(status, tree),
        hud: plain(rect('.game-hud')),
        toolScrollWidth: document.querySelector('.hud-tools')?.scrollWidth || 0,
        toolClientWidth: document.querySelector('.hud-tools')?.clientWidth || 0,
        emojiInMainHud: /[🔥☀️💧🐛🍂✨⚡]/u.test([
          document.querySelector('.game-hud')?.textContent,
          document.querySelector('.game-status-panel')?.textContent,
          document.querySelector('.action-burst-label')?.textContent,
        ].join(' ')),
      };
    })()`,
    returnByValue: true,
  });

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(join(outputDir, `${scenario.name}.png`), Buffer.from(screenshot.data, 'base64'));
  await fetch(`${debugBase}/json/close/${target.id}`);
  client.close();

  return {
    ...scenario,
    metrics: metricsResult.result.value,
    networkFailures: failures.filter(item => item.errorText !== 'net::ERR_ABORTED'),
    consoleErrors,
  };
}

await mkdir(outputDir, { recursive: true });
const report = [];
for (const scenario of scenarios) {
  report.push(await captureScenario(scenario));
}
await writeFile(join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
