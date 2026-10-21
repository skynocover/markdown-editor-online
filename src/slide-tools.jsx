// 簡報的調整工具：工具列的「簡報設定」面板，以及滑鼠移到投影片上時疊在右上角的單頁工具列
// 跟 TableTools 一樣量投影片的位置把按鈕放上去，不動預覽的 HTML；每個按鈕只改原文的一行
import React, { useState, useLayoutEffect, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Tip } from "./tip";
import { Plus, Copy, Trash2, Settings2, Image as ImageIcon, ChevronDown, TextAlignCenter, Moon, Hash } from "lucide-react";
import {
  slideRanges,
  readFrontMatter,
  setGlobal,
  setSpot,
  setSpotDirective,
  toggleClass,
  addSlide,
  duplicateSlide,
  deleteSlide,
  readBackground,
  writeBackground,
  addBackground,
  removeBackground,
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
// labels：選項的值跟顯示的字不一樣時用，例如 "" 顯示成「滿版」
// stretch：撐滿標籤右邊、按鈕平分寬度，跟拉桿的左右邊對齊
const Segmented = ({ options, value, onChange, labels, stretch }) => (
  <div className={`${stretch ? "flex flex-1" : "inline-flex"} rounded-md border border-gray-200 bg-gray-100 p-0.5`}>
    {(options.includes(value) ? options : [...options, value]).map((option) => (
      <button
        key={option}
        onClick={() => option !== value && onChange(option)}
        aria-pressed={option === value}
        className={`${stretch ? "flex-1" : ""} px-2.5 py-0.5 rounded ${option === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
      >
        {labels?.[option] ?? option}
      </button>
    ))}
  </div>
);

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="min-w-12 shrink-0 text-gray-500">{label}</span>
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
        <Settings2 size={16} className="lg:mr-2" />
        <span className="hidden lg:inline">簡報設定</span>
        <Tip text="簡報設定：主題、比例、頁碼、頁首和頁尾" />
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
const TextSetting = ({ label, placeholder, value, onCommit, autoFocus }) => {
  const [text, setText] = useState(value);
  return (
    <Row label={label}>
      <input
        value={text}
        aria-label={label}
        autoFocus={autoFocus}
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

// 拉桿：拖動時只更新旁邊的數字和 onPreview（直接改預覽畫面），放開（change 事件）才寫回原文，Ctrl+Z 才不用按幾十次
// React 的 onChange 在拖動中就會觸發，所以放開要另外掛原生的 change
// 原文改了就顯示新的值；不用 key 換一個拉桿：用方向鍵調整時每按一下都會寫回，換掉會失去焦點
// preset：預設值；值不一樣時旁邊的數字可以點，一下就恢復（拉桿很難剛好停在 100%）
const Slider = ({ label, value, min, max, step, format, onCommit, onPreview, preset }) => {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(value);
  }
  return (
    <Row label={label}>
      <span className="flex flex-1 items-center gap-2">
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => {
            setV(+e.target.value);
            onPreview(+e.target.value);
          }}
          // 寫回原文會把焦點移到編輯區，拉桿失去焦點時會再觸發一次 change，那時原文還沒重新渲染、拿的是舊的
          // 記住最後寫入的值，一樣就不寫；每次渲染重設成原文的值，Ctrl+Z 改回去以後照樣能再調
          // 寫完把焦點拉回來，方向鍵才能繼續調
          ref={(el) => {
            if (!el) return;
            el.last = value;
            el.onchange = () => {
              if (+el.value === el.last) return;
              el.last = +el.value;
              onCommit(el.last);
              el.focus();
            };
          }}
          className="min-w-0 flex-1 accent-blue-600"
        />
        {preset !== undefined && v !== preset ? (
          <button onClick={() => onCommit(preset)} className="group/tip relative w-10 text-right tabular-nums text-blue-600 hover:underline">
            {format(v)}
            <Tip text="點一下恢復預設" align="right" />
          </button>
        ) : (
          <span className="w-10 text-right tabular-nums text-gray-500">{format(v)}</span>
        )}
      </span>
    </Row>
  );
};

const POSITIONS = ["", "left", "right"];
const FITS = ["cover", "contain"];
const TONES = ["", "grayscale", "sepia"];

// 多張背景圖時分成兩段：位置、寬度是 Marp 整頁共用的（所有背景圖擠在同一區並排），其他只調第一張
const Heading = ({ children }) => <div className="pt-1 text-xs font-medium text-gray-400">{children}</div>;

// 單頁工具列的「背景圖」：沒有背景圖時貼網址新增，有的話調整第一張
// 面板用原生 popover：點外面、按 Esc 關閉；它在預覽的 DOM 裡面，滑鼠移進去不算離開預覽，工具列不會收起來
// 按住拉桿時面板淡掉只留那一條（index.css），看得到整張投影片
// svg：這頁在預覽裡的投影片，拖拉桿時直接改它的樣式即時預覽；放開寫回原文後預覽重新渲染，臨時樣式跟著消失
const Background = ({ markdown, range, svg, onChange, className }) => {
  const bg = readBackground(markdown, range);
  const [editUrl, setEditUrl] = useState(false);
  const set = (change) => onChange(writeBackground(markdown, { ...bg, ...change }));
  const preview = (change) => {
    const next = { ...bg, ...change };
    // 寬度：Marp 把分割比例寫在這頁幾個 section 的 CSS 變數上
    for (const el of svg?.querySelectorAll("[data-marpit-advanced-background-split]") ?? []) {
      el.style.setProperty("--marpit-advanced-background-split", `${next.width}%`);
    }
    // 內容那塊的位置、寬度 Marp 寫在 foreignObject 的屬性上，也要跟著改，文字才不會壓到圖
    const content = svg?.querySelector('[data-marpit-advanced-background="content"]')?.parentElement;
    if (content && next.side) {
      content.setAttribute("width", `${100 - next.width}%`);
      if (next.side === "left") content.setAttribute("x", `${next.width}%`);
    }
    // 亮度、透明度：換掉第一張圖 filter 裡的那兩個，其他濾鏡（sepia、blur）照留
    const figure = svg?.querySelector('[data-marpit-advanced-background="background"] figure');
    if (!figure) return;
    figure.dataset.filter ??= figure.style.filter;
    figure.style.filter =
      [
        figure.dataset.filter.replace(/(brightness|opacity)\([^)]*\)/g, "").trim(),
        next.brightness !== 1 && `brightness(${next.brightness})`,
        next.opacity !== 1 && `opacity(${next.opacity})`,
      ]
        .filter(Boolean)
        .join(" ") || "none";
  };
  const anchor = () => document.querySelector("[popovertarget=slide-bg]").getBoundingClientRect();
  const place = (e) => {
    if (e.newState !== "open") return;
    const r = anchor();
    e.currentTarget.style.top = `${r.bottom + 6}px`;
    e.currentTarget.style.right = `${Math.max(8, innerWidth - r.right)}px`;
  };
  const add = (e) => {
    e.preventDefault();
    const url = new FormData(e.currentTarget).get("url").trim();
    if (url) onChange(addBackground(markdown, range, url));
  };
  const many = bg?.count > 1;
  // Marp 認得是背景圖、面板讀不懂寫法（替代文字在 bg 前面、<網址>、參照式圖片）：不給加入，免得多出第二張
  const unreadable = !bg && range.bgs.length > 0;
  return (
    <>
      {/* ▾ 表示會展開面板，不是開關；面板打開時提示會壓在面板底下，index.css 把它藏起來 */}
      <button popoverTarget="slide-bg" className={className}>
        <ImageIcon size={15} />
        <ChevronDown size={12} className="-ml-0.5 text-gray-400" />
        <Tip text={bg || unreadable ? "背景圖：調整這頁的背景圖" : "背景圖：幫這頁加一張背景圖"} align="right" />
      </button>
      <div
        id="slide-bg"
        popover="auto"
        onBeforeToggle={place}
        // 打開後才量得到高度：下面放不下就改開在按鈕上方
        // React 的 autoFocus 只在掛載時聚焦一次，面板那時還藏著：打開時才聚焦網址欄
        onToggle={(e) => {
          if (e.newState !== "open") return;
          const el = e.currentTarget;
          const r = anchor();
          if (r.bottom + 6 + el.offsetHeight > innerHeight) el.style.top = `${Math.max(8, r.top - 6 - el.offsetHeight)}px`;
          document.getElementById("slide-bg-url")?.focus();
        }}
        className="fixed left-auto bottom-auto m-0 w-72 space-y-2.5 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-xl"
      >
        {bg ? (
          <>
            {many && <p className="text-xs text-gray-500">這頁有 {bg.count} 張背景圖，會在同一區並排</p>}
            {many && <Heading>整頁</Heading>}
            <Row label="位置">
              <Segmented
                options={POSITIONS}
                labels={{ "": "滿版", left: "左", right: "右" }}
                value={bg.side}
                onChange={(side) => set({ side })}
                stretch
              />
            </Row>
            {bg.side && (
              <Slider
                label="寬度"
                value={bg.width}
                min={20}
                max={80}
                step={5}
                format={(v) => `${v}%`}
                onPreview={(width) => preview({ width })}
                onCommit={(width) => set({ width })}
              />
            )}
            {/* 分三組：版面（位置、寬度、填滿）、效果、圖片
                多張背景圖時填滿只調第一張（位置、寬度才是整頁的），小標題放在填滿前面，順序不變 */}
            {many && <Heading>第一張</Heading>}
            <Row label="填滿">
              <Segmented options={FITS} labels={{ cover: "裁切", contain: "完整", auto: "原尺寸" }} value={bg.fit} onChange={(fit) => set({ fit })} stretch />
            </Row>
            {!many && <hr className="border-gray-100" />}
            {/* 0.1 + 0.05 會變成 0.15000000000000002：寫回前取到小數兩位 */}
            <Slider
              label="亮度"
              value={bg.brightness}
              min={0.1}
              max={1.5}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`} // 跟透明度一樣用百分比，原文照樣寫 brightness:0.65
              preset={1}
              onPreview={(v) => preview({ brightness: +v.toFixed(2) })}
              onCommit={(v) => set({ brightness: +v.toFixed(2) })}
            />
            <Slider
              label="透明度"
              value={bg.opacity}
              min={0.1}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              preset={1}
              onPreview={(v) => preview({ opacity: +v.toFixed(2) })}
              onCommit={(v) => set({ opacity: +v.toFixed(2) })}
            />
            <Row label="色調">
              <Segmented
                options={TONES}
                labels={{ "": "原色", grayscale: "黑白", sepia: "懷舊" }}
                value={bg.tone}
                onChange={(tone) => set({ tone })}
                stretch
              />
            </Row>
            <hr className="border-gray-100" />
            {/* 網址平常只佔一行小字，按「更換」才變成輸入框 */}
            {editUrl ? (
              <TextSetting
                label="網址"
                placeholder="圖片網址"
                value={bg.url}
                autoFocus
                onCommit={(url) => {
                  setEditUrl(false);
                  if (url && url !== bg.url) set({ url });
                }}
              />
            ) : (
              <Row label="網址">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs text-gray-500" title={bg.url}>
                    {bg.url}
                  </span>
                  <button onClick={() => setEditUrl(true)} className="shrink-0 text-xs text-blue-600 hover:underline">
                    更換
                  </button>
                </span>
              </Row>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => onChange(removeBackground(markdown, bg))}
                className="flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <Trash2 size={12} /> 移除背景圖
              </button>
            </div>
          </>
        ) : unreadable ? (
          <p className="text-xs text-gray-500">這頁的背景圖寫法面板讀不懂，請直接改左邊的原文</p>
        ) : (
          <form onSubmit={add} className="space-y-2">
            <label className="block text-gray-500" htmlFor="slide-bg-url">
              圖片網址
            </label>
            <div className="flex gap-2">
              <input
                id="slide-bg-url"
                name="url"
                type="url"
                required
                placeholder="https://"
                className="min-w-0 flex-1 px-2 py-1 border border-gray-200 rounded-md outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">加入</button>
            </div>
            <p className="text-xs text-gray-400">在網路上的圖片按右鍵 →「複製圖片網址」再貼上</p>
          </form>
        )}
      </div>
    </>
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
  // 背景圖面板開著時不換頁也不收：滑鼠出去複製網址再回來，面板和打到一半的字都還在
  useEffect(() => {
    const open = () => container.querySelector(":popover-open");
    const onOver = (e) => {
      const i = slideIndex(container, e.target);
      if (i >= 0 && !open()) setIndex(i);
    };
    const onLeave = () => !open() && setIndex(-1);
    // 面板開著時滑鼠出去了，關掉面板時補收一次；toggle 不會冒泡，要在捕獲階段聽
    const onToggle = (e) => e.newState === "closed" && !container.matches(":hover") && setIndex(-1);
    container.addEventListener("mouseover", onOver);
    container.addEventListener("mouseleave", onLeave);
    container.addEventListener("toggle", onToggle, true);
    return () => {
      container.removeEventListener("mouseover", onOver);
      container.removeEventListener("mouseleave", onLeave);
      container.removeEventListener("toggle", onToggle, true);
    };
  }, [container]);

  // 只在有指到投影片時才解析原文：解析一次要幾 ms，打字時不用算
  const ranges = useMemo(
    () => (index >= 0 ? slideRanges(marp, markdown) : null),
    [index, marp, markdown],
  );
  const range = ranges?.slides[index];
  // 這頁不寫 _paginate 時有沒有頁碼：整份沒開頁碼的話，「隱藏頁碼」沒東西可以隱藏
  const paged = useMemo(() => {
    if (!range) return false;
    const inherited = slideRanges(marp, setSpot(markdown, range, "paginate", null))?.slides[index]?.directives.paginate;
    return [true, "hold"].includes(inherited);
  }, [marp, markdown, range, index]);

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
  // 只放圖示，用途看提示：工具列滑過每一頁都會出現，越小越不擋投影片，窄預覽也放得下
  // 停用時只把圖示變灰，不用 opacity：會連提示一起變淡
  const button = "group/tip relative flex items-center gap-1 p-1.5 rounded disabled:text-gray-300 disabled:cursor-not-allowed";
  const idle = "hover:bg-gray-100 disabled:hover:bg-transparent";
  const on = "bg-blue-50 text-blue-700 hover:bg-blue-100";
  return (
    <div
      // 跨在投影片的上邊框：一半在外面，少擋一半投影片
      style={{ left: box.left - 8, top: box.top, transform: "translate(-100%, -50%)" }}
      className="absolute z-10 flex w-max items-center gap-0.5 p-1 rounded-lg border border-gray-200 bg-white/95 shadow-md text-xs text-gray-700"
    >
      <button
        onClick={() => onChange(toggleClass(marp, markdown, index, "lead"))}
        disabled={leadless}
        className={`${button} ${lead ? on : idle}`}
      >
        <TextAlignCenter size={15} />
        <Tip text={leadless ? "置中：只有 gaia 主題有置中版型" : "置中：標題和文字置中，適合封面頁"} />
      </button>
      <button
        onClick={() => onChange(toggleClass(marp, markdown, index, "invert"))}
        className={`${button} ${classes.includes("invert") ? on : idle}`}
      >
        <Moon size={15} />
        <Tip text="深色：這頁改成深色" />
      </button>
      {/* 原本就沒頁碼時停用，不然每頁都顯示成「已隱藏」；這頁寫了 _paginate: false 的話照樣可以取消 */}
      <button
        onClick={() => onChange(setSpotDirective(marp, markdown, index, "paginate", hidden))}
        disabled={hidden && !paged}
        className={`${button} ${hidden && paged ? on : idle}`}
      >
        {/* lucide 沒有「隱藏頁碼」：# 加一條斜線 */}
        <span className="relative flex">
          <Hash size={15} />
          <span className="absolute left-1/2 top-1/2 h-px w-[19px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
        </span>
        <Tip text={hidden && !paged ? "隱藏頁碼：整份還沒開頁碼，到「簡報設定」打開" : "隱藏頁碼：這頁不顯示頁碼"} align="right" />
      </button>
      <span className="mx-1 h-4 border-l border-gray-200" />
      {/* 換頁就重新掛載：面板不會開著顯示另一頁的背景圖 */}
      <Background
        key={index}
        markdown={markdown}
        range={range}
        svg={container.querySelectorAll(".slides svg[data-marpit-svg]")[index]}
        onChange={onChange}
        className={`${button} ${idle}`}
      />
      {/* headingDivider 的簡報用標題分頁，原文沒有分隔線，搬移原文的結果難以預測 */}
      {!ranges.global.headingDivider && (
        <>
          <span className="mx-1 h-4 border-l border-gray-200" />
          <button onClick={() => onChange(addSlide(markdown, range))} className={`${button} ${idle}`}>
            <Plus size={15} />
            <Tip text="新增：在這頁後面加一頁空白投影片" />
          </button>
          <button onClick={() => onChange(duplicateSlide(markdown, range))} className={`${button} ${idle}`}>
            <Copy size={15} />
            <Tip text="複製：複製這一頁，插在後面" />
          </button>
          <button
            onClick={() => onChange(deleteSlide(markdown, ranges.slides, index))}
            disabled={ranges.slides.length < 2}
            className={`${button} ${idle} hover:text-red-600 disabled:hover:text-gray-300`}
          >
            <Trash2 size={15} />
            <Tip text={ranges.slides.length < 2 ? "刪除：只剩一頁不能刪除" : "刪除這一頁"} align="right" />
          </button>
        </>
      )}
    </div>
  );
};
