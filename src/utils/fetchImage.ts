// 带 Referer/Token 头部的图片获取工具
// @author nyx

const FETCH_HEADERS: Record<string, string> = {
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  Referer: 'https://18comic.vip/',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 Chrome/138 Mobile',
};

export async function fetchImageAsDataUri(url: string): Promise<string> {
  const response = await fetch(url, { headers: FETCH_HEADERS });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}
