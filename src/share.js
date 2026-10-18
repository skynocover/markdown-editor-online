// 分享連結：把 { name, content, readonly? } 壓縮後放進網址 # 後面（不會送到伺服器）
// 格式：#s=<base64url(deflate-raw(JSON))>
// 加密：#e=<base64url(salt 16 | iv 12 | AES-GCM(deflate-raw(JSON)))>，金鑰由密碼經 PBKDF2 產生
// readonly 只是開啟時的畫面模式，不是權限：拿到連結的人一樣能取得全文

// 超過這個長度，LINE、簡訊、部分 Email 可能截斷或認不出連結
export const LINK_WARN_LENGTH = 2000;

// 解壓後的上限（字元數），正常分享的筆記遠小於此
export const MAX_DECODED_LENGTH = 1_000_000;

// OWASP 2023 對 PBKDF2-SHA256 的建議值：連結裡有密文，猜密碼可以離線進行，每猜一次都要夠貴
const PBKDF2_ITERATIONS = 600_000;

const pipe = (bytes, stream) =>
  new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();

const toBase64Url = (bytes) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64Url = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );

const compress = async (doc) =>
  new Uint8Array(
    await pipe(JSON.stringify(doc), new CompressionStream("deflate-raw")),
  );

const decompress = async (bytes) => {
  const json = new TextDecoder().decode(
    await pipe(bytes, new DecompressionStream("deflate-raw")),
  );
  // 防壓縮炸彈：小連結可解成上百 MB，放進編輯器會卡死分頁
  // ponytail: 解完才檢查，解壓當下仍會短暫吃記憶體；要擋那個得逐塊讀 stream 計數
  if (json.length > MAX_DECODED_LENGTH) throw new Error("分享內容過大");
  const doc = JSON.parse(json);
  if (typeof doc?.name !== "string" || typeof doc?.content !== "string") {
    throw new Error("分享連結格式不正確");
  }
  return {
    name: doc.name,
    content: doc.content,
    readonly: doc.readonly === true,
  };
};

const deriveKey = async (password, salt) =>
  crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    ),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

// 回傳放在 # 後面的字串：有密碼為 "e=..."，沒有為 "s=..."
export const encodeShare = async (doc, password = "") => {
  const bytes = await compress(doc);
  if (!password) return `s=${toBase64Url(bytes)}`;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes),
  );
  return `e=${toBase64Url(new Uint8Array([...salt, ...iv, ...sealed]))}`;
};

// 從網址 hash 取出分享內容；沒有分享內容時回傳 null
export const readShareHash = (hash) => {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.has("s")) return { payload: params.get("s"), encrypted: false };
  if (params.has("e")) return { payload: params.get("e"), encrypted: true };
  return null;
};

// 以下兩個在連結損毀、格式不對或密碼錯誤時都會 throw，由呼叫端處理
export const decodeShare = async (payload) =>
  decompress(fromBase64Url(payload));

export const decryptShare = async (payload, password) => {
  const bytes = fromBase64Url(payload);
  const key = await deriveKey(password, bytes.slice(0, 16));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(16, 28) },
    key,
    bytes.slice(28),
  );
  return decompress(new Uint8Array(plain));
};
