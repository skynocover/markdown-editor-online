## 1. 預覽顯示備註

- [ ] 1.1 `renderSlides` 回傳 `notes`（每頁一個字串）
- [ ] 1.2 預覽在每個 `svg[data-marpit-svg]` 後面插入 `div.slide-notes`，用 `textContent` 放入備註；重插前先刪掉舊的 `div.slide-notes`，effect 依賴 html 和 notes；`Preview` 加 `editable` prop（`slides-preview-edit` 也要用；哪一份先做就由哪一份加，後做的直接用），唯讀預覽不顯示

## 2. 講者視窗

- [ ] 2.1 `page` 從 `Presenter` 移到外層 state；`Presenter` 加全螢幕按鈕和 `F` 鍵；講者模式不掛 `fullscreenchange → onExit`，離開全螢幕只回到視窗播放
- [ ] 2.2 「講者模式」按鈕：`window.open`、複製樣式表（`<link>` 用 `link.href` 絕對網址）、`createPortal`；不自動要求全螢幕；被擋時用 alert 提示並照常播放
- [ ] 2.3 `src/speaker-view.jsx`：目前頁、下一頁、備註、計時（可重設）、頁數、上一頁和下一頁按鈕；鍵盤事件要掛在主視窗的 `window` 和 `speakerWindow` 兩邊，講者視窗的 Esc 也結束播放
- [ ] 2.4 結束播放時關掉講者視窗，講者視窗的 `pagehide` 只關掉講者模式
- [ ] 2.5 在 Safari 確認講者視窗的投影片縮放，不正常的話對它的 document 再呼叫一次 `browser()`

## 3. 驗證與文件

- [ ] 3.1 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 都通過
- [ ] 3.2 用瀏覽器實際操作驗證：預覽顯示備註、備註裡的 HTML 不會執行、只改備註時舊的備註不會留著、兩個視窗同步換頁、講者模式按 F 進出全螢幕不會結束播放、結束時一起關掉、彈出視窗被擋時的提示
- [ ] 3.3 README 補上講者備註的寫法和講者模式，並說明分享連結也看得到備註；`SLIDES_TEMPLATE` 加一段備註範例
