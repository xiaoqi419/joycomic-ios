// CORS 代理 + 图片 Descramble
// @author Jason

// 对齐 PicaComic / jmcomic python / JUKOMU Java
// 输入: MD5(epsId + 纯数字文件名) → 末位 charCode % 8/10 → * 2 + 2
// @see https://github.com/wgh136/PicaComic

import http from 'http';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import * as crypto from 'crypto';

const PORT = 3456;

// 可选代理（不强制）
try { setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:7897')); } catch {}

// Scramble descramble: 图像分割成 N 条水平带 → 反转顺序重组
function calcGridSize(epsId, filename, scrambleId) {
  const eps = parseInt(epsId, 10);
  const sc = parseInt(scrambleId, 10);

  if (eps < sc) return 0;
  if (eps < 268850) return 10;

  // 算法: MD5(epsId + filename) → 末位 charCode % N → * 2 + 2
  // filename 必须无扩展名（纯数字，如 "00001"）
  const md5Input = String(epsId) + String(filename);
  const hash = crypto.createHash('md5').update(md5Input).digest('hex');
  const charCode = hash.charCodeAt(hash.length - 1);

  if (eps > 421926) {
    return (charCode % 8) * 2 + 2;
  }
  return (charCode % 10) * 2 + 2;
}

async function descrambleImage(imageBuffer, epsId, filename, scrambleId) {
  try {
    const img = await loadImage(imageBuffer);
    const gridSize = calcGridSize(epsId, filename, scrambleId);
    if (gridSize <= 1) return imageBuffer;

    const w = img.width, h = img.height;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const blockSize = Math.floor(h / gridSize);
    const remainder = h % gridSize;

    // 逆序重排: 从最后一块开始绘制到 Canvas 顶部
    let y = 0;
    for (let i = gridSize - 1; i >= 0; i--) {
      const srcY = i * blockSize;
      const blockH = blockSize + (i === gridSize - 1 ? remainder : 0);
      ctx.drawImage(img, 0, srcY, w, blockH, 0, y, w, blockH);
      y += blockH;
    }

    return canvas.toBuffer('image/webp');
  } catch (e) {
    console.error('[descramble] Failed:', e.message);
    return imageBuffer;
  }
}

const presets = [
  { label: '同一章节 408257 → 00001 (分段18)', url: '/cdn-msp.18comic.vip/media/photos/408257/00001.webp', eps: '408257', fn: '00001', sc: '220980' },
  { label: '同一章节 408257 → 00002 (分段4)', url: '/cdn-msp.18comic.vip/media/photos/408257/00002.webp', eps: '408257', fn: '00002', sc: '220980' },
  { label: '同一章节 408257 → 00003 (分段20)', url: '/cdn-msp.18comic.vip/media/photos/408257/00003.webp', eps: '408257', fn: '00003', sc: '220980' },
  { label: '同一章节 408257 → 00004 (分段16)', url: '/cdn-msp.18comic.vip/media/photos/408257/00004.webp', eps: '408257', fn: '00004', sc: '220980' },
  { label: '同一章节 408257 → 00005 (分段2)', url: '/cdn-msp.18comic.vip/media/photos/408257/00005.webp', eps: '408257', fn: '00005', sc: '220980' },
  { label: '无解扰 eps=100000 < scId=220980', url: '/cdn-msp.18comic.vip/media/photos/100000/00001.webp', eps: '100000', fn: '00001', sc: '220980' },
  { label: '固定10段 eps=250000', url: '/cdn-msp.18comic.vip/media/photos/250000/00001.webp', eps: '250000', fn: '00001', sc: '220980' },
  { label: 'mod 10 eps=300000', url: '/cdn-msp.18comic.vip/media/photos/300000/00001.webp', eps: '300000', fn: '00001', sc: '220980' },
  { label: 'mod 8 边界 eps=421927', url: '/cdn-msp.18comic.vip/media/photos/421927/00001.webp', eps: '421927', fn: '00001', sc: '220980' },
  { label: 'mod 8 eps=500000', url: '/cdn-msp.18comic.vip/media/photos/500000/00001.webp', eps: '500000', fn: '00001', sc: '220980' },
];

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

  // 测试页面
  if (path === '/test' || path === '/test.html') {
    const testHtml = getTestHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(testHtml);
    return;
  }
  // 计算分段数的 API（供测试页调用）
  if (path === '/api/calc') {
    const epsId = params.eps_id || '';
    const picName = params.fn || '';
    const scId = params.sc || '0';
    const num = calcGridSize(epsId, picName, scId);
    const eps = parseInt(epsId, 10);
    const sc = parseInt(scId, 10);
    let detail = `epsId=${epsId} picName=${picName} scId=${scId}`;
    if (eps >= sc) {
      const md5Input = epsId + picName;
      const hash = crypto.createHash('md5').update(md5Input).digest('hex');
      const cc = hash.charCodeAt(hash.length - 1);
      const modVal = eps > 421926 ? 8 : 10;
      detail += ` MD5("${md5Input}")=${hash} lastChar=${hash.slice(-1)} charCode=${cc} %${modVal}=${cc % modVal} *2+2=${num}`;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ num, epsId, picName, scId, detail }));
    return;
  }

  // Extract domain from path: /{domain}/{rest}
  const slashIdx = path.indexOf('/', 1);
  const domain = slashIdx > 0 ? path.substring(1, slashIdx) : '18comic.vip';
  const restPath = slashIdx > 0 ? path.substring(slashIdx) : path;
  const targetUrl = `https://${domain}${restPath}${parsed.search}`;

  const isImage = restPath.match(/\.(webp|jpg|jpeg|png)$/i);
  const sc = params.sc || '0';
  const eps_id = params.eps_id || '0';
  const fn = params.fn || '';

  try {
    const headers = {
      'Referer': 'https://www.jmapibranch2.cc/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile',
      'Accept': req.headers.accept || 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'X-Requested-With': 'com.jiaohua_browser',
    };
    if (req.headers.cookie) headers['cookie'] = req.headers.cookie;
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
    if (isImage && sc !== '0') {
      try {
        console.log(`[descramble] ${restPath} eps_id=${eps_id} fn=${fn} sc=${sc}`);
        respBody = await descrambleImage(respBody, eps_id, fn, sc);
      } catch (e) {
        console.error(`[descramble FAIL] ${restPath}: ${e.message}`);
      }
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
}).listen(PORT, () => console.log(`🌐 CORS Proxy :${PORT} → 任意域名 + descramble + 测试页 /test`));

// ──────────────────────────────────────
// 测试页面 HTML（预设下拉框 + Canvas descramble + 日志）
// ──────────────────────────────────────
function getTestHtml() {
  const presetsJson = JSON.stringify(presets);

  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><title>JM Descramble Test</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:monospace}
body{background:#111;color:#0f0;padding:20px}
h1{color:#fff;margin-bottom:4px}
.sub{color:#888;margin-bottom:16px;font-size:13px}
select{display:block;width:100%;padding:7px 8px;background:#222;border:1px solid #555;color:#ddd;border-radius:4px;margin-bottom:14px;cursor:pointer;font-size:13px}
select:focus{outline:none;border-color:#0a0}
.form-row{display:flex;gap:8px;flex-wrap:wrap}
.form-row>div{flex:1;min-width:100px}
label{display:block;margin:6px 0 3px;color:#888;font-size:12px}
input{display:block;width:100%;padding:5px 8px;background:#222;border:1px solid #444;color:#fff;border-radius:4px;margin-bottom:6px;font-size:13px}
input:focus{outline:none;border-color:#0a0}
button{padding:8px 24px;background:#0a0;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;margin-top:4px}
button:hover{background:#0c0}
.row{display:flex;gap:16px;margin-top:8px}
.col{flex:1;min-width:280px}
canvas{max-width:100%;width:100%;border:1px solid #444;margin-top:8px;display:none;background:#000}
#log{background:#000;padding:8px;border-radius:4px;max-height:360px;overflow:auto;font-size:12px;line-height:1.5;margin-top:4px;white-space:pre-wrap;border:1px solid #333}
.warn{color:#fa0}
.err{color:#f00}
.ok{color:#0f0}
.info{color:#0af}
</style></head>
<body>
<h1>JM Descramble 浏览器测试</h1>
<p class="sub">选预设 → 点"测试解扰" → Canvas 显示结果 &darr;</p>

<label style="color:#aaa;font-size:13px;margin-bottom:4px">选择测试用例</label>
<select id="preset" onchange="loadPreset()"></select>

<div class="row">
<div class="col">
  <label>图片 URL（经 CORS 代理）</label>
  <input id="imgUrl" placeholder="/cdn-msp.18comic.vip/media/photos/...">
  <div class="form-row">
    <div><label>章节ID (epsId)</label><input id="epsId" placeholder="408257"></div>
    <div><label>文件名 (纯数字)</label><input id="picName" placeholder="00001"></div>
    <div><label>scrambleId</label><input id="scId" placeholder="220980"></div>
  </div>
  <button onclick="testDescramble()"> ▶ 测试解扰</button>
  <div style="margin-top:10px;font-size:12px;color:#888">
    状态: <span id="status">就绪</span>
  </div>
  <label style="margin-top:10px">日志</label>
  <div id="log"></div>
</div>
<div class="col">
  <canvas id="canvas"></canvas>
</div>
</div>

<script>
var presets = ${presetsJson};

// 渲染下拉框
(function() {
  var sel = document.getElementById('preset');
  presets.forEach(function(p, i) {
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.label;
    sel.appendChild(opt);
  });
  loadPreset();
})();

function loadPreset() {
  var p = presets[document.getElementById('preset').value];
  document.getElementById('imgUrl').value = p.url;
  document.getElementById('epsId').value = p.eps;
  document.getElementById('picName').value = p.fn;
  document.getElementById('scId').value = p.sc;
  document.getElementById('log').innerHTML = '';
  document.getElementById('canvas').style.display = 'none';
  document.getElementById('status').textContent = '\u2713 ' + p.label;
}

function log(msg, cls) {
  var el = document.getElementById('log');
  el.innerHTML += '<span class="' + (cls||'') + '">' + msg.replace(/</g,'&lt;') + '</span><br>';
  el.scrollTop = el.scrollHeight;
}

async function testDescramble() {
  var url = document.getElementById('imgUrl').value.trim();
  var epsId = document.getElementById('epsId').value.trim();
  var picName = document.getElementById('picName').value.trim();
  var scId = document.getElementById('scId').value.trim();
  var canvas = document.getElementById('canvas');
  var status = document.getElementById('status');
  document.getElementById('log').innerHTML = '';
  canvas.style.display = 'none';
  status.textContent = '测试中...';
  log('=== 开始测试 ===', 'info');
  log('epsId=' + epsId + ' picName=' + picName + ' scId=' + scId);
  log('URL: ' + url);

  // Step 1: 计算分段数（服务端 API）
  try {
    var resp = await fetch('/api/calc?eps_id=' + encodeURIComponent(epsId) + '&fn=' + encodeURIComponent(picName) + '&sc=' + encodeURIComponent(scId));
    var d = await resp.json();
    log(d.detail || 'num=' + d.num);
    log(d.num <= 1 ? '无需解扰' : '分段数: ' + d.num + ' \u2705', d.num <= 1 ? 'warn' : 'ok');
  } catch(e) {
    log('API \u9519\u8bef: ' + e.message, 'err');
    status.textContent = '\u274c \u8ba1\u7b97\u5931\u8d25';
    return;
  }

  // Step 2: 下载
  try {
    log('\u4e0b\u8f7d\u4e2d...');
    var r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var blob = await r.blob();
    log('\u4e0b\u8f7d\u5b8c\u6210: ' + (blob.size/1024).toFixed(0) + 'KB', 'ok');

    var img = await new Promise(function(ok, fail) {
      var i = new Image();
      i.onload = function() { ok(i); };
      i.onerror = function() { fail(new Error('\u89e3\u7801\u5931\u8d25')); };
      i.src = URL.createObjectURL(blob);
    });
    log('\u56fe\u7247\u5c3a\u5bf8: ' + img.naturalWidth + 'x' + img.naturalHeight, 'ok');

    // Step 3: Canvas
    var num = d.num;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');

    if (num <= 1) {
      ctx.drawImage(img, 0, 0);
      canvas.style.display = 'block';
      log('\u663e\u793a\u539f\u56fe', 'warn');
      status.textContent = '\u2713 \u5b8c\u6210 (\u65e0\u89e3\u6270)';
      return;
    }

    var blockSize = Math.floor(img.naturalHeight / num);
    var rem = img.naturalHeight % num;
    log('blockSize=' + blockSize + ' rem=' + rem);

    var y = 0;
    for (var i = num - 1; i >= 0; i--) {
      var srcY = i * blockSize;
      var h = blockSize + (i === num - 1 ? rem : 0);
      ctx.drawImage(img, 0, srcY, img.naturalWidth, h, 0, y, img.naturalWidth, h);
      y += h;
    }
    canvas.style.display = 'block';
    log('\u89e3\u6270\u5b8c\u6210! \u2714', 'ok');
    status.textContent = '\u2705 \u89e3\u6270\u6210\u529f (' + num + '\u6bb5)';
  } catch(e) {
    log('\u9519\u8bef: ' + e.message, 'err');
    status.textContent = '\u274c ' + e.message;
  }
}
</script>
</body>
</html>`;
}
