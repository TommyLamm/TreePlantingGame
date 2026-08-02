# 可直接派發的 Agent Prompts

以下 prompt 都假設 agent 在自己的獨立 worktree 工作，並從相同基準 commit 開始。

## 共通文字 Agent Prompt 前綴

```text
你是純文字 coding agent，不需要也不應執行任何視覺設計工作。你不是唯一在此 repo 工作的 agent；其他 agent 正在平行修改不同模組。不要回退其他人的變更。

工作目錄：F:\Desktop\TreePlantingGame

開始前完整閱讀總規格：
F:\Desktop\TreePlantingGame\docs\parallel-plans\README.md

若 repo 存在 .codegraph，理解或定位程式碼時先使用 CodeGraph。

嚴格遵守指定 plan 的檔案所有權。不得修改任何 JSX、CSS、assets、component、i18n 或視覺 QA 檔案。功能需要 UI 時，只輸出可測試的資料契約與 semantic descriptors，交給後續視覺 agent。

完成後執行專屬與完整相關測試，建立單一範圍 commit，不要合併 main。最終回報 branch、commit SHA、修改檔案、測試結果、public contracts、semantic keys、integration requests 及已知限制。
```
## Agent 1

```text
套用共通文字 Agent Prompt。
你負責 Plan 01，branch：codex/onboarding-objectives。
完整閱讀：F:\Desktop\TreePlantingGame\docs\parallel-plans\01-onboarding-objectives.md
只實作 onboarding／objective 的純 JavaScript model、state transitions、descriptors 與測試。不要建立任何 React component 或畫面。
```

## Agent 2

```text
套用共通文字 Agent Prompt。
你負責 Plan 02，branch：codex/event-balance-server。
完整閱讀：F:\Desktop\TreePlantingGame\docs\parallel-plans\02-event-balance-server.md
只實作 server 事件 cadence、reward、weather multiplier、optional timing fields 與 deterministic tests。不要修改 client 或 route shape。
```

## Agent 3

```text
套用共通文字 Agent Prompt。
你負責 Plan 03，branch：codex/event-interaction-engine。
完整閱讀：F:\Desktop\TreePlantingGame\docs\parallel-plans\03-event-interaction-engine.md
只建立純 JavaScript event interaction state machine、selectors、definitions 與測試。不要建立按鈕、JSX、CSS 或動畫。
```

## Agent 4

```text
套用共通文字 Agent Prompt。
你負責 Plan 04，branch：codex/growth-weather-model。
完整閱讀：F:\Desktop\TreePlantingGame\docs\parallel-plans\04-growth-weather-model.md
只建立 growth milestone、micro-growth descriptors、weather presentation model 與測試。不要修改 TreeVisual、WeatherDisplay、素材或 CSS。
```

## Agent 5

```text
套用共通文字 Agent Prompt。
你負責 Plan 05，branch：codex/minigame-main-loop。
完整閱讀：F:\Desktop\TreePlantingGame\docs\parallel-plans\05-minigame-main-loop.md
只實作 server minigame reward、client hook 資料流、result model 與測試。不要修改 MiniGameModal 或其他 JSX。
```

## Agent 6

```text
套用共通文字 Agent Prompt。
你負責 Plan 06，branch：codex/social-garden。
完整閱讀：F:\Desktop\TreePlantingGame\docs\parallel-plans\06-social-garden.md
只實作 garden help service、route、social API/model 與測試。不要修改 GardenVisitModal、LeaderboardModal 或其他 JSX。
```

## 邏輯整合 Prompt

```text
六個純邏輯 branch 已完成。請擔任邏輯整合者，完整閱讀 README.md 與 07-logic-integration.md，審查六個交接報告並按指定順序合併。

此階段不得修改 JSX、CSS、assets 或進行視覺設計。只處理 API、state、exports、descriptor 與測試契約。完成後建立 codex/logic-integration commit，回報 baseline SHA、完整測試，以及交給視覺 agent 的 contracts／semantic keys／狀態清單。
```

## 視覺 Agent Prompt

```text
你是 TreePlantingGame 本階段唯一的視覺 agent。請從 codex/logic-integration 的最終 commit 建立 codex/visual-implementation branch。

完整閱讀：
F:\Desktop\TreePlantingGame\docs\parallel-plans\README.md
F:\Desktop\TreePlantingGame\docs\parallel-plans\08-visual-implementation.md
以及邏輯整合者提供的 contracts、semantic keys 和狀態清單。

先檢查現有桌面、平板、手機畫面，提交簡短設計規格並自我審查，再實作所有 UI 接線、JSX、CSS、assets、responsive、motion、translation 呈現及視覺 QA。

維持溫暖、自然、手繪童話森林方向；中央樹是主焦點，年輪／成長里程碑是 signature element。不要把畫面做成通用 dashboard。

除非發現明確 contract bug，否則不要改 server reward、domain 或 headless state machine。完成後 commit，回報設計規格、SHA、screenshots、視覺 QA、tests、build 與 integration requests。不要合併 main。
```

## 最終整合 Prompt

```text
邏輯 baseline 與視覺 branch 均已完成。請擔任唯一最終整合者，完整閱讀 README.md 與 09-final-integration.md，審查並合併 codex/visual-implementation。

確認視覺層只消費既定 headless contracts，完成翻譯、keyboard、focus management、ARIA、舊存檔相容與 CSS 衝突收尾。執行完整 client/server tests、production build、git diff --check、E2E 與桌面／平板／手機視覺 QA。

最終回報整合 commit、測試數量、build、visual artifacts、剩餘限制，以及是否可進入 Plan 10。
```
