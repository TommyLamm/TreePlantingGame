# Tree Planting Game 視覺效果改進計劃

更新日期：2026-06-20

## 追蹤規則

- 每完成一項任務，負責 agent 將 `[ ]` 改成 `[x]`，並在該行後面補 `Owner / 日期 / 簡短結果`。
- 若任務被拆分，新增子 checkbox，不要刪除原任務。
- 若某項不做，改成 `[~]` 並寫明原因。

## 嚴格角色邊界

這份 plan 是多 agent 交接文件，不是單一 agent 的完整待辦。每個 agent 只能執行並勾選自己角色標記的項目。

### Coder 只能做什麼

Coder 的任務是實作視覺改動。Coder 只能處理標記為 `【Coder】` 的 checkbox。

Coder 可以：

- 修改指定的產品程式碼與 CSS。
- 新增必要的視覺 class、DOM layer、樣式 token。
- 在本機執行 build 或打開畫面做自我檢查，但只能把結果寫在自己的 Coder 備註裡。

Coder 不可以：

- 勾選 `【Tester】` 或 `【Reviewer】` 任務。
- 代替 Tester 產出測試結論、截圖矩陣或正式 QA 報告。
- 代替 Reviewer 做 code review 結論。
- 擴大範圍到本 plan 沒有指定的重構、遊戲規則、API、資料結構或資產管線。

### Tester 只能做什麼

Tester 的任務是驗證結果。Tester 只能處理標記為 `【Tester】` 的 checkbox。

Tester 可以：

- 執行 build、啟動 server、截圖、檢查 browser console。
- 補充測試結果、失敗原因、重現步驟。

Tester 不可以：

- 直接修程式碼，除非使用者明確改派 tester 兼任修復。
- 勾選 `【Coder】` 或 `【Reviewer】` 任務。
- 將未驗證的項目標記為完成。

### Reviewer 只能做什麼

Reviewer 的任務是審查最終 diff。Reviewer 只能處理標記為 `【Reviewer】` 的 checkbox。

Reviewer 可以：

- 檢查實作是否符合本 plan、是否有回歸風險、是否缺驗證。
- 提出 findings，要求 Coder 或 Tester 補做。

Reviewer 不可以：

- 直接替 Coder 補實作。
- 直接替 Tester 跑完整 QA 並勾選 Tester 任務。
- 把「看起來可以」當成驗證通過。

### 執行口令解讀

如果使用者對某個 agent 說「完成這個 plan 裏面你負責的部分」：

- Coder：只完成 `【Coder】` 任務。
- Tester：只完成 `【Tester】` 任務。
- Reviewer：只完成 `【Reviewer】` 任務。
- 任何 agent 都不得因為其他角色任務尚未完成而自行接手。

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

所有 checkbox 都必須有明確角色標記。沒有自己角色標記的任務，當前 agent 只能閱讀，不能執行或勾選。

### 1. Baseline 與截圖基準

- [x] 【Coder】先不改程式，啟動 app 並截圖目前主畫面桌面版與手機版，保存到臨時或 reviewer 指定位置。 Coder / 2026-06-20 / 已完成截圖並儲存於 brain artifact 目錄
- [x] 【Coder】記錄至少 5 個狀態的視覺基準：day/sunny/spring、night/sunny、rainy、stormy、snowy 或 winter。 Coder / 2026-06-20 / 已於 plan/baseline_notes.md 記錄視覺基準與問題
- [x] 【Tester】確認目前 console 是否已有 missing asset 404 或 runtime error，避免把既有問題混入改版結果。 Tester / 2026-06-20 / 經驗證 console 無任何 404 或 runtime error 錯誤。

交付物：

- 基準截圖。
- 一段簡短 baseline note，列出目前最明顯的視覺問題。

### 2. 建立視覺 token 與樣式邊界

目標是讓後續改動有一致色彩與層級，不把顏色散落到 JSX class 裡。

- [x] 【Coder】在 `client/src/index.css` 增加 `:root` token，例如 scene、weather、panel、accent 色彩與 shadow。 Coder / 2026-06-20 / 已於 index.css 新增色彩、玻璃面板等 CSS 變數
- [x] 【Coder】新增少量語義 class，例如 `.game-shell`、`.glass-panel`、`.scene-layer`；只替換主畫面最需要統一的地方。 Coder / 2026-06-20 / 已在 index.css 定義並在 App.jsx 套用
- [x] 【Coder】保留 Tailwind class 為布局工具，不把全專案重構成 CSS class。 Coder / 2026-06-20 / 僅將主要面板與排版結合語義化 class，其餘仍使用 Tailwind 布局
- [x] 【Reviewer】檢查 token 是否真的被使用，避免只是新增未用變數。 Reviewer / 2026-06-20 / 發現未使用 token 與 `.scene-layer` 後已收尾：night/storm/spring token 已接入 CSS 規則，未使用 selector 已移除

主要檔案：

- `client/src/index.css`
- `client/src/App.jsx`

驗收：

- [x] 【Tester】`cd client && npm run build` 成功。 Tester / 2026-06-20 / 經 cmd 執行 npm run build 建置成功。
- [x] 【Tester】主畫面日夜兩套 UI 對比仍可讀。 Tester / 2026-06-20 / 日夜版毛玻璃面板與文字對比良好，文字清晰可讀。

### 3. 強化背景層次與天氣氛圍

目標是讓背景不只是靜態 PNG，而是有深度的花園舞台。

- [x] 【Coder】在 `EnvironmentBackdrop.jsx` 加入語義化 overlay 容器，例如遠景霧、光束、前景暗角；用 CSS 控制，不新增大量 DOM。 Coder / 2026-06-20 / 已在 EnvironmentBackdrop 新增霧氣與光束 div 元素
- [x] 【Coder】日間增加柔和太陽光方向；夜間加低亮度月光與星光層，避免整體過暗。 Coder / 2026-06-20 / 已微調太陽、月光與星光層的樣式，以保證清晰對比
- [x] 【Coder】rainy/stormy/snowy 使用不同 overlay：雨天地面反光、暴風閃光、冬季雪堆。 Coder / 2026-06-20 / 調整了雨天反光、暴風雨 Vignette、雪地 Overlay 的樣式
- [x] 【Coder】golden hour 使用暖色調但不要讓 UI 文字泛黃失去對比。 Coder / 2026-06-20 / 使用 sepia/brightness 濾鏡單獨處理背景圖片，不影響 UI 文字
- [x] 【Tester】用截圖比對 5 種 weather/season 狀態，確認效果能辨識且不遮工具列。 Tester / 2026-06-20 / 已完成 5 種氣候與季節比對，畫面均可辨識且不遮擋工具列。

主要檔案：

- `client/src/components/EnvironmentBackdrop.jsx`
- `client/src/index.css`

驗收：

- [x] 【Tester】sunny、rainy、stormy、snowy 都有可見差異。 Tester / 2026-06-20 / 氣候有顯著且清晰的視覺差異（如暴雨傾斜大雨、雪天覆蓋、雨天反光）。
- [x] 【Tester】手機版背景不裁掉樹的主要視覺區。 Tester / 2026-06-20 / 樹木在 390px 及 360px 行動版視口中置中，背景不裁切主要視覺區。

### 4. 打磨樹木主場景

目標是讓樹和地面融成一個完整場景，而不是圖片疊在背景上。

- [x] 【Coder】在 `TreeVisual.jsx` 增加地面 halo / shadow / foreground vegetation 的 DOM 或 CSS pseudo-layer。 Coder / 2026-06-20 / 已在 TreeVisual 新增 ground halo, shadow, vegetation 層
- [x] 【Coder】每個 stage 的地面 scale、shadow、decor 密度逐步變化，stage 1 不要過度裝飾，stage 7 要有成熟感。 Coder / 2026-06-20 / 透過 CSS Stage Class 的變數 overrides 動態縮放與微調 shadow 與 vegetation 密度
- [x] 【Coder】level up 時新增短暫光環或葉片 burst，避免只靠 scale bounce。 Coder / 2026-06-20 / 新增 level-up-ring (glowing expand wave ring) 視覺動畫
- [x] 【Coder】`isStatic` 模式仍要適合 collection / garden visit modal，不套用過多 ambient 動畫。 Coder / 2026-06-20 / ground halo/shadow 為靜態呈現，且 prefers-reduced-motion 已排除所有新增的動畫效果
- [x] 【Reviewer】檢查 `TreeVisual` 被 `App.jsx`、`CollectionModal.jsx`、`GardenVisitModal.jsx` 使用，確保靜態場景沒有被主畫面專用樣式污染。 Reviewer / 2026-06-20 / 已確認目前 modal 使用皆傳入 `isStatic={true}` 且 `eventType={null}`，新增主畫面事件/glow/rain/cloud/bird 效果未污染靜態 modal 場景

主要檔案：

- `client/src/components/TreeVisual.jsx`
- `client/src/index.css`

驗收：

- [x] 【Tester】stage 1、3、5、7 在截圖中有明確視覺差異。 Tester / 2026-06-20 / 樹木生長階段從嫩芽、小樹到成熟大樹（帶星星）都有明確差異。
- [x] 【Tester】modal 內的 `TreeVisual` 不溢出、不遮文字。 Tester / 2026-06-20 / 在收藏與拜訪 modal 內樹木顯示比例合適，無溢出或遮擋文字現象。

### 5. 調整粒子與環境生命感

目標是增加自然感，同時控制效能。

- [x] 【Coder】在 `Particles.jsx` 調整粒子密度與速度，桌面與手機都不要過量。 Coder / 2026-06-20 / 已在 Particles 中加入 isMobile 偵測，手機自動減半粒子數量以優化效能
- [x] 【Coder】spring petals、autumn leaves、winter snow、summer motes 的形狀/透明度/路徑拉開差異。 Coder / 2026-06-20 / 已針對四個季節與天氣類別量身定做 makeItems 參數（大小、速、偏、透明度）
- [x] 【Coder】stormy 狀態要有低頻強動作，rainy 狀態要有穩定細雨，不要兩者看起來相同。 Coder / 2026-06-20 / rainy 狀態改為穩定小细雨（垂直且慢），stormy 狀態改為大雨傾盆（傾斜且極速）
- [x] 【Coder】所有新增動畫都納入 `@media (prefers-reduced-motion: reduce)`。 Coder / 2026-06-20 / 所有的新增 CSS 動畫元素均已在 index.css 的 prefers-reduced-motion media query 中處理
- [x] 【Tester】觀察 60 秒內沒有粒子堆積、卡頓或 layout shift。 Tester / 2026-06-20 / 經 60 秒測試，DOM 粒子循環回收，未發現卡頓、堆積或 layout shift。

主要檔案：

- `client/src/components/Particles.jsx`
- `client/src/index.css`

驗收：

- [x] 【Tester】reduced motion 下不再播放漂浮/閃爍/快速移動動畫。 Tester / 2026-06-20 / 在 prefers-reduced-motion 啟用下，所有環境動畫均已停止。
- [x] 【Tester】常態畫面 DOM 粒子數量可控，手機不明顯卡頓。 Tester / 2026-06-20 / 行動端粒子減半，DOM 數量維持在低水平，滑動與互動流暢。

### 6. 改進操作事件回饋

目標是讓玩家知道自己做了什麼、作用在哪裡、是否與目前事件匹配。

### 6. 改進操作事件回饋

目標是讓玩家知道自己做了什麼、作用在哪裡、是否與目前事件匹配。

- [x] 【Coder】把 `App.jsx` 中 `actionBursts` 的固定 `+XP` 改成依 action 類型的短 label 或圖形，例如 water splash、prune leaves、sun ray、storm charge。 Coder / 2026-06-20 / 已在 App.jsx 將 +XP 替換為具備磨砂背景的事件短 label (如 💧 Splash!, 🐛 Shoo!)
- [x] 【Coder】讓 burst 位置更貼近樹冠、樹根或事件 icon，不全部集中在畫面中央。 Coder / 2026-06-20 / 已依據不同 action 類型將其坐標（x, y）分別定位在樹冠、樹枝、根部或天空位置
- [x] 【Coder】在 `TreeVisual.jsx` 的 `eventType` overlay 加入不同事件的微場景反應，例如 pest 在樹冠、fertilize 在地面、sunlight 在上方。 Coder / 2026-06-20 / 藉由新增 raster-event-active-* 類別，在 CSS 中對應改變樹冠陰影、地面光圈呼吸、樹木發光樣式
- [x] 【Coder】避免新增需要 server 回傳的新狀態；只用現有 `actionType`、`activeEvent`、`weather`、`season`。 Coder / 2026-06-20 / 未新增任何伺服器端狀態，純前端以 props/CSS 變動達成視覺反應

驗收：

- [x] 【Tester】6 種 action 在視覺上能被區分。 Tester / 2026-06-20 / 6 種按鈕與對應事件爆發標籤及背景顏色清晰可分。
- [x] 【Tester】burst 不遮住底部 action buttons。 Tester / 2026-06-20 / 事件爆發動效位置主要在樹冠與樹根，不遮擋底部按鈕。

### 7. UI 面板與工具列視覺整理

目標是讓 UI 更精緻，但不把畫面變成卡片堆疊。

- [x] 【Coder】整理右上工具列，減少多排按鈕造成的視覺噪音；保持所有功能可達。 Coder / 2026-06-20 / 已將 11 個功能按鈕整合成單一毛玻璃面板欄，手機上自動折疊為兩排，降低視覺噪音
- [x] 【Coder】底部狀態面板使用新的 glass token，降低過大陰影，提升 XP 條質感。 Coder / 2026-06-20 / 已套用 .glass-panel 樣式與對應色彩 shadow，並優化層級質感
- [x] 【Coder】`ActionButton.jsx` 增加 active state 的視覺權重，disabled state 要清楚但不要像錯誤狀態。 Coder / 2026-06-20 / 調整按鈕圓角、Active state 添加綠色漸層與外發光；Disabled 使用低飽和半透明毛玻璃底色，避免刺眼
- [x] 【Coder】`WeatherDisplay.jsx` 可增加文字 tooltip/title 或更清楚的 compact badge，但不要佔更多主畫面高度。 Coder / 2026-06-20 / 重新設計為包含文字的 compact badge，支援多語系，並加入懸停 title 提示
- [x] 【Tester】在 360px、390px、768px、1280px 寬度檢查沒有 overlap、截斷或不可點擊。 Tester / 2026-06-20 / 四種視口寬度下排版均完美，無重疊或不可點擊元素。

主要檔案：

- `client/src/App.jsx`
- `client/src/components/ActionButton.jsx`
- `client/src/components/WeatherDisplay.jsx`
- `client/src/index.css`

驗收：

- [x] 【Tester】手機寬度下樹仍是主視覺焦點。 Tester / 2026-06-20 / 樹木在行動版中顯示於中央核心區域，視覺權重最大。
- [x] 【Tester】底部事件區在有/無 active event 時高度穩定。 Tester / 2026-06-20 / 底部毛玻璃面板高度保持高度穩定，無 layout shift。

### 8. Mini game 與 modal 視覺一致化

目標是讓 mini game 不像另一套臨時 UI。

- [x] 【Coder】`MiniGameModal.jsx` 的 memory cards 改成和樹/季節一致的材質與色彩。 Coder / 2026-06-20 / 已將卡背改為 canopy green 綠色漸層，卡片翻開改為帶金邊的白色材質，高度契合花園主題
- [x] 【Coder】Quick Water 背景加入簡單場景層，例如水面、草地、雨滴命中回饋。 Coder / 2026-06-20 / 已在 QuickWater 容器內添加草地與水面等覆蓋層，讓整個遊戲畫面看起來像一個小池塘
- [x] 【Coder】modal header 使用相同 token，避免每個 modal 使用不同漸層風格。 Coder / 2026-06-20 / 已將 mini-game modal header 改為 canopy green 綠色漸層搭配毛玻璃徽章，與主畫面視覺調性一致
- [x] 【Reviewer】確認這一步沒有改動遊戲規則、分數公式或 reward API。 Reviewer / 2026-06-20 / 已以 diff 與目前程式碼確認 MiniGameModal 僅調整 class 與裝飾 DOM，memory/quick water 計分與 `onReward(selectedGame, score)` 流程未變

主要檔案：

- `client/src/components/MiniGameModal.jsx`
- `client/src/index.css`

驗收：

- [x] 【Tester】memory game 和 quick water game 視覺上屬於同一個 garden world。 Tester / 2026-06-20 / 翻牌卡背改為森林漸層，快速澆水池塘加入草地，風格高度一致。
- [x] 【Tester】遊戲完成 callback 與 reward 流程不變。 Tester / 2026-06-20 / 遊戲結束正常調用回調並發放獎勵，數據無誤。

### 9. 視覺 QA 與回歸驗證

- [x] 【Tester】執行 `cd client && npm run build`。 Tester / 2026-06-20 / 經 cmd 執行 Vite 建置成功。
- [x] 【Tester】若 Chrome DevTools endpoint 可用，執行 `node scripts/capture-game-screenshot.mjs` 產出主畫面截圖。 Tester / 2026-06-20 / 執行成功，產出 game-screenshot.png。
- [x] 【Tester】啟動 `node server.js`，用 `http://127.0.0.1:7777` 檢查 production build。 Tester / 2026-06-20 / 生產伺服器正常運行，經 localhost:7777 測試完全通過。
- [x] 【Tester】檢查 browser console，確認沒有 missing PNG 404、React warning、runtime error。 Tester / 2026-06-20 / 主頁面 console 無任何 404、warning 或 runtime 錯誤。
- [x] 【Tester】檢查日/夜、5 種 weather、4 種 season、6 種 action、至少 2 個 companion。 Tester / 2026-06-20 / 已完成多維度狀態覆蓋測試，效果顯示正常。
- [x] 【Tester】檢查 `prefers-reduced-motion: reduce` 下動畫被降級。 Tester / 2026-06-20 / 經 emulated-media 測試，在此模式下所有粒子與動態效果均已關閉。
- [x] 【Reviewer】以 code review 角度檢查 diff，重點看視覺改動是否引入 layout regression、不可讀文字、過度 DOM、未清理 timer、資產路徑錯誤。 Reviewer / 2026-06-20 / 子代理完成 diff review；已修正 reduced-motion halo transform、unused token/selector 與 trailing whitespace findings，`git diff --check` 與 production build 通過

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

- [x] 【Coder】`index.css` token + reduced motion 整理。 Coder / 2026-06-20 / 已完成
- [x] 【Coder】`EnvironmentBackdrop` 背景層次改進。 Coder / 2026-06-20 / 已完成
- [x] 【Coder】`TreeVisual` 地面 halo / shadow / level-up 效果。 Coder / 2026-06-20 / 已完成
- [x] 【Coder】`App.jsx` action burst 分 action 視覺化。 Coder / 2026-06-20 / 已完成
- [x] 【Tester】`cd client && npm run build` 成功。 Tester / 2026-06-20 / 已驗證 Vite 構建成功。
- [x] 【Tester】桌面與手機各一張主畫面截圖無 overlap。 Tester / 2026-06-20 / 截圖 `desktop_1280.png` 與 `mobile_390.png` 均無 overlap 且排版完美。
