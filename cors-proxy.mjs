// CORS 代理 + 图片 Descramble
// @author 

import http from 'http';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const PORT = 3456;
setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:7897'));

// Scramble descramble: 图像分割成 N 条水平带 → 反转顺序重组
function calcGridSize(scrambleId, albumId) {
  const b64s = Buffer.from(String(scrambleId)).toString('base64');
  const b64a = Buffer.from(albumId || '0').toString('base64');
  const combined = b64s + b64a;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16);
  let r = hex.charCodeAt(hex.length - 1);
  if (scrambleId >= 268850 && scrambleId <= 421925) r %= 10;
  else if (scrambleId >= 421926) r %= 8;
  const gridMap = { 0: 2, 1: 4, 2: 6, 3: 8, 4: 10, 5: 12, 6: 14, 7: 16, 8: 18, 9: 20 };
  return gridMap[r] || 10;
}

async function descrambleImage(imageBuffer, scrambleId, albumId) {
  if (scrambleId === 0 || scrambleId === 220980) return imageBuffer;

  try {
    const img = await loadImage(imageBuffer);
    const gridSize = calcGridSize(scrambleId, albumId);
    const w = img.width, h = img.height;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const stripH = Math.floor(h / gridSize);
    const remainder = h % gridSize;

    for (let i = 0; i < gridSize; i++) {
      const srcY = h - stripH * (i + 1) - (i === 0 ? 0 : remainder);
      const destY = stripH * i;
      const currentH = stripH + (i === 0 ? remainder : 0);
      ctx.drawImage(img, 0, srcY, w, currentH, 0, destY, w, currentH);
    }

    return canvas.toBuffer('image/webp');
  } catch (e) {
    console.error('[descramble] Failed:', e.message);
    return imageBuffer;
  }
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*', 'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const url = req.url || '/';
  const parsed = new URL(url, 'http://localhost');
  const path = parsed.pathname;
  const params = Object.fromEntries(parsed.searchParams);

  // Extract domain from path: /{domain}/{rest}
  const slashIdx = path.indexOf('/', 1);
  const domain = slashIdx > 0 ? path.substring(1, slashIdx) : '18comic.vip';
  const restPath = slashIdx > 0 ? path.substring(slashIdx) : path;
  const targetUrl = `https://${domain}${restPath}`;

  const isImage = restPath.match(/\.(webp|jpg|jpeg|png)$/i);
  const sc = parseInt(params.sc) || 0;
  const aid = params.aid || '0';

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile',
      'Accept': req.headers.accept || '*/*',
    };
    if (req.headers.token) headers['token'] = req.headers.token;
    if (req.headers.tokenparam) headers['tokenparam'] = req.headers.tokenparam;
    if (req.headers.cookie) headers['cookie'] = req.headers.cookie;
    if (req.headers['x-avs']) headers['cookie'] = (headers['cookie'] ? headers['cookie'] + '; ' : '') + `AVS=${req.headers['x-avs']}`;
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

    let body = null;
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const resp = await fetch(targetUrl, { method: req.method, headers, body });
    let respBody = Buffer.from(await resp.arrayBuffer());

    // Descramble if image with scramble params
    if (isImage && sc !== 0 && sc !== 220980) {
      console.log(`[descramble] ${restPath} sc=${sc} aid=${aid}`);
      respBody = await descrambleImage(respBody, sc, aid);
    }

    const origin = req.headers['origin'] || '*';
    res.writeHead(resp.status, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
    });
    res.end(respBody);
  } catch (err) {
    res.writeHead(502, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain' });
    res.end(`Proxy Error: ${err.message}`);
  }
}).listen(PORT, () => console.log(`🌐 CORS Proxy :${PORT} → 任意域名 + descramble`));
