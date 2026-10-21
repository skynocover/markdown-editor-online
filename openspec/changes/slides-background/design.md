## Context

Marp 的背景圖寫成 `![bg 關鍵字...](網址)`，關鍵字之間用空白隔開，不認得的字會被當成替代文字。主要的關鍵字有：
- 位置：`left`、`right`，可以加比例，例如 `left:40%`
- 大小：`cover`（預設）、`contain`、`fit`、`auto`、`50%`、`w:`、`h:`
- 濾鏡：`blur`、`brightness`、`contrast`、`drop-shadow`、`grayscale`、`hue-rotate`、`invert`、`opacity`、`saturate`、`sepia`
- 排列：同一頁連續寫好幾張會橫向並排，`vertical` 改成上下排

`slides-preview-edit` 已經提供每頁的原文範圍（`slideRanges`）和單頁工具列。

## Goals / Non-Goals

**Goals:**
- 最常用的調整（左右分割、比例、調暗、填滿方式）不用記語法
- 面板沒有的設定原樣保留，絕不因為介面沒有這個選項就把它刪掉

**Non-Goals:**
- 亮度以外的濾鏡（`blur`、`grayscale`、`contrast`、`sepia` 等），以及 `w:`、`h:`、百分比縮放：手寫的會放進 `rest` 原樣保留。模糊、黑白不做的原因：比較少用，而且 `blur` 帶單位、`grayscale` 有數值又只適合做成開關，每多一個就多一組解析規則和預設值
- 多張背景圖的排列、`vertical`
- 投影片內一般圖片（非背景）的大小調整
- 上傳圖片：這個工具不存放檔案，只能貼網址

## Decisions

### 解析成「認得的部分 + 原樣保留的部分」
`readBackground(tokens, markdown, range)` 用 `slideRanges` 同一次 `marp.markdown.parse` 的結果，找這頁範圍內 alt 以 `bg` 開頭的 image token，算出背景圖的數量和第一張所在的行，再到那一行用正規表示式找出 `![bg ...](...)`。
- 不直接對原文用正規表示式：程式碼區塊和行內程式碼裡的 `![bg]` 都會被誤判，範本第 3 頁就有一個寫在行內程式碼裡的示範

把方括號裡的字逐一分類：
- 認得的字轉成欄位：`side`（`left`、`right` 或空）、`width`（只寫 `left`、`right` 沒帶比例時是 Marp 預設的 50%）、`fit`（`cover`、`contain`；`fit` 視為 `contain`）、`brightness`
- 其他字依原本的順序放進 `rest`

`brightness` 只寫名稱、不帶數值時，Marp 會當成 1.5（已驗證 `![bg brightness]` 會變成 `brightness(1.5)`），解析時要照這個值讀，不能當成不認得的字，否則再拉亮度會寫出 `brightness:0.5 brightness`。寫回時一律寫完整的 `brightness:數值`。寫了兩次時以最後一個為準，寫回時只留一個。

`writeBackground` 組回 `bg` + 欄位 + `rest`，並且只輸出跟預設值不同的欄位，例如 `brightness` 是 1、`fit` 是 `cover` 時不寫。找不到 `![bg` 時回傳 null，工具列顯示成「新增」。

### 拉桿放開時才寫回
拉桿在 `change`（放開）時才寫回原文，不在 `input`（拖動中）就寫。
- 原因：每次寫回都會產生一筆復原紀錄，一邊拖一邊寫的話，Ctrl+Z 要按幾十次
- 代價：拖動時預覽不會即時更新，放開才看到結果

### 新增時的預設值
預設用 `![bg right:40%](網址)`，也就是範本裡示範的左文右圖。插在這頁開頭的設定註解後面。網址裡的空白和括號要編碼（`%20`、`%28`、`%29`），避免 Markdown 的圖片語法斷掉。只換這三種字元，不用 `encodeURI`：網址裡已經有的 `%20` 會被重複編碼成 `%2520`。

### 移除背景圖
刪掉那個圖片語法所在的整行；如果那一行還有其他文字，就只刪圖片語法本身。

## Risks / Trade-offs

- [使用者手寫的替代文字跟關鍵字混在一起] → 不認得的字一律保留在 `rest`，順序不變
- [同一頁有多張背景圖] → 只調第一張，面板上註明「共 N 張，只調整第一張」
- [拖動拉桿時看不到即時效果] → 可以接受；之後如果真的需要，可以在拖動時用 CSS 暫時改預覽，不寫回原文
