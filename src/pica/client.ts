// Pica — HTTP 客户端（支持自动重连 & 签名）
// 参考 PicaComic (https://github.com/Pacalini/PicaComic) 实现
// @author Jason

import { buildHeaders } from './crypto';

const BASE = 'https://picaapi.go2778.com/';
const TIMEOUT = 15000;
const MAX_RETRIES = 2;

class PicaHttpClient {
  private token = '';
  private baseUrl = BASE;

  setToken(t: string) { this.token = t; }
  getToken() { return this.token; }
  setBaseUrl(url: string) { this.baseUrl = url; }

  private async request<T>(
    method: string,
    pathWithQuery: string,
    body?: Record<string, any> | null,
  ): Promise<T> {
    // 签名用纯路径（不含 query string，Pica 服务器要求）
    const purePath = pathWithQuery.split('?')[0];
    const headers = buildHeaders(purePath, method, this.token);

    const opts: RequestInit = {
      method,
      headers: { ...headers as Record<string, string> },
    };
    if (body && method !== 'GET') {
      opts.body = JSON.stringify(body);
    }

    let lastErr: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        opts.signal = controller.signal;
        const timer = setTimeout(() => controller.abort(), TIMEOUT);

        const res = await fetch(this.baseUrl + pathWithQuery, opts);
        clearTimeout(timer);

        if (!res.ok) {
          if (res.status === 401) { this.token = ''; throw new Error('登录失效'); }
          const txt = await res.text();
          let msg = txt;
          try { msg = JSON.parse(txt).message || txt; } catch {}
          throw new Error(`Pica ${res.status}: ${msg}`);
        }

        const json = await res.json();
        // Pica API 响应统一为 { code, message, data }
        return (json.data || json) as T;
      } catch (e: any) {
        lastErr = e;
        if (e.name === 'AbortError') continue;
        if (e.message?.includes('登录失效')) throw e;
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw lastErr;
  }

  get<T>(path: string, query?: Record<string, any>) {
    const qs = query ? '?' + new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<T>('GET', path + qs);
  }

  post<T>(path: string, body?: Record<string, any> | null) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: Record<string, any>) {
    return this.request<T>('PUT', path, body);
  }

  del<T>(path: string, body?: Record<string, any>) {
    return this.request<T>('DELETE', path, body);
  }
}

export const picaClient = new PicaHttpClient();
