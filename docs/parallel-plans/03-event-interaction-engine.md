# Plan 03：事件互動 State Machine

## 目標

建立六種事件微互動的純邏輯 state machine。此 agent 不建立按鈕、畫面、動畫或 CSS；視覺 agent 稍後將 state machine 接到 UI。

## 所有權

只可新增：

- `client/src/features/events/eventDefinitions.js`
- `client/src/features/events/eventInteractionEngine.js`
- `client/src/features/events/eventInteractionSelectors.js`
- `client/src/features/events/index.js`
- `client/test/eventInteractionEngine.test.js`

不得修改任何 JSX、CSS、component、hook、API、reducer 或 server 檔案。

## Must-have

1. 六種事件映射到至少三種 archetype：hold、sequence、timing。
2. 提供建立、更新、完成、失敗、取消及 reset interaction state 的純函式。
3. 所有 state 必須 serializable，並由 caller 傳入 timestamp／elapsed time；模組不可自行讀 `Date.now()`。
4. Selector 回傳 renderer 所需的 semantic data：progress、step、status、instructionKey、canSubmit、completedAction。
5. 同一 interaction 最多產生一次 completion；重複 input 不得產生第二次 action。
6. Event type 改變時可安全 reset。
7. 提供 reduced-motion-friendly 的 deterministic mode flag，但不描述畫面怎樣呈現。

## 凍結輸出

成功輸出必須包含原本 event type，讓視覺層只需呼叫一次既有 `onAction(eventType)`；不新增 server proof／score 契約。

## 驗收與交接

每個 archetype 測試成功、失敗、取消、reset、disabled、double completion。回報 public API、完整 state transition 表、semantic keys 與測試結果；不提供視覺規格。
