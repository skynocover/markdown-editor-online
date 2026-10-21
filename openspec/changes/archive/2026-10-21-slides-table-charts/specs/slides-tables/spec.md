## ADDED Requirements

### Requirement: 簡報裡的表格計算公式
簡報模式（front matter 有 `marp: true`）中，表格裡以 `=` 開頭的儲存格，系統 SHALL 用跟一般模式相同的規則計算並顯示結果，原始 Markdown SHALL 保持不變。

#### Scenario: 加總
- **WHEN** 簡報某一頁的表格有 `=SUM(B2:B4)`，B2 到 B4 是 120、180、260
- **THEN** 投影片顯示 `560`

#### Scenario: 跟一般模式結果一致
- **WHEN** 同一個表格分別放在一般文件和簡報裡
- **THEN** 每一格顯示的結果相同

#### Scenario: 跳脫等號
- **WHEN** 簡報表格的儲存格內容是 `\=abc`
- **THEN** 顯示 `=abc`，不當成公式

### Requirement: 簡報裡的表格圖表只顯示圖
簡報模式中，表格正上方有圖表註解（語法同 `table-charts`）時，系統 SHALL 在投影片上只顯示圖，不顯示表格。圖 SHALL 等比例縮到投影片放得下。

#### Scenario: 投影片上的圖
- **WHEN** 簡報某一頁的表格上方是 `<!-- chart bar B2:C4 -->`
- **THEN** 那一頁顯示長條圖，不顯示表格；預覽和播放畫面都一樣

#### Scenario: 一般模式切成簡報
- **WHEN** 一般文件的表格有圖表註解，使用者在檔頭加上 `marp: true`
- **THEN** 一般模式原本是表格加圖，簡報裡變成只有圖

#### Scenario: 註解和表格中間有空行
- **WHEN** 簡報裡圖表註解和表格中間隔了一行空行
- **THEN** 不畫圖，照常顯示表格（跟一般模式一樣）

#### Scenario: 圖表註解不是講者備註
- **WHEN** 簡報某一頁有圖表註解
- **THEN** 這個註解不會出現在這一頁的講者備註裡

#### Scenario: 圖表錯誤
- **WHEN** 簡報裡的圖表註解範圍超出表格
- **THEN** 投影片上顯示錯誤訊息，其他投影片正常

#### Scenario: 不影響 Marp 指令
- **WHEN** 同一頁同時有 `<!-- _class: invert -->` 和圖表註解
- **THEN** 這一頁照常套用 `invert`，圖的顏色跟著變淺
