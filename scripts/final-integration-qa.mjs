import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/lamyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = join(projectRoot, 'client');
const outputPath = join(projectRoot, 'artifacts', 'final-integration-qa.json');
const visualQaDir = join(projectRoot, 'artifacts', 'visual-qa');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const appUrl = 'http://127.0.0.1:5174';
const apiUrl = 'http://127.0.0.1:7777';
const processes = [];
const report = { modalFocus: [], gameplay: {}, social: {} };

const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

async function waitForUrl(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'unknown error'}`);
}

function start(command, args, options) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
  processes.push(child);
  return child;
}

async function post(pathname, body) {
  const response = await fetch(`${apiUrl}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  assert.equal(response.ok, true, `${pathname}: ${payload.error || response.status}`);
  return payload;
}

async function auditDialog(page, name, openDialog, returnSelector) {
  console.log(`Auditing modal: ${name}`);
  await openDialog();
  const dialog = page.locator('.game-modals-layer [role="dialog"]').last();
  await dialog.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const candidates = [...document.querySelectorAll('.game-modals-layer [role="dialog"]')];
    const active = candidates[candidates.length - 1];
    return active && active.contains(document.activeElement);
  });

  const initial = await dialog.evaluate(element => ({
    ariaModal: element.getAttribute('aria-modal'),
    labelled: Boolean(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')),
    focusInside: element.contains(document.activeElement),
  }));
  assert.deepEqual(initial, { ariaModal: 'true', labelled: true, focusInside: true });

  const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const focusableCount = await dialog.locator(focusableSelector).count();
  if (focusableCount > 1) {
    await dialog.evaluate((element, selector) => element.querySelectorAll(selector)[element.querySelectorAll(selector).length - 1].focus(), focusableSelector);
    await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate((element, selector) => document.activeElement === element.querySelector(selector), focusableSelector), true);

    await page.keyboard.press('Shift+Tab');
    assert.equal(await dialog.evaluate((element, selector) => {
      const items = element.querySelectorAll(selector);
      return document.activeElement === items[items.length - 1];
    }, focusableSelector), true);
  }

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  if (returnSelector) {
    try {
      await page.waitForFunction(selector => document.activeElement?.matches(selector), returnSelector, { timeout: 3000 });
    } catch {
      const active = await page.evaluate(() => ({
        className: document.activeElement?.className || '',
        tagName: document.activeElement?.tagName || '',
        text: document.activeElement?.textContent?.trim() || '',
      }));
      throw new Error(`${name} did not return focus to ${returnSelector}: ${JSON.stringify(active)}`);
    }
  }
  report.modalFocus.push({ name, focusableCount, escape: true, returnFocus: Boolean(returnSelector) });
}

async function openToolbarDialog(page, buttonName) {
  await page.getByRole('button', { name: buttonName, exact: true }).click();
}

async function openMoreDialog(page, itemName) {
  await page.locator('.hud-more-button').click();
  await page.getByRole('menuitem', { name: itemName, exact: true }).click();
}

async function readLevel(page) {
  return Number((await page.locator('.status-level').innerText()).match(/\d+/)?.[0] || 0);
}

async function resolveNextEvent(page) {
  const interaction = page.locator('.event-interaction');
  await interaction.waitFor({ state: 'visible', timeout: 12000 });
  const eventType = await interaction.evaluate(element => (
    [...element.classList].find(className => className.startsWith('event-interaction-') && !['event-interaction-hold', 'event-interaction-sequence', 'event-interaction-timing', 'event-interaction-idle', 'event-interaction-active', 'event-interaction-completed', 'event-interaction-failed'].includes(className))
  ));
  await interaction.locator('.action-btn-active').click();
  await interaction.waitFor({ state: 'detached', timeout: 10000 });
  return eventType || 'active-event';
}

const tempDir = await mkdtemp(join(tmpdir(), 'tree-final-integration-'));
const dbFile = join(tempDir, 'save.json');
let browser;

try {
  await writeFile(dbFile, '{}', 'utf8');
  start(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: '7777', DB_FILE: dbFile },
  });
  start(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174'], {
    cwd: clientRoot,
    env: process.env,
  });
  await Promise.all([
    waitForUrl(`${apiUrl}/api/health`),
    waitForUrl(appUrl),
  ]);

  await post('/api/heartbeat', { username: 'FinalB' });

  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Create New User' }).click();
  await page.getByPlaceholder('Enter your name...').fill('FinalA');
  await page.getByRole('button', { name: 'Enter Garden' }).click();
  await page.locator('.game-shell').waitFor({ state: 'visible' });

  const onboarding = page.locator('.onboarding-overlay');
  await onboarding.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement === document.querySelector('.onboarding-overlay'));
  for (let step = 0; step < 6; step += 1) {
    const nextButton = onboarding.getByRole('button', { name: 'Next', exact: true });
    await nextButton.click();
    if (step < 5) await page.waitForFunction(index => document.querySelector('.onboarding-step-meta')?.textContent.includes(`Step ${index} of 7`), step + 2);
  }
  await onboarding.waitFor({ state: 'detached' });
  report.gameplay.onboarding = true;

  if (await page.locator('.game-modals-layer').count()) {
    await page.keyboard.press('Escape');
    await page.locator('.game-modals-layer').waitFor({ state: 'detached' });
  }

  for (const [name, label, returnSelector] of [
    ['store', 'Store', '.hud-tools > button:nth-of-type(1)'],
    ['collection', 'Collection', '.hud-tools > button:nth-of-type(2)'],
    ['companions', 'Companions', '.hud-tools > button:nth-of-type(3)'],
    ['daily reward', 'Reward', '.hud-tools > button:nth-of-type(4)'],
  ]) {
    await auditDialog(page, name, () => openToolbarDialog(page, label), returnSelector);
  }
  for (const [name, label] of [['profile', 'Profile'], ['leaderboard', 'Leaderboard'], ['prestige', 'Prestige'], ['mini-games', 'Mini-Games'], ['statistics', 'Statistics']]) {
    await auditDialog(page, name, () => openMoreDialog(page, label), '.hud-more-button');
  }

  await mkdir(visualQaDir, { recursive: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await openMoreDialog(page, 'Mini-Games');
  await page.locator('.game-modals-layer [role="dialog"]').last().waitFor({ state: 'visible' });
  await page.screenshot({ path: join(visualQaDir, 'minigame-modal.png') });
  await page.keyboard.press('Escape');
  await page.locator('.game-modals-layer').waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.locator('.hud-more-button').click();
  await page.getByRole('menuitem', { name: /Use time warp/ }).click();
  await page.waitForFunction(() => document.querySelector('.hud-more-menu') === null);

  const firstEvent = await resolveNextEvent(page);
  report.gameplay.firstEvent = firstEvent;
  await page.waitForFunction(() => !document.body.textContent.includes('Answer the forest'));

  const rewardTrigger = page.getByRole('button', { name: 'Reward', exact: true });
  await rewardTrigger.click();
  const rewardDialog = page.locator('.game-modals-layer [role="dialog"]').last();
  await rewardDialog.waitFor({ state: 'visible' });
  await rewardDialog.getByRole('button', { name: 'Claim', exact: true }).click();
  await rewardDialog.getByText(/^Claimed/).waitFor();
  await page.keyboard.press('Escape');
  await rewardDialog.waitFor({ state: 'detached' });
  report.gameplay.reward = true;

  const resolvedEvents = [firstEvent];
  while (await readLevel(page) < 5) resolvedEvents.push(await resolveNextEvent(page));
  assert.equal(await readLevel(page) >= 5, true);
  await page.locator('.growth-roadmap').getByText('Sprout', { exact: true }).waitFor();
  report.gameplay.growthMilestone = await readLevel(page);
  report.gameplay.resolvedEvents = resolvedEvents.length;

  await page.locator('.hud-more-button').click();
  await page.getByRole('menuitem', { name: 'Leaderboard', exact: true }).click();
  const finalBRow = page.locator('[role="button"]', { hasText: 'FinalB' }).first();
  await finalBRow.focus();
  await page.keyboard.press('Enter');
  const gardenDialog = page.locator('.garden-visit-modal');
  await gardenDialog.waitFor({ state: 'visible' });
  assert.equal(await gardenDialog.evaluate(element => element.contains(document.activeElement)), true);
  await gardenDialog.getByRole('button', { name: 'Tend this garden', exact: true }).click();
  await gardenDialog.getByText('A little care was shared', { exact: true }).waitFor();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: join(visualQaDir, 'garden-visit-modal.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  const ownerHeartbeat = await post('/api/heartbeat', { username: 'FinalB' });
  assert.equal(ownerHeartbeat.gardenHelp.helpers.includes('FinalA'), true);
  report.social = {
    helper: 'FinalA',
    owner: 'FinalB',
    ownerHeartbeatObserved: true,
    helpCount: ownerHeartbeat.gardenHelp.helpers.length,
  };

  assert.deepEqual(consoleErrors, []);
  report.consoleErrors = consoleErrors;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  for (const child of processes.reverse()) {
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
  await Promise.all(processes.map(async child => {
    if (child.exitCode === null && child.signalCode === null) await once(child, 'close').catch(() => {});
  }));
  await rm(tempDir, { recursive: true, force: true });
}
