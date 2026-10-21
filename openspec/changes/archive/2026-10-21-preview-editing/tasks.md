## 1. 預覽編輯表格

- [x] 1.1 `src/preview-edit.js`：`markTables`、`previewRenderer`（table 加 `data-start`）、`readTable`、`writeTable`
- [x] 1.2 點格編輯：Enter、Tab、Shift+Tab 換格，Esc 取消，用 `execCommand` 寫回
- [x] 1.3 `src/table-tools.jsx`：欄號、列號、新增列和欄、× 刪除、拖曳換位置
- [x] 1.4 刪除、移動欄列時，公式座標跟著改（`fixRefs`）
- [x] 1.5 編輯公式時點格插入座標、拖曳插入範圍（`canPickRef`、`rangeRef`）

## 2. 其他編輯功能

- [x] 2.1 待辦 checkbox：`markTasks`、`toggleTask`，唯讀預覽不能點
- [x] 2.2 工具列「插入表格」按鈕，插入後打開第一格
- [x] 2.3 `src/text-format.js` 的 `toggleWrap`，以及 Ctrl/Cmd+B、Ctrl/Cmd+I 快捷鍵
- [x] 2.4 側邊欄拖曳換順序（`dropOnFile`），拖到資料夾上時放到最後面

## 3. 驗證與文件

- [x] 3.1 `src/preview-edit.test.js`、`src/text-format.test.js`
- [x] 3.2 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 都通過
- [x] 3.3 用瀏覽器實際操作驗證：編輯格子、換格、插入座標、勾選 checkbox、插入表格、快捷鍵、側邊欄排序，以及 Ctrl+Z 還原
- [x] 3.4 README 補上這些功能
