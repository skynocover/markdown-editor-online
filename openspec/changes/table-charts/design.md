## Context

- `mermaid-diagrams` 完成後，`src/diagram.js` 的 `renderDiagram(source)` 能把 mermaid 原文同步轉成 SVG（含按需載入、錯誤顯示、安全限制）
- `parseMarkdown`：`marked.lexer` → `markTables`（只記頂層表格的 `start`）→ `markTasks` → `calcTables` → `marked.parser`。`previewRenderer.table` 在 `<table>` 加上 `data-start`
- 表格編輯：`readTable(markdown, start)` 讀出 `{ end, align, grid }`，`TableTools` 的操作改 `grid`，`editTable` 用 `replaceText(start, end, writeTable(...))` 寫回。`fixRefs` 在刪除、搬動欄列時修正公式裡的座標
- 公式編輯時，預覽裡點格子插入座標、拖曳插入範圍（`picking`、`onPreviewMouseDown`、`onPreviewMouseOver`）
- `evaluateTable(rows)` 只回傳公式格的「顯示字串」（加千分位、最多 2 位小數），非公式格是 `null`
- 實測 `marked`：`<!-- chart bar D2:D3 -->` 緊接表格（沒有空行）時，切成一個 `html` token 加一個 `table` token
- 實測 Pele `xychart-beta`：`bar "線上" [120, 180]` 這種有名字的系列會畫圖例；標籤裡有 `"` 會語法錯誤；數值不接受 `1e3` 這種寫法；`pie` 的負值會丟出 `semantic` 錯誤

## Goals / Non-Goals

**Goals:**
- 圖直接讀表格與公式結果，表格改了圖立刻跟著變
- 在別的 Markdown 編輯器裡打開，只看到表格，沒有多餘的東西
- 不需要記語法也能用：按鈕插入、拖曳選範圍
- 表格轉 mermaid 文字是純函式，可以單獨測試

**Non-Goals:**
- 欄列互換（以列為系列）、指定標籤欄、圖表標題、顏色、座標軸範圍
- 巢狀在引用、清單裡的表格（跟表格編輯一樣，只處理頂層）
- 簡報裡的表格（`slides-table-charts`）
- 一般模式只顯示圖、不顯示表格（`only`）：表格藏起來就點不到、叫不出表格工具，要另外設計「點圖顯示表格」；主要用途（簡報）由 `slides-table-charts` 的「簡報裡一律只顯示圖」處理。第二版再把 `only` 加進語法；v1 不認得的註解照一般註解處理，表格照常顯示

## Decisions

### 語法：表格正上方的 HTML 註解
`<!-- chart <type> <range> -->`，`type` 是 `bar` | `line` | `pie`，`range` 是 `B2:D3` 或單一座標 `D2`（刪欄列時範圍可能縮成一格），不分大小寫。整行要完全符合這個格式才算數；其他註解照常處理。
- 只認頂層 token 中「`html` token 符合格式，下一個 token 就是 `table`」的組合
- 替代方案：` ```chart ` 區塊。不採用：在 GitHub 會多一段看不懂的程式碼，而且要另外設計怎麼指定表格
- 替代方案：按鈕產生 mermaid 原文。不採用：只是快照，表格改了不會更新

### 取得完整精度的數值
`table-formula.js` 多匯出 `tableValues(rows, budget)`：回傳每格的值，可能是數字、`null`（空白）、字串（文字）或 `{ code }`（公式錯誤）。`evaluateTable` 改成用它，再格式化公式格。圖表用數值，不用加了千分位的顯示字串，避免精度被截斷，也不用再解析字串。公式預算 `budget` 跟 `calcTables` 共用。

### 表格轉 mermaid（`src/table-chart.js`）
- `parseChart(comment)` → `{ type, range }` 或 `null`
- `defaultRange(values)`：所有數字欄 × 所有資料列；如果最後一列有 `SUM`、`AVG`、`MIN`、`MAX`、`COUNT` 的公式，就不包含它。「數字欄」是資料列裡至少有一個數字、而且第一欄除外的欄
- `chartSource(values, spec)` → mermaid 原文，或丟出帶中文訊息的錯誤（`values` 第 1 列就是表頭，不另外傳）：
  - 範圍截到表格邊界；整個在表格外 → 「範圍超出表格」
  - 標籤：同一列第一欄的文字；系列名稱：表頭。都把 `"` 換成 `'`，換行換成空白
  - 範圍裡的文字、空白：bar / line 補 0 的話會誤導，所以**略過整個標籤**的條件是「那一列在範圍內都不是數字」，其他情況空白當 0（跟四則運算一樣）
  - 範圍裡有公式錯誤 → 「C3 是 #ERR」，不畫圖
  - 數值格式化成不用科學記號的十進位字串
  - `bar` / `line` → `xychart-beta`，每欄一個有名字的系列；`pie` → 只能一欄，多欄 → 「圓餅圖只能選一欄」
- 產生的原文交給 `renderDiagram`，錯誤、載入中、安全限制都沿用 `mermaid-diagrams`

### 接進預覽
`markTables` 之後，認出圖表註解並把 `{ spec, start }` 掛到下一個表格 token 上（`start` 是註解在原文的位置，給編輯用）。`calcTables` 時順便算圖表需要的數值。`previewRenderer.table` 在表格後面接上圖。圖外面的容器帶 `data-chart-start`，給選範圍時找到對應的表格。

### 「圖表 ▾」選單
放在 `TableTools` 下方「新增一列」那一條的右邊，從它切一段出來。
- 沒有圖：長條圖、折線圖、圓餅圖 → 在表格正上方插入註解，範圍用 `defaultRange`
- 有圖：換成另一種類型、選範圍、移除圖表
- 寫回原文：表格的寫回範圍從 `[表格 start, end)` 擴大成 `[註解 start, end)`，註解和表格一起改，一次 undo 就能還原

### 選範圍
沿用公式拖曳的 `picking` 機制（`cellPos`、`rangeRef`），但寫入的目標換成註解的範圍：
- 進入選範圍狀態時，用藍框標出目前範圍（CSS），上方顯示「拖曳選擇要畫的格子」
- 拖曳時藍框跟著動；**放開滑鼠就用一次 `replaceText` 寫回註解**，寫回原文本身就會重新 render，圖跟著更新
- 點欄號選那一欄的資料列（第 2 列到最後一列），Shift 加選到另一欄，一樣點了就寫回
- 取消就按 Ctrl+Z，每次寫回都是一步 undo；Esc 或點表格外面只是離開選範圍狀態
- 替代方案：拖曳時更新暫存範圍、即時預覽，Enter 才寫回、Esc 取消。不採用：暫存範圍要傳進用 `useMemo` 快取的 render 流程才能重畫圖，多一套 state；直接寫回原文加上 undo 就有一樣的效果

### 刪除、搬動欄列時修正範圍
`fixRefs` 現在只改 `grid` 裡 `=` 開頭的格子。把「修正一個座標字串」拆出來，`reorderRows`、`reorderCols` 時也拿去修正註解的範圍。範圍整個被刪掉 → 註解的範圍變成 `#REF`，預覽顯示錯誤，使用者可以重新選範圍。

## Risks / Trade-offs

- [註解和表格中間多了一個空行，圖就消失] → README 寫清楚；「圖表 ▾」插入的註解一定緊貼表格
- [預設範圍的「最後一列是加總」判斷猜錯] → 只是預設值，畫出來不對可以馬上選範圍
- [表格很大時每打一個字都重算圖] → 數值本來就在算公式時算過，轉 mermaid 很便宜；Pele 一張圖 1–7 ms
- [Pele 對 `xychart` 的限制（標籤字元、數值格式）不只實測到的這些] → `chartSource` 的測試直接拿產生的原文跑 Pele 的 `render`，確認不會語法錯誤

## Open Questions

- 第二版加 `only` 時，在可編輯的預覽裡怎麼回到表格（點圖暫時顯示表格？）
