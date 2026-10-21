## 1. 解析與改寫（`src/slides.js`）

- [x] 1.1 `readBackground(markdown, range)`：`slideRanges` 用 Marp 解析結果的 image token 記下每頁背景圖所在的行（`bgs`），找出數量和第一張，再拆成欄位和 `rest`；只寫 `left`、`right` 時寬度是 50%；只寫 `brightness` 不帶數值時是 1.5
- [x] 1.2 `writeBackground(markdown, bg)`：只輸出跟預設值不同的欄位，`rest` 依原本順序接在後面
- [x] 1.3 `addBackground`、`removeBackground`，包括網址編碼（只換空白和括號）和刪整行或只刪語法的判斷
- [x] 1.4 測試：保留不認得的字、`fit` 視為 `contain`、預設值不輸出、多張背景圖、網址編碼和已編碼的網址、行內程式碼裡的 `![bg]` 不算、`left` 沒帶比例是 50%、只寫 `brightness` 沒帶數值、`brightness` 寫兩次、`blur`、`grayscale` 原樣留在 `rest`

## 2. 介面

- [x] 2.1 單頁工具列加「背景圖」按鈕：沒有背景圖時輸入網址，有背景圖時打開面板
- [x] 2.2 背景圖面板：位置、寬度、填滿方式、亮度、網址、移除；拉桿放開時才寫回

- [x] 2.3 透明度、色調；拖拉桿時即時預覽、面板淡掉只留那一條；網址平常一行小字、按「更換」才編輯
- [x] 2.4 面板兩欄對齊、分三組、亮度用百分比、點數字恢復預設；多張背景圖時分成「整頁」和「第一張」；整份沒開頁碼時停用「隱藏頁碼」；「背景圖」加分隔線和 ▾；工具列只留圖示、跨在投影片上邊框

## 3. 驗證與文件

- [x] 3.1 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 都通過
- [x] 3.2 用瀏覽器實際操作驗證：每個控制項、手寫的 `sepia` 被保留、Ctrl+Z 還原
- [x] 3.3 README 補上背景圖面板的說明
