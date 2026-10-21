// 執行：node --test src/table-chart.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "pele";
import { tableValues } from "./table-formula.js";
import { chartLineLength, chartSource, defaultRange, parseChart, rangeBounds, readChart, writeChart } from "./table-chart.js";

// 產生的原文一定要讓 Pele 畫得出來
const source = (grid, spec) => {
  const src = chartSource(tableValues(grid), spec);
  render(src);
  return src;
};

const ORDER = [
  ["品項", "數量", "單價", "小計"],
  ["咖啡", "2", "80", "=B2*C2"],
  ["蛋糕", "10", "120", "=B3*C3"],
  ["合計", "", "", "=SUM(D2:D3)"],
];

test("解析註解：整行要完全符合，不分大小寫", () => {
  assert.deepEqual(parseChart("<!-- chart bar D2:D3 -->\n"), { type: "bar", range: "D2:D3" });
  assert.deepEqual(parseChart("<!--CHART Pie d2-->"), { type: "pie", range: "D2" });
  assert.deepEqual(parseChart("<!-- chart line #REF -->"), { type: "line", range: "#REF" });
  assert.equal(parseChart("<!-- 這是說明 -->"), null);
  assert.equal(parseChart("<!-- chart area B2:C3 -->"), null);
  assert.equal(parseChart("<!-- chart bar B2:C3 only -->"), null);
  assert.equal(parseChart("<!-- chart bar B2:C3 --> 後面還有字"), null);
  assert.equal(parseChart("<!--\nchart bar B2:C3\n-->"), null);
  assert.equal(parseChart("    <!-- chart bar B2:C3 -->"), null);
  assert.equal(readChart("    <!-- chart bar B2:B3 -->\n| a | b |", 29), null);
  assert.equal(writeChart({ type: "bar", range: "B2:C3" }), "<!-- chart bar B2:C3 -->");
});

test("讀出表格上一行的註解", () => {
  const md = "# 標題\n<!-- chart bar B2 -->\n| a | b |";
  const start = md.indexOf("|");
  assert.deepEqual(readChart(md, start), { type: "bar", range: "B2", start: md.indexOf("<") });
  assert.equal(readChart("<!-- chart bar B2 -->\n\n| a |", 23), null); // 中間有空行
  assert.equal(readChart("| a |", 0), null);
});

test("某個位置的那一行是不是圖表註解", () => {
  const md = "<!-- chart bar B2 -->\n| a |";
  assert.equal(chartLineLength(md, 0), md.indexOf("|"));
  assert.equal(chartLineLength(md, md.indexOf("|")), 0);
  assert.equal(chartLineLength("<!-- chart bar B2 -->", 0), 0); // 後面沒有表格
});

test("數字標籤不加千分位", () => {
  const grid = [["年", "2023"], ["2021", "1"], ["2022", "2"]];
  assert.equal(source(grid, { type: "bar", range: "B2:B3" }), 'xychart-beta\n  x-axis ["2021", "2022"]\n  bar "2023" [1, 2]');
});

test("長條圖：標籤是第一欄、系列名稱是表頭", () => {
  assert.equal(
    source(ORDER, { type: "bar", range: "D2:D3" }),
    'xychart-beta\n  x-axis ["咖啡", "蛋糕"]\n  bar "小計" [160, 1200]',
  );
});

test("多系列、折線圖", () => {
  const grid = [["月份", "線上", "門市"], ["1月", "120", "80"], ["2月", "180", "95"], ["3月", "260", "110"]];
  assert.equal(
    source(grid, { type: "line", range: "B2:C4" }),
    'xychart-beta\n  x-axis ["1月", "2月", "3月"]\n  line "線上" [120, 180, 260]\n  line "門市" [80, 95, 110]',
  );
});

test("圓餅圖", () => {
  assert.equal(source(ORDER, { type: "pie", range: "D2:D3" }), 'pie\n  "咖啡": 160\n  "蛋糕": 1200');
  assert.throws(() => source(ORDER, { type: "pie", range: "B2:C3" }), /圓餅圖只能選一欄/);
});

test("公式用完整精度，數字不用科學記號", () => {
  const grid = [["a", "b"], ["x", "=1/3"], ["y", "0.0000001"], ["z", "=1000000*1000000*1000000*1000"]];
  assert.equal(
    source(grid, { type: "bar", range: "B2:B4" }),
    'xychart-beta\n  x-axis ["x", "y", "z"]\n  bar "b" [0.3333333333333333, 0.0000001, 1000000000000000000000]',
  );
});

test("範圍截到表格邊界、單一座標", () => {
  assert.match(source(ORDER, { type: "line", range: "D2:D100" }), /\[160, 1200, 1360\]$/); // 合計那列也在範圍裡
  assert.match(source(ORDER, { type: "bar", range: "D2" }), /\[160\]$/);
  assert.throws(() => source(ORDER, { type: "bar", range: "F2:G3" }), /範圍超出表格/);
  assert.throws(() => source(ORDER, { type: "bar", range: "#REF" }), /範圍超出表格/);
  assert.deepEqual(rangeBounds("C9:B2", 4, 3), [[1, 1], [3, 2]]);
});

test("整列、整欄都不是數字就略過，其他空白當 0", () => {
  const grid = [["月份", "備註", "線上", "門市"], ["1月", "x", "120", ""], ["小計", "", "", ""], ["2月", "", "180", "95"]];
  assert.equal(
    source(grid, { type: "bar", range: "B2:D4" }),
    'xychart-beta\n  x-axis ["1月", "2月"]\n  bar "線上" [120, 180]\n  bar "門市" [0, 95]',
  );
  assert.throws(() => source(grid, { type: "bar", range: "B2:B4" }), /範圍裡沒有數字/);
});

test("範圍裡有公式錯誤就不畫", () => {
  const grid = [["a", "b"], ["x", "1"], ["y", "=1/0"]];
  assert.throws(() => source(grid, { type: "bar", range: "B2:B3" }), /^Error: B3 是 #ERR$/);
});

test("標籤裡的 \" 和換行不會造成語法錯誤", () => {
  const grid = [['名"稱', "值"], ['說"明\n第二行', "1"], ["", "2"]];
  assert.equal(
    source(grid, { type: "bar", range: "B2:B3" }),
    "xychart-beta\n  x-axis [\"說'明 第二行\", \" \"]\n  bar \"值\" [1, 2]",
  );
});

test("公式標籤照表格顯示：錯誤碼、2 位小數", () => {
  const grid = [["a", "b"], ["=1/0", "1"], ["=1/3", "2"]];
  assert.equal(source(grid, { type: "bar", range: "B2:B3" }), 'xychart-beta\n  x-axis ["#ERR", "0.33"]\n  bar "b" [1, 2]');
});

test("預設範圍：數字欄 × 資料列，不含合計列", () => {
  assert.equal(defaultRange(ORDER, "bar"), "B2:D3");
  assert.equal(defaultRange(ORDER, "pie"), "D2:D3"); // 最右邊的數字欄
  assert.equal(defaultRange([["a", "b"], ["x", "1"], ["y", "2"]], "line"), "B2:B3");
  // 每列都有小計公式：最後一列不是合計
  const subtotal = [["月", "線上", "門市", "合計"], ["1", "1", "2", "=SUM(B2:C2)"], ["2", "3", "4", "=SUM(B3:C3)"], ["3", "5", "6", "=SUM(B4:C4)"]];
  assert.equal(defaultRange(subtotal, "bar"), "B2:D4");
  assert.equal(defaultRange([["a", "b"], ["x", "y"]], "bar"), "B2:B2"); // 沒有數字欄：畫出來會顯示錯誤，再自己選範圍
});
