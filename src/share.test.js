// 執行：node --test src/share.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeShare, decodeShare, MAX_DECODED_LENGTH } from "./share.js";

test("編碼後解碼得到原本的內容（含中文與 emoji）", async () => {
  const doc = {
    name: "筆記.md",
    content: "# 標題\n\n中文 😀 `code`\n".repeat(50),
  };
  const payload = await encodeShare(doc);
  assert.match(payload, /^[A-Za-z0-9_-]+$/); // 網址安全字元
  assert.deepEqual(await decodeShare(payload), doc);
});

test("損毀的連結會 throw", async () => {
  const payload = await encodeShare({ name: "a.md", content: "hello" });
  await assert.rejects(decodeShare(payload.slice(0, -3)));
  await assert.rejects(decodeShare("@@@"));
});

test("解壓後超過上限的連結會被拒絕（壓縮炸彈）", async () => {
  const payload = await encodeShare({
    name: "bomb.md",
    content: "a".repeat(MAX_DECODED_LENGTH),
  });
  assert.ok(payload.length < 5000); // 連結很小
  await assert.rejects(decodeShare(payload), /過大/);
});
