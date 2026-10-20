// 從試算表貼上：把剪貼簿的 TSV 轉成 GFM 表格

// 引號格：整格用 "..." 包住、結束引號後面緊接分隔符或結尾，裡面的 "" 是一個 "
const QUOTED = /"((?:[^"]|"")*)"(?=[\t\n]|$)/y;

// 解析 TSV：只有符合 QUOTED 的儲存格才拆引號（Excel 的規則）
// 網頁表格不會幫儲存格加引號，"hi" there、"5 吋 這種開頭是 " 的格子照字面讀
const parseTsv = (text) => {
  const rows = [[]];
  let cell = "";
  let atStart = true;
  const endCell = () => {
    rows.at(-1).push(cell);
    cell = "";
    atStart = true;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && atStart) {
      QUOTED.lastIndex = i;
      const m = QUOTED.exec(text);
      if (m) {
        cell = m[1].replace(/""/g, '"');
        i = QUOTED.lastIndex - 1;
        atStart = false;
        continue;
      }
    }
    if (c === "\t") {
      endCell();
    } else if (c === "\n") {
      endCell();
      rows.push([]);
    } else {
      cell += c;
      atStart = false;
    }
  }
  endCell();
  return rows;
};

// 先跳脫 \，不然 a\|b 會變成 a\\|b，marked 把 | 當成欄位分隔
const toCell = (s) => s.trim().replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, "<br>");

// 至少 2 列、每列欄數相同且至少 2 欄才轉換，否則回傳 null
export const tsvToTable = (text) => {
  const rows = parseTsv(text.replace(/\r\n/g, "\n").replace(/\n$/, "")); // Windows 換行先統一；Excel 結尾會多一個換行
  const cols = rows[0].length;
  if (rows.length < 2 || cols < 2 || rows.some((r) => r.length !== cols)) return null;
  const line = (cells) => `| ${cells.map(toCell).join(" | ")} |`;
  return [line(rows[0]), line(rows[0].map(() => "---")), ...rows.slice(1).map(line)].join("\n");
};

// 表格前後補空行：不黏在前一段，後面的文字也不會被當成表格的最後一列
export const padTable = (table, before, after) => {
  let prefix = "\n\n";
  if (before === "" || /(^|\n)\n$/.test(before)) prefix = "";
  else if (before.endsWith("\n")) prefix = "\n";
  const suffix = after === "" || after.startsWith("\n") ? "\n" : "\n\n";
  return prefix + table + suffix;
};
