# Plan 10：公開版本身分與安全強化

## 執行時機

只在 Plan 09 完成後執行；不可與玩法或視覺工作平行。

## 目標

避免任何人僅輸入另一個 username 就操作其花園、coins、prestige、gift 或 social action，同時保留舊玩家資料遷移路徑。

## 工作

1. 先寫 threat model：冒充、重播、暴力請求、跨來源、存檔外洩、資源耗盡。
2. 決定身分模型：PIN／password、一次性登入連結或外部 identity provider。
3. 建立 server-issued session；受保護 route 從 session 取得 actor，不信任 body username。
4. 對 action、shake、gift、garden help、minigame reward 加入細分 rate limit。
5. CORS 改為 allowlist，加入安全 headers、body limits 與 token／cookie 策略。
6. 建立可回復的舊帳戶 claim／migration 流程。
7. 增加未登入、錯 actor、過期 session、重播、rate limit、雙裝置同步測試。

## 驗收

所有玩家資料修改均有 server-verified actor；A 無法代表 B 行動；舊帳戶有文件化遷移；完整 client／server／E2E／security tests 通過。
