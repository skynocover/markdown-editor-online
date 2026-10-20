## Why

分帳、報價、預算、活動費用這類「小表格 + 說明文字」的需求很常見。在 Markdown 裡手打表格很麻煩，而資料通常本來就在試算表裡。

這個 change 讓表格「貼得進來」：從試算表貼上直接變成 Markdown 表格。一份文件就能用網址分享，對方不用登入，也能用密碼加密。表格公式另外放在 `table-formulas` change，等貼上表格上線、確認真的有計算的需求再做。

## What Changes

- 從 Excel、Google Sheets 等試算表複製（剪貼簿附有 HTML 表格，且至少 2 欄 2 列、每列欄數相同）後貼到編輯區時，自動轉成 GFM 表格，第一列當表頭；從程式碼編輯器貼上含 Tab 的程式碼不受影響
- 儲存格裡的 `|` 跳脫成 `\|`，儲存格內的換行轉成 `<br>`；能處理 Excel、Google Sheets 為含換行或引號的儲存格加上的 `"..."` 引號格式
- 貼上後按一次 Ctrl+Z（Cmd+Z）就能復原；用瀏覽器的「貼上為純文字」（Ctrl+Shift+V）照原樣貼上
- 不符合條件的貼上，行為完全不變

## Capabilities

### New Capabilities
- `paste-table`: 編輯區貼上試算表資料時轉換成 Markdown 表格，包含判斷條件、轉換規則、復原與貼原文的方式

### Modified Capabilities
（無）

## Impact

- 新增 `src/paste-table.js`（純函式）與 `src/paste-table.test.js`
- `src/markdown-editor.jsx`：textarea 加上 `onPaste`
- 不新增套件；存檔格式、分享連結、zip 匯出完全不變
