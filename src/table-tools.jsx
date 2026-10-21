// 編輯表格時疊在預覽上的工具：欄號、列號、刪除、新增、拖曳換位置、圖表
// 量表格每一欄、每一列的位置，把按鈕放上去，不動預覽的 HTML
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { addRow, addCol, deleteRow, deleteCol, moveRow, moveCol, colName, rangeRef } from "./preview-edit";
import { defaultRange, rangeBounds } from "./table-chart";

const CHART_TYPES = { bar: "長條圖", line: "折線圖", pie: "圓餅圖" };

// 按鈕按下時不搶焦點：正在編輯的格子由 onEdit 一起存
const keepFocus = (e) => e.preventDefault();

// container：預覽的捲動區塊（position: relative）；html 變了表格 DOM 會換掉，要重新量
// chart：表格上方的圖表註解（readChart），沒有是 null；onEdit 的 op 可以改 t.chart
export const TableTools = ({ container, start, html, chart, onEdit }) => {
  const [box, setBox] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // 拖曳經過的欄列：{ type, index }
  const dragging = useRef(null);
  const [picking, setPicking] = useState(false); // 選圖表範圍
  const [selecting, setSelecting] = useState(null); // 拖曳中的範圍 { from, to }，[列, 欄]
  const [anchorCol, setAnchorCol] = useState(null); // Shift 點欄號時從這欄延伸

  useEffect(() => {
    if (!picking) return;
    const onKey = (e) => e.key === "Escape" && setPicking(false);
    // 點欄號、範圍那層以外（別的表格、編輯區）就離開：TableTools 換表格時不會重新掛載
    const onDown = (e) => !e.target.closest?.("[data-range-pick]") && setPicking(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [picking]);

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
  const choosing = picking && chart;

  // 選範圍：每次放開滑鼠、點欄號就寫回註解，圖跟著重畫；選錯按 Ctrl+Z
  const setRange = (range) => onEdit((t) => t.chart && (t.chart.range = range));

  // 滑鼠位置 → 格子 [列, 欄]；表頭不算資料，超出表格就取最近的格子
  const cellAt = (e) => {
    const outer = container.getBoundingClientRect();
    const x = e.clientX - outer.left + container.scrollLeft;
    const y = e.clientY - outer.top + container.scrollTop;
    const find = (list, v, pos, size) => {
      const i = list.findIndex((b) => v < b[pos] + b[size]);
      return i < 0 ? list.length - 1 : i;
    };
    return [Math.max(find(rows, y, "top", "height"), 1), find(cols, x, "left", "width")];
  };

  const shown = choosing && rangeBounds(selecting ? rangeRef(selecting.from, selecting.to) : chart.range, rows.length, cols.length);

  // 「圖表」選單用原生 select：開關、點外面收起、鍵盤操作都交給瀏覽器
  const chartActions = chart
    ? {
        ...Object.fromEntries(
          Object.entries(CHART_TYPES)
            .filter(([type]) => type !== chart.type)
            .map(([type, name]) => [`換成${name}`, () => onEdit((t) => (t.chart.type = type))]),
        ),
        選範圍: () => {
          setAnchorCol(null);
          setPicking(true);
        },
        移除圖表: () => {
          setPicking(false);
          onEdit((t) => (t.chart = null));
        },
      }
    : Object.fromEntries(
        Object.entries(CHART_TYPES).map(([type, name]) => [
          name,
          () => onEdit((t) => (t.chart = { type, range: defaultRange(t.grid, type) })),
        ]),
      );
  const addRowWidth = Math.max(table.width - 68, 40);

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
        data-range-pick
        style={{ left: table.left, top: table.top - 22, width: table.width, height: 20 }}
        className="absolute overflow-hidden"
      >
        {cols.map((col, c) => (
          <div
            key={`c${c}`}
            // 選範圍時不能拖曳：點欄號手滑會變成搬欄
            {...(choosing ? {} : dragProps("col", c))}
            // 選範圍時點欄號選這欄的資料列，Shift 從上次點的欄延伸過來
            onClick={
              choosing
                ? (e) => {
                    const from = e.shiftKey && anchorCol !== null ? anchorCol : c;
                    if (!e.shiftKey) setAnchorCol(c);
                    setRange(rangeRef([1, from], [rows.length - 1, c]));
                  }
                : undefined
            }
            style={{ left: col.left - table.left, top: 0, width: col.width, height: 20 }}
            className={`group absolute flex items-center justify-center gap-1 text-xs text-gray-500 border border-b-0 rounded-t select-none ${choosing ? "cursor-pointer" : "cursor-grab"} ${isDropTarget("col", c) ? "bg-blue-200" : "bg-gray-100"}`}
            title={choosing ? "選這一欄，Shift 加選" : "拖曳換位置"}
          >
            {colName(c)}
            {cols.length > 1 && !choosing && (
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
        style={{ left: table.left, top: table.top + table.height + 4, width: addRowWidth }}
        className="absolute flex items-center justify-center gap-1 py-0.5 text-xs text-gray-500 border border-dashed rounded hover:bg-blue-50 hover:text-blue-600"
      >
        <Plus size={12} /> 新增一列
      </button>
      <select
        value=""
        onChange={(e) => chartActions[e.target.value]()}
        // Windows、Linux 的選單收著時按方向鍵會直接換選項（觸發 change）；用 Space、Alt+↓ 打開再選
        onKeyDown={(e) => /^(Arrow|Home$|End$|Page)/.test(e.key) && e.preventDefault()}
        style={{ left: table.left + addRowWidth + 4, top: table.top + table.height + 4, width: 64 }}
        className="absolute py-0.5 text-xs text-gray-500 border border-dashed rounded bg-white hover:bg-blue-50 hover:text-blue-600"
        aria-label="圖表"
      >
        <option value="" disabled hidden>
          圖表
        </option>
        {Object.keys(chartActions).map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>

      {/* 選範圍：藍框標出範圍；表格上蓋一層接滑鼠，pointer capture 讓拖到表格外也收得到放開 */}
      {choosing && (
        <>
          <div
            style={{ left: table.left, top: table.top - 40 }}
            className="absolute px-1 rounded bg-white text-xs text-blue-600 whitespace-nowrap pointer-events-none"
          >
            拖曳選擇要畫的格子；點欄號選整欄，Shift 加選。Esc 結束
          </div>
          {shown && (
            <div
              style={{
                left: cols[shown[0][1]].left,
                top: rows[shown[0][0]].top,
                width: cols[shown[1][1]].left + cols[shown[1][1]].width - cols[shown[0][1]].left,
                height: rows[shown[1][0]].top + rows[shown[1][0]].height - rows[shown[0][0]].top,
              }}
              className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10"
            />
          )}
          <div
            data-range-pick
            onMouseDown={keepFocus}
            onPointerDown={(e) => {
              if (e.button !== 0) return; // 右鍵是開選單，不是選範圍
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = cellAt(e);
              setSelecting({ from: p, to: p });
            }}
            onPointerMove={(e) => selecting && setSelecting({ ...selecting, to: cellAt(e) })}
            onPointerUp={() => {
              if (selecting) setRange(rangeRef(selecting.from, selecting.to));
              setSelecting(null);
            }}
            // 觸控時瀏覽器接手捲動會送 pointercancel，收不到放開，拖曳狀態要清掉
            onPointerCancel={() => setSelecting(null)}
            style={{ left: table.left, top: table.top, width: table.width, height: table.height }}
            className="absolute cursor-crosshair"
          />
        </>
      )}
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
