## Why

流程圖、時序圖、圓餅圖這類圖，現在只能另外畫好再貼圖片網址，改一個節點就要重畫重傳。Mermaid 語法是 GitHub、Obsidian 都認得的文字格式，寫在 Markdown 裡就能跟文件一起存檔、一起用網址分享。

用 [Pele](https://pele.run)（Obsidian 的開源 Mermaid 渲染器）而不是 Mermaid.js：`render()` 是同步的，回傳 SVG 字串，可以直接接進現有「原文 → HTML 字串 → DOMPurify」的同步流程；Mermaid.js 是 async 而且要操作 DOM。Pele 也比較小（約 230 kB gzip 對 1.6 MB），還能每種圖各自按需載入。

## What Changes

- 一般模式預覽中，語言標成 `mermaid` 的程式碼區塊（` ```mermaid `）顯示成 SVG 圖；原文不變
- 簡報（Marp）模式的 ` ```mermaid ` 也顯示成圖，寬度不超出投影片
- Pele 只在文件裡第一次出現 mermaid 區塊時載入，而且只載入用到的圖表類型；載入完成前先顯示原始碼
- 語法錯誤或不支援的圖表類型：顯示原始碼與錯誤訊息，預覽其他部分照常顯示
- 圖的 SVG 一樣經過 DOMPurify，並限制原文與輸出大小，避免分享連結塞超大圖表卡住頁面
- 圖的顏色、字型配合預覽與投影片主題
- 不做：從表格產生圖表、圖表編輯器、把圖匯出成圖片、縮放拖曳、Mermaid 的 `click` 互動

## Capabilities

### New Capabilities
- `mermaid-diagrams`: 預覽與簡報中 mermaid 程式碼區塊的顯示方式、載入中與錯誤時的顯示、安全限制

### Modified Capabilities
（無）

## Impact

- 新增依賴 `pele`（MIT、零依賴），用 `pele/lazy` 按需載入，不進主 bundle
- 新增 `src/diagram.js`（載入與渲染）與測試
- `src/preview-edit.js` 的 `previewRenderer` 加上 `code`；`src/slides.js` 的 Marp 實例加 fence 規則
- `src/markdown-editor.jsx`：DOMPurify 設定允許 SVG；載入完成後觸發重新 render
- 字數會算進圖裡的文字（字數本來就是算預覽後看得到的文字）
- 原本就寫了 ` ```mermaid ` 的文件，預覽會從程式碼變成圖
- 存檔格式、分享連結、`.md` 和 zip 匯出完全不變
