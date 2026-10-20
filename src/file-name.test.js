// 執行：node --test src/file-name.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { nameFromContent, isAutoNamed, AUTO_NAME_LENGTH } from "./file-name.js";

test("取第一個非空行，去掉 Markdown 符號", () => {
  assert.equal(
    nameFromContent("\n\n# 會議紀錄 **重要**\n內文"),
    "會議紀錄 重要.md",
  );
  assert.equal(nameFromContent("- [ ] 買牛奶"), "買牛奶.md");
  assert.equal(nameFromContent("1. 第一步"), "第一步.md");
  assert.equal(nameFromContent("> 引用一句話"), "引用一句話.md");
  assert.equal(
    nameFromContent("[官網](https://example.com) 介紹"),
    "官網 介紹.md",
  );
  assert.equal(nameFromContent("a/b\\c"), "a b c.md");
});

test("簡報跳過 front matter 和指令註解", () => {
  assert.equal(
    nameFromContent("---\nmarp: true\n---\n\n<!-- _class: lead -->\n# 年度報告"),
    "年度報告.md",
  );
});

test("超過長度截斷，emoji 不會被切壞", () => {
  const name = nameFromContent("👍🏽".repeat(30));
  assert.equal(name, "👍🏽".repeat(AUTO_NAME_LENGTH) + ".md");
});

test("沒有內容時回傳 null", () => {
  assert.equal(nameFromContent(""), null);
  assert.equal(nameFromContent("\n   \n#  "), null);
});

test("自動檔名判斷：有旗標看旗標，舊資料看預設名稱", () => {
  assert.equal(isAutoNamed({ name: "新檔案3.md" }), true);
  assert.equal(isAutoNamed({ name: "筆記.md" }), false);
  assert.equal(isAutoNamed({ name: "新檔案3.md", autoName: false }), false);
  assert.equal(isAutoNamed({ name: "會議.md", autoName: true }), true);
});

test("跳過跨行的指令註解和 <style> 區塊", () => {
  assert.equal(
    nameFromContent("---\nmarp: true\n---\n<!--\n_class: lead\n-->\n<style>\nh1 { color: red }\n</style>\n# 年度報告"),
    "年度報告.md",
  );
});

test("一般文件開頭的 --- 是分隔線，不當 front matter", () => {
  // 跟改版前一樣取第一行；重點是不會跳過一整段，從後面的「附錄」取名
  assert.equal(nameFromContent("---\n# 會議紀錄\n內容\n---\n附錄"), "---.md");
});

test("簡報跳過整行背景圖；一般文件不刪 <style 之後的內容", () => {
  assert.equal(
    nameFromContent("---\nmarp: true\n---\n\n![bg right:40%](https://x/y.jpg)\n\n# 年度報告"),
    "年度報告.md",
  );
  // 同一行多張背景圖：Marp 的左右分割背景
  assert.equal(
    nameFromContent("---\nmarp: true\n---\n\n![bg](a.jpg) ![bg](b.jpg)\n\n# 年度報告"),
    "年度報告.md",
  );
  assert.equal(
    nameFromContent("如何用 <style> 標籤\n\n內文\n\n```html\n</style>\n```"),
    "如何用 <style> 標籤.md",
  );
});
