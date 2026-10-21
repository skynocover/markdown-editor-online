// 滑鼠移上去或鍵盤聚焦時顯示的提示；父元素要有 group/tip relative
// 只用 opacity 藏起來，螢幕閱讀器讀得到：純圖示按鈕不用再寫 aria-label
// 原生 title 要停一秒以上才出現，而且觸控、鍵盤都看不到
const TIP_ALIGN = {
  left: "left-0",
  right: "right-0",
  center: "left-1/2 -translate-x-1/2",
};
export const Tip = ({ text, align = "center" }) => (
  <span
    className={`pointer-events-none absolute top-full z-50 mt-1.5 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-normal text-white opacity-0 shadow transition-opacity delay-150 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100 group-has-[:focus-visible]/tip:opacity-100 ${TIP_ALIGN[align]}`}
  >
    {text}
  </span>
);
