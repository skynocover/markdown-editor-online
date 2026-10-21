## 1. 分頁定位與原文改寫（`src/slides.js`）

- [ ] 1.1 `slideRanges(marp, markdown)`：用 `marp.markdown.parse` 取得每頁的行範圍和 `marpitDirectives`，以及是否有設定 `headingDivider`；第 1 頁的範圍改成從 front matter 後面開始
- [ ] 1.2 `setGlobal(markdown, key, value)`：優先改最後一個註解，其次改 front matter，都沒有就加在 front matter 最後面，值是空的就刪掉那一行，值有 YAML 特殊字元時用 `JSON.stringify` 包起來
- [ ] 1.3 `setSpot(markdown, range, key, value)` 和 `toggleClass`：讀寫 `_class`、`_paginate`，從實際套用的值增減，保留其他 class；跟延續下來的值相同就刪掉那一行，空 class 寫成 `""`
- [ ] 1.4 `addSlide`、`duplicateSlide`、`deleteSlide`、`moveSlide`，包括第 1 頁和 front matter 的特殊情況
- [ ] 1.5 `src/slides.test.js`：程式碼區塊裡的 `---`、`***` 分頁、設定寫在註解裡、刪第 1 頁、移動第 1 頁時 front matter 不動、只剩一頁、保留其他 class、延續 `class: invert` 時開關置中或深色、頁尾有冒號

## 2. 介面（`src/slide-tools.jsx`）

- [ ] 2.1 整份設定列：主題、比例、頁碼、頁尾（Enter 或失去焦點時寫入）
- [ ] 2.2 單頁工具列：量 svg 位置疊在投影片右上角，滑鼠移過去時顯示，捲動、縮放視窗時重新量
- [ ] 2.3 置中、深色、隱藏頁碼開關，以及新增、複製、刪除、上移、下移；有 `headingDivider` 時隱藏搬移類的操作
- [ ] 2.4 `src/markdown-editor.jsx`：`Preview` 加 `editable` prop，只在編輯模式的簡報預覽掛上工具，寫回共用 `replaceText`

## 3. 驗證與文件

- [ ] 3.1 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 都通過
- [ ] 3.2 用瀏覽器實際操作驗證：每個開關、每種投影片操作、Ctrl+Z 還原、唯讀預覽看不到工具
- [ ] 3.3 README 和 `SLIDES_TEMPLATE` 的說明補上預覽調整的方式
