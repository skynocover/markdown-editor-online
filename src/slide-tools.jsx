// 簡報的調整工具：工具列的「簡報設定」面板，以及滑鼠移到投影片上時疊在右上角的單頁工具列
// 跟 TableTools 一樣量投影片的位置把按鈕放上去，不動預覽的 HTML；每個按鈕只改原文的一行
import React, { useState, useLayoutEffect, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Tip } from "./tip";
import { Plus, Copy, Trash2, Settings2 } from "lucide-react";
import {
  slideRanges,
  readFrontMatter,
  setGlobal,
  setSpotDirective,
  toggleClass,
  addSlide,
  duplicateSlide,
  deleteSlide,
} from "./slides";

// 主題用小卡片顯示，不用點就看得出風格；底色、字色、字型取自各主題的預設樣式
// desc 顯示在卡片下方，滑鼠移到哪張就說明哪張，不然說明目前的主題
const THEMES = [
  { name: "default", style: { background: "#fff", color: "#24292f" }, align: "text-left", desc: "白底黑字、文字靠左，適合報告和技術文件" },
  { name: "gaia", style: { background: "#fff8e1", color: "#455a64", fontFamily: "Lato, sans-serif" }, align: "text-left", desc: "米黃底、色調溫暖，唯一有置中封面版型" },
  { name: "uncover", style: { background: "#fdfcff", color: "#202228", letterSpacing: "0.05em" }, align: "text-center", desc: "極簡、內容置中，適合一頁一句重點的演講" },
];
const SIZES = ["16:9", "4:3"];

// 幾個選項並排的按鈕，目前的值反白；原文寫了清單以外的值（例如自訂比例）也一起列出來
const Segmented = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-md border border-gray-200 bg-gray-100 p-0.5">
    {(options.includes(value) ? options : [...options, value]).map((option) => (
      <button
        key={option}
        onClick={() => option !== value && onChange(option)}
        aria-pressed={option === value}
        className={`px-2.5 py-0.5 rounded ${option === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
      >
        {option}
      </button>
    ))}
  </div>
);

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="shrink-0 text-gray-500">{label}</span>
    {children}
  </div>
);

// 「簡報設定」按鈕和面板：theme、size 用整份實際套用的值；paginate、header、footer 會往後延續，讀 front matter 的預設值
// global：render 時 Marp 留下的整份設定，不用為了設定面板再解析一次
// 原生 popover：點外面、按 Esc 自動關閉；打開時量按鈕的位置，面板對齊按鈕右下
// popovertarget 用 id 找面板，面板在 portal 裡照樣找得到
// theme、size 寫在多行註解裡時 setGlobal 找不到，改了也會被註解蓋掉：寫完重新解析，沒生效就不改
export const SlideSettings = ({ marp, markdown, global, onChange, className }) => {
  const theme = global.theme ?? "default";
  const [hovered, setHovered] = useState(null);
  const desc = THEMES.find((t) => t.name === (hovered ?? theme))?.desc ?? `原文用的是自訂主題 ${theme}`;
  const header = readFrontMatter(markdown, "header") ?? "";
  const footer = readFrontMatter(markdown, "footer") ?? "";
  const paginate = readFrontMatter(markdown, "paginate")?.toLowerCase() === "true"; // Marp 不分大小寫
  const set = (key, value) => {
    const next = setGlobal(markdown, key, value);
    if ((key === "theme" || key === "size") && slideRanges(marp, next)?.global[key] !== value) return;
    onChange(next);
  };
  const place = (e) => {
    if (e.newState !== "open") return;
    const r = document.querySelector("[popovertarget=slide-settings]").getBoundingClientRect();
    e.currentTarget.style.top = `${r.bottom + 6}px`;
    e.currentTarget.style.right = `${Math.max(8, innerWidth - r.right)}px`;
  };
  return (
    <>
      <button popoverTarget="slide-settings" className={className}>
        <Settings2 size={16} className="mr-2" />
        簡報設定
      </button>
      {/* 面板放到 body：留在按鈕組裡會被當成組的最後一個，打亂分隔線和圓角 */}
      {createPortal(
        <div
          id="slide-settings"
          popover="auto"
          onBeforeToggle={place}
          className="fixed left-auto bottom-auto m-0 w-80 space-y-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-xl"
        >
          <div>
            <div className="mb-2 text-gray-500">主題</div>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => t.name !== theme && set("theme", t.name)}
                  onMouseEnter={() => setHovered(t.name)}
                  onMouseLeave={() => setHovered(null)}
                  aria-pressed={t.name === theme}
                  className={`overflow-hidden rounded-md border text-xs ${t.name === theme ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-400"}`}
                >
                  <div style={t.style} className={`aspect-video px-2 pt-2 ${t.align}`}>
                    <div className="text-base font-bold leading-none">Aa</div>
                    <div className="mt-1 h-1 w-3/4 rounded-full bg-current opacity-25" />
                  </div>
                  <div className="border-t border-gray-100 py-1 text-gray-600">{t.name}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{desc}</p>
          </div>
          <Row label="比例">
            <Segmented options={SIZES} value={global.size ?? "16:9"} onChange={(v) => set("size", v)} />
          </Row>
          <Row label="顯示頁碼">
            <button
              role="switch"
              aria-checked={paginate}
              aria-label="顯示頁碼"
              onClick={() => set("paginate", !paginate)}
              className={`relative h-5 w-9 rounded-full transition-colors ${paginate ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${paginate ? "translate-x-4" : ""}`}
              />
            </button>
          </Row>
          {/* 原文改了就換一個輸入框，顯示新的值 */}
          <TextSetting
            key={`h${header}`}
            label="頁首"
            placeholder="每頁上方的文字"
            value={header}
            onCommit={(v) => v !== header && set("header", v)}
          />
          <TextSetting
            key={`f${footer}`}
            label="頁尾"
            placeholder="每頁底部的文字"
            value={footer}
            onCommit={(v) => v !== footer && set("footer", v)}
          />
        </div>,
        document.body,
      )}
    </>
  );
};

// 頁首、頁尾：打字時不寫回原文，Enter 或離開輸入框才寫，Ctrl+Z 才不會一個字一個字還原
// 點外面、按 Esc 關掉面板都會離開輸入框，一定會寫入，不用提示「按 Enter 套用」
const TextSetting = ({ label, placeholder, value, onCommit }) => {
  const [text, setText] = useState(value);
  return (
    <Row label={label}>
      <input
        value={text}
        aria-label={label}
        onChange={(e) => setText(e.target.value)}
        // 寫回原文會把焦點移到編輯區，再還給使用者點的東西，例如另一個輸入框
        onBlur={(e) => {
          onCommit(text.trim());
          e.relatedTarget?.focus();
        }}
        // 注音選字確認的 Enter 不算：照樣寫回的話，選好的字會再被輸入一次（keyCode 229 同 markdown-editor 的 isComposing）
        // 擋掉 Enter 本身：寫回原文會把焦點移到編輯區，不擋的話這個 Enter 會在原文插一個換行
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          e.currentTarget.blur();
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 px-2 py-1 border border-gray-200 rounded-md outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </Row>
  );
};

// 第幾張投影片：第 N 個 svg[data-marpit-svg]，跟 Presenter 數頁數的方式一樣
const slideIndex = (container, target) => {
  const svg = target.closest?.("svg[data-marpit-svg]");
  return svg ? [...container.querySelectorAll(".slides svg[data-marpit-svg]")].indexOf(svg) : -1;
};

// container：預覽的捲動區塊（position: relative）；html 變了投影片 DOM 會換掉，要重新量
export const SlideTools = ({ container, marp, markdown, html, onChange }) => {
  const [index, setIndex] = useState(-1); // 滑鼠所在的投影片
  const [box, setBox] = useState(null);

  // 移到別張投影片才換；移到工具列、投影片之間的空白、備註時留著，離開預覽才收起來
  // 觸控裝置沒有 hover：點一下投影片一樣會觸發 mouseover
  useEffect(() => {
    const onOver = (e) => {
      const i = slideIndex(container, e.target);
      if (i >= 0) setIndex(i);
    };
    const onLeave = () => setIndex(-1);
    container.addEventListener("mouseover", onOver);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      container.removeEventListener("mouseover", onOver);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [container]);

  // 只在有指到投影片時才解析原文：解析一次要幾 ms，打字時不用算
  const ranges = useMemo(
    () => (index >= 0 ? slideRanges(marp, markdown) : null),
    [index, marp, markdown],
  );
  const range = ranges?.slides[index];

  useLayoutEffect(() => {
    const svg = container.querySelectorAll(".slides svg[data-marpit-svg]")[index];
    const measure = () => {
      if (!svg) return setBox(null);
      const outer = container.getBoundingClientRect();
      const r = svg.getBoundingClientRect();
      setBox({
        left: r.right - outer.left + container.scrollLeft,
        top: r.top - outer.top + container.scrollTop,
      });
    };
    measure();
    if (!svg) return;
    // 收合側邊欄、縮放視窗、圖片載入都會讓投影片換位置
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(svg);
    observer.observe(svg.parentElement); // 只改備註時 html 不變，但備註變高會把後面的投影片往下推
    return () => observer.disconnect();
  }, [container, index, html]);

  // 找不到這頁在原文的範圍就不給操作，絕不寫錯位置
  if (!box || !range) return null;

  const classes = String(range.directives.class ?? "").split(/\s+/);
  const lead = classes.includes("lead");
  // 只有 gaia 主題有置中版型，其他主題按了不會變；已經寫了的話還是可以關掉
  const leadless = ranges.global.theme !== "gaia" && !lead;
  const hidden = ![true, "hold"].includes(range.directives.paginate); // hold：顯示頁碼但不加一
  // 停用時只把字變灰，不用 opacity：會連提示一起變淡
  const button = "group/tip relative flex items-center gap-1 px-2 py-1 rounded disabled:text-gray-300 disabled:cursor-not-allowed";
  const idle = "hover:bg-gray-100 disabled:hover:bg-transparent";
  const on = "bg-blue-50 text-blue-700 hover:bg-blue-100";
  return (
    <div
      style={{ left: box.left - 8, top: box.top + 8, transform: "translateX(-100%)" }}
      className="absolute z-10 flex w-max items-center gap-0.5 p-1 rounded-lg border border-gray-200 bg-white/95 shadow-md text-xs text-gray-700"
    >
      <button
        onClick={() => onChange(toggleClass(marp, markdown, index, "lead"))}
        disabled={leadless}
        className={`${button} ${lead ? on : idle}`}
      >
        置中
        <Tip text={leadless ? "只有 gaia 主題有置中版型" : "標題和文字置中，適合封面頁（_class: lead）"} />
      </button>
      <button
        onClick={() => onChange(toggleClass(marp, markdown, index, "invert"))}
        className={`${button} ${classes.includes("invert") ? on : idle}`}
      >
        深色
        <Tip text="這頁改成深色（_class: invert）" />
      </button>
      <button
        onClick={() => onChange(setSpotDirective(marp, markdown, index, "paginate", hidden))}
        className={`${button} ${hidden ? on : idle}`}
      >
        隱藏頁碼
        <Tip text="這頁不顯示頁碼（_paginate: false）" />
      </button>
      {/* headingDivider 的簡報用標題分頁，原文沒有分隔線，搬移原文的結果難以預測 */}
      {!ranges.global.headingDivider && (
        <>
          <span className="mx-1 h-4 border-l border-gray-200" />
          <button onClick={() => onChange(addSlide(markdown, range))} className={`${button} ${idle}`}>
            <Plus size={13} /> 新增
            <Tip text="在這頁後面新增一頁空白投影片" />
          </button>
          <button onClick={() => onChange(duplicateSlide(markdown, range))} className={`${button} ${idle}`}>
            <Copy size={13} /> 複製
            <Tip text="複製這一頁，插在後面" />
          </button>
          <button
            onClick={() => onChange(deleteSlide(markdown, ranges.slides, index))}
            disabled={ranges.slides.length < 2}
            className={`${button} ${idle} hover:text-red-600 disabled:hover:text-gray-300`}
          >
            <Trash2 size={13} /> 刪除
            <Tip text={ranges.slides.length < 2 ? "只剩一頁不能刪除" : "刪除這一頁"} align="right" />
          </button>
        </>
      )}
    </div>
  );
};
