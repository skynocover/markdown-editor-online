## Context

- 簡報走 Marp（markdown-it），不經過 `parseMarkdown`，所以 `calcTables` 和 `table-charts` 的處理都沒有作用
- 實測 `@marp-team/marp-core`：表格正上方的 `<!-- chart bar B2:C4 -->` 會變成一個 `marpit_comment` token，`content` 是 `chart bar B2:C4`，`marpitParsedDirectives` 是空的（不會被當成 Marp 指令），下一個 token 是 `table_open`；輸出的 HTML 裡沒有這個註解，表格正常
- markdown-it 的表格 token 是扁平的：`table_open` → `thead_open` → `tr_open` → `th_open` → `inline`（`content` 是格子的原始 Markdown）→ … → `table_close`
- `mermaid-diagrams` 已經讓簡報裡的 ` ```mermaid ` 經過 `renderDiagram` 顯示，並處理投影片內的縮放與顏色
- `table-charts` 提供 `tableValues`、`evaluateTable`、`parseChart`、`chartSource`

## Goals / Non-Goals

**Goals:**
- 簡報裡的表格公式和一般模式算出一樣的結果
- 一般模式寫好的「表格 + 圖表註解」，加上 `marp: true` 就能直接變成投影片上的圖
- 計算和轉換邏輯全部重用，只新寫 markdown-it 這一層

**Non-Goals:**
- 簡報預覽裡的表格編輯、「圖表 ▾」、選範圍
- 跨頁參照（表格在一頁、圖在另一頁）
- 簡報裡同時顯示表格和圖

## Decisions

### 掛一條 markdown-it core rule
`loadMarp` 建好 Marp 後，用 `marp.markdown.core.ruler.push` 加一條規則，在 block 解析完、渲染前處理 token：
1. 掃出每一組 `table_open` … `table_close`，從 `inline` token 的 `content` 組出 `rows: string[][]`（表頭是第 1 列）
2. `tableValues` / `evaluateTable` 計算，把公式格的 `inline` token 換成結果文字（`content` 和 `children` 一起換）
3. 前一個 token 是 `marpit_comment` 而且 `parseChart` 認得 → 把整組表格 token 換成一個 `fence` token（`info` 是 `mermaid`，`content` 是 `chartSource(values, spec)` 的原文），交給 `mermaid-diagrams` 包好的 fence 規則畫圖；`chartSource` 丟出錯誤時換成自訂的 `table_chart_error` token，加一條 renderer rule 輸出跳脫過的錯誤訊息
- 公式預算 `budget` 整份簡報共用一個，跟一般模式一樣
- 替代方案：換成 `html_block`，內容是 `renderDiagram(...)` 的 SVG。不採用：實測 Marp 的 HTML 白名單會把 `html_block` 裡的 `<svg>`、`<rect>` 跳脫成文字；換成 `fence` 則是沿用 mermaid 的渲染、載入中、錯誤顯示，不用另外處理
- 替代方案：渲染成 HTML 之後再用 DOM 處理表格。不採用：原始的 `\=`、行內程式碼資訊已經不見了，而且一般模式也是在 token 層處理
- 替代方案：簡報先用 `marked` 處理表格再交給 Marp。不採用：Marp 有自己的 Markdown 方言（指令、背景圖語法），兩個解析器切出來的區塊不一定一致

### 簡報裡一律只顯示圖
投影片空間有限，表格加圖通常放不下。有圖表註解的表格在簡報裡只顯示圖。這樣同一份文件在一般模式是「表格 + 圖」，切成簡報後自動變成「只有圖」，不用改註解。想讓觀眾看到數字，就在另一頁放一份沒有註解的表格。

### 跟一般模式共用的程式
markdown-it token 轉成 `rows` 的部分放在新的 `src/slides-table.js`（純函式，可以用 Marp 實例跑測試）。`table-formula.js`、`table-chart.js`、`diagram.js` 都不改。

## Risks / Trade-offs

- [Marp 升版後註解的 token 型別或名稱改變] → 測試直接用真的 Marp 實例解析含註解的簡報，升版時會失敗
- [markdown-it 和 marked 對表格的切法不同（例如格子裡的 `|` 跳脫），算出來不一樣] → 測試用同一份表格分別跑一般模式和簡報，比對結果
- [原本在簡報表格裡寫 `=` 開頭文字的人，內容會變成計算結果或 `#ERR`] → README 說明用 `\=`；跟一般模式導入公式時的處理一樣
- [`mermaid-diagrams` 的 fence 規則之後改成不看 `info`，或改用其他方式接進 Marp] → 測試直接檢查簡報裡的圖表輸出 SVG，fence 規則改了會失敗
