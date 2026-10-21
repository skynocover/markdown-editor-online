## ADDED Requirements

### Requirement: 整份簡報設定列
編輯模式下打開簡報時，系統 SHALL 在預覽上方顯示主題（default、gaia、uncover）、比例（16:9、4:3）、頁碼開關和頁尾文字，並以目前實際套用的值作為初始狀態。修改時 SHALL 只改原文裡對應的那一行：設定寫在註解裡時改最後一個註解，否則改 front matter 那一行；都沒有的話加在 front matter 的最後面。值清空時 SHALL 刪掉那一行。

#### Scenario: 換主題
- **WHEN** front matter 有 `theme: gaia`，使用者選 uncover
- **THEN** 那一行變成 `theme: uncover`，front matter 的其他行不變

#### Scenario: 新增設定
- **WHEN** front matter 沒有 `size`，使用者選 4:3
- **THEN** front matter 最後面加上 `size: 4:3`

#### Scenario: 設定寫在註解裡
- **WHEN** 第一頁有 `<!-- theme: gaia -->`，使用者選 default
- **THEN** 改成 `<!-- theme: default -->`，不在 front matter 另外加一行

#### Scenario: 清空頁尾
- **WHEN** front matter 有 `footer: 公司名稱`，使用者把頁尾清空
- **THEN** 刪掉那一行

### Requirement: 單頁版型與頁碼
滑鼠移到投影片上時，系統 SHALL 在該頁下方顯示「置中」、「深色」、「隱藏頁碼」開關，並以這頁實際套用的設定作為初始狀態。切換時 SHALL 只寫入只影響當頁的設定（`_class`、`_paginate`）：這頁已經有該設定就改，沒有就插在這頁開頭，值變空時刪掉那一行。`_class` 裡 `lead`、`invert` 以外的 class SHALL 原樣保留。

#### Scenario: 設成封面頁
- **WHEN** 使用者在沒有任何設定的投影片上打開「置中」
- **THEN** 這頁的分隔線下一行插入 `<!-- _class: lead -->`

#### Scenario: 同時置中和深色
- **WHEN** 這頁有 `<!-- _class: lead -->`，使用者打開「深色」
- **THEN** 變成 `<!-- _class: lead invert -->`

#### Scenario: 保留其他 class
- **WHEN** 這頁有 `<!-- _class: lead custom -->`，使用者關掉「置中」
- **THEN** 變成 `<!-- _class: custom -->`

#### Scenario: 關掉最後一個 class
- **WHEN** 這頁有 `<!-- _class: invert -->`，使用者關掉「深色」
- **THEN** 刪掉那一行

#### Scenario: 隱藏頁碼
- **WHEN** 使用者在某頁打開「隱藏頁碼」
- **THEN** 這頁插入 `<!-- _paginate: false -->`，其他頁的頁碼不受影響

### Requirement: 新增、複製、刪除、移動投影片
單頁工具列 SHALL 提供新增（插在這頁後面）、複製、刪除、上移、下移。每頁的原文範圍 SHALL 由 Marp 解析器決定，程式碼區塊裡的 `---` 不算分頁。只剩一頁時 SHALL 不能刪除；第一頁不能上移，最後一頁不能下移。設定了 `headingDivider` 時 SHALL 隱藏這些操作。

#### Scenario: 新增投影片
- **WHEN** 使用者在第 2 頁按「新增」
- **THEN** 第 2 頁後面多一頁空白投影片

#### Scenario: 下移
- **WHEN** 使用者在第 2 頁按「下移」
- **THEN** 第 2、3 頁的內容互換，分隔線留在原位

#### Scenario: 刪除第一頁
- **WHEN** 簡報有 3 頁，使用者刪除第 1 頁
- **THEN** 原本的第 2 頁變成第 1 頁，front matter 保留

#### Scenario: 程式碼裡的分隔線
- **WHEN** 第 1 頁的程式碼區塊裡有一行 `---`，使用者複製第 1 頁
- **THEN** 複製的是完整的第 1 頁，程式碼區塊沒有被切開

### Requirement: 修改可以還原，唯讀時不顯示
所有修改 SHALL 能用 Ctrl+Z（Cmd+Z）還原。唯讀預覽和分享連結 SHALL 不顯示整份設定列和單頁工具列。找不到某頁在原文的範圍時 SHALL 不顯示該頁的工具列。

#### Scenario: 還原
- **WHEN** 使用者刪除一頁後按 Ctrl+Z
- **THEN** 那一頁回來了

#### Scenario: 唯讀預覽
- **WHEN** 對方用唯讀分享連結打開簡報
- **THEN** 看不到任何簡報調整工具
