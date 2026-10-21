## Why

拿數字去報告（月報、提案、季度回顧）是圖表最有價值的場景：數字改了，投影片上的圖要跟著變，不用再從 Excel 截圖。但現在簡報裡的表格連公式都不算（README 寫明「簡報裡的表格不會計算」），`table-charts` 的圖表註解也只在一般模式有效。

依賴 `mermaid-diagrams`（簡報裡的圖表渲染）和 `table-charts`（`tableValues`、`parseChart`、`chartSource`）先完成。

## What Changes

- 簡報（`marp: true`）裡的表格也計算公式，規則跟一般模式完全一樣
- 簡報裡表格正上方的 `<!-- chart bar B2:C4 -->` 也會畫圖；投影片空間有限，簡報裡**一律只顯示圖**，不顯示表格
- 圖等比例縮到投影片放得下；深色頁（`invert`）裡圖的文字和線條跟著變淺色（沿用 `mermaid-diagrams`）
- 不做：簡報裡的表格編輯工具和「圖表 ▾」按鈕（簡報預覽本來就不能點表格編輯，註解要自己寫，或在一般模式先做好再加 `marp: true`）、跨頁參照表格

## Capabilities

### New Capabilities
- `slides-tables`: 簡報裡表格公式的計算、圖表註解的顯示方式

### Modified Capabilities
（無）

## Impact

- `src/slides.js`：`loadMarp` 建好 Marp 後加一條 markdown-it core rule，找出表格、計算公式、處理圖表註解
- `src/slides.test.js`：用真的 Marp 實例測公式、圖表、註解不進講者備註
- README：移除「簡報裡的表格不會計算」，補上簡報裡的圖表說明
- 原本就在簡報表格裡寫 `=` 開頭文字的儲存格會開始被計算，要改成 `\=`
- 存檔格式、分享連結不變
