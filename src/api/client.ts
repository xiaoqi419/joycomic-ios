// API HTTP 客户端 - 支持 CloudFlare 绕过 + 双引擎
// @author Jason

import { API_DOMAINS } from '../constants';
import { generateToken, nowTs } from './crypto';
import type { JmApiResponse } from './types';

// Web 端 CORS 代理地址（仅在浏览器中生效）
// 需要先运行: node cors-proxy.mjs
const WEB_PROXY = 'http://localhost:3456';

export class ApiError extends Error {
  constructor(msg: string, public code?: number, public body?: string) {
    super(msg);
    this.name = 'ApiError';
  }
}

// 浏览器级请求头（模拟 Android Chrome，参考 PicaComic）
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://18comic.vip/',
  'Origin': 'https://18comic.vip',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

export class ApiClient {
  private domainIndex = 0;
  private cookieJar: string = '';
  private avsToken: string = '';

  constructor(private domains: string[] = [...API_DOMAINS]) {}

  setAvs(token: string) {
    this.avsToken = token;
  }

  getAvs() {
    return this.avsToken;
  }

  getDomain(): string {
    if (typeof window !== 'undefined') return this.domains[0];
    // 优先使用用户选择的服务器
    try {
      const { useSettingsStore } = require('../store/useSettings');
      const { selectedServer, autoSelectServer, servers } = useSettingsStore.getState();
      if (selectedServer && !autoSelectServer) return selectedServer;
      if (autoSelectServer && servers.length > 0) {
        const fastest = servers.find((s: any) => s.available);
        if (fastest) return fastest.domain;
      }
    } catch {}
    return this.domains[this.domainIndex % this.domains.length];
  }

  private switchDomain(): boolean {
    this.domainIndex++;
    return this.domainIndex < this.domains.length;
  }

  /**
   * 初次访问首页，获取 CloudFlare cookies
   */
  async warmUp(): Promise<boolean> {
    // Web 端不需要 warmUp（走 CORS 代理，没有 CloudFlare 问题）
    if (typeof window !== 'undefined') return true;
    const domain = this.getDomain();
    try {
      const resp = await fetch(`https://${domain}/`, {
        headers: {
          ...BROWSER_HEADERS,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
        },
        redirect: 'follow',
      });
      // 保存 cookies
      const setCookie = resp.headers.get('set-cookie');
      if (setCookie) this.cookieJar = setCookie;
      // 检查是否被 CloudFlare 拦截
      const text = await resp.text();
      if (text.includes('Just a moment') || text.includes('challenge')) {
        console.warn('⚠️ CloudFlare 拦截，尝试备用域名...');
        return false;
      }
      return resp.ok;
    } catch {
      return false;
    }
  }

  /**
   * 发起请求 - 自动处理 CloudFlare
   */
  async request<T = any>(
    path: string,
    config: {
      method?: 'GET' | 'POST';
      query?: Record<string, string | number>;
      form?: Record<string, string | number>;
      isMobileApi?: boolean;  // true=移动端加密API, false=网页端
    } = {},
    retryCount = 0,
    maxRetries = 3
  ): Promise<T> {
    const ts = nowTs();
    const domain = this.getDomain();
    const method = config.method || 'GET';
    const isMobile = config.isMobileApi !== false;

    // 构建请求头
    const headers: Record<string, string> = { ...BROWSER_HEADERS };
    if (isMobile) {
      const { token, tokenparam } = generateToken(ts);
      headers['Token'] = token;      // 官方 App 用大写 T
      headers['Tokenparam'] = tokenparam; // 官方 App 用大写 T
    }
    if (this.cookieJar) {
      headers['Cookie'] = this.cookieJar;
    }
    if (this.avsToken) {
      headers['Cookie'] = (headers['Cookie'] ? headers['Cookie'] + '; ' : '') + `AVS=${this.avsToken}`;
    }

    // 构建 URL（web 端走本地 CORS 代理）
    let url = `https://${domain}${path}`;
    if (typeof window !== 'undefined') {
      url = `${WEB_PROXY}/${domain}${path}`;
    }
    if (config.query) {
      const params = new URLSearchParams();
      Object.entries(config.query).forEach(([k, v]) => params.append(k, String(v)));
      url += '?' + params.toString();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const isWeb = typeof window !== 'undefined';
    const fetchOpts: RequestInit = {
      method, headers, redirect: 'follow',
      credentials: isWeb ? 'omit' : 'include',
      referrerPolicy: 'no-referrer' as any,
      signal: controller.signal,
    };
    if (config.form && method === 'POST') {
      const fd = new URLSearchParams();
      Object.entries(config.form).forEach(([k, v]) => fd.append(k, String(v)));
      fetchOpts.body = fd.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    try {
      const response = await fetch(url, fetchOpts);
      clearTimeout(timeoutId);
      const text = await response.text();

      const sc = response.headers.get('set-cookie');
      if (sc) this.cookieJar = sc;

      if (text.includes('Just a moment') || text.includes('challenge-platform')) {
        throw new ApiError('CloudFlare 拦截', 403, 'cloudflare');
      }

      if (!response.ok) {
        // 尝试提取 API 返回的详细错误信息
        let errMsg = `HTTP ${response.status}`;
        try {
          const errJson = JSON.parse(text);
          if (errJson.errorMsg) errMsg = errJson.errorMsg;
          else if (errJson.errors) errMsg = JSON.stringify(errJson.errors);
        } catch {}
        throw new ApiError(errMsg, response.status, text.slice(0, 200));
      }

      // 移动端 API：返回加密的 data 字符串
      if (isMobile) {
        let json: JmApiResponse;
        try { json = JSON.parse(text); } catch {
          throw new ApiError('JSON 解析失败', response.status, text.slice(0, 100));
        }
        if (json.code !== 200) {
          throw new ApiError(`API错误(code=${json.code})`, json.code, json.errorMsg);
        }
        return json.data as unknown as T;
      }

      // 网页端 API：直接返回文本
      return text as unknown as T;

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError && error.body === 'cloudflare' && retryCount < maxRetries) {
        const warmed = await this.warmUp();
        if (warmed) {
          return this.request<T>(path, config, retryCount + 1, maxRetries);
        }
        // warmUp 失败 → 换域名
        if (this.switchDomain()) {
          return this.request<T>(path, config, retryCount + 1, maxRetries);
        }
      }

      // 普通错误 → 换域名重试
      const shouldRetry = retryCount < maxRetries &&
        (error instanceof ApiError || error.name === 'TypeError') &&
        this.switchDomain();

      if (shouldRetry) {
        return this.request<T>(path, config, retryCount + 1, maxRetries);
      }

      throw error;
    }
  }

  /** 移动端 API (加密) */
  async getMobile<T = any>(path: string, query?: Record<string, string | number>) {
    return this.request<T>(path, { method: 'GET', query, isMobileApi: true });
  }

  /** 网页端 API (HTML) */
  async getWeb(path: string, query?: Record<string, string | number>) {
    return this.request<string>(path, { method: 'GET', query, isMobileApi: false });
  }
  /** 移动端 API — POST (登录/注册等) */
  async postMobile<T = any>(path: string, form?: Record<string, string | number>) {
    return this.request<T>(path, { method: 'POST', form, isMobileApi: true });
  }
}

export const apiClient = new ApiClient();
