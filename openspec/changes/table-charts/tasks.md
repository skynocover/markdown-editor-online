## 1. 數值與轉換（純函式）

- [ ] 1.1 `src/table-formula.js` 匯出 `tableValues(rows, budget)`（數字、`null`、字串、`{ code }`），`evaluateTable` 改用它；現有 `table-formula.test.js` 照樣通過
- [ ] 1.2 新增 `src/table-chart.js`：`parseChart(comment)`，只接受完整符合 `chart <bar|line|pie> <範圍或座標|#REF>` 的註解，不分大小寫
- [ ] 1.3 `defaultRange(values)`：數字欄 × 資料列，最後一列有 `SUM`/`AVG`/`MIN`/`MAX`/`COUNT` 公式時排除
- [ ] 1.4 `chartSource(values, spec)`：範圍截到表格邊界、標籤與系列名稱的字元替換、整列非數字就略過、公式錯誤與範圍錯誤的中文訊息、數值不用科學記號、`bar`/`line` → 有名字系列的 `xychart-beta`、`pie` 只能一欄
- [ ] 1.5 新增 `src/table-chart.test.js`，涵蓋 table-charts spec 的資料與錯誤情境；產生的原文拿 Pele 的 `render` 跑過，確認沒有語法錯誤；`node --test src/table-chart.test.js` 通過

## 2. 接進預覽

- [ ] 2.1 `parseMarkdown`：`markTables` 之後找出「頂層 `html` token 是圖表註解、下一個是 `table`」的組合，把 `{ spec, start }` 掛到表格 token；`calcTables` 時保留圖表要用的數值
- [ ] 2.2 `previewRenderer.table`：表格後面接 `renderDiagram(chartSource(values, spec))`，錯誤時顯示一行錯誤訊息；圖的容器帶 `data-chart-start`
- [ ] 2.3 確認唯讀分享預覽、字數計算正常；表格公式的 `budget` 跟圖表共用

## 3. 表格工具

- [ ] 3.1 `TableTools`：「新增一列」右邊切出「圖表 ▾」按鈕與選單（沒有圖：三種類型；有圖：換類型、選範圍、移除圖表）
- [ ] 3.2 讀寫表格時一併讀寫上方的圖表註解：寫回範圍從表格擴大到註解，插入、換類型、移除都是一次 `replaceText`，一次 Ctrl+Z 還原
- [ ] 3.3 `preview-edit.js`：把 `fixRefs` 裡「修正一個座標字串」拆出來，`reorderRows`、`reorderCols` 也修正註解的範圍；`preview-edit.test.js` 加上圖表範圍的情境

## 4. 選範圍

- [ ] 4.1 選範圍狀態：藍框標出目前範圍、顯示操作提示；Esc 或點表格外面離開
- [ ] 4.2 拖曳選格子（沿用 `picking` 的 mousedown / mouseover，藍框跟著動），放開滑鼠用一次 `replaceText` 寫回註解
- [ ] 4.3 點欄號選該欄資料列、Shift 延伸到另一欄，點了就寫回

## 5. 驗證與文件

- [ ] 5.1 手動測試：從 Excel 貼上表格 → 插入長條圖 → 改數字 → 選範圍 → 換折線圖 → 刪欄 → 移除圖表；每一步按 Ctrl+Z 都正確還原
- [ ] 5.2 確認在 GitHub 預覽同一份檔案只看到表格
- [ ] 5.3 `pnpm lint`、`node --test src/*.test.js`、`pnpm build` 通過
- [ ] 5.4 README：新增「表格圖表」段落（註解語法、類型、範圍規則、緊貼表格不能有空行、在別的編輯器只看到表格；簡報裡還不支援）
