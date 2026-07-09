// SourceSelector — 测速 + 源选择
// @author Jason

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { generateToken, nowTs } from '../api/crypto';
import type { SettingData } from '../api/types';

const KEY = '@jmcomic.selectedShuntKey';

export async function loadSelectedShunt(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? parseInt(v, 10) : 0;
  } catch { return null; }
}

export async function saveSelectedShunt(key: number): Promise<void> {
  await AsyncStorage.setItem(KEY, String(key));
}

export interface ShuntInfo {
  key: number;
  title: string;
  /** 测速后的延迟 (ms)，-1 表示失败 */
  latency: number;
  imgHost: string;
}

/**
 * 获取某个 shunt 的 img_host
 */
export async function getShuntImgHost(key: number): Promise<string> {
  const ts = nowTs();
  const { token, tokenparam } = generateToken(ts);
  // 不能用 getMainHost（主站带 Cloudflare），要用 CDN 代理域名
  const domain = apiClient.getDomains()[0];
  const qs = key === 0 ? 'express=on' : `app_img_shunt=${key}`;
  const url = `https://${domain}/setting?${qs}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36',
      Accept: 'application/json, text/plain, */*',
      token,
      tokenparam,
    },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = JSON.parse(text);
  const setting = json.data as string;
  const { decryptAndParse } = await import('../api/crypto');
  const detail = decryptAndParse<SettingData>(ts, setting);
  return (detail.img_host || '').replace(/^https?:\/\//, '');
}

/**
 * 测试图片 CDN 延迟
 */
async function testImgHostLatency(host: string): Promise<number> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    await fetch(`https://${host}/favicon.ico`, {
      method: 'HEAD',
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    return Date.now() - start;
  } catch {
    return -1;
  }
}

/**
 * 测试所有 shunt 并返回结果
 */
export async function testAllShunts(shunts: Array<{ key: number; title: string }>): Promise<ShuntInfo[]> {
  const results: ShuntInfo[] = [];

  for (const s of shunts) {
    try {
      const imgHost = await getShuntImgHost(s.key);
      const latency = await testImgHostLatency(imgHost);
      results.push({ key: s.key, title: s.title, latency, imgHost });
    } catch {
      results.push({ key: s.key, title: s.title, latency: -1, imgHost: '' });
    }
  }

  return results;
}

/**
 * 从结果中选最快的
 */
export function pickFastest(results: ShuntInfo[]): ShuntInfo | null {
  const valid = results.filter((r) => r.latency >= 0);
  if (valid.length === 0) return null;
  valid.sort((a, b) => a.latency - b.latency);
  return valid[0];
}
