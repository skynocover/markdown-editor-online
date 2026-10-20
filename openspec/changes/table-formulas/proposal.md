## Why

分帳、報價、預算這類表格，最後總要加總或算小計。現在只能開 Excel 或 Google Sheets 處理，分享時對方還得登入或下載檔案。如果 Markdown 表格裡能寫公式，一份文件就能用網址分享，這是試算表做不好、而我們本來就擅長的地方。

依賴 `spreadsheet-tables`（貼上表格）先上線：資料進得來，計算才有意義。等有真實的計算需求再開始做。

## What Changes

- Markdown 表格中以 `=` 開頭的儲存格，在預覽時顯示計算結果；原始 Markdown 不變
- 支援四則運算、括號、負號；A1 格式的儲存格參照（`B2`）與範圍（`B2:B5`），表頭是第 1 列
- 支援函數 `SUM`、`AVG`、`MIN`、`MAX`、`COUNT`；公式可以參照其他公式儲存格
- 被參照的儲存格可以帶千分位（`1,200`）或百分比（`5%` = 0.05）；計算結果一律加千分位顯示（`20,500`）
- 錯誤值：`#ERR`、`#REF`、`#CYCLE`；用 `\=` 開頭可以顯示字面上的 `=`
- 用自己寫的解析器計算，**不使用 `eval` 或 `Function`**
- 不做：跨表格參照、圖表、儲存格格式設定、貨幣符號辨識（`$30` 視為文字）、簡報（Marp）內的表格、滑鼠移上去顯示原始公式

## Capabilities

### New Capabilities
- `table-formulas`: Markdown 表格儲存格公式的語法、參照規則、支援的函數、錯誤值，以及預覽時如何顯示

### Modified Capabilities
（無）

## Impact

- 新增 `src/table-formula.js`（純函式）與 `src/table-formula.test.js`
- `src/markdown-editor.jsx`：`parseMarkdown` 從 `marked.parse` 改成先 lexer、計算表格、再 parser
- 字數會算進公式的計算結果（字數本來就是算預覽後看得到的文字）
- 原本就在表格裡寫 `=` 開頭文字的儲存格，會被當成公式計算，要改寫成 `\=` 才會照字面顯示
- 不新增套件；存檔格式、分享連結、zip 匯出完全不變
