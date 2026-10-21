## Why

背景圖是簡報最常用的視覺元素，但 Marp 的寫法把所有設定擠在方括號裡（`![bg right:40% brightness:0.5](...)`），要記關鍵字，數值也要一直改、一直看預覽才調得出來。用拉桿和按鈕調整，比在原文猜數字直觀得多。

## What Changes

- 單頁工具列加一個「背景圖」按鈕：
  - 這頁沒有背景圖時，貼上網址就插入 `![bg right:40%](網址)`
  - 這頁有背景圖時，打開背景圖面板
- 背景圖面板可以調整：
  - 位置：滿版、左、右
  - 寬度：20%–80%，只在選左或右時出現
  - 填滿方式：裁切填滿、完整顯示
  - 亮度
  - 圖片網址
  - 移除背景圖
- 一頁有多張背景圖時只調第一張；面板沒有的設定（例如 `blur`、`grayscale`、`sepia`、`vertical`）原樣保留
- 不做：模糊、黑白等亮度以外的濾鏡，需要時在原文手寫

## Capabilities

### New Capabilities
- `slides-background`: 在預覽新增、調整、移除投影片的背景圖

### Modified Capabilities
（無）

## Impact

- 依賴 `slides-preview-edit`：用到它的 `slideRanges` 和單頁工具列
- `src/slides.js`：新增 `readBackground`、`writeBackground` 純函式和測試
- `src/slide-tools.jsx`：新增背景圖面板
- 不新增套件，存檔格式不變
