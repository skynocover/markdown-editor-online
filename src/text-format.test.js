// 執行：node --test src/text-format.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toggleWrap } from "./text-format.js";

// 套用結果，回傳 [新文字, 選取範圍]
const apply = (value, start, end, mark) => {
  const r = toggleWrap(value, start, end, mark);
  return [value.slice(0, r.start) + r.text + value.slice(r.end), r.select];
};

test("包起來、再按一次拿掉", () => {
  assert.deepEqual(apply("a 重要 b", 2, 4, "**"), ["a **重要** b", [4, 6]]);
  assert.deepEqual(apply("a **重要** b", 4, 6, "**"), ["a 重要 b", [2, 4]]);
  assert.deepEqual(apply("a 重要 b", 2, 4, "*"), ["a *重要* b", [3, 5]]);
  assert.deepEqual(apply("a *重要* b", 3, 5, "*"), ["a 重要 b", [2, 4]]);
});

test("沒選字：插入一對符號，游標放中間", () => {
  assert.deepEqual(apply("ab", 1, 1, "**"), ["a****b", [3, 3]]);
});

test("粗體裡按斜體不拆粗體", () => {
  assert.deepEqual(apply("**重要**", 2, 4, "*"), ["***重要***", [3, 5]]);
});

test("開頭、結尾不會出錯", () => {
  assert.deepEqual(apply("重要", 0, 2, "**"), ["**重要**", [2, 4]]);
});

test("粗斜體裡按斜體拿掉斜體", () => {
  assert.deepEqual(apply("***a***", 3, 4, "*"), ["**a**", [2, 3]]);
});

test("選取範圍頭尾的空白不包進去", () => {
  assert.deepEqual(apply("word next", 0, 5, "**"), ["**word** next", [2, 6]]);
});
