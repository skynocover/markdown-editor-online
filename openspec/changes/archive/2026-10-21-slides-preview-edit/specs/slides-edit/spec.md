## ADDED Requirements

### Requirement: 整份簡報設定
編輯模式下打開簡報時，系統 SHALL 在頂端工具列顯示「簡報設定」按鈕（一般文件 SHALL 不顯示），面板裡有主題（default、gaia、uncover，卡片下方用一句話說明滑鼠所在或目前的主題風格）、比例（16:9、4:3）、頁碼開關、頁首和頁尾文字，修改時 SHALL 只改原文裡對應的那一行。主題、比例 SHALL 以目前實際套用的值作為初始狀態；設定寫在註解裡時改最後一個註解，否則改 front matter 那一行。頁碼、頁首、頁尾會從寫的那一頁往後延續，SHALL 只讀寫 front matter 那一行，不改任何頁裡的註解。front matter 沒有那一行時 SHALL 加在 front matter 的最後面。值清空時 SHALL 刪掉那一行。值含有 YAML 特殊字元時 SHALL 用引號包起來。

#### Scenario: 換主題
- **WHEN** front matter 有 `theme: gaia`，使用者選 uncover
- **THEN** 那一行變成 `theme: uncover`，front matter 的其他行不變

#### Scenario: 新增設定
- **WHEN** front matter 沒有 `size`，使用者選 4:3
- **THEN** front matter 最後面加上 `size: 4:3`

#### Scenario: 設定寫在註解裡
- **WHEN** 第一頁有 `<!-- theme: gaia -->`，使用者選 default
- **THEN** 改成 `<!-- theme: default -->`，不在 front matter 另外加一行

#### Scenario: 頁碼只改 front matter
- **WHEN** front matter 有 `paginate: true`，第 3 頁有 `<!-- paginate: false -->`，使用者在設定面板關掉頁碼
- **THEN** front matter 那一行變成 `paginate: false`，第 3 頁的註解不變

#### Scenario: 頁碼寫在中途的註解裡
- **WHEN** front matter 沒有 `paginate`，第 3 頁有 `<!-- paginate: true -->`
- **THEN** 設定面板的頁碼顯示成未開啟；使用者打開時在 front matter 加上 `paginate: true`

#### Scenario: 頁尾有冒號
- **WHEN** 使用者把頁尾設成 `公司: 研發部`
- **THEN** 寫入 `footer: "公司: 研發部"`，簡報照常顯示

#### Scenario: 清空頁尾
- **WHEN** front matter 有 `footer: 公司名稱`，使用者把頁尾清空
- **THEN** 刪掉那一行

#### Scenario: 新增頁首
- **WHEN** front matter 沒有 `header`，使用者把頁首設成 `第一章`
- **THEN** front matter 最後面加上 `header: 第一章`

### Requirement: 單頁版型與頁碼
滑鼠移到投影片上，或在觸控裝置點一下投影片時，系統 SHALL 在該頁右上角顯示「置中」、「深色」、「隱藏頁碼」開關，並以這頁實際套用的設定作為初始狀態。切換時 SHALL 只寫入只影響當頁的設定（`_class`、`_paginate`），新的值 SHALL 從這頁實際套用的值增減（包括從前面頁延續下來的 `class`）。新的值跟延續下來的值相同時 SHALL 刪掉那一行，否則這頁已經有該設定就改，沒有就插在這頁開頭。`lead`、`invert` 以外的 class SHALL 原樣保留。主題不是 gaia 時（只有 gaia 有置中版型），「置中」SHALL 停用，這頁已經有 `lead` 時 SHALL 仍可關掉。

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

#### Scenario: 延續下來的深色頁設成置中
- **WHEN** front matter 有 `class: invert`，使用者在沒有 `_class` 的頁面打開「置中」
- **THEN** 這頁插入 `<!-- _class: invert lead -->`，深色效果保留

#### Scenario: 關掉延續下來的深色
- **WHEN** front matter 有 `class: invert`，使用者在沒有 `_class` 的頁面關掉「深色」
- **THEN** 這頁插入 `<!-- _class: "" -->`，只有這頁變回淺色

#### Scenario: 其他主題沒有置中版型
- **WHEN** 主題是 default，使用者把滑鼠移到沒有 `lead` 的投影片上
- **THEN** 「置中」按鈕停用，提示只有 gaia 主題有置中版型

#### Scenario: 隱藏頁碼
- **WHEN** 使用者在某頁打開「隱藏頁碼」
- **THEN** 這頁插入 `<!-- _paginate: false -->`，其他頁的頁碼不受影響

### Requirement: 新增、複製、刪除投影片
單頁工具列 SHALL 提供新增（插在這頁後面）、複製（插在這頁後面）、刪除。每頁的原文範圍 SHALL 由 Marp 解析器決定，程式碼區塊裡的 `---` 不算分頁。只剩一頁時 SHALL 不能刪除。設定了 `headingDivider` 時 SHALL 隱藏這些操作。

#### Scenario: 新增投影片
- **WHEN** 使用者在第 2 頁按「新增」
- **THEN** 第 2 頁後面多一頁空白投影片

#### Scenario: 刪除第一頁
- **WHEN** 簡報有 3 頁，使用者刪除第 1 頁
- **THEN** 原本的第 2 頁變成第 1 頁，front matter 保留

#### Scenario: 複製第一頁
- **WHEN** 使用者複製第 1 頁
- **THEN** 第 1 頁後面多一頁一樣的內容，中間補一條分隔線，front matter 只有一份

#### Scenario: 程式碼裡的分隔線
- **WHEN** 第 1 頁的程式碼區塊裡有一行 `---`，使用者複製第 1 頁
- **THEN** 複製的是完整的第 1 頁，程式碼區塊沒有被切開

### Requirement: 停用的按鈕說明原因
簡報調整工具裡因為目前狀態而停用的按鈕，滑鼠移上去時 SHALL 立刻（不用等瀏覽器原生提示的延遲）顯示停用的原因。

#### Scenario: 只剩一頁
- **WHEN** 簡報只有一頁，使用者把滑鼠移到「刪除」上
- **THEN** 提示「只剩一頁不能刪除」

#### Scenario: 非 gaia 主題的置中
- **WHEN** 主題是 default，使用者把滑鼠移到停用的「置中」上
- **THEN** 提示「只有 gaia 主題有置中版型」

### Requirement: 修改可以還原，唯讀時不顯示
所有修改 SHALL 能用 Ctrl+Z（Cmd+Z）還原。唯讀預覽和分享連結 SHALL 不顯示整份設定面板和單頁工具列。找不到某頁在原文的範圍時 SHALL 不顯示該頁的工具列。

#### Scenario: 還原
- **WHEN** 使用者刪除一頁後按 Ctrl+Z
- **THEN** 那一頁回來了

#### Scenario: 唯讀預覽
- **WHEN** 對方用唯讀分享連結打開簡報
- **THEN** 看不到任何簡報調整工具
