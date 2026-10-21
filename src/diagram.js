// mermaid 圖表：用 Pele 把 ```mermaid 的原文同步轉成 SVG，一般預覽和簡報共用
// Pele 和每種圖表都按需載入：還沒載好先顯示原文並記進待載入清單，編輯器載好後重新 render
let pele = null;
let pending = [];

// 分享連結是不受信任的輸入：不輸出 click 連結、不載入外部圖片，原文和輸出都限制大小
// 上限是 Pele 預設的 1/2～1/4：手寫的圖碰不到，一張圖壓在 100 ms、1 MB 以內
// fontFamily 跟預覽同字型（Tailwind 預設），量出來的字寬才準
const OPTIONS = {
  links: false,
  images: false,
  limit: 20000,
  maxEdges: 1000,
  outputLimit: 1000000,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

// 寫了 accTitle / accDescr 才會輸出 id="<idPrefix>-title"：前綴用原文算，同頁多張圖不撞名
// 不能每次 render 換：idPrefix 也是部分圖表手繪線條的亂數種子，換了圖會跟著打字抖動
// ponytail: 兩張一模一樣的圖仍會同 id，只影響讀螢幕軟體念的標題
const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);

const codeBlock = (source) =>
  `<pre><code class="language-mermaid">${escapeHtml(source)}</code></pre>`;

// 行號可能指到原文最後一行的下一行（缺結尾的語法錯誤），收回最後一行
const atLine = (e, source) => {
  const lines = source.trimEnd().split("\n").length;
  return e.line > 0 ? `（第 ${Math.min(e.line, lines)} 行）` : "";
};

const errorMessage = (e, source) => {
  switch (e.code) {
    case "syntax":
      return `圖表語法錯誤${atLine(e, source)}`;
    case "semantic":
      return `圖表內容有誤${atLine(e, source)}`;
    case "unsupported-diagram":
      return "不支援的圖表類型";
    case "limit":
      return "圖表太大，超過大小限制";
    default:
      return "圖表無法顯示";
  }
};

// options：簡報要用比較大的字，跟投影片內文差不多大
export const renderDiagram = (source, options) => {
  const type = pele?.detectType(source);
  if (!pele || (type && !pele.registered(type))) {
    pending.push(source);
    return codeBlock(source);
  }
  try {
    const { svg } = pele.render(source, { ...OPTIONS, idPrefix: `pele-${hash(source)}`, ...options });
    return `<div class="diagram">${svg}</div>`;
  } catch (e) {
    return `${codeBlock(source)}<p class="diagram-error">${escapeHtml(errorMessage(e, source))}</p>`;
  }
};

export const takePending = () => {
  const list = pending;
  pending = [];
  return list;
};

// 失敗不快取：pele 還是 null、類型沒註冊，下次 render 又會記進待載入，再試一次
export const loadDiagrams = async (sources) => {
  pele ??= await import("pele/lazy");
  const types = new Set(sources.map((s) => pele.detectType(s)).filter((t) => t && !pele.registered(t)));
  await Promise.all([...types].map((t) => pele.load(t)));
};
