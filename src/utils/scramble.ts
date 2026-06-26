// 图片 Scramble 解码
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
  const gridMap: Record<number, number> = { 0: 2, 1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 14, 7: 16, 8: 18, 9: 20 };
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

let _imgHost = 'cdn-msp.18comic.vip';
export function setImageHost(h: string) { _imgHost = h; }

export function buildChapterImageUrls(
  host: string,
  chapterId: string,
  pageCount: number,
  scrambleId: number,
  images?: { page: number; image: string }[],
): string[] {
  // API 返回 images = [{page, image:"完整URL"}]
  if (images?.length) {
    return images.map((item) => {
      let url = item.image;
      url += `?sc=${scrambleId}&aid=${chapterId}`;
      return proxyImgUrl(url);
    });
  }
  // fallback: 生成 webp 文件名
  const urls: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    let url = `https://${host}/media/photos/${chapterId}/${String(i).padStart(5, '0')}.webp`;
    url += `?sc=${scrambleId}&aid=${chapterId}`;
    urls.push(proxyImgUrl(url));
  }
  return urls;
}
