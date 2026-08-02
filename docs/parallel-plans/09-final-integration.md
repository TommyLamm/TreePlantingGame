# Plan 09：最終整合、翻譯與無障礙驗證

## 執行時機

視覺 agent 完成 Plan 08 後，由主整合者執行。

## 工作

1. 審查視覺 branch 是否只消費 headless contracts，沒有私自改 reward／server 規則。
2. 合併視覺 branch，解決最後接線問題。
3. 完成所有語言的 translation keys，移除 hard-coded English。
4. Modal focus management：open focus、Escape、focus trap、return focus。
5. 所有主要操作可鍵盤完成，狀態更新使用適量 `aria-live`。
6. 驗證舊 heartbeat、舊存檔和沒有 optional fields 時仍可運作。
7. 檢查 feature CSS specificity、responsive、reduced motion 及 44px target。

## 完整驗證

- 完整 client tests。
- 完整 server tests。
- Client production build。
- `git diff --check`。
- 重跑 Plan 08 視覺矩陣並人工檢查 screenshots。
- E2E：登入 → onboarding → objective → event → reward → growth milestone。
- E2E：A 探訪 B → help → B heartbeat 看見結果。

## 交付

回報整合 commit、測試數量、build、視覺 QA、仍存在的限制，以及是否可以進入 Plan 10。
