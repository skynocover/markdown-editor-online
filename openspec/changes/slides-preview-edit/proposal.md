## Why

簡報模式現在只能靠手寫 Marp 語法調整：換主題要記得 front matter 的 `theme:`，做封面頁要寫 `<!-- _class: lead -->`，調換投影片順序要在原文剪下貼上一整段。表格已經可以在預覽直接編輯，簡報也應該讓常用的調整在預覽上點一下就完成，不用先學語法。

## What Changes

- 簡報模式的預覽上方加一列整份簡報的設定：主題（default、gaia、uncover）、比例（16:9、4:3）、頁碼開關、頁尾文字
- 滑鼠移到投影片上時，下方出現單頁工具列：
  - 「置中」、「深色」兩個開關，分別寫入 `_class: lead`、`_class: invert`，兩個可以同時開
  - 「隱藏頁碼」開關，寫入 `_paginate: false`
  - 新增（插在這頁後面）、複製、刪除、上移、下移
- 每個控制項只對應一行 Marp 語法；使用者回頭看原文看得懂改了什麼，也能自己改回來
- 所有修改都用 `execCommand` 寫回原文，Ctrl+Z 可以還原
- 唯讀預覽、分享連結不顯示這些工具

## Capabilities

### New Capabilities
- `slides-edit`: 在預覽調整簡報的整份設定、單頁版型和頁碼，以及新增、複製、刪除、移動投影片

### Modified Capabilities
（無）

## Impact

- `src/slides.js`：新增純函式，包括用 Marp 解析器找出每頁在原文的行範圍、讀寫整份設定、讀寫單頁設定，以及搬移投影片；同時新增測試 `src/slides.test.js`
- 新增 `src/slide-tools.jsx`：整份設定列和單頁工具列，疊在預覽上的做法跟 `TableTools` 一樣
- `src/markdown-editor.jsx`：簡報模式的預覽接上工具，寫回原文共用 `replaceText`
- 不新增套件，存檔格式、分享連結和 zip 匯出都不變
- 之後的 `slides-background` 會用到這裡的分頁定位和單頁工具列
