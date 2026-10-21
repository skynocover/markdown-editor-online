import { renderDiagram } from "./diagram.js";
import { display, isFormula, tableValues } from "./table-formula.js";
import { chartSource, parseChart } from "./table-chart.js";

// 簡報模式：檔頭 front matter 有 `marp: true` 時，用 Marp 把 --- 分隔的內容排成投影片
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;

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
- 「簡報設定」換主題、比例；滑鼠移到投影片上可以設成置中、深色、加背景圖，或新增、複製、刪除這一頁

<!-- 這是講者備註：一般的 HTML 註解只有預覽和「講者模式」看得到，放映時看不到 -->

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

// ── 在預覽調整簡報：每頁在原文的範圍、讀寫設定、新增複製刪除投影片 ──
// 都是「原文進、原文出」的純函式，以行為單位改寫，只動需要改的那幾行

// front matter 佔幾行，也就是第 1 頁從第幾行開始
const frontMatterLines = (markdown) =>
  markdown.match(FRONT_MATTER)?.[0].replace(/\r?\n$/, "").split("\n").length ?? 0;

// 只寫一個設定的註解，例如 <!-- _class: lead -->
// ponytail: 程式碼區塊裡剛好有一行一樣的註解也會被當成設定，真的遇到再改用 Marp 的 token 找
// 值不能跨過 -->：一行寫了好幾個註解時不算，整行換掉會把其他設定一起刪掉
const directiveLine = (key) => new RegExp(`^\\s*<!--\\s*${key}\\s*:(?:(?!-->).)*-->\\s*$`);

// YAML 特殊字元用 JSON 字串包起來（JSON 字串也是合法的 YAML），不然 `footer: 公司: 研發部` 會解析失敗
// 冒號後面接空白才特別，4:3 照寫；反斜線也要：Marp 把沒引號的值當成雙引號字串，C:\Users 的 \U 會讓整個 front matter 解析失敗
const yamlValue = (value) =>
  /: |:$| #|\\|^[\s\-?!&*|>%@`"'[{#]|\s$/.test(value) ? JSON.stringify(value) : value;

// 用 Marp 自己的解析器找每頁的範圍：程式碼區塊裡的 --- 不算分頁，*** 也能分頁
// 第 2 頁以後的 start 是分隔線那一行，end 是下一頁的 start（不含）；第 1 頁從 front matter 後面開始
// directives：這頁實際套用的設定（含延續下來的）；global：整份的設定（theme、size、headingDivider）
// bgs：這頁每張背景圖所在的行；用 Marp 的 image token 找，程式碼裡的 ![bg] 不算
// 算不出來（解析失敗、token 沒有行號）回傳 null，工具列就不顯示
export const slideRanges = (marp, markdown) => {
  let tokens;
  try {
    tokens = marp.markdown.parse(markdown, {}); // 沒給 env 的話，參考連結、註腳會丟錯
  } catch {
    return null;
  }
  const opens = tokens.filter((t) => t.type === "marpit_slide_open");
  if (!opens.length || opens.some((t) => !t.map)) return null;
  const starts = opens.map((t, i) => (i === 0 ? frontMatterLines(markdown) : t.map[0]));
  const total = markdown.split("\n").length;
  const bgs = opens.map(() => []);
  const spots = opens.map(() => new Set()); // 這頁 Marp 讀到的設定註解，程式碼區塊裡的不算
  let slide = -1;
  for (const t of tokens) {
    if (t.type === "marpit_slide_open") slide++;
    if (t.type === "marpit_comment" && slide >= 0) Object.keys(t.meta?.marpitParsedDirectives ?? {}).forEach((k) => spots[slide].add(k));
    // 整段只有背景圖時 Marp 會把它改成 marpit_hidden_inline
    if ((t.type !== "inline" && t.type !== "marpit_hidden_inline") || !t.map) continue;
    let line = t.map[0]; // 一段文字可能跨好幾行：數前面有幾個換行
    for (const c of t.children) {
      if (c.type === "softbreak" || c.type === "hardbreak") line++;
      if (c.type === "image" && c.meta?.marpitImage?.background) bgs[slide].push(line);
    }
  }
  return {
    slides: opens.map((t, i) => ({
      start: starts[i],
      end: starts[i + 1] ?? total,
      separator: i > 0,
      directives: t.meta.marpitDirectives,
      bgs: bgs[i],
      spots: spots[i],
    })),
    global: { ...marp.lastGlobalDirectives },
  };
};

// front matter 裡某個 key 的值（去掉引號），沒寫就是 undefined
export const readFrontMatter = (markdown, key) => {
  // 不跨行：`header:` 空值不能讀到下一行；下面接著 `- 值` 的是 YAML 陣列，讀成 [a, b]
  const m = markdown
    .match(FRONT_MATTER)?.[1]
    .match(new RegExp(`^${key}[ \\t]*:[ \\t]*(.*?)[ \\t]*$((?:\\n[ \\t]*-.*)*)`, "m"));
  if (!m) return undefined;
  const raw = m[1] || (m[2] && `[${m[2].split("\n").slice(1).map((l) => l.replace(/^\s*-\s*/, "").trim()).join(", ")}]`);
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw.replace(/^'(.*)'$/, "$1");
};

// 整份設定：theme、size 寫在註解裡就改最後一個（Marp 套用最後一個）
// paginate、header、footer 會從寫的那一頁往後延續，只改 front matter，中途的註解是使用者刻意寫的
// 都沒有就加在 front matter 最後面；值是空的就刪掉那一行
export const setGlobal = (markdown, key, value) => {
  const lines = markdown.split("\n");
  const fmEnd = frontMatterLines(markdown);
  const empty = value === "" || value == null;
  const text = empty ? "" : yamlValue(String(value));
  const write = (i, line) => {
    if (empty) lines.splice(i, 1);
    else lines[i] = line;
    return lines.join("\n");
  };
  if (key === "theme" || key === "size") {
    const re = directiveLine(key);
    const i = lines.findLastIndex((line, n) => n >= fmEnd && re.test(line));
    if (i >= 0) return write(i, `<!-- ${key}: ${text} -->`);
  }
  if (!fmEnd) return markdown; // 簡報一定有 front matter（marp: true）
  const re = new RegExp(`^${key}\\s*:`);
  const i = lines.findIndex((line, n) => n > 0 && n < fmEnd - 1 && re.test(line));
  if (i >= 0) {
    // 值是下面幾行的 YAML 陣列（`- lead`）時一起換掉，留著的話 front matter 會壞掉
    let n = i + 1;
    while (n < fmEnd - 1 && /^[ \t]*-/.test(lines[n])) n++;
    lines.splice(i + 1, n - i - 1);
    return write(i, `${key}: ${text}`);
  }
  if (empty) return markdown;
  lines.splice(fmEnd - 1, 0, `${key}: ${text}`);
  return lines.join("\n");
};

// 單頁設定：在這頁找 <!-- _key: ... -->，有就改，沒有就插在這頁開頭（分隔線下一行），null 就刪掉
export const setSpot = (markdown, range, key, value) => {
  const lines = markdown.split("\n");
  const re = directiveLine(`_${key}`);
  const i = lines.findIndex((line, n) => n >= range.start && n < range.end && re.test(line));
  const line = `<!-- _${key}: ${value} -->`;
  if (i >= 0) {
    if (value == null) lines.splice(i, 1);
    else lines[i] = line;
  } else if (value != null) {
    lines.splice(range.separator ? range.start + 1 : range.start, 0, line);
  }
  return lines.join("\n");
};

// 比較時統一格式：class 可能是 YAML 陣列或多個空白；paginate 沒寫等於 false，hold 也有顯示頁碼
const normalize = {
  class: (v) => (Array.isArray(v) ? v.join(" ") : (v ?? "")).split(/\s+/).filter(Boolean).join(" "),
  paginate: (v) => v === true || v === "hold",
};

// 只寫只影響當頁的 _key：跟「這頁不寫 _key 時會套用的值」（延續下來的）一樣就刪掉那一行，不一樣才寫
// 延續下來的值用拿掉這行後重新解析得到，跟 Marp 的規則一定一致
// class 是空的要寫 ""，才蓋得掉延續下來的 class
export const setSpotDirective = (marp, markdown, index, key, value) => {
  const range = slideRanges(marp, markdown)?.slides[index];
  if (!range) return markdown;
  const without = setSpot(markdown, range, key, null);
  const inherited = slideRanges(marp, without)?.slides[index]?.directives[key];
  if (normalize[key](value) === normalize[key](inherited)) return without;
  const text = key === "class" ? normalize.class(value) || '""' : String(value);
  const next = setSpot(markdown, range, key, text);
  // 設定寫在多行註解裡時 setSpot 找不到，插進去的那行會被後面的註解蓋掉：寧可不改也不寫一行沒作用的
  const applied = slideRanges(marp, next)?.slides[index]?.directives[key];
  return normalize[key](applied) === normalize[key](value) ? next : markdown;
};

// 置中（lead）、深色（invert）開關：從這頁實際套用的 class 增減，其他 class 原樣保留
export const toggleClass = (marp, markdown, index, name) => {
  const range = slideRanges(marp, markdown)?.slides[index];
  if (!range) return markdown;
  const classes = normalize.class(range.directives.class).split(" ").filter(Boolean);
  const next = classes.includes(name) ? classes.filter((c) => c !== name) : [...classes, name];
  return setSpotDirective(marp, markdown, index, "class", next.join(" "));
};

// 整份深色：front matter 的 class 加減 invert，其他 class 保留
// 頁裡的 _class 會整個蓋掉 front matter 的 class（封面的 _class: lead 最常見）：這些頁一起加減，每一頁才都跟著變
// 中途不帶底線的 class 註解不動，跟頁碼一樣是使用者刻意寫的
// front matter 的 class 是原文，可能是 [a, "b"] 這種 YAML 陣列：去掉括號、逗號、引號
const classList = (cls) => (Array.isArray(cls) ? cls.join(" ") : (cls ?? "")).split(/[\s,[\]"']+/).filter(Boolean);

export const isDark = (markdown) => classList(readFrontMatter(markdown, "class")).includes("invert");

export const setDark = (marp, markdown, dark) => {
  const edit = (cls) => {
    const list = classList(cls).filter((c) => c !== "invert");
    return (dark ? [...list, "invert"] : list).join(" ");
  };
  const next = setGlobal(markdown, "class", edit(readFrontMatter(markdown, "class")));
  // 只改 Marp 真的讀到 _class 的頁：程式碼區塊裡同樣的一行不算；別頁的修改不影響這頁的 _class，解析一次就夠
  return (slideRanges(marp, next)?.slides ?? []).reduce(
    (md, range, i) => (range.spots.has("_class") ? setSpotDirective(marp, md, i, "class", edit(range.directives.class)) : md),
    next,
  );
};

// 插入一段投影片：前一行有字的話先空一行，不然 --- 會變成上一段的標題底線
const insertLines = (lines, at, block) => {
  lines.splice(at, 0, ...(lines[at - 1]?.trim() ? ["", ...block] : block));
  return lines.join("\n");
};

// 在這頁後面插入一頁空白投影片
export const addSlide = (markdown, range) =>
  insertLines(markdown.split("\n"), range.end, ["---", "", ""]);

// 把這頁的原文（含分隔線）複製一份插在後面；第 1 頁沒有分隔線要補一條，front matter 不複製
export const duplicateSlide = (markdown, range) => {
  const lines = markdown.split("\n");
  const body = lines.slice(range.start, range.end);
  return insertLines(lines, range.end, range.separator ? body : ["---", ...body]);
};

// 整份共用的設定寫在哪一頁都一樣，刪頁時要留下來，不然整份簡報的主題、比例跟著變
const GLOBAL_LINE = /^\s*<!--\s*(theme|size|style|math|lang|headingDivider)\s*:.*-->\s*$/;

// 刪掉這頁；刪第 1 頁時連第 2 頁的分隔線一起刪，front matter 保留。只剩一頁不能刪
// 這頁的 theme、size、style 等整份設定的註解和 <style> 區塊留在原位；延續的 class、paginate 是這頁寫的內容，一起刪
export const deleteSlide = (markdown, slides, index) => {
  if (slides.length < 2) return markdown;
  const lines = markdown.split("\n");
  const { start, end } = slides[index];
  const removed = lines.splice(start, (index === 0 ? slides[1].start + 1 : end) - start);
  // 沒有 scoped 的 <style> 套用到整份，整個區塊照樣留下；程式碼區塊裡的是範例，跟著刪
  let inStyle = false;
  let inFence = false;
  const kept = removed.filter((line) => {
    const fence = !inStyle && /^\s*(```|~~~)/.test(line);
    if (fence) inFence = !inFence;
    if (fence || inFence) return false;
    if (!inStyle && /^\s*<style(?![^>]*\bscoped\b)[\s>]/.test(line)) inStyle = true;
    const keep = inStyle || GLOBAL_LINE.test(line);
    if (/<\/style>/.test(line)) inStyle = false;
    return keep;
  });
  lines.splice(start, 0, ...kept);
  return lines.join("\n");
};

// ── 背景圖：位置、寬度是整頁的，其他只調這頁第一張 ![bg ...](網址)，面板不認得的字原樣保留 ──

// 網址可以有一層成對的括號（維基百科常見），後面的 title 另外抓，寫回時原樣接上
// ponytail: 同一行前面剛好有行內程式碼寫的 ![bg] 會先被找到，真的遇到再用 token 的位置判斷
const BG = /!\[\s*bg(?:\s+([^\]]*))?\]\(\s*((?:[^\s()]|\([^\s()]*\))*)(\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

// 這頁每張背景圖的 match；同一行可以寫好幾張，用「這一行的第幾張」找
const bgMatches = (lines, bgs) =>
  bgs.map((line, i) => ({
    line,
    m: [...(lines[line] ?? "").matchAll(BG)][bgs.slice(0, i).filter((l) => l === line).length],
  }));

const words = (m) => (m[1] ?? "").split(/\s+/).filter(Boolean);

// left、right 沒帶比例是 Marp 預設的 50%
const isSide = (word) => /^(left|right)(:\d+(\.\d+)?%)?$/.test(word);

// 只換空白和括號：會讓圖片語法斷掉的只有這些；encodeURI 會把已經編碼的 %20 再編成 %2520
const encodeUrl = (url) =>
  url.trim().replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");

// 濾鏡的數值：沒帶數值用 Marp 的預設值，50% 換成 0.5；不是數字回傳 NaN，當成不認得的字
const filterValue = (value, preset) =>
  value === undefined ? preset : value.endsWith("%") ? parseFloat(value) / 100 : parseFloat(value);

// 拆成面板的欄位，其他字依原本順序放進 rest；沒有背景圖回傳 null
// 位置、寬度 Marp 以最後一張寫了 left、right 的為準，所以每張都要看；後面只寫 left、right 沒帶比例的不會把比例改回 50%
// brightness、opacity 沒帶數值是 Marp 預設的 1.5、0.5
// ponytail: 寫兩次 Marp 會疊加（brightness(0.3) brightness(0.8)），面板只認最後一個；面板自己只寫一個，手寫兩次很少見
// tone：完整的 grayscale 或 sepia（數值是 1）；只套一半的、兩個都寫時的第二個，面板表示不了，留在 rest
export const readBackground = (markdown, range) => {
  const found = bgMatches(markdown.split("\n"), range.bgs);
  const m = found[0]?.m;
  if (!m) return null;
  const bg = {
    line: found[0].line,
    bgs: range.bgs,
    count: range.bgs.length,
    url: m[2],
    title: m[3] ?? "",
    side: "",
    width: 50,
    fit: "cover",
    brightness: 1,
    opacity: 1,
    tone: "",
    rest: [],
  };
  for (const word of words(m).filter((w) => !isSide(w))) {
    const [key, value] = word.split(":");
    if (word === "cover" || word === "contain" || word === "fit" || word === "auto") {
      bg.fit = word === "fit" ? "contain" : word; // auto：原尺寸，面板多列一個選項，不放進 rest 才不會蓋掉選的值
    } else if ((key === "brightness" || key === "opacity") && !isNaN(filterValue(value, 1))) {
      bg[key] = filterValue(value, key === "brightness" ? 1.5 : 0.5);
    } else if ((key === "grayscale" || key === "sepia") && !bg.tone && filterValue(value, 1) === 1) {
      bg.tone = key;
    } else {
      bg.rest.push(word);
    }
  }
  for (const word of found.flatMap((f) => (f.m ? words(f.m) : [])).filter(isSide)) {
    const [side, width] = word.split(":");
    bg.side = side;
    if (width) bg.width = parseFloat(width);
  }
  return bg;
};

// 組回圖片語法：只寫跟預設值不同的欄位，rest 接在後面
const backgroundText = (bg) =>
  `![${[
    "bg",
    bg.side && `${bg.side}:${bg.width}%`,
    bg.fit !== "cover" && bg.fit,
    bg.brightness !== 1 && `brightness:${bg.brightness}`,
    bg.opacity !== 1 && `opacity:${bg.opacity}`,
    bg.tone,
    ...bg.rest,
  ]
    .filter(Boolean)
    .join(" ")}](${encodeUrl(bg.url)}${bg.title ?? ""})`;

// 把第 line 行 m 那段換成 text
const splice = (lines, line, m, text) => {
  lines[line] = lines[line].slice(0, m.index) + text + lines[line].slice(m.index + m[0].length);
};

// bg：readBackground 讀到的欄位改過後傳回來；第一張換成新的語法，其他張拿掉 left、right，位置只寫在第一張
// 從後面改回來：同一行有好幾張時，前面的位置才不會跑掉
export const writeBackground = (markdown, bg) => {
  const lines = markdown.split("\n");
  for (const { line, m, i } of bgMatches(lines, bg.bgs).map((f, i) => ({ ...f, i })).reverse()) {
    if (!m) continue;
    if (i === 0) splice(lines, line, m, backgroundText(bg));
    else if (words(m).some(isSide)) {
      splice(lines, line, m, `![${["bg", ...words(m).filter((w) => !isSide(w))].join(" ")}](${m[2]}${m[3] ?? ""})`);
    }
  }
  return lines.join("\n");
};

// 預設左文右圖（範本的示範）；插在這頁開頭的設定註解、空行後面，下面空一行跟內容隔開
export const addBackground = (markdown, range, url) => {
  const lines = markdown.split("\n");
  let at = range.separator ? range.start + 1 : range.start;
  while (at < range.end && /^\s*$|^\s*<!--.*-->\s*$/.test(lines[at])) at++;
  const text = backgroundText({ url, side: "right", width: 40, fit: "cover", brightness: 1, opacity: 1, tone: "", rest: [] });
  lines.splice(at, 0, ...(lines[at]?.trim() ? [text, ""] : [text]));
  return lines.join("\n");
};

// 那一行只有圖片語法就整行刪掉（連同下面多出來的空行），還有其他字就只刪圖片語法
export const removeBackground = (markdown, bg) => {
  const lines = markdown.split("\n");
  splice(lines, bg.line, bgMatches(lines, bg.bgs)[0].m, "");
  if (!lines[bg.line].trim()) {
    lines.splice(bg.line, 1);
    if (!lines[bg.line]?.trim() && !lines[bg.line - 1]?.trim()) lines.splice(bg.line, 1);
  }
  return lines.join("\n");
};
