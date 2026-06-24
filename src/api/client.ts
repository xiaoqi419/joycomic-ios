// API HTTP 客户端 — 重写版，完整 AVS 支持
// @author Jason

import { API_DOMAINS } from '../constants';
import { generateToken, nowTs } from './crypto';
import type { JmApiResponse } from './types';

export class ApiError extends Error {
  constructor(msg: string, public code?: number, public body?: string) {
    super(msg); this.name = 'ApiError';
  }
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro Build/TP1A.220624.014) Chrome/120 Mobile',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

export class ApiClient {
  private domainIndex = 0;
  private cookieJar = '';
  private avsToken = '';
  private domains: string[];

  constructor(domains?: string[]) {
    this.domains = domains || [...API_DOMAINS];
  }

  getDomain() { return this.domains[this.domainIndex % this.domains.length]; }
  setDomains(d: string[]) { this.domains = d; }
  setAvs(token: string) { this.avsToken = token; }

  private switchDomain() { this.domainIndex++; return this.domainIndex < this.domains.length; }

  private buildHeaders(ts: number, isMobile: boolean): Record<string, string> {
    const h: Record<string, string> = { ...BROWSER_HEADERS };
    if (isMobile) {
      const { token, tokenparam } = generateToken(ts);
      h['Token'] = token;
      h['Tokenparam'] = tokenparam;
    }
    const avs = this.avsToken || globalAvs;
    if (avs) {
      // 浏览器不允许直接设 Cookie，用 X-AVS 让代理转换
      if (typeof window !== 'undefined') {
        h['X-AVS'] = avs;
      } else {
        h['Cookie'] = `AVS=${avs}`;
      }
    }
    return h;
  }

  async request<T>(path: string, config: {
    method?: 'GET' | 'POST';
    query?: Record<string, string | number>;
    form?: Record<string, string | number>;
    isMobile?: boolean;
  } = {}, retry = 0): Promise<T> {
    const ts = nowTs();
    const domain = this.getDomain();
    const method = config.method || 'GET';
    const isMobile = config.isMobile !== false;
    const headers = this.buildHeaders(ts, isMobile);

    let url = `https://${domain}${path}`;
    if (typeof window !== 'undefined') url = `http://localhost:3456/${domain}${path}`;
    if (config.query) {
      const p = new URLSearchParams();
      Object.entries(config.query).forEach(([k, v]) => p.append(k, String(v)));
      url += '?' + p.toString();
    }

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 12000);
    try {
      const opt: RequestInit = { method, headers, signal: ctrl.signal };
      if (config.form && method === 'POST') {
        const fd = new URLSearchParams();
        Object.entries(config.form).forEach(([k, v]) => fd.append(k, String(v)));
        opt.body = fd.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const resp = await fetch(url, opt);
      clearTimeout(tid);
      const text = await resp.text();

      if (text.includes('Just a moment')) throw new ApiError('被拦截', 403, 'cf');

      if (!resp.ok) {
        let msg = `HTTP ${resp.status}`;
        try { const j = JSON.parse(text); if (j.errorMsg) msg = j.errorMsg; } catch {}
        throw new ApiError(msg, resp.status);
      }

      if (isMobile) {
        const json: JmApiResponse = JSON.parse(text);
        if (json.code !== 200) throw new ApiError(json.errorMsg || 'API Error', json.code);
        return json.data as T;
      }
      return text as T;
    } catch (e: any) {
      clearTimeout(tid);
      if (retry < 3 && this.switchDomain() && e instanceof ApiError) {
        return this.request<T>(path, config, retry + 1);
      }
      throw e;
    }
  }

  async getMobile<T>(path: string, q?: Record<string, string | number>) { return this.request<T>(path, { method: 'GET', query: q }); }
  async postMobile<T>(path: string, f?: Record<string, string | number>) { return this.request<T>(path, { method: 'POST', form: f }); }
  async getWeb(path: string, q?: Record<string, string | number>) { return this.request<string>(path, { method: 'GET', query: q, isMobile: false }); }
}

// 全局 AVS 存储（热重载安全）
let globalAvs = '';
export function setGlobalAvs(t: string) { globalAvs = t; }
export function getGlobalAvs() { return globalAvs; }

export const apiClient = new ApiClient();
