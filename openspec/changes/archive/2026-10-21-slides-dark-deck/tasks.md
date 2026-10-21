## 1. 實作

- [x] 1.1 `src/slides.js`：`setDark(marp, markdown, dark)`，front matter 的 `class` 加減 `invert`，寫了 `_class` 的頁用 `setSpotDirective` 一起加減
- [x] 1.2 `src/slides.test.js`：保留其他 class、沒有 class 時新增、關掉時刪掉那一行、封面 `_class: lead` 跟著變深色再變回來、原文回到原樣
- [x] 1.3 `src/slide-tools.jsx`：設定面板加「深色」開關，頁碼和深色共用 `Switch`；按鈕提示補上深色
- [x] 1.4 主題卡片：深色打開時換成各主題的深色配色
- [x] 1.5 面板分組：主題、深色｜比例｜頁碼、頁首、頁尾，組之間加分隔線

## 2. 驗證

- [x] 2.1 瀏覽器：開關切換時每一頁跟著變，Ctrl+Z 還原；單頁「深色」照樣能個別調整
- [x] 2.2 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 通過
