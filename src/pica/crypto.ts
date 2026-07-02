// Pica — HMAC-SHA256 签名 & 常量
// 参考 PicaComic (https://github.com/Pacalini/PicaComic) 实现
// @author Jason

import CryptoJS from 'crypto-js';

export const API_KEY = 'C69BAF41DA5ABD1FFEDC6D2FEA56B';
export const SECRET_KEY = '~d}$Q7$eIni=V)9\\RK/P.RM4;9[7|@/CA}b~OW!3?EV`:<>M7pddUBL5n|0/*Cn';

/**
 * 生成随机 nonce（每次请求必须不同）
 * PicaComic 使用 UUID v1，这里用随机字符串替代
 */
export function createNonce(): string {
  // 生成 32 位随机 hex 字符串（模拟 UUID 去横杠的格式）
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result + Date.now().toString(16);
}

export function nowTs(): string {
  return String(Math.floor(Date.now() / 1000));
}

/**
 * HMAC-SHA256 签名
 * @param path 请求路径（相对路径，不含域名）
 * @param ts 时间戳（秒）
 * @param nonce 随机字符串
 * @param method HTTP 方法（大写）
 */
export function sign(path: string, ts: string, nonce: string, method: string): string {
  const key = (path + ts + nonce + method + API_KEY).toLowerCase();
  const hmac = CryptoJS.HmacSHA256(key, SECRET_KEY);
  return hmac.toString(CryptoJS.enc.Hex);
}

export function buildHeaders(
  path: string,
  method: string,
  token?: string,
  quality = 'original',
): Record<string, string> {
  const ts = nowTs();
  const nonce = createNonce();
  return {
    accept: 'application/vnd.picacomic.com.v1+json',
    'User-Agent': 'okhttp/3.8.1',
    'Content-Type': 'application/json; charset=UTF-8',
    'api-key': API_KEY,
    'app-build-version': '45',
    'app-platform': 'android',
    'app-uuid': 'defaultUuid',
    'app-version': '2.2.1.3.3.4',
    'app-channel': '3',
    'image-quality': quality,
    authorization: token || '',
    time: ts,
    nonce,
    signature: sign(path, ts, nonce, method),
  };
}
