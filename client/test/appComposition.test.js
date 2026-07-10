import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appPath = fileURLToPath(new URL('../src/App.jsx', import.meta.url));
const source = await readFile(appPath, 'utf8');

test('App imports only the React hooks it uses', () => {
  const reactImport = source.match(/^import\s+(.+?)\s+from\s+['"]react['"];?$/m);

  assert.ok(reactImport, 'App should import its hooks from React');
  assert.match(reactImport[1], /^\{[^}]+\}$/, 'React import should not have a default binding');

  const importedHooks = reactImport[1]
    .slice(1, -1)
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)
    .sort();

  assert.deepEqual(importedHooks, ['useCallback', 'useEffect', 'useMemo', 'useReducer', 'useState']);
  for (const hook of importedHooks) {
    assert.match(
      source.replace(reactImport[0], ''),
      new RegExp(`\\b${hook}\\b`),
      `${hook} should be used directly by App`,
    );
  }
});

test('App remains a small composition root', () => {
  assert.ok(source.trimEnd().split(/\r?\n/).length < 300, 'App.jsx should stay under 300 lines');
  assert.doesNotMatch(source, /api\.|fetch\s*\(|setInterval\s*\(|visibilitychange/);
  assert.doesNotMatch(
    source,
    /^import\b[^;\n]*\b(?:Collection|DailyReward|GardenVisit|Leaderboard|MiniGame|OfflineEarnings|Prestige|Profile|Stats|Store)Modal\b[^;\n]*;/m,
  );
  assert.doesNotMatch(source, /import[^;]*(?:TreeVisual|ActionButton)[^;]*;/);
  assert.doesNotMatch(source, /^import\b[^;\n]*\/components\/Icons[^;\n]*;/m);
  assert.doesNotMatch(source, /\b(?:event|action)_?(?:icon|label)s?(?:_?map)?\b/i);

  for (const hook of ['useGameSession', 'useGameActions', 'useGameModals']) {
    assert.match(
      source,
      new RegExp(`import\\s+\\{\\s*${hook}\\s*\\}\\s+from\\s+['"]\\.\\/hooks\\/${hook}(?:\\.js)?['"]`),
    );
  }

  for (const component of ['GameModals', 'GameHeader', 'GameStage', 'ActionPanel']) {
    assert.match(
      source,
      new RegExp(`import\\s+\\{\\s*${component}\\s*\\}\\s+from\\s+['"]\\.\\/components\\/game\\/${component}(?:\\.jsx)?['"]`),
    );
  }
});
