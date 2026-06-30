// 图片 Scramble 解码 — 精确算法 (从 PicaComic / JMComic-qt 移植)
// 网格数 = MD5(epsId + 纯数字文件名) → 末位 charCode % N → * 2 + 2
// 图片重组 = 将水平条带逆序重排 (最后一块放到最上面)
// @author nyx

import CryptoJS from 'crypto-js';
import { jmLogger } from './JmLogger';

/**
 * 计算分段数 (即百叶窗的叶片数)
 * 从 PicaComic lib/foundation/image_loader/image_recombine.dart 移植
 *
 * @param epsId      章节 ID (albumId 或 chapterId)
 * @param scrambleId 从 API 获取的 scramble_id，回退值 220980
 * @param pictureName 纯数字文件名，不带扩展名，如 "00001"（不能用 "00001.webp"）
 */
export function getSegmentationNum(
  epsId: string,
  scrambleId: string,
  pictureName: string,
): number {
  const epsID = parseInt(epsId, 10);
  const scrambleID = parseInt(scrambleId, 10);
  let num = 0;

  if (epsID < scrambleID) {
    num = 0;
  } else if (epsID < 268850) {
    num = 10;
  } else if (epsID > 421926) {
    const md5Input = epsId + pictureName;
    const hash = CryptoJS.MD5(md5Input).toString(CryptoJS.enc.Hex);
    const charCode = hash.charCodeAt(hash.length - 1);
    const remainder = charCode % 8;
    num = remainder * 2 + 2;
    jmLogger.log(`MD5("${md5Input}")=${hash} last=${charCode} %8=${remainder} *2+2=${num}`);
  } else {
    const md5Input = epsId + pictureName;
    const hash = CryptoJS.MD5(md5Input).toString(CryptoJS.enc.Hex);
    const charCode = hash.charCodeAt(hash.length - 1);
    const remainder = charCode % 10;
    num = remainder * 2 + 2;
    jmLogger.log(`MD5("${md5Input}")=${hash} last=${charCode} %10=${remainder} *2+2=${num}`);
  }
  return num;
}

/**
 * 从 URL 中提取文件名 (如 "00001.webp")
 */
export function extractFilename(url: string): string {
  // 去掉 query string
  const path = url.split('?')[0];
  const m = path.match(/\/(\d+\.\w+)$/);
  return m ? m[1] : '00001.webp';
}

/**
 * 提取文件名去掉扩展名 (如 "00001")
 */
export function extractFilenameWithoutExt(url: string): string {
  const fn = extractFilename(url);
  return fn.replace(/\.\w+$/, '');
}

/**
 * 生成用于 WebView Canvas 解扰的 HTML
 *
 * 该 HTML 会:
 * 1. 加载图片 (data URL, 同源, 无 CORS 问题)
 * 2. 将图片切成水平条带并按逆序重排
 * 3. 渲染到 Canvas 上
 * 4. 每一步都通过 postMessage 回传日志到 React Native
 */
export function buildDescrambleHtml(
  imageUrl: string,
  epsId: string,
  scrambleId: string,
  pictureName: string,
): string {
  const num = getSegmentationNum(epsId, scrambleId, pictureName);

  // 不需要解扰 — 直接显示原图
  if (num <= 1) {
    return buildSimpleImageHtml(imageUrl, false);
  }

  const safeUrl = imageUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
canvas{display:block;width:100vw;height:100vh;object-fit:contain}
#log{display:none;color:#0f0;font:12px monospace;position:fixed;bottom:0;left:0;z-index:99;background:rgba(0,0,0,.8);padding:4px;max-height:40vh;overflow:auto;white-space:pre-wrap;width:100%}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="log"></div>
<script>
(function(){
  function log(msg) {
    var el = document.getElementById('log');
    if (el) el.textContent += msg + '\\n';
    try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage && window.ReactNativeWebView.postMessage('[WV] ' + msg); } catch(e) {}
  }
  try {
    log('start');
    var img = new Image();
    img.onload = function() {
      try {
        log('img.onload w=' + img.naturalWidth + ' h=' + img.naturalHeight);
        var num = ${num};
        var c = document.getElementById('c');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        var ctx = c.getContext('2d');
        log('canvas ' + c.width + 'x' + c.height + ' num=' + num);

        var blockSize = Math.floor(img.naturalHeight / num);
        var remainder = img.naturalHeight % num;
        log('blockSize=' + blockSize + ' remainder=' + remainder);

        var blocks = [];
        for (var i = 0; i < num; i++) {
          var start = i * blockSize;
          var end = start + blockSize + (i === num - 1 ? remainder : 0);
          blocks.push({ start: start, end: end });
        }

        var y = 0;
        for (var i = blocks.length - 1; i >= 0; i--) {
          var block = blocks[i];
          var h = block.end - block.start;
          ctx.drawImage(img, 0, block.start, img.naturalWidth, h, 0, y, img.naturalWidth, h);
          y += h;
        }
        log('done strips=' + blocks.length);
      } catch(e) {
        log('ERR draw: ' + e.message);
        document.body.innerHTML = '<img src="' + '${safeUrl}' + '" style="max-width:100%;max-height:100vh;object-fit:contain">';
      }
    };
    img.onerror = function() {
      log('ERR img.onerror');
      document.body.innerHTML = '<img src="' + '${safeUrl}' + '" style="max-width:100%;max-height:100vh;object-fit:contain">';
    };
    img.src = '${safeUrl}';
    log('img.src set');
  } catch(e) {
    log('FATAL: ' + e.message);
  }
})();
</script>
</body>
</html>`;
}

/**
 * 简单的图片展示 HTML (无解扰)
 */
export function buildSimpleImageHtml(imageUrl: string, darkBg = true): string {
  const bg = darkBg ? '#000' : '#fff';
  const safeUrl = imageUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:${bg};overflow:hidden}
img{display:block;width:100vw;height:100vh;object-fit:contain}
</style>
</head>
<body>
<img src="${safeUrl}" alt="">
</body>
</html>`;
}
