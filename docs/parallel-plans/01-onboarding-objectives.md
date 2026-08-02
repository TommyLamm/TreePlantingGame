# Plan 01：Onboarding 與目標推導模型

## 目標

建立純 JavaScript 的新手流程與目標推導模型。此 agent 不建立任何 UI；只提供視覺 agent 可以直接消費的 state、progress 與 semantic descriptors。

## 所有權

只可新增：

- `client/src/features/objectives/objectiveDefinitions.js`
- `client/src/features/objectives/deriveObjectives.js`
- `client/src/features/objectives/onboardingState.js`
- `client/src/features/objectives/index.js`
- `client/test/onboardingObjectives.test.js`

不得修改任何 JSX、CSS、App、component、i18n、API、reducer 或 server 檔案。

## Must-have

1. `deriveObjectives(game)` 由既有 game state 推導最多三個目標。
2. 支援首次處理事件、Level 5、首次非預設外觀、首次裝備夥伴及 Level 50 prestige readiness。
3. 每個 objective descriptor 至少包含：`id`、`labelKey`、`descriptionKey`、`current`、`target`、`completed`、optional `navigationTarget`。
4. 建立 onboarding 純 reducer／transition function，支援 start、next、back、dismiss、complete、restore。
5. 模型不直接讀寫 `localStorage`；只接受輸入並回傳下一個 serializable state。
6. 缺少舊版 game 欄位、null inventory 或 malformed numeric value 時安全運作。
7. 所有結果 deterministic，不使用 Date、DOM 或隨機數。

## 驗收

- 同一輸入永遠回傳相同結果。
- 任何時候最多三個 active objectives。
- 完成目標不永久阻塞後續目標。
- Onboarding state 可 JSON serialize／restore。
- 專屬及完整 client tests 通過。

## 交接

回報 exports、descriptor 範例、semantic copy keys，以及視覺 agent 需要實作的畫面狀態；不要提供 CSS 或 layout 建議。
