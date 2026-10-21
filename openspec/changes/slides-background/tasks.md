## 1. 解析與改寫（`src/slides.js`）

- [ ] 1.1 `readBackground(markdown, range)`：找出這頁第一個 `![bg]`（跳過程式碼區塊），拆成欄位和 `rest`，並回傳背景圖的數量
- [ ] 1.2 `writeBackground(bg)`：只輸出跟預設值不同的欄位，`rest` 依原本順序接在後面
- [ ] 1.3 `addBackground`、`removeBackground`，包括網址編碼和刪整行或只刪語法的判斷
- [ ] 1.4 測試：保留不認得的字、`fit` 視為 `contain`、預設值不輸出、多張背景圖、網址編碼

## 2. 介面

- [ ] 2.1 單頁工具列加「背景圖」按鈕：沒有背景圖時輸入網址，有背景圖時打開面板
- [ ] 2.2 背景圖面板：位置、寬度、填滿方式、亮度、模糊、黑白、網址、移除；拉桿放開時才寫回

## 3. 驗證與文件

- [ ] 3.1 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 都通過
- [ ] 3.2 用瀏覽器實際操作驗證：每個控制項、手寫的 `sepia` 被保留、Ctrl+Z 還原
- [ ] 3.3 README 補上背景圖面板的說明
