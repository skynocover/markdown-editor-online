## Why

預算、報價、業績這類表格，資料已經貼進來、公式也算好了，下一步通常是「看成圖」。現在只能把數字再打一次寫成 mermaid，或回 Excel 做圖再截圖；表格一改，圖就過時。圖應該直接讀表格，表格改了圖跟著變。

依賴 `mermaid-diagrams`（Pele 引擎、按需載入、錯誤顯示）先完成：這個 change 只負責把表格轉成 mermaid 文字。

## What Changes

- 表格正上方（中間不能有空行）的 HTML 註解 `<!-- chart bar D2:D3 -->`，讓預覽在表格下方顯示圖；類型有 `bar`、`line`、`pie`，範圍跟公式一樣用 A1 座標
- 標籤取同一列的第一欄，系列名稱取表頭，數值用公式的計算結果（完整精度）；範圍跨多欄就是多系列，有圖例
- 表格編輯工具在「新增一列」右邊加「圖表 ▾」：插入長條／折線／圓餅圖（用預設範圍）、選範圍、移除圖表；已經有圖時可以換類型
- 「選範圍」：沿用公式拖曳選格子的操作，放開滑鼠就寫回註解、圖跟著更新，要取消就按 Ctrl+Z；點欄號選整欄，Shift 加選多欄
- 刪除、搬動欄列時，註解裡的範圍跟公式一樣自動修正
- 不做：欄列互換、指定標籤欄、圖表標題與顏色設定、簡報裡的表格圖表（`slides-table-charts`）、只顯示圖不顯示表格（`only`，第二版）

## Capabilities

### New Capabilities
- `table-charts`: 表格上方註解的語法、表格資料轉成圖的規則、錯誤顯示、「圖表 ▾」與選範圍的操作

### Modified Capabilities
- `preview-edit`: 「在預覽調整表格結構」的座標修正範圍，從表格內的公式擴大到表格上方的圖表註解

## Impact

- 新增 `src/table-chart.js`（註解解析、預設範圍、表格轉 mermaid 文字，純函式）與測試
- `src/table-formula.js`：多匯出一個取得完整精度數值的函式，給圖表用
- `src/markdown-editor.jsx`：`parseMarkdown` 在表格前認出圖表註解；表格編輯寫回原文時一併改註解；選範圍狀態
- `src/table-tools.jsx`：「圖表 ▾」按鈕與選單
- `src/preview-edit.js`：`fixRefs` 也套到註解的範圍
- 註解在 GitHub、Obsidian 看不見，那邊只看到表格；存檔格式、分享連結不變
