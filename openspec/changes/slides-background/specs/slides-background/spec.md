## ADDED Requirements

### Requirement: 新增背景圖
單頁工具列 SHALL 提供「背景圖」按鈕。這頁沒有背景圖時，使用者貼上網址後，系統 SHALL 在這頁開頭的設定註解後面插入 `![bg right:40%](網址)`。網址裡的空白和括號 SHALL 編碼，其他字元（包括已經編碼過的 `%xx`）SHALL 原樣保留。

#### Scenario: 新增背景圖
- **WHEN** 使用者在沒有背景圖的投影片按「背景圖」，貼上 `https://example.com/a.jpg`
- **THEN** 這頁插入 `![bg right:40%](https://example.com/a.jpg)`

#### Scenario: 網址有空白
- **WHEN** 貼上的網址是 `https://example.com/my photo.jpg`
- **THEN** 寫入的網址是 `https://example.com/my%20photo.jpg`

#### Scenario: 網址已經編碼過
- **WHEN** 貼上的網址是 `https://example.com/my%20photo.jpg`
- **THEN** 寫入的網址不變

### Requirement: 調整背景圖
這頁有背景圖時，系統 SHALL 打開背景圖面板，顯示第一張背景圖目前的設定（只寫 `left`、`right` 時寬度視為 50%），並提供位置（滿版、左、右）、寬度（20%–80%，只在選左或右時顯示）、填滿方式（裁切填滿、完整顯示）、亮度、網址和移除。寫回時 SHALL 只輸出跟預設值不同的設定，面板不認得的字（包括 `blur`、`grayscale` 等其他濾鏡）SHALL 依原本的順序保留。`brightness` 不帶數值時 SHALL 照 Marp 的預設值解讀成 1.5，寫回時 SHALL 寫成完整的 `brightness:數值`。程式碼區塊和行內程式碼裡的 `![bg]` SHALL 不算背景圖。拉桿 SHALL 在放開時才寫回原文。

#### Scenario: 改成左邊
- **WHEN** 背景圖是 `![bg right:40%](a.jpg)`，使用者選「左」
- **THEN** 變成 `![bg left:40%](a.jpg)`

#### Scenario: 調暗
- **WHEN** 使用者把亮度拉到 0.5 後放開
- **THEN** 方括號裡加上 `brightness:0.5`，Ctrl+Z 一次就能還原

#### Scenario: 只寫濾鏡名稱
- **WHEN** 背景圖是 `![bg brightness](a.jpg)`，使用者打開面板後把亮度拉到 0.5
- **THEN** 面板一開始的亮度顯示 1.5，寫回後變成 `![bg brightness:0.5](a.jpg)`，不會同時留著 `brightness`

#### Scenario: 調回預設值
- **WHEN** 背景圖有 `brightness:0.5`，使用者把亮度拉回 1
- **THEN** 拿掉 `brightness:0.5`

#### Scenario: 保留不認得的設定
- **WHEN** 背景圖是 `![bg sepia right:30%](a.jpg)`，使用者把寬度改成 50%
- **THEN** 變成 `![bg right:50% sepia](a.jpg)`，`sepia` 保留

#### Scenario: 行內程式碼裡的示範
- **WHEN** 這頁只有 `` `![bg right:40%](圖片網址)` `` 這段行內程式碼
- **THEN** 視為沒有背景圖，按鈕顯示成新增

#### Scenario: 多張背景圖
- **WHEN** 這頁有兩個 `![bg]`
- **THEN** 面板只調整第一張，並註明共有 2 張

### Requirement: 移除背景圖
背景圖面板 SHALL 提供移除。圖片語法單獨佔一行時 SHALL 刪掉整行，同一行還有其他文字時 SHALL 只刪圖片語法。

#### Scenario: 移除
- **WHEN** 使用者在面板按「移除」
- **THEN** 這頁的第一個 `![bg ...](...)` 從原文刪掉，Ctrl+Z 可以還原
