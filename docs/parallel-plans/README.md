# TreePlantingGame 多 Agent 執行總規格

此版本把「功能邏輯」與「視覺呈現」完全分開。前六個純文字 agent 只處理資料、規則、state machine、API 與測試；它們不修改 JSX、CSS、素材、layout、animation 或視覺 QA。所有呈現工作集中交給一個後置視覺 agent。

## 推薦順序

### Wave 1：六個純文字 Agent 平行執行

1. `01-onboarding-objectives.md`：目標推導與 onboarding 狀態模型。
2. `02-event-balance-server.md`：server 事件節奏、獎勵與天氣倍率。
3. `03-event-interaction-engine.md`：純邏輯事件互動 state machine。
4. `04-growth-weather-model.md`：成長里程碑與天氣呈現資料模型。
5. `05-minigame-main-loop.md`：小遊戲 server reward 與 client 資料流。
6. `06-social-garden.md`：每日花園協助的 service、route 與 client API。

### Wave 2：邏輯整合檢查點

由主整合者執行 `07-logic-integration.md`：依順序合併六個 branch、處理 API／state 契約、跑完整邏輯測試，產出一個乾淨的 logic baseline。這一步不設計 UI。

### Wave 3：單一視覺 Agent

視覺 agent 必須從 Wave 2 的 logic baseline 建立 branch，執行 `08-visual-implementation.md`。它獨佔所有 JSX、CSS、素材、layout、motion、responsive 與視覺 QA，因此不會與前六個 agent 發生檔案衝突。

### Wave 4：最終整合

主整合者執行 `09-final-integration.md`：審查視覺 branch、完成翻譯與無障礙收尾、跑完整測試、build 及視覺 QA。

### Wave 5：公開版本安全

玩法穩定後才執行 `10-auth-security.md`。安全改造會跨越 client API、server routes 與 repository，不與其他工作平行。

## Branch／worktree 建議

Wave 1 的六個 agent 必須從同一個基準 commit 建立獨立 worktree：

- `codex/onboarding-objectives`
- `codex/event-balance-server`
- `codex/event-interaction-engine`
- `codex/growth-weather-model`
- `codex/minigame-main-loop`
- `codex/social-garden`

Wave 2 建議 branch：`codex/logic-integration`。

Wave 3 的視覺 branch 必須從 `codex/logic-integration` 的最終 commit 建立，建議命名 `codex/visual-implementation`。

## 純文字 Agent 統一禁止修改

Wave 1 所有 agent 均不得修改或新增：

- 任何 `*.jsx`
- 任何 `*.css`
- `client/public/assets/**`
- `client/src/App.jsx`
- `client/src/index.css`
- `client/src/utils/i18n.js`
- `client/src/components/**`
- `scripts/capture-*.mjs` 或其他視覺 QA 腳本
- `artifacts/visual-qa/**`

純文字 agent 不需要評論色彩、排版、間距、美術風格、動畫或畫面好不好看。若功能需要 UI，只交付清楚的輸入／輸出契約與 presentation descriptor，交給視覺 agent 實作。

## Wave 1 檔案所有權

| 工作線 | 可修改的既有檔案 | 新檔案命名空間 |
|---|---|---|
| 01 Onboarding | 無 | `client/src/features/objectives/*.js`, `client/test/onboardingObjectives.test.js` |
| 02 Event server | `progressionService.js`, `gameStateService.js`, `server/config/gameData.js` | `server/config/eventBalance.js`, `test/eventBalanceV2.test.js` |
| 03 Event engine | 無 | `client/src/features/events/*.js`, `client/test/eventInteractionEngine.test.js` |
| 04 Growth model | 無 | `client/src/features/growth/*.js`, `client/test/growthWeatherModel.test.js` |
| 05 Minigame | `rewardService.js`, `useGameActions.js` | `client/src/features/minigame/*.js`, `test/minigameLoopV2.test.js`, `client/test/minigameLoopV2.test.js` |
| 06 Social | `socialService.js`, `socialRoutes.js` | `client/src/features/social/*.js`, `test/socialGardenV2.test.js`, `client/test/socialGardenV2.test.js` |

表內未列出的既有檔案一律不可修改。每條工作線新增自己的測試檔，不修改現有共用測試。

## 凍結契約

- `POST /api/action` request 維持 `{ username, action }`。
- Heartbeat 既有欄位與語意保持相容；只可增加 optional 欄位。
- 使用者存檔不可新增必填欄位。
- 純邏輯模組不得 import React、DOM、CSS、assets 或瀏覽器 layout API。
- 功能文案以 semantic key／descriptor 輸出，不直接修改翻譯檔。
- 新 API response 保留所有既有欄位，只增加 optional 欄位。

## 共同完成條件

- 不越過 plan 的檔案所有權。
- 不回退其他人的變更。
- 每個 public function／state transition／server boundary 有 deterministic 測試。
- 執行該工作線測試及完整 client 或 server 測試。
- 提交單一範圍 commit，不自行合併 main。
- 回報 commit SHA、修改檔案、測試、public contract、integration request 與已知限制。

完整可貼用 prompt 見 `prompts.md`。
