## 1. 先實測

- [x] 1.1 `pnpm add pele@1.8.0`（鎖定版本）
- [x] 1.2 瀏覽器實測：中文流程圖節點的框寬是否正確（`defaultMeasurer` 有沒有用 canvas）；不準就決定要傳的 `measurer`
- [x] 1.3 查 Pele 的 `limit`、`outputLimit`、`maxEdges` 預設值，拿一張大圖實測後決定數值，寫進 design.md 的 Open Questions

## 2. 圖表模組

- [x] 2.1 新增 `src/diagram.js`：`loadDiagrams(sources)`（`import("pele/lazy")` → `detectType` → `load(type)`，失敗不快取）
- [x] 2.2 `renderDiagram(source)`：已載入 → SVG 包 `<div class="diagram">`；未載入 → 原本的程式碼區塊並記進待載入清單；錯誤 → 原文加跳脫過的錯誤訊息（`syntax` 帶行號、`unsupported-diagram`、`limit` 各有中文訊息）
- [x] 2.3 Pele 選項：`links: false`、`images: false`、大小上限、預覽字型的 `fontFamily`（Pele 輸出本來就沒有 `id`，不用移除）
- [x] 2.4 `takePending()`：取出並清空待載入清單
- [x] 2.5 新增 `src/diagram.test.js`：載入前顯示原文並記進待載入、載入後輸出 SVG、語法錯誤、不支援類型、超過上限、`onerror` / `javascript:` 不出現在輸出、輸出沒有 `id` 屬性、標籤文字含 `id="x"` 時照常顯示；`node --test src/diagram.test.js` 通過

## 3. 接進預覽

- [x] 3.1 `previewRenderer.code`：`lang === "mermaid"` 時呼叫 `renderDiagram`，其他照原本的 renderer
- [x] 3.2 `render()` 結果帶上 `takePending()` 的內容；編輯器加上 effect 呼叫 `loadDiagrams`，完成後遞增 `diagramVersion`，加進 `current`、`view` 的 `useMemo` 依賴
- [x] 3.3 確認 DOMPurify 保留 SVG 和根節點的 `style` 屬性，`FORBID_TAGS: ["style"]` 不變
- [x] 3.4 預覽容器設定 `--pele-*` 變數，配合預覽的顏色

## 4. 簡報模式

- [x] 4.1 `loadMarp` 建好 Marp 後，包住 `marp.markdown.renderer.rules.fence`，`info` 是 `mermaid` 時呼叫 `renderDiagram`
- [x] 4.2 確認 `foreignObject` 裡的 SVG 通過簡報的 DOMPurify 設定
- [x] 4.3 簡報 CSS：圖加 `max-height`，等比例縮小；`--pele-fg`、`--pele-line` 用 `currentColor`，`invert` 頁看得清楚
- [x] 4.4 確認預覽和播放畫面都顯示圖；播放畫面數投影片用的是 `svg[data-marpit-svg]`，確認圖表的 SVG 不會被算成投影片

## 5. 驗證與文件

- [x] 5.1 手動測試：流程圖、時序圖、pie、xychart；邊打字邊更新；語法錯誤後修好；分享連結唯讀預覽；簡報一般頁和 `invert` 頁
- [x] 5.2 確認沒有 mermaid 區塊的文件不會載入 Pele（Network 面板）
- [x] 5.3 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 通過
- [x] 5.4 README：新增「圖表」段落（` ```mermaid ` 語法、支援的圖表類型連到 Pele、簡報也能用；不支援的項目：`click` 連結、外部圖片）
