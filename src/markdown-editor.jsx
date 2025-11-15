import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Copy,
  Check,
} from "lucide-react";

// 簡單的 Markdown 轉換函數
const parseMarkdown = (markdown) => {
  let html = markdown;

  // 標題
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // 粗體
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // 斜體
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // 程式碼區塊
  html = html.replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>");

  // 行內程式碼
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 連結
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );

  // 圖片
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width: 100%;" />'
  );

  // 無序列表
  html = html.replace(/^\* (.*$)/gim, "<li>$1</li>");
  html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gim, "<li>$1</li>");

  // 引用
  html = html.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

  // 水平線
  html = html.replace(/^---$/gim, "<hr />");
  html = html.replace(/^\*\*\*$/gim, "<hr />");

  // 段落
  html = html.replace(/\n\n/g, "</p><p>");
  html = "<p>" + html + "</p>";

  return html;
};

const MarkdownEditor = () => {
  // 從 localStorage 載入資料，若無則使用預設值
  const loadFromStorage = () => {
    try {
      const savedData = localStorage.getItem("markdown-editor-data");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return {
          files: parsed.files || [
            {
              id: 1,
              name: "歡迎.md",
              content:
                '# 歡迎使用 Markdown 編輯器\n\n## 功能特色\n\n- 支援多個檔案\n- 即時預覽\n- 可縮放的側邊欄\n- 自動同步到 localStorage\n\n### 快速開始\n\n開始輸入你的 **Markdown** 內容吧！\n\n```javascript\nconsole.log("Hello, Markdown!");\n```\n\n> 這是一個引用區塊',
            },
          ],
          currentFileId: parsed.currentFileId || 1,
          nextId: parsed.nextId || 2,
          sidebarCollapsed: parsed.sidebarCollapsed || false,
        };
      }
    } catch (error) {
      console.error("載入資料失敗:", error);
    }
    return {
      files: [
        {
          id: 1,
          name: "歡迎.md",
          content:
            '# 歡迎使用 Markdown 編輯器\n\n## 功能特色\n\n- 支援多個檔案\n- 即時預覽\n- 可縮放的側邊欄\n- 自動同步到 localStorage\n\n### 快速開始\n\n開始輸入你的 **Markdown** 內容吧！\n\n```javascript\nconsole.log("Hello, Markdown!");\n```\n\n> 這是一個引用區塊',
        },
      ],
      currentFileId: 1,
      nextId: 2,
      sidebarCollapsed: false,
    };
  };

  const initialData = loadFromStorage();
  const [files, setFiles] = useState(initialData.files);
  const [currentFileId, setCurrentFileId] = useState(initialData.currentFileId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialData.sidebarCollapsed
  );
  const [nextId, setNextId] = useState(initialData.nextId);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // 儲存要刪除的檔案 ID
  const [copied, setCopied] = useState(false); // 複製狀態

  // 自動同步到 localStorage
  useEffect(() => {
    const dataToSave = {
      files,
      currentFileId,
      nextId,
      sidebarCollapsed,
    };
    localStorage.setItem("markdown-editor-data", JSON.stringify(dataToSave));
  }, [files, currentFileId, nextId, sidebarCollapsed]);

  const currentFile = files.find((f) => f.id === currentFileId);

  const createNewFile = () => {
    const newFile = {
      id: nextId,
      name: `新檔案${nextId}.md`,
      content: "",
    };
    setFiles([...files, newFile]);
    setCurrentFileId(nextId);
    setNextId(nextId + 1);
  };

  const deleteFile = (id) => {
    if (files.length === 1) {
      alert("至少需要保留一個檔案！");
      return;
    }
    setDeleteConfirm(id); // 顯示確認對話框
  };

  const confirmDelete = () => {
    const newFiles = files.filter((f) => f.id !== deleteConfirm);
    setFiles(newFiles);
    if (currentFileId === deleteConfirm) {
      setCurrentFileId(newFiles[0].id);
    }
    setDeleteConfirm(null); // 關閉對話框
  };

  const cancelDelete = () => {
    setDeleteConfirm(null); // 關閉對話框
  };

  const updateFileName = (id, newName) => {
    setFiles(files.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  };

  const updateFileContent = (content) => {
    setFiles(
      files.map((f) => (f.id === currentFileId ? { ...f, content } : f))
    );
  };

  const exportFile = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newFile = {
          id: nextId,
          name: file.name,
          content: event.target.result,
        };
        setFiles([...files, newFile]);
        setCurrentFileId(nextId);
        setNextId(nextId + 1);
      };
      reader.readAsText(file);
    }
  };

  const copyContent = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後恢復
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 側邊欄 */}
      <div
        className={`bg-gray-800 text-white transition-all duration-300 ${
          sidebarCollapsed ? "w-0" : "w-64"
        } overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">檔案管理</h2>
            <button
              onClick={createNewFile}
              className="p-2 hover:bg-gray-700 rounded"
              title="新增檔案"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="mb-4">
            <label className="flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer">
              <Upload size={16} className="mr-2" />
              <span className="text-sm">匯入檔案</span>
              <input
                type="file"
                accept=".md,.txt"
                onChange={importFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center p-2 rounded cursor-pointer ${
                  file.id === currentFileId
                    ? "bg-blue-600"
                    : "hover:bg-gray-700"
                }`}
                onClick={() => setCurrentFileId(file.id)}
              >
                <FileText size={16} className="mr-2 shrink-0" />
                <input
                  type="text"
                  value={file.name}
                  onChange={(e) => updateFileName(file.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFile(file.id);
                  }}
                  className="p-1 hover:bg-red-600 rounded ml-2"
                  title="刪除檔案"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 flex flex-col">
        {/* 工具列 */}
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 折疊按鈕 - 移到左上角 */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              title={sidebarCollapsed ? "展開側邊欄" : "收起側邊欄"}
            >
              {sidebarCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>
            <h1 className="text-lg font-semibold">
              {currentFile?.name || "未選擇檔案"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 複製按鈕 */}
            <button
              onClick={copyContent}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              title="複製內容"
            >
              {copied ? (
                <>
                  <Check size={16} className="mr-2" />
                  已複製
                </>
              ) : (
                <>
                  <Copy size={16} className="mr-2" />
                  複製
                </>
              )}
            </button>
            {/* 匯出按鈕 */}
            <button
              onClick={exportFile}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              title="匯出檔案"
            >
              <Download size={16} className="mr-2" />
              匯出
            </button>
          </div>
        </div>

        {/* 編輯器和預覽區 */}
        <div className="flex-1 flex overflow-hidden">
          {/* Markdown 編輯區 */}
          <div className="flex-1 border-r">
            <textarea
              value={currentFile?.content || ""}
              onChange={(e) => updateFileContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm resize-none outline-none"
              placeholder="在此輸入 Markdown..."
            />
          </div>

          {/* 預覽區 */}
          <div className="flex-1 overflow-auto bg-white">
            <div
              className="p-4 prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(currentFile?.content || ""),
              }}
              style={{
                lineHeight: "1.6",
              }}
            />
          </div>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">確認刪除</h3>
            <p className="text-gray-600 mb-6">
              確定要刪除檔案「{files.find((f) => f.id === deleteConfirm)?.name}
              」嗎？此操作無法復原。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 樣式 */}
      <style>{`
        .prose h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose p {
          margin-bottom: 1em;
        }
        .prose ul {
          list-style-type: disc;
          margin-left: 2em;
          margin-bottom: 1em;
        }
        .prose ol {
          list-style-type: decimal;
          margin-left: 2em;
          margin-bottom: 1em;
        }
        .prose li {
          margin-bottom: 0.5em;
        }
        .prose code {
          background-color: #f4f4f4;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .prose pre {
          background-color: #f4f4f4;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          margin-bottom: 1em;
        }
        .prose pre code {
          background-color: transparent;
          padding: 0;
        }
        .prose blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1em;
          margin-left: 0;
          color: #666;
          font-style: italic;
        }
        .prose a {
          color: #0066cc;
          text-decoration: underline;
        }
        .prose hr {
          border: none;
          border-top: 2px solid #ddd;
          margin: 2em 0;
        }
        .prose strong {
          font-weight: bold;
        }
        .prose em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default MarkdownEditor;
