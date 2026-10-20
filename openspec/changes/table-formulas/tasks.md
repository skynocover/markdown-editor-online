## 1. 公式引擎（純函式）

- [ ] 1.1 新增 `src/table-formula.js`：tokenizer（數字、參照、範圍、函數名、運算子、括號、逗號）
- [ ] 1.2 遞迴下降解析與計算：四則運算、負號、括號
- [ ] 1.3 儲存格值的解析：用 regex 判斷數字（含千分位、結尾 `%`）、空白、文字（含 `$30`、`1,2,3`）；四則運算與範圍參數的不同規則；公式結果不是數字 → `#ERR`
- [ ] 1.4 參照與範圍：A1 座標（表頭為第 1 列，表頭公式也計算）、不分大小寫；單一參照超出範圍 → `#REF`，範圍截到表格邊界，整個在表格外 → `#REF`
- [ ] 1.5 函數 `SUM`、`AVG`、`MIN`、`MAX`、`COUNT`；範圍內的錯誤值往外傳遞；未知函數 → `#ERR`
- [ ] 1.6 公式參照公式：memo 加上 visiting 集合（`#CYCLE`）、錯誤傳遞；結果不是 `Number.isFinite` → `#ERR`
- [ ] 1.7 匯出 `evaluateTable(rows: string[][]) → (string | null)[][]`（非公式格回傳 `null`）；輸出用 `Intl.NumberFormat("en-US", { maximumFractionDigits: 10 })` 格式化
- [ ] 1.8 新增 `src/table-formula.test.js`，涵蓋 table-formulas spec 所有情境（含 `=alert(1)`、巢狀過深與很長的參照鏈會丟出例外），`node --test src/table-formula.test.js` 通過

## 2. 接進預覽

- [ ] 2.1 `parseMarkdown` 改成 `marked.lexer` → `walkTokens` 找出 table → `evaluateTable` → 寫回儲存格 tokens → `marked.parser` → DOMPurify；`lexer`、`parser` 都傳 `{ ...marked.defaults, breaks: true }`
- [ ] 2.2 每個表格的 `evaluateTable` 包 try/catch，丟出例外時該表格照原文顯示
- [ ] 2.3 確認唯讀分享預覽、字數計算都正確顯示計算結果

## 3. 驗證與文件

- [ ] 3.1 手動測試：從試算表貼上分帳表後加上 `=SUM`、修改數字後即時重算、千分位與百分比、循環參照、刪掉欄位造成 `#REF`
- [ ] 3.2 `pnpm lint`、`node --test src/*.test.js` 通過
- [ ] 3.3 README：新增「表格公式」段落（語法、座標規則、函數、錯誤值、千分位與百分比、`\=` 跳脫；不支援的項目：貨幣符號要寫在表頭、簡報內不計算）
