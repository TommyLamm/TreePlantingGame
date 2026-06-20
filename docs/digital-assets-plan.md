# 種樹遊戲數字資產與動畫增強計畫

## 目標與現況

目標是讓現有 React/Vite 種樹遊戲在不改動核心玩法的前提下，增加畫面可見的數字資產與環境動畫，讓主畫面更有生命力。已檢視：

- `client/src/App.jsx`：主畫面、日夜背景、`Particles`、`TreeVisual`、`WeatherDisplay`、action bursts 都在這裡組合。
- `client/src/components/TreeVisual.jsx`：主要樹木 SVG、成長階段、樹皮/葉層、鳥、雲、草地、房子、角色參照物、事件 overlay。
- `client/src/components/Particles.jsx`：日間落葉、夜間螢火蟲粒子。
- `client/src/index.css` 與 `client/tailwind.config.js`：現有動畫 keyframes 包含 `sway`、`float`、`fall`、`burst`、`wiggle` 等。
- `public/`：目前只有 `index.html`，尚無可復用圖片資產目錄。

## 建議新增/修改的資產與元件

1. 新增 `public/assets/environments/`
   - 放置少量 WebP/PNG 背景層：遠山、地平線、雲影、夜空星點、冬季雪地、雨天霧層。
   - 建議尺寸：桌面 `1600x900`，移動端可由 CSS `object-fit: cover` 處理；每張壓縮到約 250 KB 以下。

2. 新增 `public/assets/companions/`
   - 放置可選 companion 的小型透明 PNG/WebP：butterfly、squirrel、bird、owl、deer、phoenix。
   - 每個資產建議 `512x512` 透明背景，實際渲染縮到 32-96 px。

3. 新增 `client/src/components/EnvironmentBackdrop.jsx`
   - 依 `isDay`、`game.weather`、`game.season` 渲染背景圖層、光暈、遠景和天氣 overlay。
   - 放在 `App.jsx` root 內，`Particles` 後或前方視覺層需明確控制 `z-index`。

4. 擴充 `client/src/components/Particles.jsx`
   - 由只接收 `isDay` 改為接收 `weather`、`season`。
   - 日間：春季花瓣、夏季葉片、秋季黃葉、冬季雪花。
   - 夜間：保留螢火蟲，但雨天/雪天切換為雨絲或雪粒。

5. 新增 `client/src/components/CompanionSprite.jsx`
   - 根據 `game.companion` 在樹旁顯示對應動物/精靈。
   - 初版可用 imagegen 產物當透明 PNG；需要動態時以 CSS transform 做漂浮、跳躍、拍翼或閃爍。

6. 擴充 `client/src/components/TreeVisual.jsx`
   - 保留現有程式化 SVG 樹，不建議用整棵樹圖片替換。
   - 增加樹冠外側的幾片獨立 SVG 葉片，套用不同延遲的擺動與落葉動畫。
   - 依季節/天氣調整小型可見元素：春季花瓣、秋季落葉、冬季枝頭積雪、雨天葉面水滴。

7. 擴充 `client/tailwind.config.js`
   - 新增 `leaf-swing`、`leaf-drift`、`bird-cross`、`ambient-glow`、`rain-streak`、`snow-drift`、`butterfly-flutter`、`companion-hop`。
   - 動畫都應使用 transform/opacity，避免頻繁改 layout 屬性。

## 動畫清單

1. 擺動落葉
   - 來源：`Particles.jsx` 與 `TreeVisual.jsx` 少量 SVG 葉片。
   - 行為：葉片先左右擺動，再用不同速度飄落；秋季提高數量，雨天降低不透明度。

2. 飛鳥與遠景生命感
   - 來源：現有 `TreeVisual.jsx` 的 `Bird` 可保留，另在 `EnvironmentBackdrop.jsx` 加遠方小鳥橫向飛行。
   - 行為：2-3 隻鳥每 18-28 秒從畫面一側飛過，避免一直搶視線。

3. 環境光
   - 來源：`EnvironmentBackdrop.jsx`。
   - 行為：白天太陽光暈慢速呼吸；夜晚月光和星點微閃；golden hour 時增加暖色 radial glow。

4. 季節差異
   - 春季：粉色花瓣、小花、嫩綠草。
   - 夏季：飽和綠葉、明亮陽光、蝴蝶。
   - 秋季：橘黃葉片、地面落葉堆、較暖背景。
   - 冬季：雪花、地面薄雪、枝頭積雪、低飽和藍白色背景。

5. 天氣差異
   - sunny：亮光與少量微塵。
   - cloudy：雲影緩慢平移，降低整體對比。
   - rainy：斜向雨絲、地面小漣漪、水滴閃光。
   - stormy：短暫閃電、樹晃動幅度略高、背景變暗。
   - snowy：慢速雪粒與積雪層。

6. Companion 動畫
   - butterfly：在樹冠附近 8 字形飛行。
   - squirrel：樹幹附近短跳與停頓。
   - bird：枝頭落下/起飛的小循環。
   - owl：夜晚眼睛微亮、白天靜止。
   - deer：樹旁呼吸與低頭吃草。
   - phoenix：慢速火焰粒子與光暈，prestige 專屬。

## Imagegen Prompts

以下 prompt 以「可直接用於 imagegen」為目標。若要在遊戲中做動畫，優先生成透明 PNG/WebP 的局部資產，而不是整張 UI 截圖。

### 1. 白天森林遠景背景

Prompt:

```text
A cozy stylized forest garden background for a React tree planting idle game, clear daytime sky, soft distant hills, gentle meadow horizon, subtle painterly texture, warm friendly colors, no characters, no text, no UI, no logo, wide 16:9 composition, center area kept visually calm for a large tree SVG overlay, soft depth layers, game asset, high quality, clean edges
```

限制:

```text
Avoid photorealism, avoid dark moody lighting, avoid complex foreground objects, avoid text, avoid watermark, avoid adding a giant tree in the center
```

建議輸出：`public/assets/environments/day-forest.webp`

### 2. 夜晚月光花園背景

Prompt:

```text
A peaceful stylized nighttime garden background for a tree planting game, deep blue sky, soft moonlight, faint stars, distant silhouettes of hills and small trees, calm open center for a large tree overlay, gentle magical atmosphere, readable but not too dark, no characters, no text, no UI, wide 16:9, game background asset, clean painterly style
```

限制:

```text
Avoid horror mood, avoid heavy fog, avoid purple-only palette, avoid text, avoid watermark, avoid placing a main tree in the center
```

建議輸出：`public/assets/environments/night-garden.webp`

### 3. 春季花瓣粒子圖集

Prompt:

```text
A transparent background sprite sheet of small spring flower petals for a cozy tree planting game, 16 individual petals, soft pink and pale peach colors, varied angles and shapes, simple stylized painterly game asset, clean alpha edges, no shadows outside the petals, no text, no UI, arranged in a 4 by 4 grid
```

限制:

```text
Transparent background only, no branch, no full flowers, no text, no watermark, no realistic photo texture
```

建議輸出：`public/assets/particles/spring-petals.png`

### 4. 秋季落葉粒子圖集

Prompt:

```text
A transparent background sprite sheet of small autumn leaves for a cozy tree planting game, 20 individual leaves, maple and oval leaf shapes, orange yellow red brown palette, varied rotation and sizes, stylized painterly game asset, clean alpha edges, no text, no UI, arranged evenly in a grid
```

限制:

```text
Transparent background only, no branches, no piles, no text, no watermark, avoid photorealism
```

建議輸出：`public/assets/particles/autumn-leaves.png`

### 5. 雪花粒子圖集

Prompt:

```text
A transparent background sprite sheet of soft snowflake particles for a cozy tree planting game, 24 small snowflakes and round snow dots, white and pale cyan, varied opacity and size, simple clean game asset, no text, no UI, arranged in a grid, alpha background
```

限制:

```text
Transparent background only, no winter landscape, no characters, no text, no watermark, avoid overly detailed lace patterns
```

建議輸出：`public/assets/particles/snowflakes.png`

### 6. Companion 透明 PNG：蝴蝶

Prompt:

```text
A cute stylized butterfly companion for a cozy tree planting game, transparent background, three-quarter view, soft blue and lavender wings with small warm highlights, friendly simple shape, readable at 48 pixels, clean alpha edges, no text, no UI, no shadow outside the character
```

限制:

```text
Transparent background only, single character only, no flowers, no text, no watermark, avoid photorealism
```

建議輸出：`public/assets/companions/butterfly.png`

### 7. Companion 透明 PNG：松鼠

Prompt:

```text
A cute stylized squirrel companion for a cozy tree planting game, transparent background, sitting pose with fluffy tail and small acorn, warm brown fur, friendly expression, simple readable silhouette at 64 pixels, clean alpha edges, no text, no UI, game sprite asset
```

限制:

```text
Transparent background only, single character only, no forest background, no text, no watermark, avoid realistic fur detail
```

建議輸出：`public/assets/companions/squirrel.png`

### 8. Companion 透明 PNG：鳳凰

Prompt:

```text
A small cute phoenix companion for a cozy tree planting prestige game reward, transparent background, stylized warm orange and gold feathers, tiny flame tail, magical but friendly, readable at 64 pixels, clean alpha edges, no text, no UI, single character game sprite
```

限制:

```text
Transparent background only, no full scene, no aggressive expression, no text, no watermark, avoid realistic bird anatomy
```

建議輸出：`public/assets/companions/phoenix.png`

### 9. 地面落葉/草叢貼圖

Prompt:

```text
A transparent background ground decoration asset for a cozy tree planting game, small patch of grass with a few fallen leaves and tiny flowers, stylized painterly, soft green and warm accent colors, low profile horizontal shape, clean alpha edges, no text, no UI, suitable for placing near the base of a tree
```

限制:

```text
Transparent background only, no large tree, no character, no text, no watermark, avoid photorealism
```

建議輸出：`public/assets/decor/ground-patch.png`

## 實作順序建議

- [x] 第一階段：不依賴圖片的動態增強
  - [x] 擴充 `Particles.jsx` 支援 `weather` / `season`。
  - [x] 新增 Tailwind/global keyframes：落葉擺動、雨絲、雪花、環境光。
  - [x] 在 `App.jsx` 傳入 `game.weather`、`game.season`。
  - 完成記錄：`Particles` 現在有春季花瓣、夏季微塵、秋季落葉、冬季雪/雨、雲層、日光 glints、夜間螢火蟲與蝴蝶。

- [x] 第二階段：背景與環境層
  - [x] 新增 `client/public/assets/environments/day-forest.svg`、`client/public/assets/environments/night-garden.svg` 作為可追蹤本地背景資產，並由 Vite 複製到 production `dist`。
  - [x] 新增 `EnvironmentBackdrop.jsx`，以 CSS blend/opacity 呈現日夜、天氣、季節、golden hour、遠鳥、星點、雨地漣漪、暴風閃電、雪地層。
  - [x] 在 `App.jsx` 接入背景層並控制 z-index，使背景不遮住樹與操作面板。
  - 備註：原本 WebP/imagegen 背景 prompt 保留，可後續用生成位圖替換目前 SVG 背景。

- [x] 第三階段：Companion 視覺化
  - [x] 新增 `CompanionSprite.jsx`。
  - [x] 支援 `butterfly`、`squirrel`、`phoenix`，並同步支援 `bird`、`owl`、`deer`。
  - [x] 在主樹附近放置 companion sprite，使用 CSS transform 動畫做飛行、跳躍、停棲、呼吸、火焰微粒。
  - 備註：原本透明 PNG/imagegen companion prompt 保留，可後續替換目前 inline SVG sprite。

- [x] 第四階段：樹與事件 polish
  - [x] 在 `TreeVisual.jsx` 增加少量獨立葉片、花瓣、積雪、水滴 SVG，不替換現有程式化樹木。
  - [x] 強化 action bursts：澆水有水滴散落，修剪有葉屑，陽光有金色微粒，暴風有短線光粒，施肥/害蟲也有對應粒子。
  - [x] 補上 `prefers-reduced-motion`，停用非必要背景/companion/action 動畫。

## 進度記錄

- [x] 2026-06-20：完成 phase 1-4 程式碼整合。
- [x] 2026-06-20：執行 production build，確認 Vite build 成功。
- [x] 2026-06-20：確認服務端首頁與新增背景 SVG asset URL 回 200。
- [ ] 後續可選：用本文件的 imagegen prompt 生成 WebP/PNG 位圖，替換目前的本地 SVG/inline SVG 佔位資產。
- [ ] 後續可選：用瀏覽器逐一視覺檢查所有天氣、季節、skin、companion 組合。

## 驗證方式

- [x] 靜態檢查
  - [x] 執行 production build，確認 Vite build 成功。
  - [x] 確認 `/assets/environments/day-forest.svg` 與 `/assets/environments/night-garden.svg` 在服務端回 200。
  - [ ] 檢查 console 沒有 missing asset 404。

- [ ] 視覺檢查
  - [ ] 啟動 `cd client && npm run dev`。
  - [ ] 檢查桌面寬度、手機寬度下，背景、樹、面板、工具列不重疊。
  - [ ] 驗證日間與夜間視覺都可讀，不影響底部操作面板。

- [ ] 狀態組合檢查
  - [ ] 手動或 mock 測試 `weather`: sunny、rainy、stormy、snowy。
  - [ ] 手動或 mock 測試 `season`: spring、summer、autumn、winter。
  - [ ] 測試 `treeSkin`: cherry、autumn、snow、golden。
  - [ ] 測試 companion: butterfly、squirrel、phoenix。

- [ ] 動畫效能檢查
  - [ ] Chrome Performance 確認 idle 主畫面無明顯 layout thrashing。
  - [x] 粒子數在手機寬度下控制在保守範圍，雨雪/夜間也有條件減量。
  - [x] 使用 `prefers-reduced-motion` 時降低或停用非必要背景動畫。

## 風險與假設

1. 現有樹木是程式化 SVG，整棵樹不應用圖片替換，否則會破壞等級成長與 skin 邏輯。
2. `Particles.jsx` 目前使用 `Math.random()` 產生粒子；切換日夜會重新生成是可接受的，但若後續需要可重現畫面，可改 seeded random。
3. 背景圖片若太細或太亮，會和 SVG 樹與 UI 爭搶視覺焦點；prompt 已要求中央留白與柔和遠景。
4. Emoji companion 目前只在按鈕與文字中顯示；若加入 `CompanionSprite`，需避免和現有 toolbar 的 emoji 表示混淆。
5. 圖片資產會增加下載量；建議用 WebP、透明 PNG 只保留小型 sprite，並延後載入非當前季節/天氣資產。
6. 暴風、雨、雪動畫容易影響可讀性；預設透明度需保守，且操作按鈕區域上方不要覆蓋高對比粒子。
