## 1. 轉換函式

- [x] 1.1 新增 `src/paste-table.js`：實作 TSV 解析（處理引號狀態機、`\r\n`、結尾換行）
- [x] 1.2 實作 `tsvToTable(text)`：判斷條件（≥2 列、每列欄數相同且 ≥2 欄），不符合時回傳 `null`；儲存格去前後空白、`|` 跳脫、換行轉 `<br>`
- [x] 1.3 新增 `src/paste-table.test.js`，涵蓋 paste-table spec 中每個轉換與判斷的情境，`node --test src/paste-table.test.js` 通過

## 2. 編輯區整合

- [x] 2.1 textarea 加上 `onPaste`：`text/html` 不含 `<table>`（不分大小寫）就不攔截；否則呼叫 `tsvToTable(text/plain)`，回傳 `null` 時不攔截
- [x] 2.2 依游標前文補空行、依游標後文決定結尾補 `\n` 或 `\n\n`，用 `execCommand('insertText')` 插入；回傳 `true` 才 `preventDefault`，否則讓瀏覽器照原樣貼上

## 3. 驗證與文件

- [x] 3.1 手動測試：從 Excel、Google Sheets 貼上表格；貼上後按 Ctrl+Z；用 Ctrl+Shift+V 貼上；貼 Tab 縮排的程式碼；貼一般文字
- [x] 3.2 `pnpm lint`、`node --test src/*.test.js` 通過
- [x] 3.3 README：「編輯與預覽」加上貼上表格與 Ctrl+Shift+V 貼原文
