import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('../src/index.css', import.meta.url));
const appPath = fileURLToPath(new URL('../src/App.jsx', import.meta.url));

test('the main game uses one named visual token system', async () => {
  const css = await readFile(cssPath, 'utf8');
  for (const token of [
    '--ui-forest-ink',
    '--ui-moss',
    '--ui-parchment',
    '--ui-amber',
    '--ui-charcoal',
    '--ui-radius-panel',
    '--ui-radius-control',
    '--ui-shadow-raised',
  ]) {
    assert.match(css, new RegExp(token));
  }
  assert.doesNotMatch(css, /--transition-smooth:\s*all\b/);
});

test('the main game shell uses the game typography class', async () => {
  const source = await readFile(appPath, 'utf8');
  assert.match(source, /game-typography/);
  assert.doesNotMatch(source, /game-shell[^\n]+font-sans/);
});

test('motion and compact HUD have explicit accessibility fallbacks', async () => {
  const css = await readFile(cssPath, 'utf8');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('compact event actions stay on one internally scrollable row', async () => {
  const css = await readFile(cssPath, 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(
    css,
    /\.event-action-buttons\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto;[^}]*scrollbar-width:\s*none;/s,
  );
  assert.match(css, /\.event-action-buttons \.action-btn\s*\{[^}]*flex:\s*0 0 48px;/s);
  assert.match(css, /width:\s*min\(390px,\s*calc\(100vw - 20px\)\)/);
});
