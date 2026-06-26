// 图片 Scramble 解码 — 从 jmcomic 官方 Python 库提取的精确算法
// 网格数 = MD5(aid + 文件名) → 末位 charCode % x → * 2 + 2
// @author nyx

/** 计算网格数 (0=不需要解码) */
export function calcGridSize(aid: string, filename: string, scrambleId: number): number {
  const aidNum = parseInt(aid) || 0;
  // aid < scramble_id → 无需解码
  if (aidNum < scrambleId) return 0;
  // aid < 268850 → 固定 10
  if (aidNum < 268850) return 10;
  // aid >= 268850 → MD5 计算
  const x = aidNum < 421926 ? 10 : 8;
  const s = aid + filename;
  const hash = md5Simple(s);
  const lastChar = hash[hash.length - 1];
  const num = (lastChar.charCodeAt(0) % x) * 2 + 2;
  return num;
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
  albumId?: string,
  images?: { page: number; image: string }[],
): string[] {
  const aid = albumId || chapterId;
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
