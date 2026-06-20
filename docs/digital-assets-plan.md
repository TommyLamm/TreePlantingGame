# 數字資產生成與 SVG 替換計畫

更新日期：2026-06-20

## 目標

生成完整的本地 PNG 數字資產，並替換 React/Vite 遊戲畫面中的 SVG 圖形來源。追蹤範圍以目前由 `server.js` 服務的 `client/dist` React app 為主；根目錄 `public/index.html` 是 legacy 單檔頁面，另列為後續清理項。

## 已完成

- [x] Planner：檢視 repo 內目前 SVG 與 asset 入口。
- [x] Planner：建立本地計畫文件 `docs/digital-assets-plan.md`。
- [x] Asset producer：新增可重跑腳本 `scripts/generate-digital-assets.mjs`。
- [x] Asset producer：生成 70 個 PNG 資產到 `client/public/assets/`。
- [x] Asset producer：建立 `client/public/assets/asset-manifest.json`。
- [x] 背景：生成 `client/public/assets/environments/day-forest.png`。
- [x] 背景：生成 `client/public/assets/environments/night-garden.png`。
- [x] 樹木：生成 `default`、`cherry`、`autumn`、`snow`、`golden` 五套 skin，每套 `stage-1` 到 `stage-7`。
- [x] Companion：生成 `butterfly`、`squirrel`、`bird`、`owl`、`deer`、`phoenix` 透明 PNG。
- [x] Decor：生成 `ground-patch.png`，並重建 `person.png`、`house.png`。
- [x] UI icon：生成 `Icons.jsx` 所需的 PNG icon，包括 close icon。
- [x] `EnvironmentBackdrop.jsx`：背景引用由 `.svg` 改為 `.png`。
- [x] `TreeVisual.jsx`：原程式化 inline SVG 樹改為 raster tree scene。
- [x] `CompanionSprite.jsx`：inline SVG companion 改為 PNG sprite。
- [x] `Icons.jsx`：inline SVG icon 改為 PNG asset wrapper，保留原 export 名稱。
- [x] `CollectionModal.jsx`：close inline SVG 改為 PNG `X` icon。
- [x] `StoreModal.jsx`、`ProfileModal.jsx`、`LeaderboardModal.jsx`：SVG data URI texture 改為 CSS pattern。
- [x] 刪除不再引用的 `client/public/assets/environments/day-forest.svg`。
- [x] 刪除不再引用的 `client/public/assets/environments/night-garden.svg`。
- [x] 掃描 `client/src`，確認沒有 `<svg`、`.svg`、`data:image/svg`、SVG primitive 標記殘留。

## 生成資產索引

- [x] `client/public/assets/environments/*.png`
- [x] `client/public/assets/trees/*.png`
- [x] `client/public/assets/companions/*.png`
- [x] `client/public/assets/decor/*.png`
- [x] `client/public/assets/icons/*.png`
- [x] `client/public/assets/asset-manifest.json`

## 驗證結果

- [x] `cd client && npm run build` 成功。
- [x] `rg -n "<svg|data:image/svg|\.svg" client/src client/public` 無結果。
- [x] Vite build 已複製 PNG assets 到 `client/dist/assets/`。
- [x] 最終掃描 `rg -n "\.svg|<svg|data:image/svg" client public` 只剩根目錄 legacy `public/index.html`。
- [ ] 瀏覽器 console 沒有 missing asset 404。
- [ ] 主畫面日間/夜間背景正確載入 PNG asset。
- [ ] `weather`: sunny、cloudy、rainy、stormy、snowy 都有可見且不遮 UI 的視覺效果。
- [ ] `season`: spring、summer、autumn、winter 都有對應 raster 或 CSS fallback。
- [ ] companion: butterfly、squirrel、bird、owl、deer、phoenix 都正常顯示。
- [ ] 手機寬度與桌面寬度下，背景、樹、操作按鈕、modal 不重疊。

## 後續範圍

- [ ] 根目錄 `public/index.html` 仍含 legacy inline SVG。若這個舊頁面仍是產品入口，需要另開任務同步替換；目前 server 入口使用 `client/dist`。
- [ ] 若需要更精細的高解析度美術，可用現有生成腳本作為 placeholder 管線，再替換 PNG 檔本身。
- [ ] 若要支援 sprite atlas 或 WebP 壓縮，可在 `scripts/generate-digital-assets.mjs` 後續擴充輸出格式。

## 風險與決策

- 原本 `TreeVisual.jsx` 的 SVG 可連續反映 level 幾何成長；現在改成 7 階段 PNG，保留成長階段但不再逐級改變樹形。
- PNG icon 不再依 Tailwind `text-*` 顏色動態變色；目前以資產自身顏色呈現。
- `client/src` 已按「畫面上所有 SVG 圖」的字面需求替換；legacy `public/index.html` 尚未處理，因為它不是目前 Express production 入口。
