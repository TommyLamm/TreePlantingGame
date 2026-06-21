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

let id = 0;
async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result || {});
    } else if (msg.method) {
      const list = listeners.get(msg.method) || [];
      for (const cb of list) cb(msg.params);
    }
  });

  return {
    send(method, params = {}) {
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
    },
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(cb);
    },
    close() {
      ws.close();
    },
  };
}

async function runMatrix() {
  console.log('Connecting to DevTools...');
  await waitForDevTools();
  const target = await json(`${endpoint}/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
  const page = await cdp(target.webSocketDebuggerUrl);

  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Fetch.enable', {
    patterns: [
      { urlPattern: '*/api/heartbeat', requestStage: 'Response' }
    ]
  });

  // Default mock user state
  let mockUser = {
    username: 'screenshot_demo',
    xp: 0,
    level: 1,
    activeEvent: null,
    isDemoMode: false,
    lastTick: Date.now(),
    lastEventTime: Date.now(),
    coins: 500,
    inventory: { xpBuff: false, autoWater: false, treeSkin: 'default', unlockedSkins: ['default'] },
    joinDate: Date.now(),
    playTime: 100000,
    interactionCount: 5,
    profile: { avatar: null, birthday: '', signature: 'Hello Garden!' },
    achievements: [],
    lastLoginDate: '2026-06-20',
    loginStreak: 2,
    maxLoginStreak: 2,
    dailyRewardClaimed: true,
    combo: 0,
    maxCombo: 0,
    companion: null,
    unlockedCompanions: [],
    generation: 0,
    prestigePoints: 0,
    prestigeUpgrades: {},
    totalXpEarned: 10,
    totalCoinsEarned: 500,
    totalEventsResolved: 1,
    lastOfflineXp: 0,
    lastOfflineCoins: 0,
    goldenHourUntil: 0,
    lastShakeTime: 0,
    lastGiftDate: null,
    minigameCount: 0,
    minigameDate: null,
    weather: 'sunny',
    season: 'spring',
    dailyRewardAvailable: false
  };

  // Listen to Fetch.requestPaused to intercept heartbeat response
  page.on('Fetch.requestPaused', async (params) => {
    const { requestId, request } = params;
    // console.log(`Intercepted request: ${request.url}`);
    try {
      // Return fulfilled response with mock user
      const responseHeaders = [
        { name: 'content-type', value: 'application/json' },
        { name: 'access-control-allow-origin', value: '*' }
      ];
      const bodyString = JSON.stringify(mockUser);
      const base64Body = Buffer.from(bodyString).toString('base64');
      
      await page.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: 200,
        responseHeaders,
        body: base64Body
      });
    } catch (err) {
      console.error('Error in request interception:', err);
    }
  });

  // Set device metrics
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Evaluate startup storage
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('zenUser', 'screenshot_demo');
      localStorage.setItem('zenMuted', 'true');
    `
  });

  // Reload to force first login
  await page.send('Page.navigate', { url: appUrl });
  await delay(3000);

  // Setup the visual matrix test cases
  const cases = [
    {
      name: 'matrix_stage1_spring_sunny',
      setup: () => {
        mockUser.level = 1;
        mockUser.weather = 'sunny';
        mockUser.season = 'spring';
        mockUser.activeEvent = null;
        mockUser.companion = null;
      }
    },
    {
      name: 'matrix_stage3_summer_rainy',
      setup: () => {
        mockUser.level = 25;
        mockUser.weather = 'rainy';
        mockUser.season = 'summer';
        mockUser.activeEvent = null;
        mockUser.companion = 'butterfly';
        mockUser.unlockedCompanions = ['butterfly'];
      }
    },
    {
      name: 'matrix_stage5_autumn_stormy',
      setup: () => {
        mockUser.level = 50;
        mockUser.weather = 'stormy';
        mockUser.season = 'autumn';
        mockUser.activeEvent = null;
        mockUser.companion = 'squirrel';
        mockUser.unlockedCompanions = ['butterfly', 'squirrel'];
      }
    },
    {
      name: 'matrix_stage7_winter_snowy',
      setup: () => {
        mockUser.level = 100;
        mockUser.weather = 'snowy';
        mockUser.season = 'winter';
        mockUser.activeEvent = null;
        mockUser.companion = 'owl';
        mockUser.unlockedCompanions = ['butterfly', 'squirrel', 'owl'];
      }
    },
    {
      name: 'matrix_event_pest',
      setup: () => {
        mockUser.level = 25;
        mockUser.weather = 'sunny';
        mockUser.season = 'spring';
        mockUser.activeEvent = 'PEST';
      }
    },
    {
      name: 'matrix_event_sunlight',
      setup: () => {
        mockUser.level = 25;
        mockUser.weather = 'cloudy';
        mockUser.season = 'spring';
        mockUser.activeEvent = 'SUNLIGHT';
      }
    },
    {
      name: 'matrix_event_water',
      setup: () => {
        mockUser.level = 25;
        mockUser.weather = 'sunny';
        mockUser.season = 'spring';
        mockUser.activeEvent = 'WATER';
      }
    }
  ];

  // Capture cases
  for (const tc of cases) {
    console.log(`Setting up case: ${tc.name}...`);
    tc.setup();
    // Trigger update on page by reloading or invoking a custom trigger
    await page.send('Runtime.evaluate', { expression: 'location.reload()' });
    await delay(3000);

    const ss = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(join(artifactDir, `screenshots/${tc.name}.png`), Buffer.from(ss.data, 'base64'));
    console.log(`Saved screenshot: ${tc.name}.png`);
  }

  // Case 8: Reduced motion verification (with snowy winter stage 7)
  console.log('Setting up case: matrix_reduced_motion...');
  mockUser.level = 100;
  mockUser.weather = 'snowy';
  mockUser.season = 'winter';
  mockUser.activeEvent = null;
  await page.send('Runtime.evaluate', { expression: 'location.reload()' });
  await delay(2000);
  
  // Emulate reduced motion
  await page.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await delay(1000);
  const ssReduced = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(artifactDir, `screenshots/matrix_reduced_motion.png`), Buffer.from(ssReduced.data, 'base64'));
  console.log('Saved screenshot: matrix_reduced_motion.png');
  
  // Reset media features
  await page.send('Emulation.setEmulatedMedia', { features: [] });

  // Case 9: Memory Match Game (open fun zone, then memory match)
  console.log('Opening Fun Zone modal...');
  await page.send('Runtime.evaluate', {
    expression: `
      const miniGameBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Mini Games' || b.title === '迷你遊戲' || b.innerText.includes('🎮'));
      if (miniGameBtn) miniGameBtn.click();
    `
  });
  await delay(2000);

  console.log('Opening Memory Match game inside modal...');
  await page.send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const memoryBtn = buttons.find(b => b.innerText.includes('🃏') || b.innerText.includes('Memory Match') || b.innerText.includes('記憶翻牌'));
      if (memoryBtn) memoryBtn.click();
    `
  });
  await delay(2000);
  const ssMemory = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(artifactDir, `screenshots/matrix_minigame_memory.png`), Buffer.from(ssMemory.data, 'base64'));
  console.log('Saved screenshot: matrix_minigame_memory.png');

  // Let's close the minigame or restart/reload
  await page.send('Runtime.evaluate', { expression: 'location.reload()' });
  await delay(3000);

  // Case 10: Quick Water Game (open fun zone, then quick water)
  console.log('Opening Fun Zone modal for Quick Water...');
  await page.send('Runtime.evaluate', {
    expression: `
      const miniGameBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Mini Games' || b.title === '迷你遊戲' || b.innerText.includes('🎮'));
      if (miniGameBtn) miniGameBtn.click();
    `
  });
  await delay(2000);

  console.log('Opening Quick Water game inside modal...');
  await page.send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const waterBtn = buttons.find(b => b.innerText.includes('💧') || b.innerText.includes('Quick Water') || b.innerText.includes('快速澆水'));
      if (waterBtn) waterBtn.click();
    `
  });
  await delay(2000);
  console.log('Clicking Start Game button...');
  await page.send('Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.innerText.includes('Start') || b.innerText.includes('開始') || b.innerText.includes('开始'));
      if (startBtn) startBtn.click();
    `
  });
  await delay(2000);
  const ssWater = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(artifactDir, `screenshots/matrix_minigame_water.png`), Buffer.from(ssWater.data, 'base64'));
  console.log('Saved screenshot: matrix_minigame_water.png');

  // Close and cleanup
  page.close();
  console.log('Visual matrix capture completed!');
}

runMatrix().catch((err) => {
  console.error('Error running visual matrix:', err);
  process.exitCode = 1;
});
