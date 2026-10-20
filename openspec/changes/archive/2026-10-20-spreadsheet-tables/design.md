## Context

編輯區是一般的 `<textarea>`（受控元件，`value={currentContent}`、`onChange` → `updateFileContent`），目前沒有任何編輯輔助功能。從 Excel 或 Google Sheets 複製時，剪貼簿同時有 `text/html`（一個 `<table>`）和 `text/plain`。`text/plain` 是 TSV：欄位用 `\t` 分隔、列用 `\n`（Excel 用 `\r\n`）分隔。含換行、Tab 或 `"` 的儲存格會用 `"..."` 包起來，裡面的 `"` 寫成 `""`。

## Goals / Non-Goals

**Goals:**
- 從 Excel 或 Google Sheets 貼上表格，一步得到正確的 GFM 表格
- 不影響一般文字的貼上
- 原生的復原（Ctrl+Z）照常可用

**Non-Goals:**
- 不解析 `text/html` 的內容（合併儲存格、粗體等格式）：只看裡面有沒有 `<table>`，資料仍從 TSV 讀
- 不轉換純文字來源的 TSV（例如從 VS Code 複製）：見「判斷條件」
- 不判斷游標是否在程式碼區塊裡：真的要貼原文時用 Ctrl+Shift+V
- 不做「Markdown 表格複製回 Excel」，也不做 Tab 自動對齊欄位
- 不偵測欄位對齊方式（數字靠右等），一律用 `---`
- 表格公式：另見 `table-formulas` change

## Decisions

### 轉換邏輯放在獨立的純函式模組
`src/paste-table.js` 匯出 `tsvToTable(text) → string | null`，不符合條件時回傳 `null`。跟 `file-name.js`、`slides.js` 一樣用 `node --test` 測試，元件只負責接事件。

### 判斷條件：`text/html` 含 `<table>`，且 TSV 解析後至少 2 列 × 2 欄、每列欄數相同
- 只看 `text/plain` 會誤判：從編輯器複製用 Tab 縮排的程式碼（Go、Makefile），每行切開是 `["", "程式碼"]`，剛好符合 2 欄 2 列。試算表複製時都會附上 HTML 表格，程式碼編輯器不會，所以用它來判斷來源
- `<table` 的檢查（不分大小寫）放在元件裡，只有一行；`tsvToTable(text)` 仍然只吃純文字，維持純函式、好測試
- 代價：從純文字編輯器複製的 TSV 不會轉換，這種情況很少見
- 先去掉結尾的換行（Excel 複製時會多一個）
- 各列欄數必須相同，否則不轉換：試算表複製的是矩形範圍，空白格也會留下 Tab，所以本來就整齊。從網頁選取「段落 + 表格 + 段落」時，HTML 也含 `<table>`，但段落那幾列只有 1 欄；如果用「最多欄數 ≥ 2」再補齊，整段文字都會被塞進表格

### 用一個小狀態機解析 TSV 引號
逐字元讀取，分成「在引號內」和「在引號外」兩種狀態。只有儲存格一開頭就是 `"` 才算引號模式（Excel 的規則），所以 `5"` 這種吋的寫法不會被誤判。不用 `split('\t')`，因為儲存格內的換行會把列切錯。

### 儲存格轉換
- `|` → `\|`
- 儲存格內的 `\r\n`、`\n` → `<br>`：DOMPurify 會放行 `<br>`，GFM 表格的儲存格也不能真的換行
- 去掉前後空白：Excel 的儲存格常有多餘空白，轉成表格後看不出來，只會造成困擾

### 插入方式：`document.execCommand('insertText')`
它會寫進瀏覽器原生的復原紀錄，並觸發 `input` 事件，讓 React 的 `onChange` 照常更新 state。直接 `updateFileContent()` 會讓 Ctrl+Z 失效，這正是貼上之後最常按的鍵。
- `execCommand` 已被標為棄用，但目前沒有其他 API 能保留 textarea 的原生復原；所有主流瀏覽器都支援（Firefox 89 起）
- 先不呼叫 `preventDefault`，`execCommand` 回傳 `true` 才呼叫：回傳 `false` 時就讓瀏覽器照原樣貼上，跟現在的行為一樣。不另外寫 `setRangeText` 備援，因為現在的瀏覽器不會走到那一段

### 表格前後補空行
游標前一行不是空行時，前面補 `\n\n`（游標在行中間時，要先換行再空一行）。後面補 `\n`；游標後面同一行還有文字時補 `\n\n`。GFM 表格會把緊接在後面的非空行當成最後一列（已用 marked 實測），所以只補一個 `\n` 擋不住。

### Ctrl+Shift+V 貼原文：不用另外處理
Chrome、Edge、Firefox 的「貼上為純文字」（Ctrl/Cmd+Shift+V）只會提供 `text/plain`，沒有 `text/html`，自然不符合判斷條件。所以不用監聽 keydown、不用設旗標。

## Risks / Trade-offs

- [Numbers 或 Safari 複製時不附 HTML 表格，結果不會轉換] → 還沒驗證，列入手動測試；最壞情況只是照原樣貼上，跟現在一樣
- [某個來源同時提供 HTML 表格和不是 TSV 的純文字] → 不到 2 欄 2 列或欄數不一致就照原樣貼上；真的轉錯了可以按 Ctrl+Z
- [`execCommand` 未來被移除] → 回傳 `false` 時照原樣貼上，最壞情況是功能失效，跟現在一樣
- [Safari 的貼上為純文字是 Cmd+Option+Shift+V，有些使用者不知道] → 先貼再按 Ctrl+Z 一樣能還原
- [貼上很大的表格，例如上千列] → 轉換是線性時間，問題反而在 localStorage 只有 5MB 和分享網址長度，這些現有機制已經會提醒

## Open Questions

- Excel、Google Sheets：已手動測試，可以正確轉換
- Numbers、Safari、網頁表格：不在這次範圍內，沒有驗證；條件符合就會轉換，不符合就照原樣貼上
