// 簡報模式：檔頭 front matter 有 `marp: true` 時，用 Marp 把 --- 分隔的內容排成投影片
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;

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
- 「簡報設定」換主題、比例；滑鼠移到投影片上可以設成置中、深色，或新增、複製、刪除這一頁

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
  return {
    slides: opens.map((t, i) => ({
      start: starts[i],
      end: starts[i + 1] ?? total,
      separator: i > 0,
      directives: t.meta.marpitDirectives,
    })),
    global: { ...marp.lastGlobalDirectives },
  };
};

// front matter 裡某個 key 的值（去掉引號），沒寫就是 undefined
export const readFrontMatter = (markdown, key) => {
  const raw = markdown
    .match(FRONT_MATTER)?.[1]
    .match(new RegExp(`^${key}\\s*:\\s*(.*?)\\s*$`, "m"))?.[1];
  if (raw === undefined) return undefined;
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
  if (i >= 0) return write(i, `${key}: ${text}`);
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
