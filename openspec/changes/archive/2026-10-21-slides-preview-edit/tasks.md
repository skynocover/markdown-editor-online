## 1. 分頁定位與原文改寫（`src/slides.js`）

- [x] 1.1 `slideRanges(marp, markdown)`：用 `marp.markdown.parse` 取得每頁的行範圍和 `marpitDirectives`，以及是否有設定 `headingDivider`；第 1 頁的範圍改成從 front matter 後面開始
- [x] 1.2 `setGlobal(markdown, key, value)`：`theme`、`size` 優先改最後一個註解，其次改 front matter；`paginate`、`footer` 只改 front matter，都沒有就加在 front matter 最後面，值是空的就刪掉那一行，值有 YAML 特殊字元時用 `JSON.stringify` 包起來
- [x] 1.3 `setSpot(markdown, range, key, value)` 和 `toggleClass`：讀寫 `_class`、`_paginate`，從實際套用的值增減，保留其他 class；跟延續下來的值相同就刪掉那一行，空 class 寫成 `""`
- [x] 1.4 `addSlide`、`duplicateSlide`、`deleteSlide`，包括第 1 頁和 front matter 的特殊情況
- [x] 1.5 `src/slides.test.js`：程式碼區塊裡的 `---`、`***` 分頁、設定寫在註解裡、刪第 1 頁、複製第 1 頁時補分隔線且 front matter 只有一份、只剩一頁、保留其他 class、延續 `class: invert` 時開關置中或深色、頁尾有冒號、中途有 `<!-- paginate: false -->` 時設定面板只改 front matter

## 2. 介面（`src/slide-tools.jsx`）

- [x] 2.1 工具列的「簡報設定」面板（跟播放、講者模式連成一組，只在簡報時出現）：主題小卡片、比例、頁碼、頁首、頁尾（Enter 或失去焦點時寫入）；頁碼、頁首、頁尾的初始狀態讀 front matter；停用的按鈕滑鼠移上去時立刻說明原因
- [x] 2.2 單頁工具列：量 svg 位置疊在投影片右上角，滑鼠移過去時顯示，觸控裝置點一下投影片顯示，捲動、縮放視窗時重新量
- [x] 2.3 置中、深色、隱藏頁碼開關，以及新增、複製、刪除；有 `headingDivider` 時隱藏新增、複製、刪除
- [x] 2.4 `src/markdown-editor.jsx`：`Preview` 加 `editable` prop（`slides-speaker-notes` 也要用；哪一份先做就由哪一份加，後做的直接用），只在編輯模式的簡報預覽掛上工具，寫回共用 `replaceText`

## 3. 驗證與文件

- [x] 3.1 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 都通過
- [x] 3.2 用瀏覽器實際操作驗證：每個開關、每種投影片操作、Ctrl+Z 還原、唯讀預覽看不到工具
- [x] 3.3 README 和 `SLIDES_TEMPLATE` 的說明補上預覽調整的方式
