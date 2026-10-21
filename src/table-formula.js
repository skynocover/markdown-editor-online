// 表格公式：Markdown 表格裡以 = 開頭的儲存格，預覽時顯示計算結果
// 自己寫解析器，不用 eval / Function：公式可能來自不受信任的分享連結
import { marked } from "marked";

// 錯誤用 { code } 丟出，在儲存格層級接住；堆疊溢位等其他例外不接，交給表格層級
const fail = (code) => {
  throw { code };
};

// 被參照的儲存格要符合這個格式才算數字：1,200、-3.5、5%；1,2,3、0x1F、1e3、$30 都是文字
const NUMBER = /^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?%?$/;

// 數字、參照或範圍（只支援 A–Z 欄）、函數名、運算子、#REF；先轉大寫，參照和函數名不分大小寫
// #REF：刪掉欄列時，指到被刪掉格子的參照換成它（preview-edit 的 fixRefs）
const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|([A-Z]\d+)(?::([A-Z]\d+))?|([A-Z]+)|([-+*/(),])|(#REF))/y;

const tokenize = (src) => {
  const s = src.trim().toUpperCase();
  const tokens = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < s.length) {
    const m = TOKEN.exec(s);
    if (!m) fail("#ERR");
    const [, num, ref, refEnd, name, op, deleted] = m;
    if (deleted) fail("#REF");
    if (num) tokens.push({ num: Number(num) });
    else if (refEnd) tokens.push({ range: [ref, refEnd] });
    else if (ref) tokens.push({ ref });
    else if (name) tokens.push({ name });
    else tokens.push({ op });
  }
  return tokens;
};

// "B3" → [列, 欄]，從 0 起算；表頭是第 1 列
const parseRef = (ref) => [Number(ref.slice(1)) - 1, ref.charCodeAt(0) - 65];

// 四則運算裡：空白當 0，文字是錯誤
const toNumber = (v) => {
  if (v === null) return 0;
  if (typeof v !== "number") fail("#ERR");
  return v;
};

const sum = (nums) => nums.reduce((a, b) => a + b, 0);

// 用 Map 不用物件：=constructor(1) 這類名稱不會查到 Object.prototype
// 結果不是有限數字（AVG、MIN、MAX 遇到空範圍）會在公式層級變成 #ERR
const FUNCTIONS = new Map([
  ["SUM", sum],
  ["AVG", (nums) => sum(nums) / nums.length],
  ["MIN", (nums) => nums.reduce((a, b) => Math.min(a, b), Infinity)],
  ["MAX", (nums) => nums.reduce((a, b) => Math.max(a, b), -Infinity)],
  ["COUNT", (nums) => nums.length],
]);

// 固定 en-US：不跟著瀏覽器語系，千分位跟輸入的規則一致
// 最多 2 位小數（金額到分就夠），只影響顯示，參照時用完整精度；signDisplay：-0.001 顯示 0 不是 -0
const FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, signDisplay: "negative" });

// rows 是表格每一格的原始 Markdown（含表頭）；回傳同樣形狀，每格的值：數字、null（空白）、字串（文字）或 { code }（公式錯誤）
// 公式格是完整精度的計算結果（圖表用），顯示用的格式化是 display
// budget：讀格子的次數上限，整份文件共用一個（calcTables 傳進來）
export const tableValues = (rows, budget = { left: 1e7 }) => {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const memo = new Map(); // 每個公式格只算一次，結果是數字或 { code }
  const visiting = new Set(); // 正在算的格子，又遇到就是循環參照

  const raw = (r, c) => (rows[r][c] ?? "").trim();

  // 儲存格的值：數字、null（空白）或字串（文字）
  const cellValue = (r, c) => {
    if (--budget.left < 0) throw new Error("formula budget exceeded");
    const s = raw(r, c);
    if (s.startsWith("=")) return formulaValue(r, c);
    if (s === "") return null;
    if (!NUMBER.test(s)) return s;
    const n = Number(s.replace(/[,%]/g, ""));
    return s.endsWith("%") ? n / 100 : n;
  };

  const formulaValue = (r, c) => {
    const key = r * width + c;
    if (memo.has(key)) {
      const v = memo.get(key);
      if (typeof v !== "number") throw v;
      return v;
    }
    if (visiting.has(key)) fail("#CYCLE");
    visiting.add(key);
    try {
      const v = toNumber(evaluate(raw(r, c).slice(1)));
      if (!Number.isFinite(v)) fail("#ERR");
      memo.set(key, v);
      return v;
    } catch (e) {
      if (e?.code) memo.set(key, e);
      throw e;
    } finally {
      visiting.delete(key);
    }
  };

  const refValue = (ref) => {
    const [r, c] = parseRef(ref);
    if (r < 0 || r >= height || c >= width) fail("#REF");
    return cellValue(r, c);
  };

  // 範圍截到表格邊界，整個在表格外才是 #REF；略過空白和文字，錯誤照樣往外丟
  const collectRange = ([a, b], out) => {
    const [r1, c1] = parseRef(a);
    const [r2, c2] = parseRef(b);
    const top = Math.max(Math.min(r1, r2), 0);
    const bottom = Math.min(Math.max(r1, r2), height - 1);
    const left = Math.min(c1, c2);
    const right = Math.min(Math.max(c1, c2), width - 1);
    if (top > bottom || left > right) fail("#REF");
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const v = cellValue(r, c);
        if (typeof v === "number") out.push(v);
      }
    }
  };

  // 遞迴下降：expr := term (+|- term)*、term := unary (*|/ unary)*、unary := -unary | primary
  const evaluate = (src) => {
    const tokens = tokenize(src);
    let i = 0;
    const take = (op) => {
      if (tokens[i]?.op !== op) return false;
      i++;
      return true;
    };

    const expr = () => {
      let v = term();
      for (;;) {
        if (take("+")) v = toNumber(v) + toNumber(term());
        else if (take("-")) v = toNumber(v) - toNumber(term());
        else return v;
      }
    };
    const term = () => {
      let v = unary();
      for (;;) {
        if (take("*")) v = toNumber(v) * toNumber(unary());
        else if (take("/")) {
          const d = toNumber(unary());
          if (d === 0) fail("#ERR");
          v = toNumber(v) / d;
        } else return v;
      }
    };
    const unary = () => (take("-") ? -toNumber(unary()) : primary());
    const primary = () => {
      const t = tokens[i++];
      if (t?.num !== undefined) return t.num;
      if (t?.ref) return refValue(t.ref);
      if (t?.op === "(") {
        const v = expr();
        if (!take(")")) fail("#ERR");
        return v;
      }
      const fn = t?.name && FUNCTIONS.get(t.name);
      if (!fn || !take("(")) fail("#ERR");
      const nums = [];
      do {
        if (tokens[i]?.range) collectRange(tokens[i++].range, nums);
        else {
          const v = expr();
          if (v !== null) nums.push(toNumber(v));
        }
      } while (take(","));
      if (!take(")")) fail("#ERR");
      return fn(nums);
    };

    const v = expr();
    if (i !== tokens.length) fail("#ERR");
    return v;
  };

  return rows.map((row, r) =>
    row.map((_, c) => {
      try {
        return cellValue(r, c);
      } catch (e) {
        if (!e?.code) throw e;
        return e;
      }
    }),
  );
};

export const isFormula = (s) => (s ?? "").trim().startsWith("=");
export const display = (v) => (typeof v === "number" ? FORMAT.format(v) : v.code);

// 回傳同樣形狀，公式格是顯示用的結果字串，其他格是 null
export const evaluateTable = (rows, budget) =>
  tableValues(rows, budget).map((row, r) => row.map((v, c) => (isFormula(rows[r][c]) ? display(v) : null)));

// 找出 marked tokens 裡所有表格（包含引用、清單裡的），公式格換成計算結果
// 計算時丟出例外（例如參照鏈太長、括號太深造成堆疊溢位）時，該表格照原文顯示
// 讀格子的次數上限：每個公式都掃一次大範圍時，計算量是「公式數 × 範圍大小」，可以大到讓頁面卡住
// 超過就丟出一般例外（不是 { code }），表格照原文顯示；1000 列、每列 SUM 一整欄約 1M 次，在上限內
// 整份文件共用：每個表格各自重算的話，放很多個大表格就能繞過
// 每格的值記在 token.values，給表格下方的圖表用
export const calcTables = (tokens) => {
  const budget = { left: 1e7 };
  marked.walkTokens(tokens, (token) => {
    if (token.type !== "table") return;
    const cells = [token.header, ...token.rows];
    const rows = cells.map((row) => row.map((cell) => cell.text));
    try {
      token.values = tableValues(rows, budget);
    } catch {
      return;
    }
    cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!isFormula(rows[r][c])) return;
        const s = display(token.values[r][c]);
        cell.tokens = [{ type: "text", raw: s, text: s }];
      }),
    );
  });
};
