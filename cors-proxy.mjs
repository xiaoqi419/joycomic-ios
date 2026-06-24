// CORS 代理 - 支持任意目标域名
// @author Jason

import http from 'http';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const PORT = 3456;
setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:7897'));

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': '*', 'Access-Control-Max-Age': '86400' });
    res.end();
    return;
  }
  // URL 格式: /{domain}/{path} → https://{domain}/{path}
  const path = req.url || '/';
  const slashIdx = path.indexOf('/', 1);
  const domain = slashIdx > 0 ? path.substring(1, slashIdx) : '18comic.vip';
  const restPath = slashIdx > 0 ? path.substring(slashIdx) : path;
  const targetUrl = `https://${domain}${restPath}`;

  console.log(`[proxy] ${req.method} ${domain}${restPath}`);

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile',
      'Accept': req.headers.accept || '*/*',
    };
    if (req.headers.token) headers['token'] = req.headers.token;
    if (req.headers.tokenparam) headers['tokenparam'] = req.headers.tokenparam;
    if (req.headers.cookie) headers['cookie'] = req.headers.cookie;
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

    // 转发 POST body
    let body = null;
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }
    const resp = await fetch(targetUrl, { method: req.method, headers, body });
    const respBody = await resp.arrayBuffer();
    const origin = req.headers['origin'] || '*';
    res.writeHead(resp.status, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
    });
    res.end(Buffer.from(respBody));
  } catch (err) {
    res.writeHead(502, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain' });
    res.end(`Proxy Error: ${err.message}`);
  }
}).listen(PORT, () => console.log(`🌐 CORS Proxy :${PORT} → 任意域名`));
