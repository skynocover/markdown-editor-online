## Why

現在的播放模式只能換頁，上台報告時看不到講稿。Marp 本來就支援講者備註（投影片裡的一般 HTML 註解），`marp.render()` 也會依頁回傳，但 `renderSlides` 沒有用到，寫了備註也看不到。

## What Changes

- 編輯模式的簡報預覽，在每張投影片下方用淡色小字顯示這頁的備註
- 播放按鈕旁邊新增「講者模式」按鈕：
  - 主視窗照樣播放投影片，給觀眾看
  - 另外開一個講者視窗，顯示目前頁、下一頁、備註、經過時間和頁數
- 兩個視窗同步換頁，在任何一個視窗按方向鍵或點按鈕都能換頁
- 結束播放時一起關掉講者視窗；只關掉講者視窗的話，播放照樣繼續
- 瀏覽器擋掉彈出視窗時，提示使用者允許
- 不做：播放時在同一個畫面顯示備註（接投影機時觀眾也看得到）、自動把視窗放到第二個螢幕、手機遙控、排練計時

## Capabilities

### New Capabilities
- `speaker-notes`: 在預覽顯示講者備註，以及播放時的講者視窗

### Modified Capabilities
（無）

## Impact

- `src/markdown-editor.jsx`：`renderSlides` 多回傳 `comments`；預覽顯示備註（`Preview` 加 `editable` prop，`slides-preview-edit` 也用它）；`Presenter` 用 portal 把講者視窗畫過去，目前頁數兩邊共用
- 新增 `src/speaker-view.jsx`：講者視窗的內容
- 備註是 Markdown 原文的一部分，用分享連結分享時對方看得到原文，備註也會看到；README 要說明這一點
- 跟 `slides-preview-edit`、`slides-background` 沒有依賴關係，可以分開做
- 不新增套件
