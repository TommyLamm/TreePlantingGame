# Plan 07：純邏輯整合檢查點

## 執行時機

六個 Wave 1 branch 完成後，由主整合者單獨執行。視覺 agent 尚未開始。

## 目標

把六條邏輯工作合併成一個穩定 baseline，處理跨模組 API／state 契約，但不建立或修改任何視覺呈現。

## 合併順序

1. Plan 02 event server。
2. Plan 05 minigame reward。
3. Plan 06 social garden。
4. Plan 01 onboarding model。
5. Plan 03 event interaction engine。
6. Plan 04 growth/weather model。

每次 merge 後立即跑該工作線測試。

## 可做的接線

- 對齊 optional server response 欄位。
- 更新純 JS API adapter、reducer 或 server composition，前提是邏輯測試需要。
- 統一天氣 multiplier single source of truth。
- 解決 export name、descriptor shape 或 hook return contract 衝突。
- 新增 integration contract tests。

## 禁止事項

- 不修改 JSX、CSS、assets、layout 或 animation。
- 不在此階段把新功能接到可見 UI。
- 不執行主觀視覺調整。

## 完成條件

- 完整 client／server 邏輯測試通過。
- 所有 headless module 有文件化 public contract。
- 建立 `codex/logic-integration` commit。
- 交給視覺 agent：baseline SHA、exports、props／event contracts、translation keys、必須呈現的狀態清單。
