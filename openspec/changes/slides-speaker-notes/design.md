## Context

規劃時做了驗證：`marp.render(md)` 回傳的 `comments` 是依頁分組的陣列，例如 `[["備註一","備註二"], []]`。設定用的註解（`<!-- _class: lead -->`）不會出現在裡面。投影片 HTML 本身不包含備註。

`Presenter` 目前是一個全螢幕的覆蓋層：自己管理 `page`，用 `nth-of-type` 的 CSS 只顯示一頁，在 `window` 上聽鍵盤事件。

## Goals / Non-Goals

**Goals:**
- 寫備註的時候看得到備註放在哪一頁
- 接投影機報告時，觀眾只看到投影片，講者在自己的螢幕上看到備註、下一頁和時間

**Non-Goals:**
- 播放時在同一個畫面顯示備註：接投影機通常是同步顯示，觀眾也看得到
- 用 Window Management API 自動把視窗放到第二個螢幕：只有 Chrome 支援，還要另外取得權限
- 手機遙控、排練計時、錄製每頁時間
- 在預覽直接編輯備註：在原文改就好

## Decisions

### 備註跟著 render 的結果一起傳
`renderSlides` 回傳 `{ slides, html, css, notes }`，其中 `notes` 是 `comments` 每頁的字串陣列，以兩個換行串起來。唯讀預覽的 `view` 也會有 `notes`，但不顯示。

### 預覽的備註用 DOM 插入純文字
預覽的投影片是一整段 `dangerouslySetInnerHTML`。在 `useLayoutEffect` 裡找出每個 `svg[data-marpit-svg]`，在後面插入 `div.slide-notes`，用 `textContent` 放入備註（`white-space: pre-wrap`），html 或 notes 改變時重插。
- 用 `textContent`，不用 innerHTML：分享連結的內容不可信任，備註不能被當成 HTML 執行
- 不在 HTML 字串裡用 `</svg>` 切開：投影片內容裡也可能有巢狀的 svg（例如數學公式）
- 預覽的 `{__html}` 已經用 `useMemo` 記住，React 不會把插入的節點洗掉
- 只在 `Preview` 的 `editable` 為 true 時插入；`editable` 取代目前用有沒有傳 `tableEvents` 分辨唯讀的做法
- 備註佔投影片下方，`slides-preview-edit` 的單頁工具列放在投影片右上角，兩者不重疊

### 講者視窗用 portal 渲染，不用 BroadcastChannel
點「講者模式」時，在同一次點擊裡：
1. 用 `window.open("", "speaker", ...)` 開一個空白的同源視窗
2. 把主頁面 `<head>` 裡的樣式表複製過去；`<link>` 用解析後的絕對網址 `link.href`，空白頁的相對路徑不一定解析得到
3. 用 `createPortal` 把 `SpeakerView` 渲染進那個視窗的 `document.body`
4. 主視窗進入 `Presenter` 並要求全螢幕

`page` 從 `Presenter` 移到外層的 state，兩個視窗共用，所以天然就是同步的，不需要訊息傳遞。鍵盤事件在主視窗和講者視窗的 `window` 都要聽，按鍵的意義相同；在講者視窗按 Esc 也是結束播放。
- 不用 BroadcastChannel 加獨立頁面：那樣要多一個建置入口，還要自己處理狀態同步。portal 只多一個元件
- 講者視窗的 `pagehide` 事件只把講者模式關掉；結束播放時呼叫 `speakerWindow.close()`

### 講者視窗的版面
```
┌──────────────────────────┬─────────────────┐
│                          │  下一頁（縮小）   │
│        目前頁             │                 │
│                          ├─────────────────┤
├──────────────────────────┤  ⏱ 12:34  重設   │
│ 備註（大字，可以捲動）      │  3 / 10  ◀  ▶   │
└──────────────────────────┴─────────────────┘
```
目前頁和下一頁是兩份 `doc.html`，各自用 `nth-of-type` 只顯示一頁，做法跟 `Presenter` 一樣。計時從開啟講者視窗時開始，可以重設。

### 全螢幕
瀏覽器只允許使用者的操作觸發全螢幕，而 `window.open` 會用掉這次點擊的使用者操作權限，所以講者模式下主視窗的全螢幕要求預期幾乎都會失敗。講者模式就不要求全螢幕，直接把「拖到投影機再切全螢幕」當成主要流程：主視窗的播放畫面角落提供「全螢幕」按鈕，也可以按 `F`。一般播放照舊直接全螢幕。

## Risks / Trade-offs

- [彈出視窗被擋] → `window.open` 回傳 null 時用 alert 提示允許彈出視窗，並照常開始一般播放
- [Safari 的 SVG 縮放 polyfill（`browser()`）只掛在主頁面的 document] → 實作時要確認講者視窗的投影片縮放是否正常；不正常的話，對講者視窗的 document 再呼叫一次 `browser()`
- [備註會隨著原文一起被分享] → README 和講者模式按鈕的提示文字說明這一點
- [複製到講者視窗的樣式表在開發模式下會熱更新] → 只影響開發，不處理
