# 遊戲視覺統一改造進度

最後更新：2026-07-11  
目前分支：`codex/visual-unification`  
實作工作樹：`C:\Users\lamyu\.config\superpowers\worktrees\TreePlantingGame\visual-unification`  
原始專案：`F:\Desktop\TreePlantingGame`

目前狀態：Task 1–9 已完成實作與驗證；本文件原先列出的 Task 9 待辦均已處理。

### 最終驗證更新

- 暴風警告的重複 emoji 已移除並有回歸測試。
- tablet/mobile 事件面板已改為單列操作，六個按鈕完整顯示且不遮住樹木。
- 五個視覺 QA 場景皆無 document overflow、樹／面板交疊、HUD emoji、console error 或 network failure。
- client tests：33/33 通過。
- client production build：通過。
- server tests：142 通過、2 個 Windows signal 測試依既有條件跳過。
- 最終證據位於 `artifacts/visual-qa/`。

## 1. 已完成的事項

### 視覺方向與基礎規範

- 已確立整體風格為「溫暖、手繪、童話繪本感」，統一森林場景、中央物件、HUD、圖示與互動回饋。
- 已建立視覺系統文件：`docs/design-system.md`。
- 已建立完整實作計畫：`docs/superpowers/plans/2026-07-11-game-visual-unification.md`。
- 已加入本機可用的 Nunito Sans 與 Noto Sans TC variable fonts，以及 OFL 授權文件。
- 已建立統一的顏色、字體、間距、陰影、圓角、動態與深色模式 tokens。

### 場景素材統一

- 已重新製作預設樹木 1–7 階成長素材，統一為手繪水粉風格。
- 櫻花、秋季、雪地、金色皮膚均沿用相同樹形輪廓衍生，確保成長過程連續。
- 已重新製作地面、人物、房屋與六種夥伴素材：蝴蝶、松鼠、鳥、貓頭鷹、鹿、鳳凰。
- 已加入素材尺寸與透明通道測試，35 張樹木素材皆符合 512×512 RGBA 規格。
- 已建立語意場景層：ground、focus、support、companion，並統一比例、接觸陰影、飽和度與景深。

### HUD 與狀態面板

- 已將頂部資訊重建為單一遊戲 HUD，區分環境、資源與工具三區。
- 已移除不必要的使用者名稱、倍率文字與持續脈衝效果。
- 所有主要控制項維持至少 44×44 px。
- 天氣圖示已由 emoji 改成統一的 raster 圖示。
- 成長狀態面板已改成緊湊型；桌面和平狀態實測高度為 76 px。
- 事件操作只在事件發生時展開；和平狀態不再保留大型空白虛線框。
- 已將 25 個 HUD／操作圖示重新調色成森林綠、苔綠、羊皮紙與琥珀色系。
- 已重建五張 UI 材質，移除素材內建的圓角框，改由 CSS 統一控制形狀。
- 操作回饋已改為純文字 burst，不再混用 emoji。

### 響應式與動態

- 已加入手機版 HUD、狀態面板、安全區與場景縮放規則。
- 手機工具列採內部水平捲動，避免把點擊目標縮小到 44 px 以下。
- 已降低夥伴光暈與移動幅度，環境動態大多控制在 4–9 秒。
- 已補充 `prefers-reduced-motion`，停用不必要的位移、閃爍與 burst 動畫。
- 已完成 1440×900、768×1024、375×812 三種尺寸的自動視覺擷取流程。

### 測試與提交

- 目前 client 測試：32/32 通過。
- 目前 client production build：通過。
- server 基準測試：142 通過、2 個 Windows signal 測試跳過；最終交付前仍需重跑。
- 已完成提交：
  - `c848524 docs: define unified game visual system`
  - `e03160f test: define visual asset contracts`
  - `78a92dc art: unify central scene assets`
  - `1188674 style: ground scene assets in one visual space`
  - `70a12cd style: establish unified game UI tokens`
  - `36ee0ca style: rebuild the game header as one HUD`
  - `ab64c7d style: compact the growth status panel`
  - `467dfae art: unify HUD icons and interaction feedback`

## 2. 關鍵決策

- 鎖定單一美術方向：溫暖、自然、手繪童話繪本；光線統一由右上方照入。
- 保留既有素材檔名與遊戲資料流，視覺改造不修改存檔格式、狀態邏輯或 server 行為。
- 先完成預設七階樹木，再從相同輪廓衍生季節皮膚，避免不同皮膚像完全不同遊戲。
- 中央樹木是唯一主焦點；HUD 固定在畫面邊緣，人物、房屋與夥伴只作為支援元素。
- HUD 採羊皮紙與深森林色系；膠囊造型只保留給資源數值，不把所有區塊都做成 pill。
- 事件面板只在事件發生時擴張，平時保持低干擾。
- 字型直接收錄於專案，避免依賴外部字型服務造成載入差異。
- 使用靜態 contract tests 保護關鍵結構、tokens、素材規格、響應式與 reduced-motion 規則。
- 手機工具列選擇內部水平捲動，而不是縮小按鈕或讓整個頁面水平溢出。
- 視覺 QA 使用自製 Chrome DevTools Protocol 腳本；原本預期的 gstack browse 執行檔在環境中不可用。
- QA 存檔由使用者存檔的副本產生，沒有直接修改 `F:\Desktop\TreePlantingGame\save.json`。

## 3. 原交接時未完成的待辦（現已完成）

### 優先修正

1. 移除暴風警告文字中的 emoji。
   - `stormWarning` 翻譯目前包含開頭 `⚡`，畫面又另外顯示 Zap 圖示，造成重複。
   - 建議在 `ActionPanel.jsx` 顯示前移除 leading emoji，並補測試確認主要 HUD 不含 emoji。

2. 修正事件面板與樹木重疊。
   - 768×1024 tablet：事件面板覆蓋樹幹與右下地面。
   - 375×812 mobile storm：事件面板覆蓋樹木下半部。
   - 建議將 tablet/mobile 的六個事件按鈕改成單列水平捲動，以降低面板高度；再依實測調整事件狀態下的主場景 bottom padding。

3. 重跑五個視覺 QA 場景並人工檢查。
   - desktop day peaceful：1440×900
   - desktop night companion event：1440×900
   - tablet day event：768×1024
   - mobile day peaceful：375×812
   - mobile night storm：375×812

### 收尾工作

4. 將最終量測結果補回 `docs/design-system.md`，包括控制尺寸、面板高度、手機工具列行為與物件比例。
5. 決定是否保留 `artifacts/visual-qa/`；建議只保留修正後的最終截圖與 `report.json`。
6. 安全移除 `tmp/`；該資料夾包含 QA database、logs、Chrome profile，不可提交。
7. 執行最終驗證：
   - client：`npm test`
   - client：`npm run build`
   - repo root/server：`npm test`
   - Git whitespace：`git diff --check`
8. 提交尚未完成的 Task 9，建議 commit message：`style: finish responsive visual unification`。
9. 依序執行 verification-before-completion 與 finishing-a-development-branch 流程，再決定合併方式。

## 目前尚未提交的檔案

- `client/src/index.css`
  - Task 9 的 mobile/tablet HUD、狀態面板、安全區、場景縮放與 reduced-motion 調整。
- `client/test/visualContracts.test.js`
  - Task 9 的響應式、safe-area 與 reduced-motion contract tests。
- `scripts/capture-visual-qa.mjs`
  - Chrome CDP 視覺 QA 擷取腳本。
- `artifacts/visual-qa/`
  - 現有 QA 截圖與報告；其中 tablet/mobile event 截圖仍顯示重疊問題。
- `tmp/`
  - 純暫存 QA 資料，最後必須刪除且不可提交。
- `progress.md`
  - 本交接文件。

## 新對話接手方式

請在新對話中先提供本文件，並要求從 Task 9 的視覺 QA 問題繼續。工作目錄應使用：

```powershell
Set-Location 'C:\Users\lamyu\.config\superpowers\worktrees\TreePlantingGame\visual-unification'
git status --short --branch
```

建議新對話的第一句：

> 請閱讀 `progress.md` 與 `docs/superpowers/plans/2026-07-11-game-visual-unification.md`，從未完成的 Task 9 繼續；先修正 stormWarning 重複 emoji 與 tablet/mobile 事件面板遮住樹木，再重跑完整視覺 QA 和測試。

## 重要檔案索引

- `docs/superpowers/plans/2026-07-11-game-visual-unification.md`
- `docs/design-system.md`
- `client/src/index.css`
- `client/src/App.jsx`
- `client/src/components/game/GameHeader.jsx`
- `client/src/components/game/ActionPanel.jsx`
- `client/src/components/game/GameStage.jsx`
- `client/src/components/TreeVisual.jsx`
- `client/src/components/CompanionSprite.jsx`
- `client/src/components/WeatherDisplay.jsx`
- `client/src/components/ActionButton.jsx`
- `client/test/assetDimensions.test.js`
- `client/test/visualContracts.test.js`
- `client/test/gameViews.test.js`
- `scripts/generate-digital-assets.mjs`
- `scripts/capture-visual-qa.mjs`
