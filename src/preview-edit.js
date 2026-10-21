// 在預覽直接編輯：記下表格、checkbox 在原文的位置，改完寫回 Markdown
import { marked } from "marked";
import { renderDiagram } from "./diagram.js";
import { chartSource } from "./table-chart.js";

// 頂層 token 的 raw 串起來就是原文，累加長度就是表格的起點
// 引用、清單裡的表格不記，點了也不能編輯
export const markTables = (tokens) => {
  let pos = 0;
  for (const token of tokens) {
    if (token.type === "table") token.start = pos;
    pos += token.raw.length;
  }
};

// 表格上方有圖表註解（markCharts 記在 token.chart）就在表格下方畫圖；values 是 calcTables 算好的值
// 錯誤訊息都是自己組的（座標、錯誤碼），不用跳脫
const chartHtml = ({ chart, values }) => {
  try {
    if (!values) throw new Error("表格無法計算");
    return renderDiagram(chartSource(values, chart));
  } catch (e) {
    return `<p class="diagram-error">${e.message}</p>`;
  }
};

// 有記位置的表格加上 data-start，預覽點擊時靠它找回原文
export const previewRenderer = new marked.Renderer();
previewRenderer.table = function (token) {
  let html = marked.Renderer.prototype.table.call(this, token);
  if (token.start !== undefined) html = html.replace("<table>", `<table data-start="${token.start}">`);
  return token.chart ? html + chartHtml(token) : html;
};

// ```mermaid 畫成圖，其他語言照原本的程式碼區塊
previewRenderer.code = function (token) {
  return token.lang === "mermaid" ? renderDiagram(token.text) : marked.Renderer.prototype.code.call(this, token);
};

// 清單的 checkbox：每個頂層區塊裡，原文的 [ ] 跟 checkbox token 依序一一對應
// 對不上（例如清單裡的程式碼區塊也有 - [ ] 開頭的行）就整個區塊都不記，點了也沒反應
const TASK = /^[ \t>]*(?:[-*+]|\d{1,9}[.)])[ \t]+\[[ xX]\] +\S/gm;

export const markTasks = (tokens) => {
  let pos = 0;
  for (const token of tokens) {
    const boxes = [];
    marked.walkTokens([token], (t) => t.type === "checkbox" && boxes.push(t));
    const found = [...token.raw.matchAll(TASK)];
    if (found.length === boxes.length) {
      boxes.forEach((box, i) => (box.pos = pos + found[i].index + found[i][0].indexOf("[") + 1));
    }
    pos += token.raw.length;
  }
};

// 有位置的 checkbox 不加 disabled、加上 data-pos；唯讀預覽用 CSS 擋掉點擊
previewRenderer.checkbox = ({ checked, pos }) =>
  `<input ${checked ? 'checked="" ' : ""}${pos === undefined ? 'disabled="" ' : `data-pos="${pos}" `}type="checkbox"> `;

// 沒被跳脫的 |：前面有偶數個 \
const PIPE = /(?<!\\)(?:\\\\)*\|/g;
const TRAILING_PIPE = new RegExp(PIPE.source + "$");
const countCells = (line) => {
  const s = line.trim().replace(/^\|/, "");
  const pipes = s.match(PIPE)?.length ?? 0;
  return pipes + 1 - (TRAILING_PIPE.test(s) ? 1 : 0);
};

// 原文 start 開始的表格：end 不含結尾換行；grid 第一列是表頭，內容是儲存格的原始 Markdown
// 有列的格數比表頭多就不給編輯：marked 會把多的格子丟掉，寫回去就不見了
export const readTable = (markdown, start) => {
  const token = marked.lexer(markdown.slice(start))[0];
  if (token?.type !== "table") return null;
  const raw = token.raw.trimEnd();
  if (raw.split("\n").some((line) => countCells(line) > token.header.length)) return null;
  return {
    end: start + raw.length,
    align: token.align,
    grid: [token.header, ...token.rows].map((row) => row.map((cell) => cell.text)),
  };
};

const ALIGN = { left: ":---", center: ":---:", right: "---:" };

// marked 給的 text 已經把 \| 還原成 |，寫回去要再跳脫
// 前面有奇數個 \ 的 | 已經跳脫過（在格子裡自己打的 \|），不再加；偶數個的 \ 是字面上的反斜線
const escapePipes = (s) => s.replace(/(\\*)\|/g, (m, b) => (b.length % 2 ? m : `${b}\\|`));

export const writeTable = (grid, align = []) => {
  const line = (cells) => `| ${cells.map((s) => escapePipes(s.trim())).join(" | ")} |`;
  return [
    line(grid[0]),
    line(grid[0].map((_, c) => ALIGN[align[c]] ?? "---")),
    ...grid.slice(1).map(line),
  ].join("\n");
};

// 表格結構的操作：直接改 readTable 回傳的 { grid, align }；第 0 列是表頭，不能刪也不能移動
const move = (arr, from, to) => arr.splice(to, 0, ...arr.splice(from, 1));

export const addRow = (t) => t.grid.push(t.grid[0].map(() => ""));
export const addCol = (t) => {
  t.grid.forEach((row) => row.push(""));
  t.align.push(null);
};

// 刪除、移動欄列：order 是新順序裡每個位置原本的索引，公式裡的座標跟著改；moved 是搬動的那一列（欄）
const reorderRows = (t, change, moved) => {
  const order = [...t.grid.keys()];
  change(order);
  fixRefs(t, 0, t.grid.length, order, moved);
  t.grid = order.map((i) => t.grid[i]);
};
const reorderCols = (t, change, moved) => {
  const order = [...t.grid[0].keys()];
  change(order);
  fixRefs(t, 1, t.grid[0].length, order, moved);
  t.grid = t.grid.map((row) => order.map((i) => row[i] ?? ""));
  t.align = order.map((i) => t.align[i] ?? null);
};

export const deleteRow = (t, r) => reorderRows(t, (o) => o.splice(r, 1));
export const deleteCol = (t, c) => reorderCols(t, (o) => o.splice(c, 1));
export const moveRow = (t, from, to) => reorderRows(t, (o) => move(o, from, to), from);
export const moveCol = (t, from, to) => reorderCols(t, (o) => move(o, from, to), from);

// 座標或範圍，跟 table-formula 一樣只認 A–Z 欄
const REF = /\b([A-Z])(\d+)(?::([A-Z])(\d+))?\b/gi;
const toPos = (col, row) => [Number(row) - 1, col.toUpperCase().charCodeAt(0) - 65];

// 跟試算表一樣：參照的格子被刪掉 → #REF；範圍的端點被刪掉就往內縮，整個範圍都刪掉才是 #REF
// k 是要改的軸（0 列、1 欄），n 是原本的數量；表格外的座標（SUM(B2:B100) 預留的空間）照刪掉的數量往前移
// 表格上方的圖表註解（t.chart，編輯器讀表格時放進來）的範圍也一起改
// 搬動時：其他格的相對順序不變，範圍是它們的新位置；搬動的那一格落在範圍裡或緊鄰兩端才算在內（搬到範圍外就移出）
const fixRefs = (t, k, n, order, moved) => {
  const map = (i) => (i < n ? order.indexOf(i) : i - n + order.length);
  const fix = (m, c1, r1, c2, r2) => {
    const a = toPos(c1, r1);
    if (!c2) {
      a[k] = map(a[k]);
      return a[k] < 0 ? "#REF" : cellRef(...a);
    }
    const b = toPos(c2, r2);
    let lo = Math.min(a[k], b[k]);
    let hi = Math.max(a[k], b[k]);
    const p = moved >= lo && moved <= hi ? map(moved) : -1;
    const keep = (i) => i !== moved && map(i) >= 0;
    while (lo <= hi && !keep(lo)) lo++;
    while (hi >= lo && !keep(hi)) hi--;
    let [s, e] = lo > hi ? [p, p] : [map(lo), map(hi)];
    if (s < 0) return "#REF";
    if (p >= s - 1 && p <= e + 1) [s, e] = [Math.min(s, p), Math.max(e, p)];
    a[k] = s;
    b[k] = e;
    return rangeRef(a, b);
  };
  t.grid = t.grid.map((row) => row.map((s) => (s.trimStart().startsWith("=") ? s.replace(REF, fix) : s)));
  if (t.chart) t.chart.range = t.chart.range.replace(REF, fix);
};

export const colName = (c) => String.fromCharCode(65 + c);

// 點格子插入座標：表頭是第 1 列
const cellRef = (r, c) => colName(c) + (r + 1);

export const rangeRef = ([r1, c1], [r2, c2]) => {
  const a = cellRef(Math.min(r1, r2), Math.min(c1, c2));
  const b = cellRef(Math.max(r1, r2), Math.max(c1, c2));
  return a === b ? a : `${a}:${b}`;
};

// 公式裡游標在運算子、括號、逗號後面時，點別格是插入座標（跟試算表一樣）；其他時候是換格編輯
export const canPickRef = (text, caret) =>
  text.trimStart().startsWith("=") && /[=+\-*/(,:]\s*$/.test(text.slice(0, caret));
