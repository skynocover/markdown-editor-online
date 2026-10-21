// 編輯區快捷鍵：Ctrl/Cmd+B 粗體、Ctrl/Cmd+I 斜體

// 選取範圍前後已經是 mark 就拿掉，否則包起來；回傳要取代的範圍、新文字、之後要選取的範圍
// 選取範圍頭尾的空白不包進去：**word ** 不會變粗體（Windows 雙擊選字會連後面的空白一起選）
// **粗體** 裡選字按斜體：兩邊的 * 屬於粗體，不拆，變成 ***粗斜體***；***粗斜體*** 再按斜體才拆
export const toggleWrap = (value, start, end, mark) => {
  while (start < end && /\s/.test(value[start])) start++;
  while (end > start && /\s/.test(value[end - 1])) end--;
  const n = mark.length;
  const selected = value.slice(start, end);
  let stars = 0;
  while (value[start - 1 - stars] === "*") stars++;
  const wrapped =
    value.slice(Math.max(0, start - n), start) === mark &&
    value.slice(end, end + n) === mark &&
    !(mark === "*" && stars % 2 === 0);
  if (wrapped) return { start: start - n, end: end + n, text: selected, select: [start - n, end - n] };
  return { start, end, text: mark + selected + mark, select: [start + n, end + n] };
};
