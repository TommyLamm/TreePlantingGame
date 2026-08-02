# Plan 02：事件節奏、獎勵與天氣平衡

## 目標

改善普通模式長時間無事件的問題，並讓天氣倍率實際影響手動事件收益。此工作完全在 server 層，不涉及任何視覺呈現。

## 所有權

可修改：

- `server/services/progressionService.js`
- `server/services/gameStateService.js`
- `server/config/gameData.js`
- 新增 `server/config/eventBalance.js`
- 新增 `test/eventBalanceV2.test.js`

不得修改 routes、repository、shared data、client、JSX、CSS 或現有測試檔。

## Must-have

1. 把 event cadence、minimum interval、storm timeout 與 penalty 常數集中至 `eventBalance.js`。
2. 首次普通事件在 45–90 秒內出現。
3. 後續普通事件基準約 3 分鐘；prestige reduction 仍有效，最短 60 秒。
4. Demo／time-warp 600× 語意保持相容。
5. 天氣 XP／coin multiplier 套用到手動事件 reward，不重複套用其他 multiplier。
6. 暴風逾時仍扣 XP 並清 combo。
7. Response 只可增加 optional numeric timestamps，例如 `nextEventAt`／`eventExpiresAt`。
8. 所有時間與隨機行為保持 injected `now`／`random`。

## 驗收與交接

測試首次事件、steady-state、prestige、demo、weather reward、storm boundary 及非法 numeric state。回報最終常數、optional response 欄位、測試結果與 client 可消費的資料契約。
