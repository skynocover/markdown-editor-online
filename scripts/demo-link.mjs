// 產生 README 裡「範例週報」的唯讀分享連結；改了分享格式後重跑：node scripts/demo-link.mjs
import { encodeShare } from "../src/share.js";
const content = `# 第 42 週週報

## 本週業績

<!-- chart bar B2:C4 -->
| 通路 | 目標 | 實際 | 達成率 |
| --- | --- | --- | --- |
| 線上 | 120 | 138 | =C2/B2*100 |
| 門市 | 90 | 81 | =C3/B3*100 |
| 批發 | 60 | 66 | =C4/B4*100 |
| 合計 | =SUM(B2:B4) | =SUM(C2:C4) | =C5/B5*100 |

## 下週待辦

- [x] 整理客戶回饋
- [ ] 門市補貨流程檢討
- [ ] 準備月會簡報

> 這份文件就在這條連結裡，伺服器上沒有副本。按「存成我的檔案」就能自己改。
`;
const hash = await encodeShare({ name: "範例週報", content, readonly: true });
console.log(`https://markdown.ericwu.co/#${hash}`);
