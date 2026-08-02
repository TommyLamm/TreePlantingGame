# Plan 08：單一視覺 Agent 實作

## 執行時機與基準

只在 Plan 07 完成後執行。Branch 必須從 `codex/logic-integration` 的最終 commit 建立；此時不再有其他 agent 平行修改 client UI。

## 任務定位

你是本階段唯一的視覺實作者。把六組已測試的 headless 功能接入遊戲，維持現有「溫暖、自然、手繪童話森林」方向，並建立一個有辨識度的核心元素：樹木成長／年輪式里程碑，而不是通用 dashboard。

## 擁有權

可修改所有必要的 client presentation 檔案，包括：

- `client/src/App.jsx`
- `client/src/components/**/*.jsx`
- `client/src/index.css`
- `client/src/features/**/*.css`
- `client/src/utils/i18n.js`
- 必要的 client visual tests
- `client/public/assets/**`
- 視覺 QA scripts 與 `artifacts/visual-qa/**`

除非發現明確 contract bug，否則不得改 server domain、reward formula 或 headless state machine。需要改邏輯時先列出原因，交由主整合者決定。

## 先設計、後實作

1. 先檢查目前桌面、平板與手機畫面。
2. 提出一份短設計規格：4–6 個色彩 tokens、字體角色、desktop/mobile layout、唯一 signature element。
3. 自我審查是否只是通用卡片／dashboard；若是，先修訂設計方向。
4. 再開始寫 code，並在每個主要階段擷取 screenshot 比較。

## 必須呈現的功能

1. Onboarding overlay 與最多三個短期 objectives。
2. 三種事件互動 archetype，完整接到現有 `onAction(eventType)`。
3. Growth roadmap、下一里程碑及每五級微成長視覺。
4. 天氣效果的清楚說明。
5. Mini-game 結果顯示 server 回傳 coins、XP、bonus。
6. Garden visit 的每日協助狀態與操作。

## 視覺與體驗限制

- 中央樹仍是主焦點；新面板不可搶走場景主體。
- 不混用風格不一致的 emoji、icon 或素材。
- 手機主要操作至少 44×44px，不產生 document overflow。
- 事件 UI 不遮樹；和平時保持安靜。
- Motion 有明確用途，並支援 `prefers-reduced-motion`。
- 所有狀態有 loading、empty、success、error 呈現。
- 中文與英文均不截斷關鍵 CTA、數值或倒數。
- 鍵盤 focus 必須可見，但最終 focus trap／ARIA 審計由 Plan 09 再確認。

## 視覺 QA

至少驗證：

- 1440×900 日間和平／夜間事件。
- 768×1024 onboarding／事件。
- 375×812 objectives／事件／mini-game／garden visit。
- reduced motion。
- 所有主要 modal。

完成後回報 branch、commit SHA、設計規格、修改檔案、screenshots、視覺 QA report、client tests、build 與任何 logic integration request。
