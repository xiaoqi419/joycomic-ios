// 图片 Scramble 解码 — 从 APK 二进制代码完整还原
// @author nyx

export function calcGridSize(scrambleId: number, albumId: string): number {
  const b64s = btoa(String(scrambleId));
  const b64a = btoa(albumId);
  const combined = b64s + b64a;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16);
  let r = hex.charCodeAt(hex.length - 1);
  if (scrambleId >= 268850 && scrambleId <= 421925) r %= 10;
  else if (scrambleId >= 421926) r %= 8;
  const gridMap: Record<number, number> = {
    0: 2, 1: 4, 2: 6, 3: 8, 4: 10,
    5: 12, 6: 14, 7: 16, 8: 18, 9: 20,
  };
  return gridMap[r] || 10;
}

export function needsScramble(scrambleId: number): boolean {
  return scrambleId !== 0 && scrambleId !== 220980;
}

function proxyImgUrl(url: string): string {
  if (typeof navigator === 'undefined' || navigator.product === 'ReactNative') return url;
  const m = url.match(/https:\/\/([^/]+)(\/.*)/);
  return m ? `http://localhost:3456/${m[1]}${m[2]}` : url;
}

/**
 * 构建章节图片 URL 列表
 * page_arr API 格式: [[pageNum, width, height], ...]
 * images API 格式: 可能是 ["00001.webp", ...] 或 [[pageNum, w, h], ...]
 * 安全的做法: 只用 pageCount 决定数量，扩展名用 .webp
 */
export function buildChapterImageUrls(
  host: string,
  chapterId: string,
  pageCount: number,
  scrambleId: number,
): string[] {
  const urls: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    let url = `https://${host}/media/photos/${chapterId}/${String(i).padStart(5, '0')}.webp`;
    if (needsScramble(scrambleId)) url += `?scramble=${scrambleId}`;
    urls.push(proxyImgUrl(url));
  }
  return urls;
}
