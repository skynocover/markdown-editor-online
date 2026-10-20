# paste-table Specification

## Purpose
TBD - created by archiving change spreadsheet-tables. Update Purpose after archive.
## Requirements
### Requirement: 貼上試算表資料時轉成 Markdown 表格
在編輯區貼上時，剪貼簿的 `text/html` 含有 `<table>`（不分大小寫），且 `text/plain` 以 TSV 解析後至少有 2 列、每列欄數相同且至少 2 欄時，系統 SHALL 以 GFM 表格取代原文插入：第一列為表頭，接著一行分隔列 `| --- |`，其餘為資料列。

#### Scenario: 從試算表貼上 2×2 資料
- **WHEN** 使用者從試算表複製後貼上，剪貼簿的 `text/html` 含 `<table>`，`text/plain` 是 `名稱\t價格\n蘋果\t30`
- **THEN** 插入 `| 名稱 | 價格 |\n| --- | --- |\n| 蘋果 | 30 |`

#### Scenario: 結尾多一個換行
- **WHEN** 貼上的內容以 `\n` 或 `\r\n` 結尾（Excel 複製時的格式）
- **THEN** 結尾的換行不會產生空白資料列

#### Scenario: 空白儲存格
- **WHEN** `text/plain` 是 `a\t\tc\n\t\t`（有空白格與整列空白，但每列都是 3 欄）
- **THEN** 轉成表格，空白格保持空白

### Requirement: 不符合條件的貼上維持原本行為
剪貼簿的 `text/html` 不含 `<table>`，或 `text/plain` 解析後只有 1 列、只有 1 欄、或各列欄數不同時，系統 SHALL 照原樣貼上，不做任何轉換。

#### Scenario: 從網頁複製段落加表格
- **WHEN** 剪貼簿的 `text/html` 含 `<table>`，`text/plain` 是 `前言\n名稱\t價格\n蘋果\t30\n結語`（各列欄數不同）
- **THEN** 原樣插入，不轉成表格

#### Scenario: 貼上 Tab 縮排的程式碼
- **WHEN** 使用者從程式碼編輯器複製多行以 Tab 縮排的程式碼（剪貼簿沒有 HTML 表格）後貼上
- **THEN** 原樣插入，不轉成表格

#### Scenario: 純文字來源的 TSV
- **WHEN** 剪貼簿只有 `text/plain` 的 `a\tb\nc\td`，沒有 `text/html`
- **THEN** 原樣插入

#### Scenario: 貼上一般文字
- **WHEN** 使用者貼上不含 Tab 的文字
- **THEN** 原樣插入

#### Scenario: 只複製單一列
- **WHEN** 使用者從試算表貼上 `a\tb\tc`（只有一列）
- **THEN** 原樣插入

#### Scenario: 只複製單一欄
- **WHEN** 使用者從試算表貼上 `a\nb\nc`
- **THEN** 原樣插入

### Requirement: 儲存格內容正確轉換
系統 SHALL 依照 Excel 和 Google Sheets 的 TSV 引號規則解析儲存格，並把內容轉成在 GFM 表格裡顯示正確的文字。

#### Scenario: 儲存格含直線符號
- **WHEN** 儲存格內容是 `a|b`
- **THEN** 表格中寫成 `a\|b`，預覽顯示為 `a|b`

#### Scenario: 儲存格內有換行
- **WHEN** 儲存格是 `"第一行\n第二行"`（用引號包住、內含換行）
- **THEN** 表格中寫成 `第一行<br>第二行`，整份資料的列數不會因此增加

#### Scenario: 引號內的雙引號
- **WHEN** 儲存格是 `"他說""好"""`
- **THEN** 內容是 `他說"好"`

#### Scenario: 不在開頭的引號照字面處理
- **WHEN** 儲存格是 `5"`
- **THEN** 內容是 `5"`，不會進入引號模式

#### Scenario: 前後空白
- **WHEN** 儲存格是 `  蘋果  `
- **THEN** 內容是 `蘋果`

### Requirement: 貼上表格可以一次復原
轉換後插入的表格 SHALL 寫進瀏覽器原生的復原紀錄，按一次 Ctrl+Z（Cmd+Z）就回到貼上前的內容，並且 SHALL 同步更新檔案內容與預覽。

#### Scenario: 貼上後復原
- **WHEN** 使用者貼上試算表資料，接著按 Ctrl+Z
- **THEN** 編輯區回到貼上前的內容，預覽和儲存的檔案也跟著回到原狀

### Requirement: 表格與前後文字分開
系統 SHALL 確保插入的表格前面有空行（游標前一行不是空行或游標在行中間時補上），後面以換行結尾；游標後面同一行還有文字時，表格後面 SHALL 再空一行。

#### Scenario: 在段落文字後面貼上
- **WHEN** 游標位在一行文字的結尾，使用者貼上試算表資料
- **THEN** 表格前面先換行並空一行，預覽中段落和表格分開顯示

#### Scenario: 在空行貼上
- **WHEN** 游標位在空行的開頭，且前一行也是空行或位在檔案開頭
- **THEN** 前面不額外補空行

#### Scenario: 在一行文字中間貼上
- **WHEN** 游標位在一行文字的中間，使用者貼上試算表資料
- **THEN** 表格前後都有空行，游標後面的文字在預覽中是獨立的段落，不會變成表格的最後一列

### Requirement: 貼上為純文字時不轉換
使用者用瀏覽器的「貼上為純文字」（Chrome、Edge、Firefox 為 Ctrl/Cmd+Shift+V）貼上試算表資料時，系統 SHALL 照原樣貼上 TSV 文字，不轉換成表格。

#### Scenario: 用 Ctrl+Shift+V 貼上試算表資料
- **WHEN** 使用者從試算表複製 2×2 資料，在 Chrome 按 Ctrl+Shift+V 貼上
- **THEN** 原樣插入 TSV 文字

