// 執行：node --test src/preview-edit.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import {
  markTables,
  markTasks,
  previewRenderer,
  readTable,
  writeTable,
  addRow,
  addCol,
  deleteRow,
  deleteCol,
  moveRow,
  moveCol,
  rangeRef,
  canPickRef,
} from "./preview-edit.js";
import { calcTables } from "./table-formula.js";
import { markCharts } from "./table-chart.js";

const md = "# 標題\n\n| a\\|b | :c: | d |\n|:--|:-:|--:|\n| \\=x | `y` | 1 |\n\n> | q |\n> | --- |\n> | 1 |\n\n結尾";

test("頂層表格記下原文位置，引用裡的不記", () => {
  const opts = { ...marked.defaults, renderer: previewRenderer };
  const tokens = marked.lexer(md, opts);
  markTables(tokens);
  const html = marked.parser(tokens, opts);
  const starts = [...html.matchAll(/data-start="(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(starts, [md.indexOf("| a")]);
});

test("讀出表格再原樣寫回，原文不變", () => {
  const start = md.indexOf("| a");
  const table = readTable(md, start);
  assert.deepEqual(table.grid, [["a|b", ":c:", "d"], ["\\=x", "`y`", "1"]]);
  assert.equal(md.slice(start, table.end), "| a\\|b | :c: | d |\n|:--|:-:|--:|\n| \\=x | `y` | 1 |");
  assert.equal(
    writeTable(table.grid, table.align),
    "| a\\|b | :c: | d |\n| :--- | :---: | ---: |\n| \\=x | `y` | 1 |",
  );
  assert.equal(readTable(md, 0), null); // 不是表格
});

test("新增、刪除、移動欄列", () => {
  const t = readTable("| a | b |\n|:-:|---|\n| 1 | 2 |\n| 3 | 4 |", 0);
  addRow(t);
  addCol(t);
  assert.equal(writeTable(t.grid, t.align), "| a | b |  |\n| :---: | --- | --- |\n| 1 | 2 |  |\n| 3 | 4 |  |\n|  |  |  |");
  deleteRow(t, 3);
  deleteCol(t, 2);
  moveRow(t, 2, 1);
  moveCol(t, 0, 1);
  assert.deepEqual(t.grid, [["b", "a"], ["4", "3"], ["2", "1"]]);
  assert.deepEqual(t.align, [null, "center"]);
});

test("點格子插入座標", () => {
  assert.equal(rangeRef([1, 1], [1, 1]), "B2");
  assert.equal(rangeRef([4, 2], [1, 1]), "B2:C5"); // 往左上拖也是左上到右下
  assert.equal(canPickRef("=", 1), true);
  assert.equal(canPickRef("=B2*", 4), true);
  assert.equal(canPickRef("=SUM(", 5), true);
  assert.equal(canPickRef("=SUM(B2, ", 9), true);
  assert.equal(canPickRef("=5", 2), false); // 數字後面
  assert.equal(canPickRef("=B2", 3), false);
  assert.equal(canPickRef("a+", 2), false); // 不是公式
  assert.equal(canPickRef("=B2*C2", 0), false);
});

test("checkbox 記下原文裡 [ ] 的位置：巢狀、鬆散清單、引用都可以，程式碼區塊裡的不算", () => {
  const md = "# t\n\n- [ ] 買牛奶\n- [x] 寄信\n  - [ ] 子項目\n  - [ ] 子項目二\n\n1. [X] 編號\n\n- [ ] 鬆散\n\n- [ ] 清單\n\n> - [ ] 引用裡\n\n```\n- [ ] 程式碼\n```\n";
  const opts = { ...marked.defaults, renderer: previewRenderer };
  const tokens = marked.lexer(md, opts);
  markTasks(tokens);
  const html = marked.parser(tokens, opts);
  const positions = [...html.matchAll(/data-pos="(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(
    positions.map((p) => md.slice(p - 1, md.indexOf("\n", p))),
    ["[ ] 買牛奶", "[x] 寄信", "[ ] 子項目", "[ ] 子項目二", "[X] 編號", "[ ] 鬆散", "[ ] 清單", "[ ] 引用裡"],
  );
  assert.match(html, /<input checked="" data-pos="\d+" type="checkbox"> 寄信/);
});

test("清單裡的程式碼區塊也有 - [ ]：對不上就整個清單都不記", () => {
  const md = "- [ ] a\n\n  ```\n  - [ ] b\n  ```\n";
  const tokens = marked.lexer(md);
  markTasks(tokens);
  const html = marked.parser(tokens, { ...marked.defaults, renderer: previewRenderer });
  assert.doesNotMatch(html, /data-pos/);
});

test("有列的格數比表頭多：不給編輯，不然多的格子寫回去會不見", () => {
  assert.equal(readTable("| a | b |\n|---|---|\n| 1 | 2 | 3 |", 0), null);
  assert.equal(readTable("| a | b |\n|---|---|\n| `x|y` | 2 |", 0), null);
  assert.notEqual(readTable("| a | b |\n|---|---|\n| x\\|y | 2 |\n| 1 |", 0), null); // 跳脫的 |、格數比較少都沒關係
  assert.notEqual(readTable("a | b\n---|---\n1 | 2", 0), null); // 頭尾沒有 |
});

test("格子裡自己打的 \\| 不再跳脫，寫回去讀出來一樣", () => {
  for (const cell of ["x\\|y", "x\\\\|y", "a|b"]) {
    const md = writeTable([["a", "b"], [cell, "2"]]);
    assert.equal(readTable(md, 0).grid[1][1], "2", md);
  }
  assert.equal(writeTable([["x\\|y"]]).split("\n")[0], "| x\\|y |");
});

test("刪除、移動欄列時公式的座標跟著改", () => {
  const formulas = (md, op) => {
    const t = readTable(md, 0);
    op(t);
    return t.grid.map((row) => row.at(-1));
  };
  const md = "| 品項 | 數量 | 單價 | 小計 |\n|---|---|---|---|\n| 咖啡 | 2 | 60 | =B2*C2 |\n| 茶 | 1 | 40 | =b3*c3 |\n| 合計 | | | =SUM(D2:D3) |";
  assert.deepEqual(formulas(md, (t) => deleteCol(t, 0)), ["小計", "=A2*B2", "=A3*B3", "=SUM(C2:C3)"]);
  assert.deepEqual(formulas(md, (t) => deleteCol(t, 1)), ["小計", "=#REF*B2", "=#REF*B3", "=SUM(C2:C3)"]);
  assert.deepEqual(formulas(md, (t) => deleteRow(t, 1)), ["小計", "=B2*C2", "=SUM(D2)"]);
  assert.deepEqual(formulas(md, (t) => moveRow(t, 2, 1)), ["小計", "=B2*C2", "=B3*C3", "=SUM(D2:D3)"]);
  assert.deepEqual(formulas(md, (t) => moveCol(t, 3, 0)).length, 4);
  const moved = readTable(md, 0);
  moveCol(moved, 1, 2);
  assert.equal(moved.grid[1][3], "=C2*B2");
  // 範圍整個被刪掉才是 #REF；表格外預留的範圍跟著往前移
  const t = readTable("| a |\n|---|\n| 1 |\n| =SUM(A2:A2) |\n| =SUM(A2:A99) |", 0);
  deleteRow(t, 1);
  assert.deepEqual(t.grid.map((r) => r[0]), ["a", "=SUM(#REF)", "=SUM(A2:A98)"]);
});

test("圖表註解的範圍跟著刪除、移動欄列改", () => {
  const md = "| 品項 | 線上 | 門市 | 小計 |\n|---|---|---|---|\n| 咖啡 | 1 | 2 | 3 |\n| 茶 | 4 | 5 | 9 |";
  const range = (chart, op) => {
    const t = readTable(md, 0);
    t.chart = { type: "bar", range: chart };
    op(t);
    return t.chart.range;
  };
  assert.equal(range("C2:D3", (t) => deleteCol(t, 0)), "B2:C3");
  assert.equal(range("D2:D3", (t) => moveCol(t, 3, 1)), "B2:B3");
  assert.equal(range("B2:C3", (t) => deleteCol(t, 1)), "B2:B3"); // 端點被刪掉往內縮
  assert.equal(range("B2:B3", (t) => deleteCol(t, 1)), "#REF");
  assert.equal(range("B2:B3", (t) => deleteRow(t, 1)), "B2");
  assert.equal(range("#REF", (t) => deleteCol(t, 0)), "#REF");
  // 在範圍裡搬動：範圍不變；搬出去就移出；從外面搬進來就包進來
  assert.equal(range("B2:B3", (t) => moveRow(t, 2, 1)), "B2:B3");
  assert.equal(range("B2:C3", (t) => moveCol(t, 2, 1)), "B2:C3");
  assert.equal(range("B2:C3", (t) => moveCol(t, 1, 3)), "B2:B3");
  assert.equal(range("B2:C3", (t) => moveCol(t, 3, 2)), "B2:D3");
  assert.equal(range("B2:B2", (t) => moveRow(t, 1, 2)), "B3");
});

test("在 SUM 的範圍裡搬列，範圍不縮", () => {
  const t = readTable("| a |\n|---|\n| 1 |\n| 2 |\n| 3 |\n| =SUM(A2:A4) |", 0);
  moveRow(t, 3, 1);
  assert.equal(t.grid[4][0], "=SUM(A2:A4)");
  moveRow(t, 1, 4); // 搬到合計下面：移出範圍
  assert.equal(t.grid[3][0], "=SUM(A2:A3)");
});

test("表格上方的圖表註解：表格下方接上圖，中間有空行就不畫", () => {
  const html = (md) => {
    const opts = { ...marked.defaults, renderer: previewRenderer };
    const tokens = marked.lexer(md, opts);
    markTables(tokens);
    markCharts(tokens);
    calcTables(tokens);
    return marked.parser(tokens, opts);
  };
  const table = "| a | b |\n|---|---|\n| x | =1+1 |\n| y | 3 |";
  // 測試裡沒有載入 Pele，圖表顯示成 mermaid 原文
  assert.match(html(`<!-- chart bar B2:B3 -->\n${table}`), /<\/table>\n<pre><code class="language-mermaid">xychart-beta\n {2}x-axis \[&quot;x&quot;, &quot;y&quot;\]\n {2}bar &quot;b&quot; \[2, 3\]/);
  assert.doesNotMatch(html(`<!-- chart bar B2:B3 -->\n\n${table}`), /mermaid|diagram-error/);
  assert.match(html(`<!-- chart pie A2:B3 -->\n${table}`), /<\/table>\n<p class="diagram-error">圓餅圖只能選一欄<\/p>$/);
});
