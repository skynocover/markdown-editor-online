## 1. markdown-it 表格處理

- [x] 1.1 `src/slides.js`：core rule 從 markdown-it token 找出表格，組出 `rows: string[][]`，公式格的 `inline` token 換成結果文字；整份簡報共用一個 `budget`，計算丟出例外時該表格照原文顯示
- [x] 1.2 圖表：前一個 token 是 `marpit_comment`、`parseChart` 認得、行號相接 → 註解和整組表格 token 換成 `info` 為 `mermaid` 的 `fence` token（內容是 `chartSource(values, spec)`）；`chartSource` 丟錯誤時換成 `table_chart_error` token，加 renderer rule 輸出跳脫過的錯誤訊息
- [x] 1.3 規則放在 `marpit_collect` 之前：圖表註解不出現在 `comments`
- [x] 1.4 `src/slides.test.js`：用真的 Marp 實例解析；公式結果跟一般模式一致、`\=` 跳脫、圖表只顯示圖而且輸出是 `<svg>`、隔空行不畫圖、圖表錯誤顯示訊息、註解不在 `comments`、不影響 `<!-- _class: invert -->`

## 2. 接進簡報

- [x] 2.1 `loadMarp`：建好 Marp 後掛上規則
- [x] 2.2 確認圖通過簡報的 DOMPurify 設定，縮放和 `invert` 頁的顏色正確（沿用 `mermaid-diagrams` 的 CSS）

## 3. 驗證與文件

- [x] 3.1 手動測試：一般文件做好表格加圖表 → 加 `marp: true` → 預覽與播放都只有圖；改數字圖跟著變；`invert` 頁
- [x] 3.2 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 通過
- [x] 3.3 README：刪掉「簡報裡的表格不會計算」「簡報裡的表格還不支援圖表」，補上簡報裡的公式與圖表（只顯示圖、沒有表格工具要自己寫註解）
