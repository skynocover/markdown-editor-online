// 簡報模式：檔頭 front matter 有 `marp: true` 時，用 Marp 把 --- 分隔的內容排成投影片
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

export const isSlides = (markdown) =>
  /^marp:\s*true\s*$/m.test(markdown.match(FRONT_MATTER)?.[1] ?? "");

export const stripFrontMatter = (markdown) =>
  markdown.replace(FRONT_MATTER, "");

// Marp 連同主題、數學、語法上色有上百 KB：用到簡報才載入
// script:false：不要 Marp 塞進輸出的 <script>（反正也會被 DOMPurify 拿掉），改成自己跑 browser()
// browser() 掛在整個 document：Safari 的 SVG 縮放 polyfill，預覽和播放畫面都吃得到
let marpPromise;
export const loadMarp = () =>
  (marpPromise ??= Promise.all([
    import("@marp-team/marp-core"),
    import("@marp-team/marp-core/browser"),
  ]).then(
    ([{ Marp }, { browser }]) => {
      browser();
      return new Marp({ script: false });
    },
    (e) => {
      marpPromise = null; // 失敗不要快取，下次再試
      throw e;
    },
  ));

// @import 和 @font-face 不受 div.marpit 範圍限制：分享連結的簡報可以藉此改整個頁面、
// 用 unicode-range 逐字偷讀輸入框（內建主題都沒有內嵌 @font-face）
// @property 也是全域：重新註冊 Tailwind 的 --tw-* 變數就能改掉編輯器的外觀
// 只留 fonts.bunny.net：gaia 主題用它載字型，字型 CSS 只有 @font-face
// 換成空白不換成空字串：避免刪掉後前後接起來又湊出一個 @font-face
export const stripImports = (css) =>
  css
    .replace(/@import\s+(?!["']https:\/\/fonts\.bunny\.net\/)[^;]*;/gi, " ")
    .replace(/@(?:font-face|property)\b[^{]*\{[^}]*\}/gi, " ");

export const SLIDES_TEMPLATE = `---
marp: true
theme: gaia
paginate: true
---

<!-- _class: lead -->
<!-- _paginate: false -->

# 簡報標題

副標題或講者名稱

---

# 條列重點

- 用 \`---\` 分頁
- 第一行的 \`marp: true\` 開啟簡報模式
- 按右上角「播放」全螢幕，← → 換頁、Esc 離開

---

![bg right:40%](https://picsum.photos/id/29/800/900)

# 左文右圖

\`![bg right:40%](圖片網址)\`
圖片放右邊佔 40%，改成 \`left\` 放左邊

---

![bg brightness:0.5](https://picsum.photos/id/10/1280/720)

# 滿版背景圖

\`![bg brightness:0.5](圖片網址)\` 調暗讓字看得清楚

---

<!-- _class: invert -->

# 深色頁

\`<!-- _class: invert -->\` 只套用到這一頁
主題可換 \`default\`、\`gaia\`、\`uncover\`
`;
