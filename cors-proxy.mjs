// CORS 代理服务器 — 解决 web 版跨域 + 翻墙问题
// 通过本机代理(127.0.0.1:7897)访问 18comic，并添加 CORS 头
// @author Jason

import http from 'http';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const PORT = 3456;
const PROXY_URL = 'http://127.0.0.1:7897';

// 使用代理访问外网
setGlobalDispatcher(new ProxyAgent(PROXY_URL));

const server = http.createServer(async (clientReq, clientRes) => {
  const targetUrl = `https://18comic.vip${clientReq.url}`;
  console.log(`[proxy] ${clientReq.method} ${clientReq.url}`);

  // 处理 OPTIONS 预检
  if (clientReq.method === 'OPTIONS') {
    clientRes.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    });
    clientRes.end();
    return;
  }

  try {
    const resp = await fetch(targetUrl, {
      method: clientReq.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': clientReq.headers.accept || '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://18comic.vip/',
        'Origin': 'https://18comic.vip',
        'token': clientReq.headers.token || '',
        'tokenparam': clientReq.headers.tokenparam || '',
        'Cookie': clientReq.headers.cookie || '',
        'Content-Type': clientReq.headers['content-type'] || '',
      },
    });

    const body = await resp.arrayBuffer();

    clientRes.writeHead(resp.status, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
      'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
    });
    clientRes.end(Buffer.from(body));

  } catch (err) {
    console.error(`[proxy] 错误: ${err.message}`);
    clientRes.writeHead(502, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain',
    });
    clientRes.end(`Proxy Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  🌐 CORS Proxy 运行中`);
  console.log(`  端口: ${PORT} → 18comic.vip (通过本地代理)`);
  console.log(`========================================\n`);
});
