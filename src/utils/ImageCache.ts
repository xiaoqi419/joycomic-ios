// ImageCache — 图片磁盘缓存（base64 dataURI 持久化）
// 看完的章节二次打开秒加载，无需重新下载
// @author Jason

import * as FileSystem from 'expo-file-system';
import CryptoJS from 'crypto-js';

const CACHE_DIR = FileSystem.cacheDirectory + 'jm_img_cache/';
let ensured = false;

async function ensureDir() {
  if (ensured) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  ensured = true;
}

function cachePath(url: string): string {
  return CACHE_DIR + CryptoJS.MD5(url).toString() + '.base64';
}

export async function getCachedImageDataUri(url: string): Promise<string | null> {
  try {
    const path = cachePath(url);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const ext = (url.split('.').pop() || 'webp').replace(/\?.*/, '');
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    const b64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
    return 'data:image/' + mime + ';base64,' + b64;
  } catch {
    return null;
  }
}

export async function saveCachedImageDataUri(url: string, dataUri: string): Promise<void> {
  try {
    await ensureDir();
    const b64 = dataUri.split(',')[1];
    if (!b64) return;
    await FileSystem.writeAsStringAsync(cachePath(url), b64, { encoding: FileSystem.EncodingType.Base64 });
  } catch {}
}

/** 清理过期缓存（保留最近7天） */
export async function cleanImageCache(): Promise<void> {
  try {
    await ensureDir();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const now = Date.now();
    const sevenDays = 7 * 86400_000;
    for (const f of files) {
      const info = await FileSystem.getInfoAsync(CACHE_DIR + f);
      if (info.exists && info.modificationTime) {
        if (now - info.modificationTime * 1000 > sevenDays) {
          await FileSystem.deleteAsync(CACHE_DIR + f, { idempotent: true });
        }
      }
    }
  } catch {}
}
