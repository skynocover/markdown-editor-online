# mermaid-diagrams Specification

## Purpose
預覽和簡報裡的 ` ```mermaid ` 區塊畫成圖，原文不變。
## Requirements
### Requirement: mermaid 程式碼區塊在預覽時顯示成圖
語言標成 `mermaid` 的程式碼區塊（` ```mermaid `），系統 SHALL 在一般模式預覽中顯示成 SVG 圖，原始 Markdown 內容 SHALL 保持不變。

#### Scenario: 流程圖
- **WHEN** 文件中有 ` ```mermaid ` 區塊，內容是 `flowchart LR` 加上 `登入 --> 驗證`
- **THEN** 預覽在那個位置顯示有「登入」「驗證」兩個節點和一條箭頭的圖，不顯示原文

#### Scenario: 數據圖
- **WHEN** ` ```mermaid ` 區塊的內容是 `pie` 或 `xychart-beta` 圖表
- **THEN** 預覽顯示圓餅圖或長條圖

#### Scenario: 原文不受影響
- **WHEN** 文件中有 mermaid 區塊，使用者把檔案下載成 `.md`、全部匯出或產生分享連結
- **THEN** 輸出的內容是 mermaid 原文，不是 SVG

#### Scenario: 其他語言的程式碼區塊不受影響
- **WHEN** 程式碼區塊的語言是 `js` 或沒有標語言，即使內容是 mermaid 語法
- **THEN** 照原本的程式碼區塊顯示

#### Scenario: 唯讀預覽
- **WHEN** 開啟含 mermaid 區塊的分享連結
- **THEN** 唯讀預覽一樣顯示成圖

### Requirement: 簡報模式顯示 mermaid 圖
簡報模式（front matter 有 `marp: true`）中的 ` ```mermaid ` 區塊，系統 SHALL 顯示成圖，圖 SHALL 等比例縮小到不超出投影片。

#### Scenario: 投影片裡的圖
- **WHEN** 簡報的某一頁有 ` ```mermaid ` 流程圖
- **THEN** 那一頁的預覽和播放畫面都顯示成圖

#### Scenario: 大圖不超出投影片
- **WHEN** 投影片裡的圖原本的大小比投影片內容區還大
- **THEN** 圖等比例縮小，完整顯示在投影片內

#### Scenario: 深色頁
- **WHEN** 圖所在的投影片套用 `invert` 或深色主題
- **THEN** 圖的文字和線條顏色跟著投影片的文字顏色，看得清楚

### Requirement: 圖表引擎按需載入
系統 SHALL 只在文件裡出現 mermaid 區塊時才載入圖表引擎，並且只載入用到的圖表類型。載入完成前，該區塊 SHALL 顯示成原本的程式碼區塊；載入完成後，預覽 SHALL 自動更新成圖，不需要使用者操作。

#### Scenario: 沒有圖表的文件
- **WHEN** 開啟沒有任何 mermaid 區塊的文件
- **THEN** 不載入圖表引擎

#### Scenario: 第一次出現圖表
- **WHEN** 使用者在文件中第一次寫好一個 mermaid 區塊
- **THEN** 先顯示原文，引擎載入完成後自動變成圖

#### Scenario: 載入失敗
- **WHEN** 載入圖表引擎時網路失敗
- **THEN** 區塊繼續顯示原文，下次預覽更新時再試一次載入

### Requirement: 錯誤時顯示原文和錯誤訊息
mermaid 區塊有語法錯誤、圖表類型不支援，或超過大小限制時，系統 SHALL 顯示該區塊的原文和一行錯誤訊息，文件其他部分 SHALL 照常顯示。

#### Scenario: 語法錯誤
- **WHEN** mermaid 區塊內容是 `flowchart LR` 加上沒寫完的 `A -->`
- **THEN** 顯示原文，下面有一行錯誤訊息，內容包含出錯的行號

#### Scenario: 不支援的圖表類型
- **WHEN** mermaid 區塊第一行不是任何支援的圖表類型
- **THEN** 顯示原文和「不支援的圖表類型」錯誤訊息

#### Scenario: 一張圖錯誤不影響其他圖
- **WHEN** 文件裡有兩個 mermaid 區塊，其中一個有語法錯誤
- **THEN** 錯誤的那個顯示原文和錯誤訊息，另一個正常顯示成圖

### Requirement: 不受信任的圖表內容不能執行程式或發出請求
來自分享連結的 mermaid 內容是不受信任的。系統 SHALL 確保圖表輸出不包含可執行的內容，不產生連結，不載入外部圖片，並且 SHALL 限制原文和輸出的大小。

#### Scenario: 標籤裡的 HTML
- **WHEN** 節點標籤是 `<img src=x onerror=alert(1)>`
- **THEN** 不執行任何程式，輸出裡沒有 `<img>` 和事件屬性（Pele 會把標籤裡的 HTML 拿掉）

#### Scenario: click 指令
- **WHEN** mermaid 原文包含 `click A "javascript:alert(1)"` 或指向一般網址的 click
- **THEN** 圖照常顯示，但節點不是連結，點了沒有反應

#### Scenario: 超大圖表
- **WHEN** mermaid 區塊的原文、節點連線數或輸出大小超過限制
- **THEN** 不渲染，顯示原文和超過限制的錯誤訊息，頁面不會卡住

#### Scenario: 同一頁有多張圖
- **WHEN** 預覽中有多張圖，或編輯預覽和唯讀預覽同時開著
- **THEN** 每張圖的箭頭等圖形正確顯示，不會互相影響

