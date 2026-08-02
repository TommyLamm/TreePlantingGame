# Plan 06：每日花園協助 Domain 與 API

## 目標

增加每日協助朋友花園的 server domain、route 與 client API。此 agent 不修改 GardenVisitModal、LeaderboardModal 或其他 UI。

## 所有權

可修改：

- `server/services/socialService.js`
- `server/routes/socialRoutes.js`
- 新增 `client/src/features/social/socialApi.js`
- 新增 `client/src/features/social/socialModel.js`
- 新增 `client/src/features/social/index.js`
- 新增 `test/socialGardenV2.test.js`
- 新增 `client/test/socialGardenV2.test.js`

不得修改任何 JSX、CSS、common api.js、server/app.js、server.js、repository 或 shared data。

## Must-have

1. 增加每日 garden help endpoint，沿用已掛載的 social router。
2. 每位 helper 每日最多一次，不可幫自己。
3. Reward 固定且 server-authoritative；client 不傳 reward 數字。
4. 所有新增存檔資料 optional、有容量／日期上限，舊存檔安全。
5. `getGarden` 只增加 optional help summary，保留既有欄位。
6. `socialApi.js` 呼叫 endpoint；`socialModel.js` normalize response、錯誤與狀態 descriptor。
7. 沿用既有 username validation，不加入自由文字留言。

## 驗收與交接

測試 self-help、duplicate、missing user、invalid balance、success、legacy data 及並行限制。回報 endpoint request／response、model exports、semantic keys、測試及 Plan 10 授權位置。
