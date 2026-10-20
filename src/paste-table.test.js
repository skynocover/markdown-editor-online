// 執行：node --test src/paste-table.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { tsvToTable, padTable } from "./paste-table.js";

test("2×2 資料轉成表格", () => {
  assert.equal(
    tsvToTable("名稱\t價格\n蘋果\t30"),
    "| 名稱 | 價格 |\n| --- | --- |\n| 蘋果 | 30 |",
  );
});

test("結尾的換行不會產生空白列", () => {
  const expected = "| a | b |\n| --- | --- |\n| c | d |";
  assert.equal(tsvToTable("a\tb\nc\td\n"), expected);
  assert.equal(tsvToTable("a\tb\r\nc\td\r\n"), expected);
});

test("空白儲存格保持空白", () => {
  assert.equal(tsvToTable("a\t\tc\n\t\t"), "| a |  | c |\n| --- | --- | --- |\n|  |  |  |");
});

test("不符合條件回傳 null", () => {
  assert.equal(tsvToTable("前言\n名稱\t價格\n蘋果\t30\n結語"), null); // 欄數不同
  assert.equal(tsvToTable("a\tb\tc"), null); // 單一列
  assert.equal(tsvToTable("a\nb\nc"), null); // 單一欄
  assert.equal(tsvToTable("一般文字"), null);
});

test("儲存格內容轉換", () => {
  assert.equal(tsvToTable("a|b\tx\n1\t2").split("\n")[0], "| a\\|b | x |");
  assert.equal(
    tsvToTable('"第一行\n第二行"\tx\n1\t2'),
    "| 第一行<br>第二行 | x |\n| --- | --- |\n| 1 | 2 |",
  );
  assert.equal(tsvToTable('"他說""好"""\tx\n1\t2').split("\n")[0], '| 他說"好" | x |');
  assert.equal(tsvToTable('5"\tx\n1\t2').split("\n")[0], '| 5" | x |');
  assert.equal(tsvToTable("  蘋果  \tx\n1\t2").split("\n")[0], "| 蘋果 | x |");
});

test("| 跳脫後預覽顯示正確", () => {
  const html = marked.parse(tsvToTable("a|b\tx\n1\t2"));
  assert.match(html, /<th>a\|b<\/th>/);
  assert.match(marked.parse(tsvToTable("a\\|b\tx\n1\t2")), /<th>a\\\|b<\/th>/);
  assert.match(marked.parse(tsvToTable("C:\\Users\tx\n1\t2")), /<th>C:\\Users<\/th>/);
});

test("沒有整格包住的引號照字面處理（網頁表格不加引號）", () => {
  assert.equal(tsvToTable('"hi" there\tx\n1\t2').split("\n")[0], '| "hi" there | x |');
  assert.equal(tsvToTable('"5 吋\tx\n1\t2').split("\n")[0], '| "5 吋 | x |');
  assert.equal(tsvToTable('"a"\t"b"\n1\t2').split("\n")[0], "| a | b |");
});

test("前後補空行", () => {
  const t = "T";
  assert.equal(padTable(t, "", ""), "T\n");
  assert.equal(padTable(t, "段落", ""), "\n\nT\n"); // 行尾
  assert.equal(padTable(t, "段落\n", ""), "\nT\n"); // 行首，前一行有字
  assert.equal(padTable(t, "段落\n\n", ""), "T\n"); // 前一行是空行
  assert.equal(padTable(t, "\n", ""), "T\n"); // 檔案開頭的空行
  assert.equal(padTable(t, "前", "後"), "\n\nT\n\n"); // 行中間
  assert.equal(padTable(t, "段落", "\n下一段"), "\n\nT\n");
});

test("在一行文字中間貼上，後面的文字不會變成表格的列", () => {
  const md = "前" + padTable(tsvToTable("a\tb\nc\td"), "前", "後") + "後";
  const html = marked.parse(md);
  assert.match(html, /<p>後<\/p>/);
});
