## MODIFIED Requirements

### Requirement: 在預覽調整表格結構
編輯表格時，系統 SHALL 顯示欄號（A、B、C…）和列號，並提供新增列、新增欄、刪除列和欄，以及拖曳換位置的操作。表頭列 SHALL 不能刪除或移動。刪除或移動欄列時，公式裡的座標和表格上方圖表註解的範圍 SHALL 跟著更新：被刪掉的單一參照變成 `#REF`；範圍的端點被刪掉時往內縮，整個範圍都被刪掉才變成 `#REF`。

#### Scenario: 刪除欄後公式跟著改
- **WHEN** 表格是 `品項 | 數量 | 單價 | 小計`，D2 是 `=B2*C2`，使用者刪掉 A 欄
- **THEN** 原本的 D2 變成 C2，內容變成 `=A2*B2`

#### Scenario: 刪掉被參照的欄
- **WHEN** D2 是 `=B2*C2`，使用者刪掉 B 欄
- **THEN** 公式變成 `=#REF*B2`

#### Scenario: 範圍縮小
- **WHEN** 公式是 `=SUM(D2:D3)`，使用者刪掉第 2 列
- **THEN** 公式變成 `=SUM(D2)`

#### Scenario: 圖表範圍跟著改
- **WHEN** 表格上方是 `<!-- chart bar C2:D3 -->`，使用者刪掉 A 欄
- **THEN** 註解變成 `<!-- chart bar B2:C3 -->`

#### Scenario: 搬動欄後圖表範圍跟著改
- **WHEN** 表格上方是 `<!-- chart bar D2:D3 -->`，使用者把 D 欄拖到 B 欄的位置
- **THEN** 註解變成 `<!-- chart bar B2:B3 -->`
