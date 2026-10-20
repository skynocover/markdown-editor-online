// 全部匯出／還原：檔案打包成 zip，資料夾對應 zip 裡的目錄（只有一層）
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

// 還原時的上限：防壓縮炸彈，正常筆記遠小於此
const MAX_ENTRY_SIZE = 5_000_000;
const MAX_TOTAL_SIZE = 50_000_000;

const TEXT_FILE = /\.(md|markdown|txt)$/i;

// 檔名裡的 / \ 會被當成目錄，| : * ? " < > Windows 解壓不了，都換掉；開頭的 . 會被還原當成隱藏檔略過，拿掉
const safeName = (name) =>
  name.replace(/[/\\|:*?"<>]/g, "_").replace(/^\.+/, "").trim() || "未命名";

// 沒有 UTF-8 旗標的 zip（Finder、ditto 壓的）檔名會被 fflate 當 latin1 解：還原成原始位元組再試 UTF-8
const fixName = (name) => {
  if (/[\u0100-\uffff]/.test(name)) return name; // 已經是正確解出的 UTF-8
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(strToU8(name, true));
  } catch {
    return name; // 真的是 latin1
  }
};

export const toZip = (files, folders) => {
  const folderName = new Map(folders.map((d) => [d.id, safeName(d.name)]));
  const entries = {};
  const used = new Set();
  for (const file of files) {
    const dir = folderName.get(file.folderId);
    let name = safeName(file.name);
    if (!TEXT_FILE.test(name)) name += ".md"; // 沒副檔名還原時會被略過
    const base = (dir ? `${dir}/` : "") + name;
    // 同名檔案加上 (2)、(3)…，不然後面的會蓋掉前面的
    let path = base;
    for (let n = 2; used.has(path.toLowerCase()); n++) {
      path = base.replace(/(\.[^./]*)?$/, ` (${n})$1`);
    }
    used.add(path.toLowerCase());
    entries[path] = strToU8(file.content);
  }
  return zipSync(entries);
};

// 回傳 [{ folder: 資料夾名稱或 null, name, content }]；非文字檔、macOS 的 __MACOSX 與隱藏檔略過
export const fromZip = (bytes) => {
  let total = 0;
  const entries = unzipSync(bytes, {
    filter: (f) => {
      const parts = f.name.split("/");
      if (!TEXT_FILE.test(f.name) || f.originalSize > MAX_ENTRY_SIZE)
        return false;
      if (parts.some((p) => p.startsWith(".") || p === "__MACOSX"))
        return false;
      total += f.originalSize;
      if (total > MAX_TOTAL_SIZE) throw new Error("zip 內容過大");
      return true;
    },
  });
  return Object.entries(entries).map(([path, data]) => {
    const parts = fixName(path).split("/");
    return {
      // ponytail: 只有一層資料夾，更深的目錄併入最上層那個
      folder: parts.length > 1 ? parts[0] : null,
      name: parts.at(-1),
      content: strFromU8(data).replace(/\r\n?/g, "\n"),
    };
  });
};
