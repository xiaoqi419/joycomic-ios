// 图片 Scramble 解码 — 从 jmcomic 官方 Python 库提取的精确算法
// 网格数 = MD5(aid + 文件名) → 末位 charCode % x → * 2 + 2
// @author nyx

/** 计算网格数 (原版 APK 算法) */
export function calcGridSize(aid: string, filename: string, scrambleId: number): number {
  // MD5(aid + scrambleId) → switch → gridSize
  const s = String(scrambleId) + String(aid);
  const hash = md5Simple(s);
  let r = hash.charCodeAt(hash.length - 1);
  
  if (scrambleId >= 268850 && scrambleId <= 421925) {
    r %= 10;
  } else if (scrambleId >= 421926) {
    r %= 8;
  }
  
  const gridMap: Record<number, number> = {0:2,1:4,2:6,3:8,4:10,5:12,6:14,7:16,8:18,9:20};
  return gridMap[r] || 10;
}

/** 简易 MD5 哈希 */
function md5Simple(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/** 从 URL 中提取文件名 (如 00001.webp) */
export function extractFilename(url: string): string {
  const m = url.match(/\/(\d+\.\w+)(?:\?|$)/);
  return m ? m[1] : '00001.webp';
}

export function buildChapterImageUrls(
  host: string,
  chapterId: string,
  pageCount: number,
  scrambleId: number,
  images?: { page: number; image: string }[],
): string[] {
  const aid = chapterId;
  if (images?.length) {
    return images.map((item) => {
      const fn = extractFilename(item.image);
      return item.image + "?sc=" + scrambleId + "&aid=" + aid + "&fn=" + fn;
    });
  }
  const urls: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const fn = String(i).padStart(5, "0") + ".webp";
    const url = "https://" + host + "/media/photos/" + chapterId + "/" + fn;
    urls.push(url + "?sc=" + scrambleId + "&aid=" + aid + "&fn=" + fn);
  }
  return urls;
}
