// 執行：node --test src/share.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeShare,
  decodeShare,
  decryptShare,
  readShareHash,
  MAX_DECODED_LENGTH,
} from "./share.js";

// encodeShare 回傳 "s=..." / "e=..."，測試裡取出 payload
const encode = async (doc, password) =>
  readShareHash(await encodeShare(doc, password));

test("編碼後解碼得到原本的內容（含中文與 emoji）", async () => {
  const doc = {
    name: "筆記.md",
    content: "# 標題\n\n中文 😀 `code`\n".repeat(50),
    readonly: false,
  };
  const { payload, encrypted } = await encode(doc);
  assert.equal(encrypted, false);
  assert.match(payload, /^[A-Za-z0-9_-]+$/); // 網址安全字元
  assert.deepEqual(await decodeShare(payload), doc);
});

test("唯讀旗標會保留；缺少時視為可編輯", async () => {
  const { payload } = await encode({
    name: "a.md",
    content: "x",
    readonly: true,
  });
  assert.equal((await decodeShare(payload)).readonly, true);
  const plain = await encode({ name: "a.md", content: "x" });
  assert.equal((await decodeShare(plain.payload)).readonly, false);
});

test("損毀的連結會 throw", async () => {
  const { payload } = await encode({ name: "a.md", content: "hello" });
  await assert.rejects(decodeShare(payload.slice(0, -3)));
  await assert.rejects(decodeShare("@@@"));
});

test("解壓後超過上限的連結會被拒絕（壓縮炸彈）", async () => {
  const { payload } = await encode({
    name: "bomb.md",
    content: "a".repeat(MAX_DECODED_LENGTH),
  });
  assert.ok(payload.length < 5000); // 連結很小
  await assert.rejects(decodeShare(payload), /過大/);
});

test("加密：正確密碼解得開，錯誤密碼或竄改都會失敗", async () => {
  const doc = { name: "機密.md", content: "秘密內容 🔒", readonly: true };
  const { payload, encrypted } = await encode(doc, "correct horse");
  assert.equal(encrypted, true);
  assert.deepEqual(await decryptShare(payload, "correct horse"), doc);
  await assert.rejects(decryptShare(payload, "wrong"));
  // 改中間的字元：結尾的 base64 字元有幾個 bit 會被捨棄，改了可能等於沒改
  const tampered =
    payload.slice(0, 40) + (payload[40] === "A" ? "B" : "A") + payload.slice(41);
  await assert.rejects(decryptShare(tampered, "correct horse"));
  await assert.rejects(decodeShare(payload)); // 不給密碼不能當明文解
});

test("同樣內容與密碼，每次產生的連結都不同（隨機 salt/iv）", async () => {
  const doc = { name: "a.md", content: "x" };
  assert.notEqual(await encodeShare(doc, "pw"), await encodeShare(doc, "pw"));
});

test("沒有分享內容的 hash 回傳 null", () => {
  assert.equal(readShareHash(""), null);
  assert.equal(readShareHash("#foo=1"), null);
});
