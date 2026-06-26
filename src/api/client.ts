// API HTTP 客户端 — 动态域名 + AVS + 自动重试
// @author nyx

import { generateToken, nowTs } from './crypto';

export class ApiError extends Error {
  constructor(msg: string, public code?: number, public body?: string) {
    super(msg);
    this.name = 'ApiError';
  }
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

// 硬编码兜底域名（从 APK 提取的实际 API CDN）
const FALLBACK_DOMAINS = [
  'www.cdnhjk.net',
  'www.cdngwc.cc',
  'www.cdngwc.net',
  'www.cdngwc.club',
  'www.cdnutc.me',
];

export class ApiClient {
  private domainIdx = 0;
  private avsToken = '';
  private domains: string[] = [...FALLBACK_DOMAINS];
  /** 从 /api/setting 获取的主域名 */
  private mainHost = '';
  /** 从 /api/setting 获取的图片 CDN */
  private imgHost = 'cdn-msp.18comic.vip';

  getDomains() { return this.domains; }
  setDomains(d: string[]) { this.domains = d.length > 0 ? d : [...FALLBACK_DOMAINS]; }

  getMainHost() { return this.mainHost; }
  setMainHost(h: string) { this.mainHost = h; }

  getImgHost() { return this.imgHost; }
  setImgHost(h: string) { this.imgHost = h || 'cdn-msp.18comic.vip'; }

  setAvs(token: string) { this.avsToken = token; }
  getAvs() { return this.avsToken; }

  private switchDomain() {
    this.domainIdx++;
    return this.domainIdx < this.domains.length;
  }
  resetDomain() { this.domainIdx = 0; }

  private buildHeaders(ts: number, isMobile: boolean): Record<string, string> {
    const h: Record<string, string> = { ...BROWSER_HEADERS };
    if (isMobile) {
      const { token, tokenparam } = generateToken(ts);
      h['Token'] = token;
      h['Tokenparam'] = tokenparam;
    }
    if (this.avsToken) {
      h['Cookie'] = `AVS=${this.avsToken}`;
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
    const method = config.method || 'GET';
    const isMobile = config.isMobile !== false;
    const headers = this.buildHeaders(ts, isMobile);

    // 优先用 mainHost（从 /api/setting 获取），否则用 fallback 域名轮询
    const domain = this.mainHost || this.domains[this.domainIdx % this.domains.length];
    // 路径以 / 开头则直接拼接，否则加 /
    const sep = path.startsWith('/') ? '' : '/';
    let url = `https://${domain}${sep}${path}`;
    // Web 环境走本地 CORS 代理（绕过 Cloudflare 封锁）
    if (typeof window !== 'undefined') {
      url = `http://localhost:3456/${domain}/${path}`;
    }
    if (config.query) {
      const p = new URLSearchParams();
      Object.entries(config.query).forEach(([k, v]) => p.append(k, String(v)));
      url += '?' + p.toString();
    }

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15000);
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

      if (isMobile) return JSON.parse(text).data as T;
      return text as T;
    } catch (e: any) {
      clearTimeout(tid);
      if (retry < 3 && this.switchDomain() && e instanceof ApiError) {
        return this.request<T>(path, config, retry + 1);
      }
      throw e;
    }
  }

  async get<T>(path: string, q?: Record<string, string | number>) {
    return this.request<T>(path, { method: 'GET', query: q });
  }
  async post<T>(path: string, f?: Record<string, string | number>) {
    return this.request<T>(path, { method: 'POST', form: f });
  }
  async getWeb(path: string, q?: Record<string, string | number>) {
    return this.request<string>(path, { method: 'GET', query: q, isMobile: false });
  }
}

export const apiClient = new ApiClient();
