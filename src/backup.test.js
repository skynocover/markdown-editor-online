// 執行：node --test src/backup.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { toZip, fromZip } from "./backup.js";

test("匯出再還原：內容、資料夾都保留，同名檔案不會互相覆蓋", () => {
  const folders = [{ id: 10, name: "工作" }];
  const files = [
    { id: 1, name: "a.md", content: "# 根目錄 😀", folderId: null },
    { id: 2, name: "a.md", content: "第二個同名", folderId: null },
    { id: 3, name: "b.md", content: "資料夾裡", folderId: 10 },
    { id: 4, name: "x/y.md", content: "檔名有斜線", folderId: null },
    { id: 5, name: "Q: why?.md", content: "Windows 不允許的字元", folderId: null },
  ];
  const restored = fromZip(toZip(files, folders));
  const byPath = Object.fromEntries(
    restored.map((e) => [`${e.folder ?? ""}/${e.name}`, e.content]),
  );
  assert.deepEqual(byPath, {
    "/a.md": "# 根目錄 😀",
    "/a (2).md": "第二個同名",
    "工作/b.md": "資料夾裡",
    "/x_y.md": "檔名有斜線",
    "/Q_ why_.md": "Windows 不允許的字元",
  });
});

test("還原時略過非文字檔與 macOS 附加檔", () => {
  const zip = zipSync({
    "note.md": strToU8("ok"),
    "pic.png": new Uint8Array([1, 2, 3]),
    "__MACOSX/._note.md": strToU8("junk"),
    ".hidden.md": strToU8("junk"),
  });
  assert.deepEqual(fromZip(zip), [
    { folder: null, name: "note.md", content: "ok" },
  ]);
});

test("沒副檔名、開頭是 . 的檔名也能還原", () => {
  const folders = [{ id: 10, name: ".private" }];
  const files = [
    { id: 1, name: "筆記", content: "a", folderId: null },
    { id: 2, name: "...未完.md", content: "b", folderId: null },
    { id: 3, name: "c.md", content: "c", folderId: 10 },
  ];
  const names = fromZip(toZip(files, folders)).map(
    (e) => `${e.folder ?? ""}/${e.name}`,
  );
  assert.deepEqual(names.sort(), ["/未完.md", "/筆記.md", "private/c.md"]);
});

test("沒有 UTF-8 旗標的 zip（Finder 壓的）中文檔名不會變亂碼", () => {
  // 把 UTF-8 位元組當 latin1 字元寫入：fflate 就不會設 UTF-8 旗標
  const latin1 = String.fromCharCode(...strToU8("筆記/會議.md"));
  const zip = zipSync({ [latin1]: strToU8("hi") });
  assert.deepEqual(fromZip(zip), [
    { folder: "筆記", name: "會議.md", content: "hi" },
  ]);
});
