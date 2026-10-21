## MODIFIED Requirements

### Requirement: 整份簡報設定
編輯模式下打開簡報時，系統 SHALL 在頂端工具列顯示「簡報設定」按鈕（一般文件 SHALL 不顯示），面板裡有主題（default、gaia、uncover，卡片下方用一句話說明滑鼠所在或目前的主題風格）、深色開關、比例（16:9、4:3）、頁碼開關、頁首和頁尾文字（依序分成外觀、比例、每頁資訊三組），修改時 SHALL 只改原文裡對應的那一行。主題、比例 SHALL 以目前實際套用的值作為初始狀態；設定寫在註解裡時改最後一個註解，否則改 front matter 那一行。頁碼、頁首、頁尾會從寫的那一頁往後延續，SHALL 只讀寫 front matter 那一行，不改任何頁裡的註解。深色 SHALL 以 front matter 的 `class` 是否含 `invert` 作為狀態，切換時在 front matter 的 `class` 加入或移除 `invert`、保留其他值，並且對寫了 `_class` 的頁面一起加入或移除 `invert`（跟延續下來的值相同時刪掉那一行）；中途不帶底線的 `class` 註解 SHALL 不改。front matter 沒有那一行時 SHALL 加在 front matter 的最後面。值清空時 SHALL 刪掉那一行。值含有 YAML 特殊字元時 SHALL 用引號包起來。

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

#### Scenario: 打開深色
- **WHEN** front matter 沒有 `class`，使用者打開深色
- **THEN** front matter 最後面加上 `class: invert`，每一頁都變深色

#### Scenario: 保留其他 class
- **WHEN** front matter 有 `class: custom`，使用者打開深色
- **THEN** 那一行變成 `class: custom invert`

#### Scenario: 封面也跟著變
- **WHEN** 第 1 頁有 `<!-- _class: lead -->`，使用者打開深色
- **THEN** 那一行變成 `<!-- _class: lead invert -->`；再關掉時變回 `<!-- _class: lead -->`，front matter 的 `class` 那一行刪掉

#### Scenario: 主題卡片跟著深色
- **WHEN** 深色開關是打開的
- **THEN** 三張主題卡片顯示各主題深色版的背景和文字色
