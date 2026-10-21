# slides-background Specification

## Purpose
在預覽上新增、調整、移除投影片的背景圖，不用記 Marp 方括號裡的關鍵字：貼圖片網址加入，再用面板調位置、寬度、填滿方式、亮度、透明度和色調，拖拉桿時預覽即時更新。面板沒有的設定原樣保留，每次修改只改原文那一行，可以用 Ctrl+Z 還原。
## Requirements
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
這頁有背景圖時，系統 SHALL 打開背景圖面板，顯示第一張背景圖目前的設定（只寫 `left`、`right` 時寬度視為 50%），並提供位置（滿版、左、右）、寬度（20%–80%，只在選左或右時顯示）、填滿方式（裁切填滿、完整顯示）、亮度、透明度、色調（原色、黑白、懷舊，寫入 `grayscale`、`sepia`）、網址和移除。寫回時 SHALL 只輸出跟預設值不同的設定，面板不認得的字（包括 `blur`、只套一半的 `sepia:0.5` 等其他濾鏡）SHALL 依原本的順序保留。`brightness`、`opacity` 不帶數值時 SHALL 照 Marp 的預設值解讀成 1.5、0.5，寫回時 SHALL 寫成完整的 `key:數值`。程式碼區塊和行內程式碼裡的 `![bg]` SHALL 不算背景圖。拉桿 SHALL 在放開時才寫回原文，拖動時 SHALL 直接更新預覽畫面，並把面板淡掉只留那一條拉桿。

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
- **THEN** 面板註明 2 張會在同一區並排，位置、寬度標成「整頁」，其他設定標成「第一張」，只改第一張的語法

#### Scenario: 拖動時即時預覽
- **WHEN** 使用者按住亮度拉桿拖動
- **THEN** 預覽的背景圖跟著變亮變暗，原文不變；放開後才寫入 `brightness:數值`

#### Scenario: 透明度
- **WHEN** 使用者把透明度調到 60%
- **THEN** 方括號裡加上 `opacity:0.6`；調回 100% 時拿掉

#### Scenario: 色調
- **WHEN** 背景圖是 `![bg grayscale](a.jpg)`，使用者選「懷舊」
- **THEN** 變成 `![bg sepia](a.jpg)`

### Requirement: 移除背景圖
背景圖面板 SHALL 提供移除。圖片語法單獨佔一行時 SHALL 刪掉整行，同一行還有其他文字時 SHALL 只刪圖片語法。

#### Scenario: 移除
- **WHEN** 使用者在面板按「移除」
- **THEN** 這頁的第一個 `![bg ...](...)` 從原文刪掉，Ctrl+Z 可以還原

### Requirement: 單頁工具列的頁碼與背景圖按鈕
這頁不寫 `_paginate` 時本來就沒有頁碼的話，「隱藏頁碼」SHALL 停用，滑鼠移上去 SHALL 說明要到「簡報設定」打開頁碼。「背景圖」按鈕 SHALL 用分隔線跟開關、投影片操作隔開，並標示會展開面板。

#### Scenario: 整份沒開頁碼
- **WHEN** front matter 沒有 `paginate: true`，使用者把滑鼠移到投影片上
- **THEN** 「隱藏頁碼」是停用的，不會顯示成已開啟

