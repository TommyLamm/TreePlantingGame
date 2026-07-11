# Game Visual Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將主遊戲畫面統一為「溫暖手繪自然插畫」風格，讓背景、樹木、角色、動物、裝飾與 HUD 看起來屬於同一款遊戲，同時保留既有玩法、狀態與多語系行為。

**Architecture:** 先建立可驗收的視覺規範與素材契約，再以不改檔名的方式替換中央場景 PNG，接著調整場景的比例、光影與景深。場景穩定後，使用集中式 CSS tokens 重建頂部 HUD 與底部狀態面板，最後才統一字體、圖示、動態效果與響應式配置，避免 UI 樣式被舊素材反覆牽動。

**Tech Stack:** React 18、Vite 5、Tailwind CSS 3、原生 CSS、Node.js `node:test`、PNG raster assets、瀏覽器視覺回歸截圖。

---

## 一、鎖定的視覺方向

- 風格名稱：溫暖手繪自然插畫（cozy painted storybook）。
- 主光源：右上方暖黃色日光；所有樹木、人物、小屋與 companion 使用相同方向。
- 陰影：深綠灰，不使用純黑；物件底部必須有接觸陰影。
- 邊緣：柔和但清楚，避免像素鋸齒、粗黑描邊及照片級銳利度混用。
- 細節密度：主樹最高，人物／小屋次之，companion 再次，遠景最低。
- UI：暖米色紙張／霧面木質感，不再使用白色塑膠膠囊與 SaaS 玻璃卡片。
- 色彩：森林深綠 `#244634`、苔蘚綠 `#6F8B4E`、暖米色 `#F3E7C8`、琥珀橙 `#D98B2B`、炭灰綠 `#23302B`。
- 圓角：容器 14px、按鈕 10px、徽章 999px；只有數值徽章可使用膠囊形。
- 動畫：環境緩慢、操作回饋快速；不以持續 pulse 取代資訊層級。

## 二、檔案責任與修改範圍

### 新增

- `docs/design-system.md`：記錄藝術方向、色票、光影、比例、字體、HUD 與資產驗收標準。
- `client/test/visualContracts.test.js`：以靜態 markup 與 CSS source contract 保護 HUD 結構、語意 class 與禁止樣式。
- `client/test/assetDimensions.test.js`：驗證場景素材檔名、PNG 尺寸與透明背景需求。

### 修改

- `client/public/assets/trees/*.png`：重製 5 個 skin、每個 7 個成長階段，共 35 張主樹素材。
- `client/public/assets/decor/ground-patch.png`：移除明顯圓形地毯邊界，改成可與背景融合的地面接觸層。
- `client/public/assets/decor/person.png`：重製為同一手繪筆觸與右上光源。
- `client/public/assets/decor/house.png`：重製為同一手繪筆觸、修正透視與比例。
- `client/public/assets/companions/*.png`：重製 6 張 companion，統一描邊、光源與飽和度。
- `client/public/assets/icons/*.png`：優先重製主畫面會使用的 HUD 與操作圖示。
- `client/public/assets/ui/panel-day.png`、`panel-night.png`、`button-primary.png`、`action-active.png`、`action-disabled.png`：改成暖紙張／木質紋理。
- `client/public/assets/fonts/NunitoSans-Variable.woff2`、`NotoSansTC-Variable.woff2`：本機載入的 OFL 字體，避免不同作業系統回退成不同 system font。
- `scripts/generate-digital-assets.mjs`：更新 fallback palette，使未來重建不會重新產生舊式扁平素材。
- `client/src/index.css`：加入設計 tokens、場景融合、HUD、狀態面板、響應式與 reduced-motion 樣式。
- `client/src/components/game/GameHeader.jsx`：重新分組環境資訊、資源與功能入口。
- `client/src/components/game/ActionPanel.jsx`：改成精簡的遊戲狀態 HUD，保留事件操作區。
- `client/src/components/game/GameStage.jsx`：移除 emoji 操作文字並統一 burst 視覺。
- `client/src/components/TreeVisual.jsx`：加入明確的場景圖層與可測試語意 class。
- `client/src/components/CompanionSprite.jsx`：提供 companion 尺寸與景深 class。
- `client/src/components/WeatherDisplay.jsx`：移除 emoji 天氣／季節呈現，改用統一 PNG icon。
- `client/src/App.jsx`：調整主舞台與狀態 HUD 的布局容器，不改遊戲資料流。
- `client/test/gameViews.test.js`：更新主畫面結構測試。

### 明確不修改

- `client/src/state/gameReducer.js`、`client/src/hooks/*`：視覺統一不改遊戲狀態與規則。
- `server/`、`server.js`、`shared/game-data.json`：不改 API、存檔格式與伺服器行為。
- Modal 內部版面：第一輪只讓 modal 繼承新 tokens；不重新設計各 modal 的資訊架構。

---

### Task 1: 建立基準截圖與設計規範

**Files:**
- Create: `docs/design-system.md`
- Reference: `C:/Users/lamyu/AppData/Local/Temp/codex-clipboard-ce0769ab-f12f-4513-88cc-8c143059e5ca.png`

- [ ] **Step 1: 啟動目前版本並保留桌面基準畫面**

Run:

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
npm run dev -- --host 127.0.0.1
```

Expected: Vite 顯示可開啟的本機 URL，主畫面能進入且 console 沒有 asset 404。

- [ ] **Step 2: 建立 `docs/design-system.md`**

文件必須完整寫入以下規則：

```markdown
# TreePlantingGame Visual System

## Art Direction

The game uses a cozy painted storybook style. The environment, tree, people,
decorations, companions, icons, and HUD must look painted by the same artist.

## Palette

- Forest ink: #244634
- Moss: #6F8B4E
- Parchment: #F3E7C8
- Amber: #D98B2B
- Charcoal green: #23302B
- Night ink: #17283A

## Lighting

- Primary light comes from the upper-right.
- Highlights are warm yellow-green.
- Shadows are desaturated green-gray, never pure black.
- Every grounded object has a compact contact shadow beneath it.

## Asset Style

- Soft painted edges; no pixel stair-steps or heavy black outlines.
- Transparent PNG for trees, people, houses, companions, and icons.
- Main tree carries the most detail. Supporting objects use lower contrast.
- Distant objects are less saturated and less sharp than the main tree.

## Scale

- Mature tree visual height: 100% reference unit.
- Person visual height: 20-25% of mature tree height.
- House visual height: 30-38% of mature tree height.
- Butterfly visual width: 10-14% of mature tree width.

## HUD

- Panels use parchment or dark forest surfaces with subtle natural texture.
- Container radius: 14px. Button radius: 10px. Pills only for resource badges.
- Minimum interactive target: 44px by 44px.
- Body text contrast must meet WCAG AA.
- The center of the screen belongs to the tree; HUD stays near the edges.

## Motion

- Ambient motion duration: 4-12 seconds.
- Interaction feedback duration: 120-500 milliseconds.
- Animate transform and opacity only.
- Respect prefers-reduced-motion.
```

- [ ] **Step 3: Commit the visual contract**

```powershell
git add docs/design-system.md
git commit -m "docs: define unified game visual system"
```

---

### Task 2: 建立可驗證的素材契約

**Files:**
- Create: `client/test/assetDimensions.test.js`
- Modify: `scripts/generate-digital-assets.mjs`
- Test: `client/test/assetDimensions.test.js`

- [ ] **Step 1: 寫入失敗的 PNG 契約測試**

測試需解析 PNG IHDR，驗證所有場景素材存在、樹木為 512×512、decor 與 companion 尺寸一致，並確認透明素材使用 RGBA color type 6：

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const assetsRoot = fileURLToPath(new URL('../public/assets/', import.meta.url));

async function readPngHeader(relativePath) {
  const file = await readFile(`${assetsRoot}${relativePath}`);
  assert.equal(file.toString('ascii', 1, 4), 'PNG');
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
    colorType: file[25],
  };
}

test('tree assets keep one predictable transparent canvas', async () => {
  for (const skin of ['default', 'cherry', 'autumn', 'snow', 'golden']) {
    for (let stage = 1; stage <= 7; stage += 1) {
      const header = await readPngHeader(`trees/${skin}-stage-${stage}.png`);
      assert.deepEqual(header, { width: 512, height: 512, colorType: 6 });
    }
  }
});

test('supporting scene assets keep stable dimensions', async () => {
  const expected = {
    'decor/ground-patch.png': [320, 120],
    'decor/person.png': [80, 160],
    'decor/house.png': [160, 140],
    'companions/butterfly.png': [160, 160],
    'companions/squirrel.png': [160, 160],
    'companions/bird.png': [160, 160],
    'companions/owl.png': [160, 160],
    'companions/deer.png': [160, 160],
    'companions/phoenix.png': [160, 160],
  };

  for (const [path, [width, height]] of Object.entries(expected)) {
    const header = await readPngHeader(path);
    assert.deepEqual(header, { width, height, colorType: 6 });
  }
});
```

- [ ] **Step 2: 執行測試並記錄目前不符合的素材**

Run:

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/assetDimensions.test.js
```

Expected: 若既有素材尺寸或 PNG color type 不一致，測試以確切檔名失敗；這些檔案列入 Task 3 的重製範圍。

- [ ] **Step 3: 更新 fallback palette，防止重新生成舊風格素材**

將 `scripts/generate-digital-assets.mjs` 中的基礎色替換為：

```js
const visualSystem = {
  forestInk: '#244634',
  moss: '#6F8B4E',
  parchment: '#F3E7C8',
  amber: '#D98B2B',
  charcoalGreen: '#23302B',
  nightInk: '#17283A',
};

const palettes = {
  default: ['#3B2A20', '#76533A', '#244634', '#47734C', '#7FA46A'],
  cherry: ['#493028', '#7C5844', '#6F3F50', '#C67888', '#E7B8B1'],
  autumn: ['#4A2C20', '#805336', '#6D3F27', '#B66D32', '#D9A44E'],
  snow: ['#3F4747', '#75817D', '#526B68', '#B7C7BF', '#E7ECE4'],
  golden: ['#53371F', '#8A6031', '#8A6B2F', '#C99A42', '#E5C875'],
};
```

同時保留 `preserveOrDrawAsset` 行為，避免 fallback 腳本覆蓋已批准的手繪 PNG。

- [ ] **Step 4: 執行 client tests**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
npm test
```

Expected: 除了已確認等待重製的素材契約外，既有測試全部通過。

- [ ] **Step 5: Commit**

```powershell
git add client/test/assetDimensions.test.js scripts/generate-digital-assets.mjs
git commit -m "test: define visual asset contracts"
```

---

### Task 3: 重製中央場景素材

**Files:**
- Modify: `client/public/assets/trees/*.png`
- Modify: `client/public/assets/decor/ground-patch.png`
- Modify: `client/public/assets/decor/person.png`
- Modify: `client/public/assets/decor/house.png`
- Modify: `client/public/assets/companions/*.png`
- Test: `client/test/assetDimensions.test.js`

- [ ] **Step 1: 先重製 default tree 的 7 個階段作為風格樣板**

執行時使用 `imagegen` skill。每張保留 512×512 透明畫布、樹根基準線與中央軸一致。使用以下固定 brief，只替換階段描述：

```text
Transparent-background game asset for a cozy painted storybook tree-growing game.
Create one [growth stage] evergreen tree, centered on a 512×512 canvas. Soft
hand-painted gouache edges, warm sunlight from the upper-right, muted forest-green
shadows, visible but natural trunk and roots, no black outline, no pixel-art edges,
no background, no text, no border, no ground platform. Keep the trunk base centered
at x=256 and y=438. The asset must blend into a detailed sunlit forest scene.
```

驗收：把 7 張圖暫時套入遊戲逐張查看，樹根不可跳動、輪廓不可忽大忽小、stage 1→7 必須能一眼看出成長。

- [ ] **Step 2: 依樣板重製其餘 4 個 tree skin**

沿用相同構圖與光源，只允許葉色、季節覆蓋與少量裝飾改變：cherry 使用低飽和粉紅花；autumn 使用赭橙；snow 使用藍灰綠與柔雪；golden 使用琥珀金但不得螢光。

- [ ] **Step 3: 重製 ground、person 與 house**

使用以下 prompts：

```text
Ground patch: transparent 320×120 painted forest-floor contact layer, irregular
feathered edge, moss and a few tiny flowers, warm upper-right light, dark green-gray
contact center, no circular island silhouette, no border, no text.

Person: transparent 80×160 cozy storybook gardener, three-quarter view, muted earth
tone clothes, warm upper-right rim light, soft painted edge, no black outline, no
ground, readable silhouette at 24px display height.

House: transparent 160×140 tiny woodland cottage, three-quarter view matching the
person, warm upper-right light, mossy roof and muted wood, soft painted edge, no black
outline, no ground platform, readable silhouette at 60px display width.
```

- [ ] **Step 4: 重製 6 個 companion**

共用規則：160×160 透明畫布、右上暖光、柔和描邊、低於主樹的細節與飽和度。蝴蝶不得使用粗黑輪廓，實際翅寬控制在畫布的 55–65%。

- [ ] **Step 5: 執行素材契約與 build**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/assetDimensions.test.js
npm run build
```

Expected: 所有 asset contract 通過；Vite build 成功且沒有 missing asset。

- [ ] **Step 6: Commit**

```powershell
git add client/public/assets/trees client/public/assets/decor client/public/assets/companions
git commit -m "art: unify central scene assets"
```

---

### Task 4: 修正場景比例、接地與景深

**Files:**
- Modify: `client/src/components/TreeVisual.jsx`
- Modify: `client/src/components/CompanionSprite.jsx`
- Modify: `client/src/index.css`
- Modify: `client/test/gameViews.test.js`
- Test: `client/test/gameViews.test.js`

- [ ] **Step 1: 先加入場景圖層 contract test**

在 `client/test/gameViews.test.js` 的 game stage 測試加入：

```js
assert.match(stageMarkup, /scene-ground-layer/);
assert.match(stageMarkup, /scene-focus-layer/);
assert.match(stageMarkup, /scene-support-layer/);
assert.match(stageMarkup, /scene-companion-layer/);
```

- [ ] **Step 2: 執行測試確認失敗**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/gameViews.test.js
```

Expected: FAIL，因為新場景語意 class 尚未加入。

- [ ] **Step 3: 在 `TreeVisual.jsx` 建立清楚的三層場景結構**

將 ground、tree、person／house 分別包入以下容器；保留既有條件渲染：

```jsx
<div className="scene-ground-layer" aria-hidden="true">
  <img className="raster-ground-patch" src="/assets/decor/ground-patch.png" alt="" draggable="false" />
  <div className="tree-ground-shadow" />
  <div className="tree-ground-vegetation" />
</div>

<div className="scene-focus-layer">
  <div className="raster-tree-wrap">
    {!isStatic && <div className="raster-tree-glow" aria-hidden="true" />}
    <img className="raster-tree-art" src={treeSrc} alt="" aria-hidden="true" draggable="false" />
  </div>
</div>

<div className="scene-support-layer" aria-hidden="true">
  {stage >= 2 && <img className="raster-person raster-person-right" src="/assets/decor/person.png" alt="" draggable="false" />}
  {stage >= 4 && <img className="raster-house" src="/assets/decor/house.png" alt="" draggable="false" />}
  {stage >= 5 && <img className="raster-person raster-person-left" src="/assets/decor/person.png" alt="" draggable="false" />}
</div>
```

- [ ] **Step 4: 在 `CompanionSprite.jsx` 加入景深 class**

最外層 class 改為：

```jsx
<div
  className={`scene-companion-layer companion-sprite ${config.className} ${isDay ? 'companion-day' : 'companion-night'}`}
  aria-label={config.label}
>
```

- [ ] **Step 5: 套用具體比例與融合樣式**

在 `client/src/index.css` 更新下列規則：

```css
.raster-tree-art {
  filter:
    drop-shadow(10px 14px 14px rgba(35, 48, 43, 0.22))
    saturate(0.92)
    contrast(0.96);
}

.raster-ground-patch {
  width: min(64vw, 330px);
  opacity: 0.58;
  filter: blur(0.2px) drop-shadow(8px 10px 12px rgba(35, 48, 43, 0.18));
  mix-blend-mode: multiply;
}

.tree-ground-shadow {
  background: radial-gradient(ellipse, rgba(35, 48, 43, 0.52) 0%, rgba(35, 48, 43, 0.18) 48%, transparent 76%);
  filter: blur(5px);
}

.raster-person {
  width: clamp(20px, 5.2vw, 28px);
  opacity: 0.82;
  filter: saturate(0.82) contrast(0.9) drop-shadow(5px 7px 7px rgba(35, 48, 43, 0.2));
}

.raster-house {
  width: clamp(48px, 11vw, 70px);
  opacity: 0.76;
  filter: saturate(0.78) contrast(0.88) blur(0.15px) drop-shadow(7px 9px 9px rgba(35, 48, 43, 0.2));
}

.companion-art {
  filter: saturate(0.82) contrast(0.92) drop-shadow(5px 7px 7px rgba(35, 48, 43, 0.18));
}

.companion-butterfly {
  width: clamp(36px, 9vw, 52px);
}
```

- [ ] **Step 6: 執行測試與 build**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/gameViews.test.js
npm run build
```

Expected: tests PASS、build 成功；桌面畫面中人物約為成熟樹高度的 20–25%，小屋為 30–38%，蝴蝶寬度縮小約 25%。

- [ ] **Step 7: Commit**

```powershell
git add client/src/components/TreeVisual.jsx client/src/components/CompanionSprite.jsx client/src/index.css client/test/gameViews.test.js
git commit -m "style: ground scene assets in one visual space"
```

---

### Task 5: 建立統一 UI tokens 與 typography

**Files:**
- Create: `client/public/assets/fonts/NunitoSans-Variable.woff2`
- Create: `client/public/assets/fonts/NotoSansTC-Variable.woff2`
- Modify: `client/src/index.css`
- Modify: `client/src/App.jsx`
- Create: `client/test/visualContracts.test.js`
- Test: `client/test/visualContracts.test.js`

- [ ] **Step 1: 寫入 CSS contract test**

```js
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
```

- [ ] **Step 2: 執行測試確認失敗**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/visualContracts.test.js
```

Expected: FAIL，因為新 tokens 與 `game-typography` 尚未存在。

- [ ] **Step 3: 用新 tokens 取代舊 glass-only tokens**

先從字體專案的 OFL 發行檔取得 Nunito Sans 與 Noto Sans TC variable WOFF2，分別存成上述固定檔名並保留授權文件。接著在 `index.css` 頂部與 `:root` 加入：

```css
@font-face {
  font-family: "Nunito Sans";
  src: url("/assets/fonts/NunitoSans-Variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 200 1000;
  font-display: swap;
}

@font-face {
  font-family: "Noto Sans TC";
  src: url("/assets/fonts/NotoSansTC-Variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

:root {
  --ui-forest-ink: #244634;
  --ui-moss: #6f8b4e;
  --ui-parchment: #f3e7c8;
  --ui-parchment-deep: #dfcda8;
  --ui-amber: #d98b2b;
  --ui-charcoal: #23302b;
  --ui-night: #17283a;
  --ui-radius-panel: 14px;
  --ui-radius-control: 10px;
  --ui-shadow-raised: 0 8px 22px rgba(35, 48, 43, 0.22);
  --ui-shadow-pressed: 0 3px 8px rgba(35, 48, 43, 0.2);
  --ui-transition-color: color 180ms ease, background-color 180ms ease, border-color 180ms ease;
  --ui-transition-motion: transform 180ms ease-out, opacity 180ms ease-out;
}

.game-typography {
  font-family: "Nunito Sans", "Noto Sans TC", sans-serif;
  color: var(--ui-charcoal);
}
```

將 `--transition-smooth: all ...` 移除，個別元素只轉場 `transform`、`opacity`、`color`、`background-color` 和 `border-color`。

- [ ] **Step 4: 更新 App shell class**

`App.jsx` 的主容器從 `font-sans` 改為 `game-typography`，其他資料流不變。

- [ ] **Step 5: 執行 tests**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/visualContracts.test.js test/appComposition.test.js
```

Expected: PASS。

- [ ] **Step 6: Commit**

```powershell
git add client/public/assets/fonts client/src/index.css client/src/App.jsx client/test/visualContracts.test.js
git commit -m "style: establish unified game UI tokens"
```

---

### Task 6: 重組頂部 HUD

**Files:**
- Modify: `client/src/components/game/GameHeader.jsx`
- Modify: `client/src/components/WeatherDisplay.jsx`
- Modify: `client/src/index.css`
- Modify: `client/test/gameViews.test.js`
- Test: `client/test/gameViews.test.js`

- [ ] **Step 1: 定義頂部 HUD 結構測試**

在 header markup assertions 加入：

```js
assert.match(headerMarkup, /hud-environment/);
assert.match(headerMarkup, /hud-resources/);
assert.match(headerMarkup, /hud-tools/);
assert.match(headerMarkup, /aria-label="Game tools"/);
assert.doesNotMatch(headerMarkup, /🔥|☀️/);
```

- [ ] **Step 2: 執行測試確認失敗**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/gameViews.test.js
```

Expected: FAIL，新分組與 emoji 移除尚未完成。

- [ ] **Step 3: 將 header 重組為三個語意區**

結構固定為：

先把 `GameHeader.jsx` 的 icon import 補上 `Zap` 與 `SunMedium`；沒有被新 markup 使用的 `Clock` import 一併移除。

```jsx
<header className="game-hud" aria-label="Game status and tools">
  <div className="hud-environment">
    <WeatherDisplay weather={game.weather} season={game.season} isDay={isDay} t={t} />
  </div>

  <div className="hud-resources" aria-label="Player resources">
    <div className={`connection-badge connection-${serverStatus}`} title={serverStatus}>
      {serverStatus === 'connected' ? <CloudCheck size={18} /> : <CloudOff size={18} />}
    </div>
    {game.combo > 0 && <div className="resource-badge resource-combo"><Zap size={16} /><span>×{game.combo}</span></div>}
    {goldenHourActive && <div className="resource-badge resource-golden"><SunMedium size={16} /><span>2×</span></div>}
    <div className="resource-badge resource-coins"><Coins size={16} /><span>{Math.floor(game.coins)}</span></div>
  </div>

  <nav className="hud-tools" aria-label="Game tools">
    {/* 保留原按鈕 callback 與 title，全部使用 className="hud-tool-button" */}
  </nav>
</header>
```

`hud-tools` 保留現有功能，但桌面只顯示一列；使用者名稱與速率文字移入 profile modal 或 title，不再常駐畫面。

- [ ] **Step 4: WeatherDisplay 改用統一 asset icon**

從 `./Icons` import `Sun`、`Moon`、`Leaf`。用 `Sun`／`Moon` 表示天氣時段，季節使用 `Leaf`；移除 `weatherInfo.icon` 與 `seasonInfo.icon` 的 emoji 輸出。文字仍由既有 `t()` 提供。

- [ ] **Step 5: 套用 HUD 樣式**

```css
.game-hud {
  position: absolute;
  inset: 12px 12px auto;
  z-index: 30;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: "environment resources" "tools tools";
  gap: 8px;
  pointer-events: none;
}

.hud-environment,
.hud-resources,
.hud-tools {
  pointer-events: auto;
}

.hud-environment { grid-area: environment; justify-self: start; }
.hud-resources { grid-area: resources; display: flex; gap: 6px; justify-self: end; }
.hud-tools { grid-area: tools; display: flex; gap: 4px; justify-self: end; padding: 4px; }

.weather-chip,
.hud-tools {
  color: var(--ui-charcoal);
  background: rgba(243, 231, 200, 0.9);
  border: 1px solid rgba(111, 139, 78, 0.35);
  border-radius: var(--ui-radius-panel);
  box-shadow: var(--ui-shadow-raised);
  backdrop-filter: blur(8px);
}

.hud-tool-button,
.connection-badge {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--ui-radius-control);
}

.resource-badge {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  color: var(--ui-charcoal);
  background: rgba(243, 231, 200, 0.92);
  border: 1px solid rgba(111, 139, 78, 0.35);
  border-radius: 999px;
  box-shadow: var(--ui-shadow-raised);
}
```

- [ ] **Step 6: 執行 tests 與桌面／手機檢查**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/gameViews.test.js
npm run build
```

Expected: tests PASS；1440px 寬度下 HUD 不超過兩行；375px 寬度下工具列可橫向收納或折疊，任何按鈕觸控區都不小於 44px。

- [ ] **Step 7: Commit**

```powershell
git add client/src/components/game/GameHeader.jsx client/src/components/WeatherDisplay.jsx client/src/index.css client/test/gameViews.test.js
git commit -m "style: rebuild the game header as one HUD"
```

---

### Task 7: 精簡底部狀態與事件操作面板

**Files:**
- Modify: `client/src/components/game/ActionPanel.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/index.css`
- Modify: `client/test/gameViews.test.js`
- Test: `client/test/gameViews.test.js`

- [ ] **Step 1: 定義精簡狀態面板 contract**

加入：

```js
assert.match(panelMarkup, /game-status-panel/);
assert.match(panelMarkup, /status-progress/);
assert.match(panelMarkup, /event-actions/);
assert.doesNotMatch(panelMarkup, /border-dashed/);
```

- [ ] **Step 2: 執行測試確認失敗**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/gameViews.test.js
```

Expected: FAIL，新結構尚未加入。

- [ ] **Step 3: 重構 ActionPanel 的顯示層級**

保留 props 與所有 action callback，markup 改為：

```jsx
<section className={`game-status-panel ${isDay ? 'status-panel-day' : 'status-panel-night'}`} aria-label={t('status')}>
  <div className="status-summary">
    <strong className="status-level">{t('level')} {game.level}</strong>
    <span className="status-xp">{Math.floor(game.xp)} / {xpRequired} XP</span>
    {game.combo > 0 && <span className="status-combo"><Zap size={14} />×{game.combo}</span>}
  </div>

  <div className="status-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
    <span className={goldenHourActive ? 'progress-fill progress-fill-golden' : 'progress-fill'} style={{ width: `${progress}%` }} />
  </div>

  {localActiveEvent && (
    <div className={`event-actions event-${localActiveEvent.toLowerCase()}`}>
      <p className="event-label">{localActiveEvent === 'STORM' ? t('stormWarning') : t('action')}</p>
      <div className="event-action-buttons">
        {Object.entries(eventIcons).map(([key, icon]) => (
          <ActionButton key={key} icon={icon} label={eventLabels[key]} isActive={localActiveEvent === key} onClick={() => onAction(key)} />
        ))}
      </div>
    </div>
  )}
</section>
```

平靜狀態不再保留 96px 高的虛線 empty box；只顯示 level、XP 與進度條。事件出現時才展開 action buttons。

- [ ] **Step 4: 調整主布局與狀態板位置**

先在 `App.jsx` 將 `ActionPanel` 移出 `.game-main-panel`，讓 `.game-main-panel` 只包住 `GameStage`；`ActionPanel` 緊接在 `.game-main-panel` 後渲染。因為 `.game-shell` 已是定位容器，狀態板才會相對整個 viewport 固定在右下，而不是相對中央 `max-w-md` 欄位定位。

桌面狀態面板寬度為 `clamp(280px, 30vw, 390px)`；手機寬度下回到底部全寬，但與安全區保留 12px 間距。中央 `GameStage` 不再因固定高度 empty state 被向上擠壓。

```css
.game-status-panel {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 20;
  width: clamp(280px, 30vw, 390px);
  padding: 14px;
  border-radius: var(--ui-radius-panel);
  box-shadow: var(--ui-shadow-raised);
}

.status-panel-day {
  color: var(--ui-charcoal);
  background: rgba(243, 231, 200, 0.9);
  border: 1px solid rgba(111, 139, 78, 0.42);
}

.status-summary {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 4px 12px;
}

.status-level { font-size: 1.35rem; line-height: 1.15; }
.status-xp { font-variant-numeric: tabular-nums; font-size: 0.82rem; }

.status-progress {
  height: 10px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(36, 70, 52, 0.16);
}

.progress-fill {
  display: block;
  height: 100%;
  background: var(--ui-moss);
  transition: width 500ms ease-out;
}

.event-actions { margin-top: 12px; }
.event-action-buttons { display: flex; gap: 6px; }
```

- [ ] **Step 5: 執行 tests 與 build**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
node --test test/gameViews.test.js test/appComposition.test.js
npm run build
```

Expected: PASS；平靜狀態面板高度小於 100px，事件狀態展開時不遮住主樹樹幹。

- [ ] **Step 6: Commit**

```powershell
git add client/src/components/game/ActionPanel.jsx client/src/App.jsx client/src/index.css client/test/gameViews.test.js
git commit -m "style: compact the growth status panel"
```

---

### Task 8: 統一主畫面圖示與操作回饋

**Files:**
- Modify: `client/public/assets/icons/*.png`
- Modify: `client/public/assets/ui/*.png`
- Modify: `client/src/components/game/GameStage.jsx`
- Modify: `client/src/components/ActionButton.jsx`
- Modify: `client/src/index.css`
- Modify: `client/test/gameViews.test.js`

- [ ] **Step 1: 先重製主畫面實際使用的圖示**

優先順序：`coins`、`cloud-check`、`cloud-off`、`clock`、`volume-2`、`volume-x`、`user`、`book-open`、`shopping-cart`、`trophy`、`calendar`、`paw`、`recycle`、`gamepad`、`stats`、`droplets`、`bug`、`shovel`、`scissors`、`sun-medium`、`cloud-lightning`、`zap`。

固定 brief：

```text
Single transparent 96×96 game HUD icon in a cozy painted storybook style. Warm
parchment highlights, forest-green ink, muted amber accent, soft hand-painted edge,
consistent upper-right light, no text, no circular background, no black outline,
readable at 18px, centered with 12px safe padding.
```

- [ ] **Step 2: 重製 UI textures**

`panel-day.png` 使用極淡紙張纖維；`panel-night.png` 使用深森林藍綠霧面紋理；button textures 只提供 3–5% 可見度的自然紋理，不能自行包含發光、圓角或陰影。

- [ ] **Step 3: 寫入 burst 無 emoji 測試**

在 stage markup assertion 加入：

```js
assert.doesNotMatch(stageMarkup, /💧|🐛|🍂|✂️|✨|⚡/);
assert.match(stageMarkup, /action-burst-label/);
```

- [ ] **Step 4: 更新 GameStage burst label**

將 emoji label 改成純文字與現有 PNG icon；文字容器 class 使用 `action-burst-label`。例如 WATER 顯示 `Splash!`，PEST 顯示 `Shoo!`，不再在字串前放 emoji。

- [ ] **Step 5: 更新 ActionButton 的可讀性與觸控區**

按鈕最小高度設為 52px；label 字級至少 11px，不使用 9px uppercase；hover 只做 `translateY(-1px)`，active 做 `translateY(1px)`，disabled 不產生 hover 位移。

- [ ] **Step 6: 執行完整 client tests 與 build**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
npm test
npm run build
```

Expected: 全部 PASS；18px 顯示尺寸下，每個 icon 的輪廓與語意仍可辨識。

- [ ] **Step 7: Commit**

```powershell
git add client/public/assets/icons client/public/assets/ui client/src/components/game/GameStage.jsx client/src/components/ActionButton.jsx client/src/index.css client/test/gameViews.test.js
git commit -m "art: unify HUD icons and interaction feedback"
```

---

### Task 9: 響應式、動態與最終視覺驗收

**Files:**
- Modify: `client/src/index.css`
- Modify: `docs/design-system.md`
- Test: `client/test/visualContracts.test.js`

- [ ] **Step 1: 加入 reduced-motion 與小螢幕 contract**

在 `visualContracts.test.js` 加入：

```js
test('motion and compact HUD have explicit accessibility fallbacks', async () => {
  const css = await readFile(cssPath, 'utf8');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
```

- [ ] **Step 2: 完成手機布局**

```css
@media (max-width: 640px) {
  .game-hud {
    inset: max(10px, env(safe-area-inset-top)) 10px auto;
    grid-template-columns: 1fr auto;
  }

  .hud-tools {
    max-width: calc(100vw - 20px);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .game-status-panel {
    right: 10px;
    bottom: max(10px, env(safe-area-inset-bottom));
    left: 10px;
    width: auto;
  }

  .raster-tree-wrap {
    width: min(88vw, 420px);
    height: min(88vw, 420px);
  }
}
```

- [ ] **Step 3: 收斂動畫層級**

- 環境光與樹搖擺保留 5–8 秒週期。
- companion 移動保留 4–9 秒週期，位移縮小 20%。
- combo 與 golden hour 不再持續 `animate-pulse`；只在數值改變時播放一次 300ms scale feedback。
- action burst 在 900ms 內完成。
- reduced-motion 下保留狀態顏色，但停止位移、縮放與閃爍。

- [ ] **Step 4: 執行所有自動驗證**

```powershell
Set-Location F:\Desktop\TreePlantingGame\client
npm test
npm run build
Set-Location F:\Desktop\TreePlantingGame
npm test
```

Expected: client tests、client build、server tests 全部成功。

- [ ] **Step 5: 執行視覺驗收矩陣**

逐項截圖並比較 Task 1 基準：

| Viewport | State | 必須確認 |
|---|---|---|
| 1440×900 | sunny / summer / peaceful | 樹是第一焦點；HUD 不遮中央；底板高度 <100px |
| 1440×900 | night / companion / event | 夜間文字清楚；companion 不發亮到像貼紙；事件操作可見 |
| 768×1024 | sunny / event | HUD 不重疊；按鈕 ≥44px；主樹完整 |
| 375×812 | sunny / peaceful | 工具可操作；狀態板不遮樹幹；無水平頁面捲動 |
| 375×812 | storm / event | action buttons 不超出螢幕；警告不只靠顏色 |

每張畫面使用以下五項判斷，全部通過才完成：

1. 背景、樹、人物、小屋與 companion 看起來使用同一種筆觸。
2. 所有物件光源皆由右上方照射，底部有一致的深綠灰接觸陰影。
3. 第一眼先看到樹，第二眼看到成長狀態，第三眼才看到工具列。
4. 主畫面沒有 emoji、白色塑膠膠囊群或大型 SaaS 玻璃卡片。
5. 把裝飾陰影關閉後，資訊層級仍然清楚。

- [ ] **Step 6: 將最終尺寸與例外補入 design system**

把實際批准的 tree/person/house/companion 比例、HUD 高度與 mobile 行為寫回 `docs/design-system.md`，使後續新增 skin、companion 或 modal 都沿用同一規則。

- [ ] **Step 7: Final commit**

```powershell
git add client/src/index.css client/test/visualContracts.test.js docs/design-system.md
git commit -m "style: finish responsive visual unification"
```

---

## 三、實作順序摘要與停止條件

1. 先鎖定規範與基準，不靠記憶判斷「看起來比較好」。
2. 先完成 default tree 樣板；未批准前不批量生成其他 28 張樹。
3. 完成所有中央素材後，再做比例、接地、景深；不以 CSS 濾鏡掩蓋素材風格問題。
4. 場景穩定後才建立 UI tokens、頂部 HUD 與底部狀態板。
5. 圖示與動態最後統一，避免前面布局仍在變動時重工。
6. 每個 task 都需 tests、build、視覺截圖與獨立 commit。

若 default tree 7 階段未能通過風格與成長連續性驗收，停止 Task 3，不繼續生成其他 skin。若桌面通過但 375px 畫面遮住主樹，停止最終驗收並先調整 HUD，不以縮小文字到 12px 以下解決空間問題。

## 四、完成定義

- 主畫面不存在像素樹＋寫實背景＋貼紙 companion＋SaaS HUD 的混搭感。
- 主樹在所有測試 viewport 都是第一視覺焦點。
- 平靜狀態面板桌面高度小於 100px，事件時才展開操作區。
- 所有主畫面互動區至少 44×44px，正文與數字清楚可讀。
- 全部 client tests、client build 與 server tests 通過。
- 日間、夜間、事件、companion、桌面、平板與手機都有最終截圖證據。
- `docs/design-system.md` 能直接指導下一個 tree skin、companion 或 HUD component 的製作。
