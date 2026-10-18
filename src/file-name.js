// 自動檔名：使用者沒改過檔名的檔案，用第一行的前幾個字當檔名
const graphemes = new Intl.Segmenter();

export const AUTO_NAME_LENGTH = 20;

// 舊資料沒有 autoName 欄位：預設名稱「新檔案N.md」視為自動檔名
export const isAutoNamed = (file) =>
  file.autoName ?? /^新檔案\d+\.md$/.test(file.name);

// 回傳 "前幾個字.md"；第一行沒有字時回傳 null（保留原本檔名）
export const nameFromContent = (content) => {
  const line = content.split("\n").find((l) => l.trim()) ?? "";
  const text = line
    .replace(/^\s*(#{1,6}|>|[-*+]( \[[ xX]\])?|\d+[.)])\s+/, "") // 標題、引用、清單、待辦
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // 連結、圖片只留文字
    .replace(/[*_~`]/g, "") // 粗體、斜體、刪除線、行內程式碼
    .replace(/[/\\]/g, " ") // 檔名不能有斜線
    .trim();
  if (!text) return null;
  const head = [...graphemes.segment(text)]
    .slice(0, AUTO_NAME_LENGTH)
    .map((s) => s.segment)
    .join("")
    .trim();
  return `${head}.md`;
};
