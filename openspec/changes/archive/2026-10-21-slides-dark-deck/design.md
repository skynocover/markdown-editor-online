## Context

- Marp 的 `class` 寫在 front matter 時套用到每一頁；頁裡的 `_class` 只影響那一頁，而且會整個蓋掉延續下來的 `class`
- 單頁工具列的 `toggleClass`、`setSpotDirective` 已經處理「從實際套用的 class 增減、跟延續下來的一樣就刪掉那一行」
- 設定面板的頁碼、頁首、頁尾只讀寫 front matter（`readFrontMatter`、`setGlobal`）

## Decisions

### 開關狀態只看 front matter
開關打開 = front matter 的 `class` 裡有 `invert`。跟頁碼一樣不看中途的註解，也不看每頁實際套用的結果，狀態才不會因為某一頁的設定而變來變去。

### 寫入：front matter 加減 invert，有 `_class` 的頁一起改
1. `setGlobal(markdown, "class", …)`：front matter 的 `class` 加入或移除 `invert`，其他值保留；變成空的就刪掉那一行
2. 重新解析，找出寫了 `_class` 的頁，用 `setSpotDirective` 把這頁實際套用的 class 加減 `invert`；跟延續下來的值一樣時 `setSpotDirective` 會刪掉那一行，所以關掉時，打開時留下的 `_class: ""` 這類多餘的行也會被清掉
- 只改寫了 `_class` 的頁：其他頁本來就照 front matter，不用動；簡報裡 `_class` 通常只有封面幾頁，重新解析的次數少
- 替代方案：只改 front matter。不採用：封面的 `_class: lead` 會蓋掉 `class: invert`，按了開關封面還是淺色，看起來像壞掉
- 替代方案：只改 front matter，用 Marp 的 `class` 陣列或 CSS 讓 `_class` 疊加。Marp 沒有這種寫法

### 共用 switch 元件
面板裡頁碼和深色兩個開關長得一樣，抽成 `Switch`，不另外加套件。

### 主題卡片跟著深色
卡片是預覽，深色打開時換成各主題深色版的背景和文字色，顏色取自 Marp 主題 CSS 的深色值：default `#0d1117` / `#e6edf3`、gaia `#455a64` / `#fff8e1`、uncover `#202228` / `#fff`。寫死在 `THEMES` 裡，不在執行時讀 Marp 的 CSS：只有三個內建主題，Marp 升版改色時卡片只是預覽稍微不準。

### 面板分組
順序改成：主題、深色（外觀）｜比例｜頁碼、頁首、頁尾（每頁上的資訊），組之間用細分隔線。深色緊接主題，因為兩個一起決定投影片的樣子。標籤用「深色」：在「簡報設定」裡已經是整份的意思，單頁工具列的「深色」有提示「這頁改成深色」，不會混淆。

## Risks / Trade-offs

- [中途有 `<!-- class: lead -->` 的話，那頁之後的頁面照它的 class，開關打開了那些頁還是淺色] → 跟頁碼的處理一樣，中途的註解是使用者刻意寫的；README 不特別說明，單頁工具列看得到每頁的實際狀態
- [關掉時，原本個別設成深色的頁也會變淺色] → 開關的意思是「整份」；之後再用單頁的「深色」調整
