## Context

檔頭有 `marp: true` 時，`render` 用 Marp 把原文排成投影片：每頁是 `div.marpit` 底下的一個 `svg[data-marpit-svg]`，裡面的 `<section id="N">` 從 1 開始編號。結果經過 DOMPurify 過濾後放進預覽。Marp 等到第一次遇到簡報時才載入（`loadMarp`）。原文是唯一的資料來源。

規劃時做了驗證：`marp.markdown.parse(md)` 產生的 `marpit_slide_open` token 帶有 `map`（原文行號），也帶有 `meta.marpitDirectives`（這頁實際套用的設定）。程式碼區塊裡的 `---` 不會被當成分頁，`***` 可以分頁。

## Goals / Non-Goals

**Goals:**
- 不用學 Marp 語法，就能完成換主題、做封面頁、做深色頁、調整頁序
- 每個控制項只對應一行看得懂的 Marp 語法
- 找不到原文位置時不給操作，絕不寫錯位置

**Non-Goals:**
- 顏色調色盤（`backgroundColor`、`color`）：主題和深色頁已經涵蓋需求，真的需要可以自己手寫
- 字體、字級、分欄：Marp 沒有這種設定，要寫 CSS 或 HTML
- 在預覽直接改文字、拖拉元素位置：預覽元素對不回原文，Markdown 也沒有座標
- 調整頁序（上移、下移、縮圖側欄、拖拉排序）：在原文剪下貼上。不做上移、下移的原因：
  - 工具列跟著滑鼠所在的那一頁，下移後滑鼠底下換成另一頁，連按會移到別頁，要讓工具列和捲動位置跟著被移動的那一頁走才好用
  - 頁裡不帶底線的 `class`、`paginate`、`footer` 會往後延續，移動這頁會改到其他頁的樣子
  - 一次只能移一格，移遠一點反而比在原文剪下貼上慢
- 背景圖（在 `slides-background` 處理）、講者備註（在 `slides-speaker-notes` 處理）

## Decisions

### 用 Marp 自己的解析器找每頁的範圍
`slideRanges(marp, markdown)` 呼叫 `marp.markdown.parse`，從每個 `marpit_slide_open` 的 `map[0]` 取得每頁的起始行，下一頁的起始行就是這頁的結尾，最後一頁到原文結尾。第 2 頁以後的第一行是分隔線（`---` 或 `***`）。第 1 頁的 `map[0]` 是 0，範圍包含 front matter，要另外改成從 front matter 結束的下一行開始，否則刪除、複製第 1 頁會連 front matter 一起處理到。同時記下 `meta.marpitDirectives`，工具列用它顯示目前的狀態。
- 只在點擊或滑鼠移過去時才算，不在每次打字時算：解析一次要幾 ms，而且只有用到工具時才需要
- 不自己用 `---` 切：會被程式碼區塊和 `headingDivider` 搞錯
- 第 N 頁就是第 N 個 `svg[data-marpit-svg]`，跟 `Presenter` 數頁數的方式一樣

### 整份設定：`theme`、`size` 改最後一次出現的位置，`paginate`、`header`、`footer` 只改 front matter
設定面板的五個 key 在 Marp 裡分成兩種（已驗證）：
- `theme`、`size` 是整份共用的設定：可以寫在 front matter，也可以寫在任何一頁的 `<!-- theme: x -->`，後面出現的會蓋過前面的，整份只有一個值
- `paginate`、`header`、`footer` 是從這頁往後延續的設定：寫在第 3 頁的 `<!-- paginate: false -->` 只影響第 3 頁以後，第 1、2 頁還是 front matter 的值

`setGlobal(markdown, key, value)` 的規則：
1. `theme`、`size` 有寫在註解裡的話，改最後一個註解（只認一個註解只寫這一個 key 的情況）
2. 否則改 front matter 裡那一行；`paginate`、`header`、`footer` 一律只走這一步，不改任何註解
3. 都沒有的話，加在 front matter 的最後一行
4. 值是空的（例如清空頁首、頁尾）就刪掉那一行

設定面板的初始狀態：`theme`、`size` 用最後一頁實際套用的值（`marpitDirectives`）；`paginate`、`header`、`footer` 讀 front matter 那一行，沒寫就是未開啟、空白。
- 不用「實際套用的值」顯示 `paginate`、`header`、`footer`：每頁可能不同，設定面板不知道該顯示哪一頁
- 改 `paginate`、`header`、`footer` 也不去改中途的 `<!-- paginate: false -->` 註解：那是使用者刻意從某頁開始改的，設定面板只管開頭的預設值

- 只改那一行，不重新產生整個 front matter：保留使用者的註解和排列順序
- 不引入 YAML 套件：這五個 key 都是單行的純量
- 值有 YAML 特殊字元時（`:`、`#`、開頭是 `-`、`[`、`{`、引號等）用 `JSON.stringify` 包起來，JSON 字串本身就是合法的 YAML；不然 `footer: 公司: 研發部` 會讓 Marp 解析失敗

### 單頁設定：只寫只影響當頁的 `_` 版本
`setSpot(markdown, range, key, value)` 在這頁找 `<!-- _key: ... -->`，有就改，沒有就插在這頁開頭（分隔線下一行；第 1 頁插在 front matter 後面），傳入 `null` 就刪掉那一行。
- 不寫沒有底線的 `class:`：它會延續套用到後面每一頁，按了以後後面的投影片也跟著變，使用者會很困惑
- 「置中」、「深色」是兩個開關，在 class 裡加入或移除 `lead`、`invert`，其他 class 原樣保留
- 只有 gaia 主題有 `lead` 的樣式（已驗證 default、uncover 的 CSS 沒有 `.lead`；uncover 本來就全部置中），其他主題「置中」變灰並提示；這頁已經有 `lead` 時照樣可以關掉
- Tailwind 掃到程式碼裡的 `invert` 會產生 `filter: invert` 的同名樣式，把深色頁的顏色反轉；`index.css` 用 `@source not inline("invert")` 禁止產生
- 這頁的狀態從 `marpitDirectives.class` 讀，它已經是這頁實際套用的值（延續下來的 `class:` 或這頁的 `_class:`）
- 新的值要從實際套用的 class 增減，不能只看這頁的 `_class` 那一行：有寫 `_class` 的頁面，延續下來的 `class` 會整個被蓋掉。例如延續 `class: invert` 的頁面按「置中」，要寫 `_class: invert lead`，只寫 `lead` 深色就不見了
- 寫入規則：新的值跟「這頁不寫 `_class` 時會套用的值」（也就是延續下來的 `class`）相同，就刪掉 `_class` 那一行；不同就寫入。空值寫成 `<!-- _class: "" -->`，用來蓋掉延續下來的 class（已驗證 Marp 會解析成空字串）
- `_paginate` 同理：延續下來的 `paginate` 已經是 false 時不寫；要隱藏頁碼就寫 `false`，取消就刪掉那一行

### 投影片操作只搬移原文片段
- 新增：在這頁結尾插入 `\n---\n\n`
- 複製：把這頁的原文（含分隔線）插在下一頁前面；第 1 頁要另外補一條分隔線
- 刪除：刪掉這頁的範圍；刪第 1 頁時改成刪掉第 1 頁的內容和第 2 頁的分隔線，front matter 保留。只剩一頁時不能刪。這頁的 `<!-- theme -->`、`<!-- size -->` 註解留下來（整份共用，刪了整份簡報會變）；延續的 `class`、`paginate` 是這頁寫的內容，一起刪
- 寫在多行註解裡的設定找不到那一行：寫完重新解析，沒生效就不改原文，不留一行沒作用的設定
- 有設定 `headingDivider` 時隱藏這些操作：那種簡報的分頁沒有分隔線，改寫原文的結果難以預測。版型和頁碼的開關照樣可以用

### 整份設定放在工具列的面板，單頁工具疊在預覽上
整份設定是做簡報時設一次就不太動的東西，不常駐在預覽上方佔空間；跟播放、講者模式放在一起，整份簡報的操作集中在同一個地方。主題用小卡片顯示底色和字型，不用點就看得出風格；卡片下方一句話說明滑鼠所在（沒有就是目前）的主題適合什麼簡報。頁首、頁尾跟其他設定一樣排成一行；按 Enter 或離開輸入框就寫入，點外面、按 Esc 關掉面板也會離開輸入框，所以不另外提示「按 Enter 套用」。

停用的按鈕（非 gaia 主題的「置中」、只剩一頁的「刪除」）滑鼠移上去要說明原因。不用原生 `title`：要停一秒以上才出現。改用工具列已有的 `Tip`（搬到 `src/tip.jsx` 共用），停用時只把字變灰，不用 opacity，不然提示也跟著變淡。

跟 `TableTools` 一樣，量 svg 的位置後把工具列疊在投影片右上角，不動預覽的 HTML。投影片下方留給 `slides-speaker-notes` 的備註，兩個功能都做完時才不會互相蓋住。整份設定放在頂端工具列的「簡報設定」面板（原生 popover），跟播放、講者模式連成一組，只在簡報時出現，後面用直線跟通用按鈕隔開。每次修改都經過 `replaceText`，所以可以用 Ctrl+Z 還原。

`Preview` 目前用有沒有傳 `tableEvents` 分辨唯讀，簡報分支沒用到它。改成明確的 `editable` prop，簡報工具和講者備註都看它決定要不要顯示。

## Risks / Trade-offs

- [原文裡有 Marp 解析不了的寫法，例如 front matter 格式錯誤] → 算不出範圍的話就隱藏工具列
- [front matter 裡有多行值、引號或註解] → 只處理 `key: value` 單行格式；找不到那一行就加在最後面，不改寫其他行
- [刪除投影片一次可能刪掉很多內容] → 可以用 Ctrl+Z 還原，不另外跳確認視窗
- [複製的頁面裡有整份設定的註解，例如 `<!-- theme: gaia -->`] → 原文會多一行一樣的註解，值相同所以效果不變；之後 `setGlobal` 改最後一個，跟 Marp 套用最後一個的規則一致
