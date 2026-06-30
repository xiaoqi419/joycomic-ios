// 禁漫天堂 API 加解密（从 APK JS bundle 完整逆向）
// @author nyx

import CryptoJS from 'crypto-js';

// 从 APK 源码提取的加密常量
const APP_TOKEN_SECRET = '185Hcomic3PAPP7R';
const APP_TOKEN_SECRET_2 = '18comicAPPContent';
const APP_DATA_SECRET = '185Hcomic3PAPP7R';
const APP_VERSION = '2.0.26';

function md5Hex(data: string): string {
  return CryptoJS.MD5(data).toString(CryptoJS.enc.Hex);
}

/**
 * 生成 API 请求的 token 和 tokenparam
 */
export function generateToken(ts: number, forScramble = false): { token: string; tokenparam: string } {
  const secret = forScramble ? APP_TOKEN_SECRET_2 : APP_TOKEN_SECRET;
  const tokenparam = `${ts},${APP_VERSION}`;
  const token = md5Hex(`${ts}${secret}`);
  return { token, tokenparam };
}

/**
 * 获取当前秒级时间戳
 */
export function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 解密 API 响应中的 data 字段
 * AES-256-ECB(PKCS7, key=MD5("{ts}{secret}"))
 */
export function decryptData(ts: number, encryptedBase64: string): string {
  const secrets = [APP_DATA_SECRET, APP_TOKEN_SECRET_2];
  const ciphertext = CryptoJS.enc.Base64.parse(encryptedBase64);

  for (const secret of secrets) {
    try {
      const keyHex = md5Hex(`${ts}${secret}`);
      const key = CryptoJS.enc.Utf8.parse(keyHex);
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext } as CryptoJS.lib.CipherParams,
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
      );
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      if (result && (result.startsWith('{') || result.startsWith('['))) return result;
    } catch {}
  }
  throw new Error('解密失败');
}

export function decryptAndParse<T = any>(ts: number, encryptedBase64: string): T {
  return JSON.parse(decryptData(ts, encryptedBase64));
}
