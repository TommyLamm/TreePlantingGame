# Plan 05：小遊戲 Reward 與主線資料流

## 目標

讓小遊戲除 coins 外，也能提供受控 XP／bonus，並讓 client hook 正確傳遞 server 結果。此 agent 不修改 MiniGameModal 或其他畫面。

## 所有權

可修改：

- `server/services/rewardService.js`
- `client/src/hooks/useGameActions.js`
- 新增 `client/src/features/minigame/rewardModel.js`
- 新增 `client/src/features/minigame/index.js`
- 新增 `test/minigameLoopV2.test.js`
- 新增 `client/test/minigameLoopV2.test.js`

不得修改 MiniGameModal、GameModals、JSX、CSS、routes、api.js、reducer、repository 或 shared data。

## Must-have

1. 保留每天最多三場及 coins 上限 200。
2. Server 計算 score-based XP，上限 20。
3. Response 保留 `coinsEarned`、`gamesRemaining`，可增加 optional `xpEarned`、`bonus`。
4. 至少一款遊戲達標時沿用現有欄位提供短暫主線 bonus，不新增必填 schema。
5. `useGameActions` 將完整 server reward result 傳回 caller，並防止錯誤被當作成功。
6. `rewardModel.js` 只負責 normalize／describe server result，不在 client 重算權威 reward。
7. 防止負分、NaN、Infinity、重複提交及每日超限。

## 驗收與交接

測試兩種遊戲、score bounds、caps、bonus threshold、daily limit、error propagation。回報 response contract、hook contract、semantic result keys、測試與視覺 agent 顯示時需要的資料。
