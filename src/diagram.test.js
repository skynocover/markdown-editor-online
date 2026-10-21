// 執行：node --test src/diagram.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDiagrams, renderDiagram, takePending } from "./diagram.js";

const FLOW = "flowchart LR\n  登入 --> 驗證";

// 要先跑：模組狀態是共用的，Pele 一載入就回不去
test("載入前顯示原文並記進待載入", () => {
  assert.equal(renderDiagram(FLOW), `<pre><code class="language-mermaid">${FLOW.replace(">", "&gt;")}</code></pre>`);
  assert.deepEqual(takePending(), [FLOW]);
  assert.deepEqual(takePending(), []); // 取出就清空
});

test("載入後輸出 SVG，只載入用到的類型", async () => {
  await loadDiagrams([FLOW]);
  const html = renderDiagram(FLOW);
  assert.match(html, /^<div class="diagram"><svg /);
  assert.match(html, />登入</);
  assert.deepEqual(takePending(), []);

  const pie = 'pie\n  "a": 1\n  "b": 2';
  assert.doesNotMatch(renderDiagram(pie), /<svg/); // 圓餅圖還沒載
  assert.deepEqual(takePending(), [pie]);
  await loadDiagrams([pie]);
  assert.match(renderDiagram(pie), /<svg /);
});

test("語法錯誤：原文加上行號", () => {
  const html = renderDiagram("flowchart LR\n  A -->");
  assert.match(html, /<pre><code class="language-mermaid">flowchart LR\n {2}A --&gt;<\/code><\/pre>/);
  assert.match(html, /<p class="diagram-error">圖表語法錯誤（第 2 行）<\/p>$/);
});

test("不支援的圖表類型", () => {
  assert.match(renderDiagram("hello world"), /<p class="diagram-error">不支援的圖表類型<\/p>/);
  assert.deepEqual(takePending(), []); // 不是載入中，不用載
});

test("超過大小限制", () => {
  const big = "flowchart LR\n" + "  A --> B\n".repeat(3000);
  assert.match(renderDiagram(big), /圖表太大，超過大小限制/);
  const edges = "flowchart LR\n" + Array.from({ length: 1001 }, (_, i) => `  n${i} --> n${i + 1}`).join("\n");
  assert.match(renderDiagram(edges), /圖表太大，超過大小限制/);
});

test("標籤裡的 HTML、click 連結不會出現在輸出", async () => {
  const html = renderDiagram(
    'flowchart LR\n  A["<img src=x onerror=alert(1)>"] --> B\n  click A "javascript:alert(1)"\n  click B "https://example.com"',
  );
  assert.match(html, /<svg /);
  assert.doesNotMatch(html, /onerror|javascript:|<img|<a[\s>]|example\.com/);
});

test("輸出沒有 id，標籤文字裡的 id=\"x\" 照常顯示", () => {
  const html = renderDiagram('flowchart LR\n  more-menu["id=&quot;x&quot;"] --> B');
  assert.doesNotMatch(html, / id="/);
  assert.match(html, /id=&quot;x&quot;/);
});

test("accTitle 的 id：不同的圖不撞名，同一張圖每次一樣", () => {
  const ids = (src) => renderDiagram(src).match(/ id="[^"]*"/g);
  const a = "flowchart LR\n  accTitle: 登入\n  A --> B";
  const b = "flowchart LR\n  accTitle: 登出\n  A --> B";
  assert.equal(ids(a).length, 1);
  assert.notDeepEqual(ids(a), ids(b));
  assert.deepEqual(ids(a), ids(a));
});
