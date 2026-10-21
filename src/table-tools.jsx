// 編輯表格時疊在預覽上的工具：欄號、列號、刪除、新增、拖曳換位置
// 量表格每一欄、每一列的位置，把按鈕放上去，不動預覽的 HTML
import React, { useState, useLayoutEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { addRow, addCol, deleteRow, deleteCol, moveRow, moveCol, colName } from "./preview-edit";

// 按鈕按下時不搶焦點：正在編輯的格子由 onEdit 一起存
const keepFocus = (e) => e.preventDefault();

// container：預覽的捲動區塊（position: relative）；html 變了表格 DOM 會換掉，要重新量
export const TableTools = ({ container, start, html, onEdit }) => {
  const [box, setBox] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // 拖曳經過的欄列：{ type, index }
  const dragging = useRef(null);

  useLayoutEffect(() => {
    const table = container.querySelector(`.preview-editable table[data-start="${start}"]`);
    // 找不到表格（原文改了、位置對不上）就不顯示
    const measure = () => {
      if (!table) return setBox(null);
      const outer = container.getBoundingClientRect();
      const place = (el) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - outer.left + container.scrollLeft,
          top: r.top - outer.top + container.scrollTop,
          width: r.width,
          height: r.height,
        };
      };
      setBox({
        table: place(table),
        cols: [...table.rows[0].cells].map(place),
        rows: [...table.rows].map(place),
      });
    };
    measure();
    if (!table) return;
    // 重新量：打字讓欄寬改變（表格）、圖片載入讓表格往下移（預覽內容）、收合側邊欄或縮放視窗讓預覽重新置中（容器）
    // 表格太寬時自己會橫向捲動（.prose table 的 overflow-x），捲動也要重新量
    const observer = new ResizeObserver(measure);
    [table, table.closest(".prose"), container].forEach((el) => el && observer.observe(el));
    table.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      table.removeEventListener("scroll", measure);
    };
  }, [container, start, html]);

  if (!box) return null;
  const { table, cols, rows } = box;

  const dragProps = (type, index) => ({
    draggable: true,
    onDragStart: (e) => {
      dragging.current = { type, index };
      e.dataTransfer.effectAllowed = "move";
      // Firefox 沒有 setData 不會開始拖曳；用自訂型別，拖到編輯區不會插入文字
      e.dataTransfer.setData("application/x-table-tools", "");
    },
    onDragOver: (e) => {
      if (dragging.current?.type !== type) return;
      e.preventDefault();
      setDropTarget({ type, index });
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e) => {
      e.preventDefault();
      const from = dragging.current?.index;
      setDropTarget(null);
      if (from === undefined || from === index) return;
      onEdit((t) => (type === "col" ? moveCol(t, from, index) : moveRow(t, from, index)));
    },
    onDragEnd: () => {
      dragging.current = null;
      setDropTarget(null);
    },
  });

  const isDropTarget = (type, index) => dropTarget?.type === type && dropTarget.index === index;

  return (
    <>
      {/* 欄號裁到表格看得到的寬度：表格橫向捲動時，捲出去的欄不會畫到表格外面 */}
      <div
        style={{ left: table.left, top: table.top - 22, width: table.width, height: 20 }}
        className="absolute overflow-hidden"
      >
        {cols.map((col, c) => (
          <div
            key={`c${c}`}
            {...dragProps("col", c)}
            style={{ left: col.left - table.left, top: 0, width: col.width, height: 20 }}
            className={`group absolute flex items-center justify-center gap-1 text-xs text-gray-500 border border-b-0 rounded-t cursor-grab select-none ${isDropTarget("col", c) ? "bg-blue-200" : "bg-gray-100"}`}
            title="拖曳換位置"
          >
            {colName(c)}
            {cols.length > 1 && (
              <button
                onMouseDown={keepFocus}
                onClick={() => onEdit((t) => deleteCol(t, c))}
                className="invisible group-hover:visible hover:text-red-600"
                title={`刪除 ${colName(c)} 欄`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {rows.map((row, r) => (
        <div
          key={`r${r}`}
          {...(r > 0 ? dragProps("row", r) : {})}
          style={{ left: table.left - 26, top: row.top, width: 24, height: row.height }}
          className={`group absolute flex flex-col items-center justify-center text-xs text-gray-500 border border-r-0 rounded-l select-none ${r > 0 ? "cursor-grab" : ""} ${isDropTarget("row", r) ? "bg-blue-200" : "bg-gray-100"}`}
          title={r > 0 ? "拖曳換位置" : "表頭"}
        >
          {r + 1}
          {r > 0 && (
            <button
              onMouseDown={keepFocus}
              onClick={() => onEdit((t) => deleteRow(t, r))}
              className="invisible group-hover:visible hover:text-red-600"
              title={`刪除第 ${r + 1} 列`}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      <button
        onMouseDown={keepFocus}
        onClick={() => onEdit(addRow)}
        style={{ left: table.left, top: table.top + table.height + 4, width: table.width }}
        className="absolute flex items-center justify-center gap-1 py-0.5 text-xs text-gray-500 border border-dashed rounded hover:bg-blue-50 hover:text-blue-600"
      >
        <Plus size={12} /> 新增一列
      </button>
      <button
        onMouseDown={keepFocus}
        onClick={() => onEdit(addCol)}
        style={{ left: table.left + table.width + 4, top: table.top, height: table.height }}
        className="absolute flex items-center px-0.5 text-gray-500 border border-dashed rounded hover:bg-blue-50 hover:text-blue-600"
        title="新增一欄"
      >
        <Plus size={12} />
      </button>
    </>
  );
};
