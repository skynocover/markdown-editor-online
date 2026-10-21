## Why

有了貼上表格和表格公式之後，改表格還是得回到原文對齊一堆 `|`，很難知道 `B3` 指的是哪一格。待辦清單也只能在原文裡手動把 `[ ]` 改成 `[x]`。這個 change 讓常用的編輯動作可以直接在預覽完成，另外補上幾個小地方：插入表格的按鈕、粗體和斜體的快捷鍵、側邊欄檔案換順序。

## What Changes

- 在預覽點表格的格子就能直接編輯，格子裡顯示原始 Markdown（公式格顯示公式）。Enter 往下一格，Tab、Shift+Tab 往右、往左，Esc 取消
- 編輯表格時顯示欄號（A、B、C…）和列號，可以新增列、欄，用 × 刪除，拖曳換位置；刪除或移動時，公式裡的座標會跟著改
- 編輯公式時，游標在 `=+-*/(,:` 後面點別格會插入座標，拖曳則插入範圍
- 預覽裡的待辦清單 checkbox 可以點，點了會切換原文的 `[ ]` 和 `[x]`
- 上方工具列新增「插入表格」按鈕
- 編輯區用 Ctrl/Cmd+B 切換粗體、Ctrl/Cmd+I 切換斜體
- 側邊欄的檔案可以拖曳換順序
- 所有寫回原文的動作都用 `execCommand` 處理，Ctrl+Z 可以還原

## Capabilities

### New Capabilities
- `preview-edit`: 在預覽直接編輯表格（格子內容、欄列結構、公式座標）和切換待辦 checkbox，以及插入表格按鈕
- `format-shortcuts`: 編輯區的粗體、斜體快捷鍵
- `file-order`: 側邊欄拖曳檔案換順序

### Modified Capabilities
（無）

## Impact

- 新增 `src/preview-edit.js`、`src/text-format.js`（純函式）和對應的測試，以及 `src/table-tools.jsx`（欄號、列號和操作按鈕）
- `src/markdown-editor.jsx`：`parseMarkdown` 加上 `markTables`、`markTasks` 和自訂 renderer，預覽加上事件處理，並接上工具列按鈕、快捷鍵和側邊欄拖曳
- 第一次在預覽編輯某個表格並寫回時，整個表格會重新排版（`| a | b |` 格式）
- 不新增套件，存檔格式、分享連結和 zip 匯出都不變
