// 分享連結：把 { name, content } 壓縮後放進網址 # 後面（不會送到伺服器）
// 格式：#s=<base64url(deflate-raw(JSON))>

// 超過這個長度，LINE、簡訊、部分 Email 可能截斷或認不出連結
export const LINK_WARN_LENGTH = 2000;

// 解壓後的上限（字元數），正常分享的筆記遠小於此
export const MAX_DECODED_LENGTH = 1_000_000;

const pipe = (bytes, stream) =>
  new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();

export const encodeShare = async (doc) => {
  const bytes = new Uint8Array(
    await pipe(JSON.stringify(doc), new CompressionStream("deflate-raw")),
  );
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// 連結損毀或格式不對時會 throw，由呼叫端處理
export const decodeShare = async (payload) => {
  const bin = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
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
  return doc;
};
