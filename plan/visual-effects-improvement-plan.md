# Tree Planting Game 視覺效果改進計劃

更新日期：2026-06-20

## 追蹤規則

- 每完成一項任務，負責 agent 將 `[ ]` 改成 `[x]`，並在該行後面補 `Owner / 日期 / 簡短結果`。
- 若任務被拆分，新增子 checkbox，不要刪除原任務。
- 若某項不做，改成 `[~]` 並寫明原因。

## 視覺目標

把目前的畫面從「功能完整的 garden UI」推進到「有層次的立體小花園場景」。核心方向是 **layered arboretum diorama**：背景有天氣與時間氛圍，中景有樹與 companion 的明確舞台，前景 UI 像半透明園藝工具盤，不遮住樹木主體。

成功標準：

- 主畫面一眼能看出季節、天氣、日夜、成長階段。
- 操作事件有清楚的即時回饋，不只是 icon 彈出。
- UI 保持可讀，手機寬度下不壓住樹木或按鈕。
- 動畫有節制，支援 `prefers-reduced-motion`。
- 不破壞現有 PNG asset 管線與已完成的 SVG 替換成果。

## 已完成的 Planner 勘查

- [x] Planner / 2026-06-20 / 確認 repo 已有 `.codegraph/`，並用 CodeGraph 勘查主畫面與視覺元件。
- [x] Planner / 2026-06-20 / 確認主要畫面入口為 `client/src/App.jsx`。
- [x] Planner / 2026-06-20 / 確認主要視覺元件為 `EnvironmentBackdrop.jsx`、`Particles.jsx`、`TreeVisual.jsx`、`CompanionSprite.jsx`、`WeatherDisplay.jsx`、`ActionButton.jsx`、`MiniGameModal.jsx`。
- [x] Planner / 2026-06-20 / 確認全域動畫與 raster scene 樣式集中在 `client/src/index.css`。
- [x] Planner / 2026-06-20 / 確認現有 PNG assets 位於 `client/public/assets/`，manifest 為 `client/public/assets/asset-manifest.json`。
- [x] Planner / 2026-06-20 / 確認 build 命令為 `cd client && npm run build`，production server 預設為 `http://127.0.0.1:7777`。

## 設計語言

建議先建立少量 CSS token，不需要引入新設計系統或外部字體。

色彩：

- Canopy green：`#2F6B45`
- Moss shadow：`#193B2B`
- Morning mist：`#DDF3E4`
- Blossom pink：`#F7A8C8`
- Amber sun：`#F6B94A`
- Storm violet：`#6F5AA8`
- Night ink：`#132236`

材質：

- 場景：柔和霧氣、地面陰影、低對比遠景。
- UI：半透明 frosted glass，但控制陰影和圓角，避免每個區塊都像浮動卡片。
- 事件：用小粒子、短光環、地面反應表達，而不是只靠 emoji 或彈跳。

標誌性元素：

- 「tree stage halo」：樹根附近有一圈隨季節變化的地面光暈和植被碎片。它應該把樹、地面、季節連起來，成為主畫面的記憶點。

## 實作計劃

### 1. Baseline 與截圖基準

- [ ] Coder：先不改程式，啟動 app 並截圖目前主畫面桌面版與手機版，保存到臨時或 reviewer 指定位置。
- [ ] Coder：記錄至少 5 個狀態的視覺基準：day/sunny/spring、night/sunny、rainy、stormy、snowy 或 winter。
- [ ] Tester：確認目前 console 是否已有 missing asset 404 或 runtime error，避免把既有問題混入改版結果。

交付物：

- 基準截圖。
- 一段簡短 baseline note，列出目前最明顯的視覺問題。

### 2. 建立視覺 token 與樣式邊界

目標是讓後續改動有一致色彩與層級，不把顏色散落到 JSX class 裡。

- [ ] Coder：在 `client/src/index.css` 增加 `:root` token，例如 scene、weather、panel、accent 色彩與 shadow。
- [ ] Coder：新增少量語義 class，例如 `.game-shell`、`.glass-panel`、`.scene-layer`；只替換主畫面最需要統一的地方。
- [ ] Coder：保留 Tailwind class 為布局工具，不把全專案重構成 CSS class。
- [ ] Reviewer：檢查 token 是否真的被使用，避免只是新增未用變數。

主要檔案：

- `client/src/index.css`
- `client/src/App.jsx`

驗收：

- [ ] `cd client && npm run build` 成功。
- [ ] 主畫面日夜兩套 UI 對比仍可讀。

### 3. 強化背景層次與天氣氛圍

目標是讓背景不只是靜態 PNG，而是有深度的花園舞台。

- [ ] Coder：在 `EnvironmentBackdrop.jsx` 加入語義化 overlay 容器，例如遠景霧、光束、前景暗角；用 CSS 控制，不新增大量 DOM。
- [ ] Coder：日間增加柔和太陽光方向；夜間加低亮度月光與星光層，避免整體過暗。
- [ ] Coder：rainy/stormy/snowy 使用不同 overlay：雨天地面反光、暴風閃光、冬季雪堆。
- [ ] Coder：golden hour 使用暖色調但不要讓 UI 文字泛黃失去對比。
- [ ] Tester：用截圖比對 5 種 weather/season 狀態，確認效果能辨識且不遮工具列。

主要檔案：

- `client/src/components/EnvironmentBackdrop.jsx`
- `client/src/index.css`

驗收：

- [ ] sunny、rainy、stormy、snowy 都有可見差異。
- [ ] 手機版背景不裁掉樹的主要視覺區。

### 4. 打磨樹木主場景

目標是讓樹和地面融成一個完整場景，而不是圖片疊在背景上。

- [ ] Coder：在 `TreeVisual.jsx` 增加地面 halo / shadow / foreground vegetation 的 DOM 或 CSS pseudo-layer。
- [ ] Coder：每個 stage 的地面 scale、shadow、decor 密度逐步變化，stage 1 不要過度裝飾，stage 7 要有成熟感。
- [ ] Coder：level up 時新增短暫光環或葉片 burst，避免只靠 scale bounce。
- [ ] Coder：`isStatic` 模式仍要適合 collection / garden visit modal，不套用過多 ambient 動畫。
- [ ] Reviewer：檢查 `TreeVisual` 被 `App.jsx`、`CollectionModal.jsx`、`GardenVisitModal.jsx` 使用，確保靜態場景沒有被主畫面專用樣式污染。

主要檔案：

- `client/src/components/TreeVisual.jsx`
- `client/src/index.css`

驗收：

- [ ] stage 1、3、5、7 在截圖中有明確視覺差異。
- [ ] modal 內的 `TreeVisual` 不溢出、不遮文字。

### 5. 調整粒子與環境生命感

目標是增加自然感，同時控制效能。

- [ ] Coder：在 `Particles.jsx` 調整粒子密度與速度，桌面與手機都不要過量。
- [ ] Coder：spring petals、autumn leaves、winter snow、summer motes 的形狀/透明度/路徑拉開差異。
- [ ] Coder：stormy 狀態要有低頻強動作，rainy 狀態要有穩定細雨，不要兩者看起來相同。
- [ ] Coder：所有新增動畫都納入 `@media (prefers-reduced-motion: reduce)`。
- [ ] Tester：觀察 60 秒內沒有粒子堆積、卡頓或 layout shift。

主要檔案：

- `client/src/components/Particles.jsx`
- `client/src/index.css`

驗收：

- [ ] reduced motion 下不再播放漂浮/閃爍/快速移動動畫。
- [ ] 常態畫面 DOM 粒子數量可控，手機不明顯卡頓。

### 6. 改進操作事件回饋

目標是讓玩家知道自己做了什麼、作用在哪裡、是否與目前事件匹配。

- [ ] Coder：把 `App.jsx` 中 `actionBursts` 的固定 `+XP` 改成依 action 類型的短 label 或圖形，例如 water splash、prune leaves、sun ray、storm charge。
- [ ] Coder：讓 burst 位置更貼近樹冠、樹根或事件 icon，不全部集中在畫面中央。
- [ ] Coder：在 `TreeVisual.jsx` 的 `eventType` overlay 加入不同事件的微場景反應，例如 pest 在樹冠、fertilize 在地面、sunlight 在上方。
- [ ] Coder：避免新增需要 server 回傳的新狀態；只用現有 `actionType`、`activeEvent`、`weather`、`season`。
- [ ] Tester：逐一觸發 WATER、PEST、FERTILIZE、PRUNE、SUNLIGHT、STORM，確認 icon、粒子和位置匹配。

主要檔案：

- `client/src/App.jsx`
- `client/src/components/TreeVisual.jsx`
- `client/src/index.css`

驗收：

- [ ] 6 種 action 在視覺上能被區分。
- [ ] burst 不遮住底部 action buttons。

### 7. UI 面板與工具列視覺整理

目標是讓 UI 更精緻，但不把畫面變成卡片堆疊。

- [ ] Coder：整理右上工具列，減少多排按鈕造成的視覺噪音；保持所有功能可達。
- [ ] Coder：底部狀態面板使用新的 glass token，降低過大陰影，提升 XP 條質感。
- [ ] Coder：`ActionButton.jsx` 增加 active state 的視覺權重，disabled state 要清楚但不要像錯誤狀態。
- [ ] Coder：`WeatherDisplay.jsx` 可增加文字 tooltip/title 或更清楚的 compact badge，但不要佔更多主畫面高度。
- [ ] Tester：在 360px、390px、768px、1280px 寬度檢查沒有 overlap、截斷或不可點擊。

主要檔案：

- `client/src/App.jsx`
- `client/src/components/ActionButton.jsx`
- `client/src/components/WeatherDisplay.jsx`
- `client/src/index.css`

驗收：

- [ ] 手機寬度下樹仍是主視覺焦點。
- [ ] 底部事件區在有/無 active event 時高度穩定。

### 8. Mini game 與 modal 視覺一致化

目標是讓 mini game 不像另一套臨時 UI。

- [ ] Coder：`MiniGameModal.jsx` 的 memory cards 改成和樹/季節一致的材質與色彩。
- [ ] Coder：Quick Water 背景加入簡單場景層，例如水面、草地、雨滴命中回饋。
- [ ] Coder：modal header 使用相同 token，避免每個 modal 使用不同漸層風格。
- [ ] Reviewer：確認這一步沒有改動遊戲規則、分數公式或 reward API。

主要檔案：

- `client/src/components/MiniGameModal.jsx`
- `client/src/index.css`

驗收：

- [ ] memory game 和 quick water game 視覺上屬於同一個 garden world。
- [ ] 遊戲完成 callback 與 reward 流程不變。

### 9. 視覺 QA 與回歸驗證

- [ ] Tester：執行 `cd client && npm run build`。
- [ ] Tester：若 Chrome DevTools endpoint 可用，執行 `node scripts/capture-game-screenshot.mjs` 產出主畫面截圖。
- [ ] Tester：啟動 `node server.js`，用 `http://127.0.0.1:7777` 檢查 production build。
- [ ] Tester：檢查 browser console，確認沒有 missing PNG 404、React warning、runtime error。
- [ ] Tester：檢查日/夜、5 種 weather、4 種 season、6 種 action、至少 2 個 companion。
- [ ] Tester：檢查 `prefers-reduced-motion: reduce` 下動畫被降級。
- [ ] Reviewer：以 code review 角度檢查 diff，重點看視覺改動是否引入 layout regression、不可讀文字、過度 DOM、未清理 timer、資產路徑錯誤。

推薦命令：

```powershell
cd client
npm run build
cd ..
node server.js
```

若要截圖：

```powershell
node scripts/capture-game-screenshot.mjs
```

注意：截圖腳本需要 app 在 `http://127.0.0.1:7777`，並且需要 Chrome DevTools endpoint 在 `http://127.0.0.1:9222`。

## 風險與限制

- 現有 asset 已完成 SVG 到 PNG 的替換，本計劃不應重新引入 inline SVG 或 `.svg` 資產。
- `TreeVisual` 同時服務主畫面與 modal，主畫面專屬效果要用 `isStatic` 或 class 分流。
- `Particles` 使用 DOM 元素與 CSS animation，不宜無限制增加粒子數。
- 右上工具列功能很多，視覺整理時不能犧牲可點擊區域和可辨識性。
- 沒有現成測試框架，主要驗證會是 build、console、截圖和手動場景矩陣。

## 建議執行順序

1. 先做 baseline 和 token。
2. 再做背景、樹、粒子三個場景層。
3. 接著做 action feedback。
4. 最後整理 UI、mini game、modal。
5. Tester 做截圖矩陣。
6. Reviewer review diff 和視覺風險。

## 最小可接受交付

若時間有限，至少完成：

- [ ] `index.css` token + reduced motion 整理。
- [ ] `EnvironmentBackdrop` 背景層次改進。
- [ ] `TreeVisual` 地面 halo / shadow / level-up 效果。
- [ ] `App.jsx` action burst 分 action 視覺化。
- [ ] `cd client && npm run build` 成功。
- [ ] 桌面與手機各一張主畫面截圖無 overlap。
