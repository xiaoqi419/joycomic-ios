// 禁漫天堂 API 加解密实现
// 参考: hect0x7/JMComic-Crawler-Python (Python) + lanyeeee/jmcomic-downloader (Rust)
// @author Jason

import CryptoJS from 'crypto-js';
import {
  APP_TOKEN_SECRET,
  APP_TOKEN_SECRET_2,
  APP_DATA_SECRET,
  APP_VERSION,
} from '../constants';

/**
 * MD5 哈希（返回 32 位十六进制小写字符串）
 */
function md5Hex(data: string): string {
  return CryptoJS.MD5(data).toString(CryptoJS.enc.Hex);
}

/**
 * 生成 API 请求的 token 和 tokenparam
 * @param ts 时间戳（秒）
 * @param forScramble 是否为获取 scramble_id 的请求（使用不同的 secret）
 */
export function generateToken(
  ts: number,
  forScramble: boolean = false
): { token: string; tokenparam: string } {
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
 *
 * 解密流程：
 * 1. data = base64_decode(encrypted_data)
 * 2. key = md5_hex("{ts}{APP_DATA_SECRET}") — 32 字节 ASCII 字符
 * 3. decrypted = AES-256-ECB(PKCS7) decrypt(data, key)
 * 4. decrypted → UTF-8 string → JSON
 *
 * @param ts 请求时使用的时间戳
 * @param encryptedBase64 API 返回的 data 字段（base64 编码）
 * @returns 解密后的 JSON 字符串
 */
export function decryptData(
  ts: number,
  encryptedBase64: string
): string {
  // 1. 生成密钥: md5(ts + secret) 的 hex 字符串转为 UTF-8 WordArray
  const keyHex = md5Hex(`${ts}${APP_DATA_SECRET}`);
  const key = CryptoJS.enc.Utf8.parse(keyHex);

  // 2. Base64 解码密文
  const ciphertext = CryptoJS.enc.Base64.parse(encryptedBase64);

  // 3. AES-256-ECB 解密（PKCS7 padding 默认开启）
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
    key,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  // 4. 转为 UTF-8 字符串
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * 解密并解析 API 响应为 JSON 对象
 */
export function decryptAndParse<T = any>(
  ts: number,
  encryptedBase64: string
): T {
  const jsonStr = decryptData(ts, encryptedBase64);
  return JSON.parse(jsonStr) as T;
}
