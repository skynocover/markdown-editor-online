// 表格圖表：表格正上方的 <!-- chart bar B2:C4 --> 把表格資料轉成 mermaid 原文，交給 diagram.js 畫
// 註解在 GitHub、Obsidian 看不見，那邊只看到表格
import { tableValues } from "./table-formula.js";

// 整行要完全符合才算；不跨行：表格工具只認表格上一行的註解
const CHART = /^<!--[ \t]*chart[ \t]+(bar|line|pie)[ \t]+([A-Z]\d+(?::[A-Z]\d+)?|#REF)[ \t]*-->$/i;

export const parseChart = (comment) => {
  if (/^( {4}|\t)/.test(comment)) return null; // 縮排 4 格是程式碼區塊，預覽不畫，表格工具也不能當成圖表改寫
  const m = CHART.exec(comment.trim());
  return m && { type: m[1].toLowerCase(), range: m[2].toUpperCase() };
};

// 只看頂層 token：html token 是圖表註解、下一個就是表格（中間有空行會多一個 space token）
export const markCharts = (tokens) =>
  tokens.forEach((t, i) => {
    if (t.type === "table" && tokens[i - 1]?.type === "html") t.chart = parseChart(tokens[i - 1].raw);
  });

export const writeChart = ({ type, range }) => `<!-- chart ${type} ${range} -->`;

// 原文 pos 開始的那一行是圖表註解就回傳那一行的長度（含換行），表格從它後面開始；不是就回傳 0
export const chartLineLength = (markdown, pos) => {
  const end = markdown.indexOf("\n", pos);
  return end >= 0 && parseChart(markdown.slice(pos, end)) ? end + 1 - pos : 0;
};

// 原文 start 開始的表格，上一行是圖表註解就回傳 { type, range, start }，start 是註解的位置
export const readChart = (markdown, start) => {
  if (start === 0 || markdown[start - 1] !== "\n") return null;
  const lineStart = markdown.lastIndexOf("\n", start - 2) + 1;
  const spec = parseChart(markdown.slice(lineStart, start));
  return spec && { ...spec, start: lineStart };
};

const colName = (c) => String.fromCharCode(65 + c);
const toPos = (ref) => [Number(ref.slice(1)) - 1, ref.charCodeAt(0) - 65];

// 範圍 → [[上, 左], [下, 右]]，截到表格邊界（height × width）；#REF 或整個在表格外是 null
export const rangeBounds = (range, height, width) => {
  if (range === "#REF") return null;
  const [a, b = a] = range.split(":").map(toPos);
  const top = Math.max(Math.min(a[0], b[0]), 0);
  const bottom = Math.min(Math.max(a[0], b[0]), height - 1);
  const left = Math.min(a[1], b[1]);
  const right = Math.min(Math.max(a[1], b[1]), width - 1);
  return top > bottom || left > right ? null : [[top, left], [bottom, right]];
};

// 最後一列是合計（SUM、AVG… 開頭的公式，而且上一列同一欄不是：那是每列都有的小計欄）時，預設範圍不包含它
const TOTAL = /^=\s*(SUM|AVG|MIN|MAX|COUNT)\s*\(/i;

// 插入圖表時的範圍：第一欄以外、有數字的欄 × 所有資料列；圓餅圖只能一欄，取最右邊那欄（通常是小計）
export const defaultRange = (grid, type) => {
  const values = tableValues(grid);
  let last = grid.length - 1;
  if (last > 1 && grid[last].some((s, c) => TOTAL.test(s.trim()) && !TOTAL.test((grid[last - 1][c] ?? "").trim()))) last--;
  const cols = grid[0].map((_, c) => c).filter((c) => c > 0 && values.slice(1, last + 1).some((row) => typeof row[c] === "number"));
  const right = cols.at(-1) ?? 1;
  const left = type === "pie" ? right : (cols[0] ?? 1);
  return `${colName(left)}2:${colName(right)}${last + 1}`;
};

// 標籤、系列名稱放在 mermaid 的 "…" 裡：" 會造成語法錯誤，換成 '；換行換成空白；空字串 "" 也是語法錯誤，換成一個空白
// 數字跟表格一樣最多 2 位小數（公式 =1/3 → 0.33），但不加千分位：年份 2021 不能變成 2,021；公式錯誤顯示錯誤碼
// ponytail: 標籤格的 50% 會變成 0.5（值裡分不出原本的寫法），要原樣就得把原文傳進來
const LABEL = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, useGrouping: false });
const labelText = (v) => {
  if (v === null) return "";
  if (typeof v === "number") return LABEL.format(v);
  return v.code ?? v;
};
const label = (v) => `"${labelText(v).replace(/"/g, "'").replace(/\s+/g, " ").trim() || " "}"`;

// mermaid 不接受 1e-7、1e21 這種寫法；一般的數用 String，toLocaleString 會印出 0.33333333333333331483 這種二進位尾數
const num = (n) => {
  const s = String(n);
  return s.includes("e") ? n.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 }) : s;
};

// values 是 tableValues 的結果（第 1 列是表頭）；回傳 mermaid 原文，畫不出來就丟出帶中文訊息的 Error
// 範圍裡整列（或整欄）都不是數字就略過：補 0 會畫出誤導的長條；其他空白、文字當 0
export const chartSource = (values, { type, range }) => {
  const bounds = rangeBounds(range, values.length, values[0]?.length ?? 0);
  if (!bounds) throw new Error("範圍超出表格");
  const [[top, left], [bottom, right]] = bounds;
  if (type === "pie" && left !== right) throw new Error("圓餅圖只能選一欄");

  const rows = [];
  const cols = [];
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const v = values[r][c];
      if (v?.code) throw new Error(`${colName(c)}${r + 1} 是 ${v.code}`);
      if (typeof v === "number") {
        if (!rows.includes(r)) rows.push(r);
        if (!cols.includes(c)) cols.push(c);
      }
    }
  }
  if (!rows.length) throw new Error("範圍裡沒有數字");
  cols.sort((a, b) => a - b);
  const value = (r, c) => num(typeof values[r][c] === "number" ? values[r][c] : 0);

  if (type === "pie") return ["pie", ...rows.map((r) => `  ${label(values[r][0])}: ${value(r, left)}`)].join("\n");
  return [
    "xychart-beta",
    `  x-axis [${rows.map((r) => label(values[r][0])).join(", ")}]`,
    ...cols.map((c) => `  ${type} ${label(values[0][c])} [${rows.map((r) => value(r, c)).join(", ")}]`),
  ].join("\n");
};
