import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// 講者視窗：目前頁、下一頁、備註、計時、頁數；兩份 html 各用 nth-of-type 只顯示一頁，跟 Presenter 一樣
// Marp 的 css 把投影片設成 100vw×100vh，這裡改成填滿各自的格子
export const SpeakerView = ({ doc, page, total, go, onExit }) => {
  // innerHTML 物件要記住：換頁時不用重新解析整份投影片
  const inner = useMemo(() => ({ __html: doc.html }), [doc.html]);
  const slide = (name, n) =>
    `.speaker-${name} svg[data-marpit-svg]:not(:nth-of-type(${n})) { display: none; }`;
  return (
    <div className="fixed inset-0 grid grid-cols-[2fr_1fr] grid-rows-[3fr_2fr] gap-3 p-3 bg-gray-900 text-white">
      <style>
        {doc.css}
        {slide("current", page + 1)}
        {slide("next", page + 2)}
        {`.speaker-slide div.marpit { height: 100%; }
          .speaker-slide div.marpit > svg[data-marpit-svg] { width: 100%; height: 100%; }`}
      </style>
      <div
        className="speaker-slide speaker-current min-h-0"
        dangerouslySetInnerHTML={inner}
      />
      <div className="flex min-h-0 flex-col gap-2">
        <div className="text-sm text-white/60">下一頁</div>
        {page + 1 < total ? (
          <div
            className="speaker-slide speaker-next min-h-0 flex-1"
            dangerouslySetInnerHTML={inner}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-white/60">
            已經是最後一頁
          </div>
        )}
      </div>
      <div className="min-h-0 overflow-auto whitespace-pre-wrap rounded bg-white/5 p-4 text-2xl leading-relaxed">
        {doc.notes[page] || <span className="text-white/40">這頁沒有備註</span>}
      </div>
      <div className="flex flex-col items-center justify-center gap-4">
        <Elapsed />
        <div className="flex items-center gap-3">
          <button onClick={() => go(-1)} disabled={page === 0} className={SPEAKER_BUTTON} aria-label="上一頁">
            <ChevronLeft size={20} />
          </button>
          <span className="text-2xl tabular-nums">
            {page + 1} / {total}
          </span>
          <button onClick={() => go(1)} disabled={page + 1 >= total} className={SPEAKER_BUTTON} aria-label="下一頁">
            <ChevronRight size={20} />
          </button>
        </div>
        <button onClick={onExit} className={SPEAKER_BUTTON}>
          結束播放
        </button>
      </div>
    </div>
  );
};

const SPEAKER_BUTTON = "px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30";

// 經過時間：從打開講者視窗開始算；自己一個元件，每秒重畫才不會連投影片一起重畫
// 用講者視窗自己的計時器：主視窗被蓋住太久，Chrome 會把它的計時器降到一分鐘一次
// 拆開來呼叫不經過 WindowProxy，講者視窗導到別的網站後清除也不會丟 SecurityError
const Elapsed = () => {
  const ref = useRef(null);
  const [start, setStart] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const { setInterval, clearInterval } = ref.current.ownerDocument.defaultView;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span className="text-5xl tabular-nums">
        {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
      </span>
      <button
        onClick={() => {
          setStart(Date.now());
          setNow(Date.now());
        }}
        className={SPEAKER_BUTTON}
      >
        重設
      </button>
    </div>
  );
};
