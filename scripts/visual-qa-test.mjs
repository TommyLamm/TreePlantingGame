import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const endpoint = 'http://127.0.0.1:9222';
const appUrl = 'http://127.0.0.1:7777';
const artifactDir = 'C:/Users/Tommy/.gemini/antigravity-ide/brain/922b62ac-e62b-484f-a688-4609b5426f0c';

try {
  mkdirSync(join(artifactDir, 'screenshots'), { recursive: true });
} catch (e) {}

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

async function runTest() {
  console.log('Connecting to DevTools...');
  await waitForDevTools();
  const target = await json(`${endpoint}/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
  const page = await cdp(target.webSocketDebuggerUrl);

  await page.send('Page.enable');
  await page.send('Runtime.enable');
  
  // Inject error/warning listener script
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__consoleErrors = [];
      const origError = console.error;
      console.error = (...args) => {
        window.__consoleErrors.push({ type: 'error', text: args.join(' ') });
        origError.apply(console, args);
      };
      const origWarn = console.warn;
      console.warn = (...args) => {
        window.__consoleErrors.push({ type: 'warning', text: args.join(' ') });
        origWarn.apply(console, args);
      };
      
      // Listen for unhandled promise rejections
      window.addEventListener('unhandledrejection', (e) => {
        window.__consoleErrors.push({ type: 'error', text: 'Unhandled Rejection: ' + e.reason });
      });
      // Listen for window errors
      window.addEventListener('error', (e) => {
        window.__consoleErrors.push({ type: 'error', text: 'Runtime Error: ' + e.message });
      });
    `
  });

  console.log('Setting user and reloading...');
  // Force login & quiet mode, wait for it
  await delay(1000);
  await page.send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('zenUser', 'screenshot_demo');
      localStorage.setItem('zenMuted', 'true');
      location.reload();
    `,
  });
  
  await delay(3000);

  // Check login status and solve event if present
  let status = await page.send('Runtime.evaluate', {
    expression: `({
      hasTree: !!document.querySelector('.raster-tree-scene') || !!document.querySelector('.tree-container'),
      hasLogin: !!document.querySelector('input')
    })`,
    returnByValue: true,
  });

  if (status.result.value.hasLogin && !status.result.value.hasTree) {
    console.log('Logging in user screenshot_demo...');
    await page.send('Runtime.evaluate', {
      expression: `
        const input = document.querySelector('input');
        if (input) {
          input.value = 'screenshot_demo';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const button = Array.from(document.querySelectorAll('button')).find((b) => /start|開始|login|登入|enter|進入/i.test(b.innerText)) || document.querySelector('button');
          if (button) button.click();
        }
      `
    });
    await delay(3000);
  }

  // Verify UI at different viewports
  const viewports = [
    { name: 'desktop_1280', width: 1280, height: 720, mobile: false },
    { name: 'tablet_768', width: 768, height: 1024, mobile: true },
    { name: 'mobile_390', width: 390, height: 844, mobile: true },
    { name: 'mobile_360', width: 360, height: 640, mobile: true },
  ];

  for (const vp of viewports) {
    console.log(`Setting viewport: ${vp.width}x${vp.height} (${vp.name})...`);
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
    });
    await delay(1000);

    const ss = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(join(artifactDir, `screenshots/${vp.name}.png`), Buffer.from(ss.data, 'base64'));
    console.log(`Saved screenshot ${vp.name}.png`);
  }

  // Reset to standard desktop for interaction tests
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Check console logs
  const logsResult = await page.send('Runtime.evaluate', {
    expression: 'window.__consoleErrors',
    returnByValue: true
  });
  const collectedLogs = logsResult.result.value || [];
  console.log(`Collected ${collectedLogs.length} console warnings/errors:`);
  for (const log of collectedLogs) {
    console.log(`  [${log.type.toUpperCase()}] ${log.text}`);
  }

  // Emulate reduced motion
  console.log('Testing reduced motion emulation...');
  await page.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await delay(1000);
  const ssReduced = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(artifactDir, 'screenshots/desktop_reduced_motion.png'), Buffer.from(ssReduced.data, 'base64'));
  console.log('Saved screenshot desktop_reduced_motion.png');

  // Disable reduced motion emulation
  await page.send('Emulation.setEmulatedMedia', { features: [] });

  // Test triggers/actions if they are clickable
  console.log('Triggering interactions...');
  // Let's click the "Mini Games" button to check the modal consistency
  await page.send('Runtime.evaluate', {
    expression: `
      const miniGameBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Mini Games' || b.title === '迷你遊戲' || b.innerText.includes('🎮'));
      if (miniGameBtn) {
        miniGameBtn.click();
      }
    `
  });
  await delay(1500);
  const ssModal = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(artifactDir, 'screenshots/minigame_modal.png'), Buffer.from(ssModal.data, 'base64'));
  console.log('Saved screenshot minigame_modal.png');

  // Close mini games modal
  await page.send('Runtime.evaluate', {
    expression: `
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('✕') || b.innerText.includes('Close') || b.innerText.includes('關閉') || b.className.includes('close'));
      if (closeBtn) closeBtn.click();
    `
  });
  await delay(1000);

  // Close target tab
  page.close();
  console.log('Visual QA tests completed!');
}

runTest().catch((err) => {
  console.error('Error running Visual QA test:', err);
  process.exitCode = 1;
});
