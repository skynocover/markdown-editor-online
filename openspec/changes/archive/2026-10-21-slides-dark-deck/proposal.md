## Why

「簡報設定」只能換主題、比例、頁碼、頁首頁尾，想要整份簡報都是深色，只能一頁一頁按「深色」。Marp 本來就支援在 front matter 寫 `class: invert` 讓每一頁都變深色，只是面板沒有對應的開關。

## What Changes

- 「簡報設定」面板加一個「深色」開關（在簡報設定裡，就是整份的意思），在 front matter 的 `class` 加入或移除 `invert`，`class` 裡其他的值原樣保留
- 頁裡寫了 `<!-- _class: ... -->` 的頁面（例如封面的 `_class: lead`）會蓋掉 front matter 的 `class`；切換開關時這些頁也一起加減 `invert`，結果是每一頁都跟著變
- 之後仍可以用單頁工具列的「深色」開關個別調整某一頁
- 深色打開時，主題卡片改成各主題的深色版，選主題時看得到實際效果
- 面板依類別分組：外觀（主題、深色）、比例、每頁資訊（頁碼、頁首、頁尾），組之間用分隔線隔開
- 不做：中途頁裡不帶底線的 `<!-- class: ... -->` 註解不動（跟頁碼一樣，中途的註解是使用者刻意寫的）

## Capabilities

### New Capabilities
（無）

### Modified Capabilities
- `slides-edit`: 整份簡報設定多一個「深色」開關

## Impact

- `src/slides.js`：新增 `setDark(marp, markdown, dark)`，測試加在 `src/slides.test.js`
- `src/slide-tools.jsx`：設定面板加開關、重排分組、主題卡片的深色配色；頁碼和深色兩個開關共用一個 switch 元件
- 存檔格式、分享連結不變
