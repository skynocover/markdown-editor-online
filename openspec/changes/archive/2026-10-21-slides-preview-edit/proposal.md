## Why

簡報模式現在只能靠手寫 Marp 語法調整：換主題要記得 front matter 的 `theme:`，做封面頁要寫 `<!-- _class: lead -->`，調換投影片順序要在原文剪下貼上一整段。表格已經可以在預覽直接編輯，簡報也應該讓常用的調整在預覽上點一下就完成，不用先學語法。

## What Changes

- 頂端工具列加「簡報設定」按鈕，跟播放、講者模式連成一組，只在簡報時出現；面板裡是整份簡報的設定：主題（default、gaia、uncover）、比例（16:9、4:3）、頁碼開關、頁首和頁尾文字；頁碼、頁首、頁尾在 Marp 裡會從寫的那一頁往後延續，設定面板只改 front matter 裡的預設值
- 滑鼠移到投影片上（觸控裝置點一下投影片）時，投影片右上角出現單頁工具列（下方留給 `slides-speaker-notes` 的備註）：
  - 「置中」、「深色」兩個開關，分別寫入 `_class: lead`、`_class: invert`，兩個可以同時開
  - 「隱藏頁碼」開關，寫入 `_paginate: false`
  - 新增（插在這頁後面）、複製、刪除；不做上移、下移，調整頁序在原文剪下貼上
- 每個控制項只對應一行 Marp 語法；使用者回頭看原文看得懂改了什麼，也能自己改回來
- 所有修改都用 `execCommand` 寫回原文，Ctrl+Z 可以還原
- 唯讀預覽、分享連結不顯示這些工具

## Capabilities

### New Capabilities
- `slides-edit`: 在預覽調整簡報的整份設定、單頁版型和頁碼，以及新增、複製、刪除投影片

### Modified Capabilities
（無）

## Impact

- `src/slides.js`：新增純函式，包括用 Marp 解析器找出每頁在原文的行範圍、讀寫整份設定、讀寫單頁設定，以及新增、複製、刪除投影片；同時新增測試 `src/slides.test.js`
- 新增 `src/slide-tools.jsx`：簡報設定面板，以及疊在預覽上的單頁工具列（做法跟 `TableTools` 一樣）
- `src/markdown-editor.jsx`：簡報模式的預覽接上工具，寫回原文共用 `replaceText`；`Preview` 改用 `editable` prop 分辨能不能編輯（`slides-speaker-notes` 也用它）
- 不新增套件，存檔格式、分享連結和 zip 匯出都不變
- 之後的 `slides-background` 會用到這裡的分頁定位和單頁工具列
