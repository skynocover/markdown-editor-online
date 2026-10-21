## ADDED Requirements

### Requirement: 粗體與斜體快捷鍵
在編輯區按 Ctrl+B（Mac 是 Cmd+B）時，系統 SHALL 切換選取範圍的粗體（`**`）；按 Ctrl+I（Mac 是 Cmd+I）時 SHALL 切換斜體（`*`）。選取範圍前後已經有同樣的符號時 SHALL 拿掉，否則加上。選取範圍頭尾的空白 SHALL 不包進去。每次切換都 SHALL 能用 Ctrl+Z 還原。

#### Scenario: 加上粗體
- **WHEN** 使用者選取 `字` 後按 Ctrl+B
- **THEN** 變成 `**字**`，選取範圍仍然是 `字`

#### Scenario: 再按一次拿掉
- **WHEN** 使用者選取 `**字**` 裡的 `字` 後按 Ctrl+B
- **THEN** 變回 `字`

#### Scenario: 沒有選取
- **WHEN** 沒有選取文字時按 Ctrl+B
- **THEN** 插入 `****`，游標在中間

#### Scenario: 粗體裡加斜體
- **WHEN** 使用者選取 `**字**` 裡的 `字` 後按 Ctrl+I
- **THEN** 變成 `***字***`，不會把粗體拆掉

#### Scenario: Mac 上的 Ctrl+B
- **WHEN** Mac 使用者按 Ctrl+B
- **THEN** 維持系統原本的游標左移，不加粗體
