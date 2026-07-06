// 版本更新检测 — GitHub Releases API + 国内 proxy 回退
// @author Jason

import { Platform } from 'react-native';

const REPO = 'xiaoqi419/joycomic-ios';
const CACHE_KEY = '@jmcomic.update_check';
const CACHE_TTL = 3600_000; // 1 小时

const isWeb = Platform.OS === 'web';

const PROXIES = isWeb
  ? [`https://api.github.com/repos/${REPO}/releases/latest`]
  : [
      // jsDelivr CDN 优先（国内可访问 + 无 API 限流）
      `https://cdn.jsdelivr.net/gh/${REPO}@main/latest-version.json`,
      `https://raw.githubusercontent.com/${REPO}/main/latest-version.json`,
      `https://api.github.com/repos/${REPO}/releases/latest`,
      `https://ghproxy.net/https://api.github.com/repos/${REPO}/releases/latest`,
    ];

const FETCH_TIMEOUT = isWeb ? 5000 : 8000;

export interface ReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
}

export interface CheckResult {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  release: ReleaseInfo | null;
  error?: string;
}

function parseVersion(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map(Number);
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/** 从缓存读取检查结果 */
function getCachedResult(): CheckResult | null {
  try {
    const raw = (global as any).__updateCache;
    if (raw && Date.now() - raw.time < CACHE_TTL) return raw.data;
  } catch {}
  return null;
}

/** 写入缓存 */
function setCachedResult(data: CheckResult): void {
  try { (global as any).__updateCache = { data, time: Date.now() }; } catch {}
}

export async function checkForUpdate(currentVersion: string): Promise<CheckResult> {
  // 有缓存直接返回
  const cached = getCachedResult();
  if (cached) return cached;

  for (const url of PROXIES) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'JOYComic-iOS/1.0',
          Accept: 'application/json',
          ...(url.includes('api.github.com') ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}),
        },
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) continue;
      const text = await res.text();
      let data: ReleaseInfo;
      try { data = JSON.parse(text); } catch { continue; }
      if (!data.tag_name) continue;

      const latest = data.tag_name.replace(/^v/i, '');
      const hasUpdate = compareVersions(latest, currentVersion) > 0;
      const result: CheckResult = { hasUpdate, latestVersion: latest, currentVersion, release: data };

      setCachedResult(result);
      return result;
    } catch {
      continue;
    }
  }

  const failResult: CheckResult = {
    hasUpdate: false, latestVersion: '', currentVersion,
    release: null, error: '无法连接到更新服务器',
  };
  // 不缓存失败结果，下次继续尝试
  return failResult;
}
