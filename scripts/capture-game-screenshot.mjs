import { writeFileSync } from 'node:fs';

const endpoint = 'http://127.0.0.1:9222';
const appUrl = 'http://127.0.0.1:7777';
const outputPath = 'game-screenshot.png';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function json(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function waitForDevTools() {
  for (let i = 0; i < 80; i++) {
    try {
      return await json(`${endpoint}/json/version`);
    } catch {
      await delay(250);
    }
  }
  throw new Error('Chrome DevTools endpoint did not become ready.');
}

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result || {});
    }
  });

  return {
    send(method, params = {}) {
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
    },
    close() {
      ws.close();
    },
  };
}

async function main() {
  await waitForDevTools();
  const target = await json(`${endpoint}/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
  const page = await cdp(target.webSocketDebuggerUrl);

  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Page.setViewport', {}).catch(() => {});
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await delay(1500);
  await page.send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('zenUser', 'screenshot-demo');
      localStorage.setItem('zenMuted', 'true');
      location.reload();
    `,
  });

  await delay(3500);
  const state = await page.send('Runtime.evaluate', {
    expression: `({
      title: document.title,
      url: location.href,
      hasTree: !!document.querySelector('.raster-tree-scene'),
      hasLoginInput: !!document.querySelector('input'),
      bodyText: document.body.innerText.slice(0, 200)
    })`,
    returnByValue: true,
  });

  if (!state.result?.value?.hasTree) {
    await page.send('Runtime.evaluate', {
      expression: `
        const input = document.querySelector('input');
        if (input) {
          input.value = 'screenshot-demo';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const button = Array.from(document.querySelectorAll('button')).find((b) => /start|開始|login|登入|enter|進入/i.test(b.innerText)) || document.querySelector('button');
          if (button) button.click();
        }
      `,
    });
    await delay(3500);
  }

  const screenshot = await page.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
  page.close();
  console.log(outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
