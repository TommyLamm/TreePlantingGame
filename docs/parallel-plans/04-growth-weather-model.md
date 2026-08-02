# Plan 04：成長里程碑與天氣資料模型

## 目標

抽出成長階段、下一里程碑、微成長 descriptor 及天氣效果資料。此 agent 不修改 TreeVisual、WeatherDisplay 或任何素材。

## 所有權

只可新增：

- `client/src/features/growth/growthModel.js`
- `client/src/features/growth/weatherPresentation.js`
- `client/src/features/growth/index.js`
- `client/test/growthWeatherModel.test.js`

不得修改 JSX、CSS、assets、constants、shared data、component 或 server。

## Must-have

1. 保持主要 stage 門檻 1、5、12、26、46、66、86。
2. 提供 `getGrowthStage(level)`、`getNextMilestone(level)`、`getGrowthPresentation(level, context)`。
3. 每五級產生 deterministic 微成長 descriptor，例如 `groundGrowthTier`、`flowerTier`、`fruitTier`、`wildlifeTier`；descriptor 只描述語意與 tier，不包含 CSS class、顏色、座標或素材路徑。
4. `getWeatherPresentation(weather)` 回傳 name／effect keys 及 XP／coin multiplier 數值。
5. 天氣數值必須與當前 server modifiers 一致；若 Plan 02 改動數值，邏輯整合者負責對齊。
6. 所有函式對 NaN、Infinity、string level、未知 weather 安全。

## 驗收與交接

測試所有 stage 邊界、Level 1／100、每五級 descriptor、未知 weather 與 numeric normalization。回報 exports、descriptor 範例、semantic keys 與測試結果；不要提出配色、素材或 layout。
