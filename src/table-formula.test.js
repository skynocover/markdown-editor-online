// 執行：node --test src/table-formula.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { evaluateTable, calcTables } from "./table-formula.js";

// 只算一格：公式放在 A1，其他格照給的資料
const calc = (formula, rows = [[]]) => {
  const table = rows.map((r) => [...r]);
  table[0][0] = formula;
  return evaluateTable(table)[0][0];
};

// 跟 parseMarkdown 一樣的流程（不含 DOMPurify）
const render = (md) => {
  const opts = { ...marked.defaults, breaks: true };
  const tokens = marked.lexer(md, opts);
  calcTables(tokens);
  return marked.parser(tokens, opts);
};

test("運算子與優先順序", () => {
  assert.equal(calc("=1+2*3"), "7");
  assert.equal(calc("=(1+2)*3"), "9");
  assert.equal(calc("=-2*-3"), "6");
  assert.equal(calc("=0.1+0.2"), "0.3");
  assert.equal(calc("=10/4"), "2.5");
  assert.equal(calc("= 8 - 2 - 1 "), "5");
  assert.equal(calc("=0*-1"), "0");
});

test("儲存格參照", () => {
  const rows = [
    ["品項", "數量", "單價", "小計"],
    ["咖啡", "2", "80", "=B2*C2"],
    ["蛋糕", "1", "90", "=d2*2"],
  ];
  const out = evaluateTable(rows);
  assert.equal(out[1][3], "160");
  assert.equal(out[2][3], "320"); // 小寫、參照公式格
  assert.equal(out[0][0], null); // 非公式格
  assert.equal(evaluateTable([["=b2*c2", "x", "x"], ["", "2", "3"]])[0][0], "6");
});

test("儲存格的值", () => {
  assert.equal(calc("=B1+1", [["", "1,200"]]), "1,201");
  assert.equal(calc("=B1*C1", [["", "1000", "5%"]]), "50");
  for (const text of ["1,2,3", "0x1F", "1e3", "$30", "無"]) {
    assert.equal(calc("=B1+1", [["", text]]), "#ERR", text);
  }
  assert.equal(calc("=B1+1", [["", ""]]), "1"); // 空白當 0
  assert.equal(calc("=B1", [["", "品項"]]), "#ERR"); // 直接參照文字
});

test("範圍與函數", () => {
  const col = (...vals) => [["=X", ""], ...vals.map((v) => ["", v])];
  assert.equal(calc("=SUM(B2:B100)", col("10", "20")), "30"); // 截到表格邊界
  assert.equal(calc("=SUM(B2:B4)", col("10", "無", "20")), "30");
  assert.equal(calc("=COUNT(B2:B4)", col("10", "無", "")), "1");
  assert.equal(calc("=avg(B2:B3)", col("10", "20")), "15");
  assert.equal(calc("=MIN(B3:B2)", col("10", "20")), "10"); // 角落順序反過來也可以
  assert.equal(calc("=max(B2:B3, 100, C1*2)", [["", "", "60"], ["", "10"], ["", "20"]]), "120");
  assert.equal(calc("=SUM(B2:B4)", col("10", "=Z99", "20")), "#REF"); // 範圍裡的錯誤會傳遞
});

test("錯誤值", () => {
  assert.equal(calc("=1+*2"), "#ERR");
  assert.equal(calc("=FOO(1)"), "#ERR");
  assert.equal(calc("=SUM()"), "#ERR");
  assert.equal(calc("=B1:B2"), "#ERR");
  assert.equal(calc("="), "#ERR");
  const three = [["", "", ""], ["", "", ""], ["", "", ""]];
  assert.equal(calc("=Z9", three), "#REF");
  assert.equal(calc("=SUM(Z1:Z9)", three), "#REF");
  assert.equal(calc("=A0", three), "#REF");
  // 結果不是有限數字
  assert.equal(calc("=1/0"), "#ERR");
  assert.equal(calc("=1/(1/0)"), "#ERR");
  assert.equal(calc("=AVG(B1:B1)", [["", "無"]]), "#ERR");
  assert.equal(calc("=MIN(B1:B1)", [["", ""]]), "#ERR");
  assert.equal(calc("=MAX(B1:B1)", [["", ""]]), "#ERR");
  assert.equal(calc("=" + "9".repeat(400) + "*10"), "#ERR");
});

test("循環參照與錯誤傳遞", () => {
  const out = evaluateTable([["=B1", "=A1", "=A1+1"]]);
  assert.deepEqual(out[0], ["#CYCLE", "#CYCLE", "#CYCLE"]);
  assert.equal(evaluateTable([["=A1"]])[0][0], "#CYCLE");
  assert.deepEqual(evaluateTable([["=Z99", "=A1*2"]])[0], ["#REF", "#REF"]);
});

test("不執行任意程式碼", () => {
  assert.equal(calc("=alert(1)"), "#ERR");
  assert.equal(calc('=constructor.constructor("alert(1)")()'), "#ERR");
  assert.equal(calc("=constructor(1)"), "#ERR");
  assert.equal(calc("=__proto__"), "#ERR");
});

test("數字格式：千分位、不跟著語系", () => {
  assert.equal(calc("=20000+500"), "20,500");
  assert.equal(calc("=1234.5"), "1,234.5");
  assert.equal(calc("=-1234567"), "-1,234,567");
});

test("最多 2 位小數，參照時用完整精度", () => {
  assert.equal(calc("=1000/3"), "333.33");
  assert.equal(calc("=-1234.567"), "-1,234.57");
  assert.equal(calc("=-0.001"), "0");
  assert.equal(evaluateTable([["=1000/3", "=A1*3"]])[0][1], "1,000");
});

test("巢狀過深、參照鏈太長：表格照原文顯示，其他內容正常", () => {
  const deep = "(".repeat(50000) + "1" + ")".repeat(50000);
  const chain = Array.from({ length: 10000 }, (_, i) => `| =A${i + 3} |`).join("\n");
  const md = `# 標題\n\n| a |\n| --- |\n| =${deep} |\n\n| a |\n| --- |\n${chain}\n\n| b |\n| --- |\n| =1+1 |`;
  const html = render(md);
  assert.match(html, /<h1>標題<\/h1>/);
  assert.match(html, /<td>2<\/td>/); // 第三個表格照常計算
});

test("預覽：只算表格裡的公式，原文不變", () => {
  const md = "=1+1\n\n| a | b |\n| --- | --- |\n| =1+2*3 | \\=abc |\n| `=A1` | =A3 |";
  const html = render(md);
  assert.match(html, /<p>=1\+1<\/p>/);
  assert.match(html, /<td>7<\/td>/);
  assert.match(html, /<td>=abc<\/td>/);
  assert.match(html, /<td><code>=A1<\/code><\/td>/);
  assert.match(html, /<td>#ERR<\/td>/); // =A3 參照的是行內程式碼那格，算文字
  assert.ok(md.includes("=1+2*3"));
});

test("公式只看同一個表格；引用裡的表格也會算", () => {
  const md = "| a |\n| --- |\n| 1 |\n\n| b |\n| --- |\n| 5 |\n| =A2*2 |\n\n> | c |\n> | --- |\n> | =3*3 |";
  const html = render(md);
  assert.match(html, /<td>10<\/td>/);
  assert.match(html, /<td>9<\/td>/);
});

test("刪掉欄列留下的 #REF", () => {
  assert.equal(evaluateTable([["=#REF*2", "=SUM(#REF)"]])[0].join(), "#REF,#REF");
});

test("計算量太大（每格都掃整個表格）：表格照原文顯示，不卡住頁面", () => {
  const rows = Array.from({ length: 1000 }, (_, r) => Array.from({ length: 26 }, () => (r ? `=SUM(A1:Z${r})` : "1")));
  assert.throws(() => evaluateTable(rows));
  // 一般的大表格：1000 列、每列 SUM 一整欄，在上限內
  const big = Array.from({ length: 1000 }, (_, r) => [String(r), "=SUM(A1:A1000)"]);
  assert.equal(evaluateTable(big)[0][1], "499,500");
});

test("讀格子的上限整份文件共用：很多個表格各自在上限內，加起來超過就停", () => {
  // 每個表格約 3M 次：1000 列、每列 SUM 一整欄（3 欄）
  const table = Array.from({ length: 1000 }, (_, r) => `| ${r} | =SUM(A1:A1000) | =SUM(A1:A1000) | =SUM(A1:A1000) |`);
  const md = ["| a | b | c | d |", "| --- | --- | --- | --- |", ...table.slice(1)].join("\n");
  const html = render(Array(5).fill(md).join("\n\n"));
  assert.match(html, /499,500/); // 前面的表格照算
  assert.match(html, /=SUM\(A1:A1000\)/); // 後面的表格超過上限，照原文顯示
});
