import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Download,
  Upload,
  Copy,
  Check,
  Folder,
  FolderOpen,
  FolderPlus,
  Share2,
} from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { encodeShare, decodeShare, LINK_WARN_LENGTH } from "./share";

// 預覽裡的連結開新分頁，不要把編輯器換掉
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

// breaks：單換行轉 <br />，維持原本的換行行為
const parseMarkdown = (markdown) =>
  // 禁 <style>：插進來的 CSS 會套到整個編輯器，不只預覽區
  DOMPurify.sanitize(marked.parse(markdown, { breaks: true }), {
    FORBID_TAGS: ["style"],
  });

// 字數以字素計：👍🏽、👨‍👩‍👧 這類組合 emoji 也只算一個字
const graphemes = new Intl.Segmenter();

// 側邊欄拖曳用自訂型別，不會被 textarea 當成文字插入，也不會把拖曳的文字誤認成檔案 ID
const FILE_ID_TYPE = "application/x-md-file-id";

const STORAGE_KEY = "markdown-editor-data";

const MarkdownEditor = () => {
  // 從 localStorage 載入資料，若無則使用預設值
  const loadFromStorage = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
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
          folders: parsed.folders || [],
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
      folders: [],
      currentFileId: 1,
      nextId: 2,
      sidebarCollapsed: false,
    };
  };

  const initialData = loadFromStorage();
  const [files, setFiles] = useState(initialData.files);
  const [folders, setFolders] = useState(initialData.folders); // { id, name, collapsed }
  const [currentFileId, setCurrentFileId] = useState(initialData.currentFileId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initialData.sidebarCollapsed,
  );
  const [nextId, setNextId] = useState(initialData.nextId);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // 儲存要刪除的檔案 ID
  const [copied, setCopied] = useState(false); // 複製狀態
  const [shared, setShared] = useState(false); // 分享連結已複製
  const [draggingId, setDraggingId] = useState(null); // 正在拖曳的檔案 ID
  const [dragOver, setDragOver] = useState(null); // 拖曳經過的目標：資料夾 ID 或 "root"

  // 自動同步到 localStorage
  const quotaAlerted = useRef(false); // 空間不足只提醒一次，不要每打一個字就跳
  useEffect(() => {
    const dataToSave = {
      files,
      folders,
      currentFileId,
      nextId,
      sidebarCollapsed,
    };
    // 超過容量會 throw：沒接住的話整個編輯器會被 React 卸載
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      quotaAlerted.current = false;
    } catch (error) {
      console.error("儲存失敗:", error);
      if (!quotaAlerted.current) {
        quotaAlerted.current = true;
        alert(
          "瀏覽器儲存空間不足，目前的變更沒有儲存。請刪除或匯出較大的檔案。",
        );
      }
    }
  }, [files, folders, currentFileId, nextId, sidebarCollapsed]);

  // 其他分頁存檔時跟著更新，不然這個分頁下次存檔會用舊資料把它蓋掉
  // ponytail: 整份狀態直接採用（包含目前開的檔案），要各分頁獨立選檔得把 currentFileId 拆出來存
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      const data = loadFromStorage();
      setFiles(data.files);
      setFolders(data.folders);
      setCurrentFileId(data.currentFileId);
      setNextId(data.nextId);
      setSidebarCollapsed(data.sidebarCollapsed);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 檔案沒放進側邊欄時，別讓瀏覽器直接打開它而離開編輯器
  // 只攔檔案：拖曳文字到 textarea 仍維持原本行為
  useEffect(() => {
    const block = (e) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  // 從分享連結打開：內容存成一個新檔案
  useEffect(() => {
    const payload = new URLSearchParams(location.hash.slice(1)).get("s");
    if (!payload) return;
    // 先清掉 hash：重新整理不會重複匯入，StrictMode 跑兩次 effect 也只匯入一次
    history.replaceState(null, "", location.pathname + location.search);
    // 先預留 ID 再 await，同 importFiles
    const id = nextId;
    setNextId(id + 1);
    decodeShare(payload)
      .then(({ name, content }) => {
        setFiles((prev) => [...prev, { id, name, content, folderId: null }]);
        setCurrentFileId(id);
      })
      .catch(() => alert("分享連結無效或不完整"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在載入時讀一次網址
  }, []);

  // 在已開著的分頁貼上分享連結只會改 hash、不會重新載入：重新載入讓上面的 effect 處理
  useEffect(() => {
    const onHashChange = () => {
      if (new URLSearchParams(location.hash.slice(1)).has("s")) {
        location.reload();
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const currentFile = files.find((f) => f.id === currentFileId);
  const currentContent = currentFile?.content || "";
  // 字數：不算空白與換行
  const visibleChars = currentContent.replace(/\s/g, "");
  const charCount = [...graphemes.segment(visibleChars)].length;

  // 新增/匯入到收合的資料夾時展開它，不然新檔案在側邊欄看不到
  const expandFolder = (id) =>
    setFolders((prev) =>
      prev.map((d) => (d.id === id ? { ...d, collapsed: false } : d)),
    );

  const createNewFile = (folderId = null) => {
    if (folderId) expandFolder(folderId);
    const newFile = {
      id: nextId,
      name: `新檔案${nextId}.md`,
      content: "",
      folderId,
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

  // ponytail: 只支援一層資料夾，需要巢狀再加 parentId
  const createFolder = () => {
    setFolders([
      ...folders,
      { id: nextId, name: `新資料夾${nextId}`, collapsed: false },
    ]);
    setNextId(nextId + 1);
  };

  const updateFolder = (id, patch) => {
    setFolders(folders.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  // 刪除資料夾時，裡面的檔案移回根目錄，不會遺失
  const deleteFolder = (id) => {
    setFiles(
      files.map((f) => (f.folderId === id ? { ...f, folderId: null } : f)),
    );
    setFolders(folders.filter((d) => d.id !== id));
  };

  // 拖曳到資料夾（folderId 為 null 代表根目錄）：
  // 從電腦拖進來的檔案 → 匯入；側邊欄內的檔案 → 移動
  const dropToFolder = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length) {
      importFiles(e.dataTransfer.files, folderId);
    } else {
      const id = Number(e.dataTransfer.getData(FILE_ID_TYPE));
      setFiles(files.map((f) => (f.id === id ? { ...f, folderId } : f)));
    }
    endDrag();
  };

  const endDrag = () => {
    setDraggingId(null);
    setDragOver(null);
  };

  // 拖曳目標共用的事件（target 為資料夾 ID 或 "root"）
  const dropTarget = (target) => ({
    onDragOver: (e) => {
      // 只接檔案或側邊欄的檔案，拖曳文字不顯示放置提示
      const { types } = e.dataTransfer;
      if (!types.includes("Files") && !types.includes(FILE_ID_TYPE)) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(target);
    },
    onDrop: (e) => dropToFolder(e, target === "root" ? null : target),
  });

  const updateFileName = (id, newName) => {
    setFiles(files.map((f) => (f.id === id ? { ...f, name: newName } : f)));
  };

  const updateFileContent = (content) => {
    setFiles(
      files.map((f) => (f.id === currentFileId ? { ...f, content } : f)),
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

  const importFiles = async (fileList, folderId) => {
    const picked = [...fileList].filter((f) =>
      /\.(md|markdown|txt)$/i.test(f.name),
    );
    if (!picked.length) return;
    // 先預留 ID 再 await：讀檔期間新增的檔案/資料夾才不會拿到同一個 ID
    const baseId = nextId;
    setNextId(baseId + picked.length);
    const contents = await Promise.all(picked.map((f) => f.text()));
    const newFiles = picked.map((f, i) => ({
      id: baseId + i,
      name: f.name,
      content: contents[i].replace(/\r\n?/g, "\n"), // Windows 換行轉成 \n
      folderId,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setCurrentFileId(baseId);
    if (folderId) expandFolder(folderId);
  };

  const shareLink = () => {
    if (!currentFile) return;
    const link = encodeShare({
      name: currentFile.name,
      content: currentFile.content,
    }).then((payload) => `${location.origin}${location.pathname}#s=${payload}`);
    // Safari 只允許在點擊當下寫剪貼簿：先同步交出 promise，壓縮完再填入內容
    navigator.clipboard
      .write([
        new ClipboardItem({
          "text/plain": link.then((l) => new Blob([l], { type: "text/plain" })),
        }),
      ])
      .then(() => link)
      .then((l) => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        if (l.length > LINK_WARN_LENGTH) {
          alert(
            `連結已複製，但長度有 ${l.length} 字元，LINE、簡訊等部分 App 可能無法完整開啟。`,
          );
        }
      })
      .catch(() => alert("無法複製分享連結，請確認瀏覽器允許使用剪貼簿"));
  };

  const copyContent = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後恢復
    });
  };

  const renderFile = (file) => {
    const active = file.id === currentFileId;
    return (
      <div
        key={file.id}
        className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer ${
          active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
        } ${draggingId === file.id ? "opacity-40" : ""}`}
        onClick={() => setCurrentFileId(file.id)}
      >
        {/* 只有把手可拖曳：整列 draggable 會讓 Firefox 無法用滑鼠選取檔名 */}
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(FILE_ID_TYPE, file.id);
            e.dataTransfer.setDragImage(e.currentTarget.parentElement, 0, 0);
            setDraggingId(file.id);
          }}
          onDragEnd={endDrag}
          className="shrink-0 cursor-grab text-gray-500 opacity-0 group-hover:opacity-100"
        >
          <GripVertical size={14} />
        </span>
        <FileText
          size={15}
          className={`shrink-0 ${active ? "" : "text-gray-400"}`}
        />
        <input
          type="text"
          value={file.name}
          onChange={(e) => updateFileName(file.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteFile(file.id);
          }}
          className="p-1 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="刪除檔案"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 側邊欄 */}
      <div
        className={`bg-gray-800 text-white transition-all duration-300 ${
          sidebarCollapsed ? "w-0" : "w-64"
        } overflow-hidden`}
      >
        <div className="h-full flex flex-col">
          {/* 固定在上方，不隨列表捲動 */}
          <div className="shrink-0 p-4 pb-2 border-b border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">檔案管理</h2>
              <div className="flex">
                <button
                  onClick={createFolder}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="新增資料夾"
                >
                  <FolderPlus size={20} />
                </button>
                {/* 拖曳以外的匯入方式：觸控裝置、鍵盤使用者 */}
                <label
                  className="p-2 hover:bg-gray-700 rounded cursor-pointer focus-within:ring-2 focus-within:ring-blue-400"
                  title="匯入檔案"
                >
                  <Upload size={20} />
                  <input
                    type="file"
                    accept=".md,.markdown,.txt"
                    multiple
                    onChange={(e) => {
                      importFiles(e.target.files, null);
                      e.target.value = ""; // 讓同一個檔案可以再匯入一次
                    }}
                    className="sr-only"
                  />
                </label>
                <button
                  onClick={() => createNewFile()}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="新增檔案"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              拖曳 .md 檔到下方，或點上方按鈕匯入
            </p>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 pt-2 space-y-0.5"
            {...dropTarget("root")}
            onDragLeave={(e) =>
              !e.currentTarget.contains(e.relatedTarget) && setDragOver(null)
            }
          >
            {folders.map((folder) => {
              const children = files.filter((f) => f.folderId === folder.id);
              const ChevronIcon = folder.collapsed ? ChevronRight : ChevronDown;
              const FolderIcon = folder.collapsed ? Folder : FolderOpen;
              return (
                <div
                  key={folder.id}
                  {...dropTarget(folder.id)}
                  className={`rounded ${
                    dragOver === folder.id
                      ? "bg-blue-500/20 ring-2 ring-blue-400"
                      : ""
                  }`}
                >
                  <div
                    className="group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700"
                    onClick={() =>
                      updateFolder(folder.id, { collapsed: !folder.collapsed })
                    }
                  >
                    <ChevronIcon size={14} className="shrink-0 text-gray-400" />
                    <FolderIcon
                      size={16}
                      className="shrink-0 text-yellow-400"
                    />
                    <input
                      type="text"
                      value={folder.name}
                      onChange={(e) =>
                        updateFolder(folder.id, { name: e.target.value })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-semibold"
                    />
                    <span className="text-xs text-gray-400 group-hover:hidden group-focus-within:hidden">
                      {children.length}
                    </span>
                    {/* 用 opacity 而非 hidden：display:none 的按鈕鍵盤 Tab 不到 */}
                    <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          createNewFile(folder.id);
                        }}
                        className="p-1 hover:bg-gray-600 rounded"
                        title="在資料夾中新增檔案"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        className="p-1 hover:bg-red-600 rounded"
                        title="刪除資料夾（檔案會移回根目錄）"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {!folder.collapsed && (
                    <div className="ml-3.5 pl-2 border-l border-gray-600 space-y-0.5 py-0.5">
                      {children.length ? (
                        children.map(renderFile)
                      ) : (
                        <div className="px-2 py-1 text-xs italic text-gray-500">
                          拖曳檔案到這裡
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {folders.length > 0 && (
              <div className="border-t border-gray-700 my-2" />
            )}
            {files.filter((f) => !f.folderId).map(renderFile)}

            {/* 拖曳中才顯示：根目錄的放置區 */}
            {(draggingId || dragOver) && (
              <div
                className={`mt-2 p-3 rounded border-2 border-dashed text-xs text-center ${
                  dragOver === "root"
                    ? "border-blue-400 bg-blue-500/10 text-blue-300"
                    : "border-gray-600 text-gray-400"
                }`}
              >
                {draggingId ? "放到這裡移出資料夾" : "放開以匯入到根目錄"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 min-w-0 flex flex-col">
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
            {/* 分享連結按鈕 */}
            <button
              onClick={shareLink}
              className="flex items-center px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
              title="複製分享連結（內容存在連結裡）"
            >
              {shared ? (
                <>
                  <Check size={16} className="mr-2" />
                  已複製連結
                </>
              ) : (
                <>
                  <Share2 size={16} className="mr-2" />
                  分享
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
          <div className="relative flex-1 min-w-0 border-r">
            <textarea
              value={currentContent}
              onChange={(e) => updateFileContent(e.target.value)}
              className="w-full h-full p-4 pb-10 font-mono text-sm resize-none outline-none"
              placeholder="在此輸入 Markdown..."
            />
            <div className="pointer-events-none absolute bottom-2 right-4 rounded bg-white/90 px-2 py-0.5 text-xs text-gray-500 tabular-nums">
              {charCount} 字
            </div>
          </div>

          {/* 預覽區 */}
          <div className="flex-1 min-w-0 overflow-auto bg-white">
            {/* contain:paint 讓 inline style 的 position:fixed 只能待在預覽區內，蓋不到整個編輯器 */}
            <div
              className="p-4 prose max-w-none [contain:paint] [overflow-wrap:anywhere]"
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(currentContent),
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
