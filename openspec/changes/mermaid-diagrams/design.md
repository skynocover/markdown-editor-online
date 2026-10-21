## Context

預覽有兩條路，都是同步產生 HTML 字串，在 `render()` 裡用 `useMemo` 快取：
- 一般文件：`marked.lexer` → `markTables` / `markTasks` / `calcTables` → `marked.parser(tokens, { renderer: previewRenderer })` → DOMPurify（禁 `<style>`）
- 簡報：`marp.render()`（markdown-it）→ DOMPurify（加 `foreignObject` 等）；Marp 第一次遇到簡報才用 `loadMarp()` 載入，載好後 `setMarp` 觸發重新 render

分享連結是不受信任的輸入，任何人都能做一個連結，讓別人打開時渲染裡面的圖。

用 `pele@1.8.0` 在 Node 實測過：
- `render(text, options)` 是同步的，回傳 `{ svg, width, height, type }`
- 輸出只用到 `svg`、`g`、`path`、`rect`、`circle`、`text`、`tspan`，沒有 `<style>`、`foreignObject`、`<script>`；顏色用根節點 `style` 屬性裡的 `var(--pele-*)`，並且自帶 `max-width:100%;height:auto`
- 標籤裡的 `<img onerror>`、`click A "javascript:…"` 都被跳脫或濾掉
- 錯誤丟出 `PeleError`，帶 `code`（`unsupported-diagram` | `syntax` | `semantic` | `limit`）、`line`、`message`
- 輸出有 `id` 屬性，值直接是節點名稱（`A`、`L_A_B_0`），時序圖同一張圖裡就有重複的 id；但沒有任何 `url(#…)`、`href="#…"` 參照這些 id（箭頭直接畫成 `path`，沒用 `marker`）；`idPrefix` 選項對這些 id 沒有作用
- 同一份原文每次輸出都一樣
- `pele/lazy` 入口約 1 kB gzip，每種圖表是各自的 chunk，用 `load(type)` 載入；`detectType`、`registered`、`render` 也從這個入口匯出

## Goals / Non-Goals

**Goals:**
- 一般模式和簡報模式共用同一個「mermaid 原文 → HTML」函式
- 沒用到圖表的文件不多載任何東西；用到時只載入用到的圖表類型
- 圖表來自不受信任的分享連結也安全：沒有可執行內容，不發出網路請求，不會讓頁面卡死
- 一張圖出錯只影響那一張

**Non-Goals:**
- 從表格產生圖表（下一個 change）
- 圖表編輯器、匯出成圖片、縮放拖曳
- Mermaid 的 `click` 連結與外部圖片
- 編輯器的深色模式（編輯器目前沒有深色模式）

## Decisions

### 用 Pele，不用 Mermaid.js
Mermaid.js 的 `render()` 是 async 而且要操作 DOM，會打破現在「同步產生字串再 `useMemo`」的流程，還要 1.6 MB。Pele 同步、輸出純 SVG 字串、約 230 kB 而且可以拆開載入。語法相同，使用者寫的 ` ```mermaid ` 在 GitHub、Obsidian 也能顯示。
- 替代方案：用 `mount()`。不採用：它直接寫 DOM，跟字串流程不合，唯讀預覽和字數計算也拿不到 HTML

### 新增 `src/diagram.js`，兩條路共用
匯出：
- `renderDiagram(source)`：同步回傳 HTML 字串，結果是三種之一：
  - 圖：Pele 的 SVG，外面包一層 `<div class="diagram">`
  - 還沒載入：照原本程式碼區塊顯示原文（`<pre><code class="language-mermaid">`），並把原文記進「待載入」清單
  - 錯誤：同樣顯示原文，下面加一行錯誤訊息（例如「圖表語法錯誤（第 3 行）」）；訊息要跳脫 HTML
- `takePending()`：取出並清空待載入清單
- `loadDiagrams(sources)`：先 `import("pele/lazy")`，再對每段原文 `detectType` → `load(type)`；失敗不快取，下次再試（同 `loadMarp`）

一般模式：`previewRenderer.code` 遇到 `lang === "mermaid"` 呼叫 `renderDiagram`，其他照原本的 renderer。
簡報模式：`loadMarp` 建好 Marp 後，包住 `marp.markdown.renderer.rules.fence`，`info` 是 `mermaid` 時呼叫 `renderDiagram`。

- 替代方案：用 `marked.use` 寫成 extension。不採用：會改到全域 marked，而且表格公式那邊已經用 `previewRenderer` 這個模式

### 載入完成後重新 render
`render()` 跑完呼叫 `takePending()`，有東西就放進結果（例如 `{ html, diagrams: [...] }`）。編輯器的 effect 看到 `diagrams` 不是空的，就呼叫 `loadDiagrams`，完成後遞增一個 state（例如 `diagramVersion`），讓 `render` 的 `useMemo` 重新計算。跟 Marp 的載入方式一樣，只是 Marp 只有一個布林值，這裡是「哪些類型載好了」，狀態存在 `diagram.js` 模組裡，React 只需要一個計數器來觸發重算。

### 安全
- DOMPurify 預設就允許 SVG 元素和 `style` 屬性，一般模式不用改設定；`FORBID_TAGS: ["style"]` 保留，Pele 本來就不輸出 `<style>`。簡報模式的 SVG 在 `foreignObject` 裡，也就是 HTML 整合點，裡面再放 inline SVG 是合法的 HTML
- Pele 選項：`links: false`、`images: false`，不輸出連結，也不從分享連結讀外部圖片；設 `limit`（原文長度）、`outputLimit`、`maxEdges`，超過時當作錯誤顯示，數值在實作時參考 Pele 的預設值決定
- 移除輸出裡所有 `id` 屬性（`svg.replace(/ id="[^"]*"/g, "")`）：沒有東西參照這些 id，而 id 直接用使用者寫的節點名稱，節點叫 `more-menu` 就會跟編輯器選單的 id 撞名。Pele 會把文字裡的 `"` 跳脫，這個 regex 不會誤刪標籤文字
- 替代方案：用 `idPrefix` 讓每張圖的 id 不同。不採用：實測 `idPrefix` 對節點 id 沒有作用，而且 id 本來就沒被參照，不會衝突

### 顏色與字型
`--pele-*` 變數設在預覽容器上，配合預覽現在的灰階和文字顏色；背景透明。簡報裡設 `--pele-fg`、`--pele-line` 為 `currentColor`，跟著 Marp 主題和 `invert` 頁變色。`fontFamily` 傳預覽用的字型，讓 Pele 用同一個字型量字寬。

### 字數
圖裡的文字會算進字數：`countChars` 是算預覽後看得到的文字，圖裡的字也是看得到的。不另外排除。

## Risks / Trade-offs

- [瀏覽器裡中文字寬估錯，節點框太窄] → Pele 在瀏覽器的 `defaultMeasurer` 應該會用 canvas 量字寬；實作第一步就先在瀏覽器實測中文流程圖，不準再傳自己的 `measurer`
- [投影片裡圖太高，超出頁面] → SVG 本來就有 `max-width:100%`；簡報 CSS 再加 `max-height`，用 `height:auto` 等比例縮小
- [每打一個字都重新渲染所有圖] → 實測一張圖約 1–7 ms；先不快取。如果多張圖時明顯卡頓，再用原文當 key 做快取（輸出是固定的，可以直接快取）
- [分享連結塞很多張圖] → 每張有 `limit` / `outputLimit` / `maxEdges` 擋；總張數暫不限制，有問題再加
- [Pele 是新套件，升版可能改輸出] → 版本鎖在 `1.8.0`；DOMPurify 是最後一道防線，就算 Pele 輸出有問題也不會變成 XSS
- [`registered` / `load` 等 lazy API 的行為跟型別宣告不一致] → 實作時先寫 `diagram.js` 的測試，在 Node 跑過載入流程

## Migration Plan

純前端，部署即生效，存檔資料不用轉換。回滾就是移除 `renderDiagram` 的兩個呼叫點，mermaid 區塊會變回一般程式碼區塊。

## Open Questions

- `limit`、`outputLimit`、`maxEdges` 的具體數值：看 Pele 預設值，再拿一張大圖實測
