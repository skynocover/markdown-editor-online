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
