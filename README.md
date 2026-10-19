# Markdown Editor Online

一個純前端、開了就能用的 Markdown 編輯器。不用註冊、沒有後端：筆記都存在瀏覽器的 localStorage，分享連結把內容壓縮後放在網址 `#` 後面，不會送到任何伺服器。

![編輯器主畫面](docs/editor.png)

## 功能

### 編輯與預覽

- 左邊寫 Markdown，右邊即時預覽（[marked](https://marked.js.org/)，單換行就會換行）
- 預覽內容經 [DOMPurify](https://github.com/cure53/DOMPurify) 過濾，貼上來路不明的 Markdown 也不會跑出 XSS
- 右下角顯示字數：只算預覽後看得到的字，不算 Markdown 符號和空白，組合 emoji 算一個字
- 一鍵複製 Markdown 原文，或把目前檔案下載成 `.md`

### 檔案管理

- 多檔案，可以建資料夾（一層），拖曳檔案就能搬到別的資料夾
- 新檔案沒取名的話，會自動拿第一行的前 20 個字當檔名
- 把 `.md` 或 `.zip` 拖進側邊欄就能匯入
- 「全部匯出」把所有檔案打包成 zip，資料夾對應到 zip 裡的目錄，之後可以原樣匯回來
- 側邊欄可以收合，專心寫字

### 分享連結

![分享對話框](docs/share.png)

- **可編輯**：對方打開後直接存成自己的新檔案，改了也不會動到你的
- **唯讀**：對方只看到預覽，要按「存成我的檔案」才能編輯（這只是畫面模式，不是權限，拿到連結就拿得到全文）
- **密碼**：填了就用 AES-GCM 加密，金鑰由密碼經 PBKDF2（60 萬次）產生。密碼要用別的管道告訴對方

對方用唯讀連結打開時看到的畫面：

![唯讀模式](docs/readonly.png)

> 內容整份放在網址裡，所以文件越長連結越長。超過約 2000 字元時，LINE、簡訊這類地方可能會截斷連結，編輯器會提醒你。

## 資料存在哪裡

- 所有檔案都在**這個瀏覽器**的 localStorage，換瀏覽器或清除網站資料就會不見，記得定期「全部匯出」備份
- localStorage 大約只有 5MB，滿了會跳提醒

## 開發

```bash
pnpm install
pnpm dev        # 本機開發
pnpm build      # 打包到 dist/
pnpm lint

# 單元測試（Node 內建 test runner）
node --test src/*.test.js
```

技術：React 19、Vite、Tailwind CSS 4、marked、DOMPurify、fflate（zip）、lucide-react（圖示）。

主要檔案：

| 檔案 | 內容 |
| --- | --- |
| `src/markdown-editor.jsx` | 整個編輯器介面 |
| `src/share.js` | 分享連結的壓縮、加密與解碼 |
| `src/backup.js` | 全部匯出／匯入 zip |
| `src/file-name.js` | 從內容產生自動檔名 |

## License

[MIT](LICENSE)
