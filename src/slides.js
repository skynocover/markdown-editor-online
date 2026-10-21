import { renderDiagram } from "./diagram.js";
import { display, isFormula, tableValues } from "./table-formula.js";
import { chartSource, parseChart } from "./table-chart.js";

// 簡報模式：檔頭 front matter 有 `marp: true` 時，用 Marp 把 --- 分隔的內容排成投影片
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

export const isSlides = (markdown) =>
  /^marp:\s*true\s*$/m.test(markdown.match(FRONT_MATTER)?.[1] ?? "");

export const stripFrontMatter = (markdown) =>
  markdown.replace(FRONT_MATTER, "");

// 簡報裡的表格：公式換成結果；上方有圖表註解就把註解和表格換成 ```mermaid，投影片只顯示圖
// 規則跟一般模式一樣（calcTables、markCharts），只是改在 markdown-it 的 token 上做
// 放在 inline 之後（格子已經解析成 children）、marpit_collect 之前（拿掉的註解不會變成講者備註）
const tableRule = (state) => {
  const { tokens } = state;
  const budget = { left: 1e7 }; // 整份簡報共用，跟一般模式一樣
  const lines = state.src.split("\n");
  let nested = 0; // 在引用、清單裡：一般模式只認頂層的圖表註解
  for (let i = 0; i < tokens.length; i++) {
    if (/^(blockquote|bullet_list|ordered_list)_(open|close)$/.test(tokens[i].type)) nested += tokens[i].nesting;
    if (tokens[i].type !== "table_open") continue;
    let end = i;
    const cells = [];
    for (; tokens[end].type !== "table_close"; end++) {
      if (tokens[end].type === "tr_open") cells.push([]);
      else if (tokens[end].type === "inline") cells.at(-1).push(tokens[end]);
    }
    const rows = cells.map((row) => row.map((t) => t.content));
    let values = null;
    try {
      values = tableValues(rows, budget);
    } catch {
      // 算不出來（超過預算、堆疊溢位）就照原文顯示
    }
    if (values)
      cells.forEach((row, r) =>
        row.forEach((t, c) => {
          if (!isFormula(rows[r][c])) return;
          const text = new state.Token("text", "", 0);
          text.content = display(values[r][c]);
          t.children = [text];
        }),
      );

    // markdown-it 不會為空行產生 token：要比對行號，中間隔空行就不算（跟一般模式一樣）
    // 用原文那一行判斷，不用 comment.content（已經去掉 <!-- -->，多行、多的 - 、後面有字都會被認成圖表）
    const comment = tokens[i - 1];
    const chart =
      !nested &&
      comment?.type === "marpit_comment" &&
      comment.map?.[1] === tokens[i].map?.[0] &&
      parseChart(lines.slice(comment.map[0], comment.map[1]).join("\n"));
    if (!chart) {
      i = end;
      continue;
    }
    let out;
    try {
      if (!values) throw new Error("表格無法計算");
      out = new state.Token("fence", "code", 0);
      out.info = "mermaid";
      out.content = chartSource(values, chart);
    } catch (e) {
      out = new state.Token("table_chart_error", "", 0);
      out.content = e.message;
    }
    out.map = [comment.map[0], tokens[i].map[1]];
    tokens.splice(i - 1, end - i + 2, out);
    i--;
  }
};

// ```mermaid 畫成圖：fence 規則直接回傳 HTML，不經過 Marp 的 HTML 白名單（html_block 裡的 <svg> 會被跳脫）
// 投影片 1280px 寬、內文約 29px（default 主題），用預設 16px 畫圖會小到看不清楚
export const setupMarp = (marp) => {
  const { rules } = marp.markdown.renderer;
  const fence = rules.fence;
  rules.fence = (tokens, idx, ...rest) =>
    tokens[idx].info.trim() === "mermaid"
      ? renderDiagram(tokens[idx].content, { fontSize: 28 })
      : fence(tokens, idx, ...rest);
  rules.table_chart_error = (tokens, idx) =>
    `<p class="diagram-error">${marp.markdown.utils.escapeHtml(tokens[idx].content)}</p>`;
  marp.markdown.core.ruler.before("marpit_collect", "table_charts", tableRule);
};

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
      const marp = new Marp({ script: false });
      setupMarp(marp);
      return marp;
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
