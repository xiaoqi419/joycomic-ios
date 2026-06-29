// 图片 Scramble 解码 — 精确算法 (从 PicaComic / JMComic-qt 移植)
// 网格数 = MD5(epsId + 文件名) → 末位 charCode % N → * 2 + 2
// 图片重组 = 将水平条带逆序重排 (最后一块放到最上面)
// @author nyx

import CryptoJS from 'crypto-js';

/**
 * 计算分段数 (即百叶窗的叶片数)
 * 从 PicaComic lib/foundation/image_loader/image_recombine.dart 移植
 *
 * @param epsId      章节 ID (albumId 或 chapterId)
 * @param scrambleId 从 API 获取的 scramble_id，回退值 220980
 * @param pictureName 文件名，如 "00001.webp"
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
    // 早期章节无保护
    num = 0;
  } else if (epsID < 268850) {
    // 固定 10 段 (旧保护方式)
    num = 10;
  } else if (epsID > 421926) {
    // MD5(epsId + pictureName) → 末位 charCode % 8 → * 2 + 2
    const hash = CryptoJS.MD5(epsId + pictureName).toString(CryptoJS.enc.Hex);
    const charCode = hash.charCodeAt(hash.length - 1);
    const remainder = charCode % 8;
    num = remainder * 2 + 2; // 结果: 2,4,6,8,10,12,14,16
  } else {
    // 268850 <= epsID <= 421926
    // MD5(epsId + pictureName) → 末位 charCode % 10 → * 2 + 2
    const hash = CryptoJS.MD5(epsId + pictureName).toString(CryptoJS.enc.Hex);
    const charCode = hash.charCodeAt(hash.length - 1);
    const remainder = charCode % 10;
    num = remainder * 2 + 2; // 结果: 2,4,6,8,10,12,14,16,18,20
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
 * 1. 加载原始图片 (crossOrigin="anonymous")
 * 2. 计算分段数
 * 3. 将图片切成水平条带并按逆序重排
 * 4. 渲染到 Canvas 上
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
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(function(){
  var img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function(){
    var num = ${num};
    var c = document.getElementById('c');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    var ctx = c.getContext('2d');

    // 计算每块高度
    var blockSize = Math.floor(img.naturalHeight / num);
    var remainder = img.naturalHeight % num;

    // 分配块: [{start, end}, ...]
    var blocks = [];
    for (var i = 0; i < num; i++) {
      var start = i * blockSize;
      var end = start + blockSize + (i === num - 1 ? remainder : 0);
      blocks.push({ start: start, end: end });
    }

    // 逆序重排: 从最后一块开始绘制到 Canvas 顶部
    var y = 0;
    for (var i = blocks.length - 1; i >= 0; i--) {
      var block = blocks[i];
      var h = block.end - block.start;
      ctx.drawImage(img, 0, block.start, img.naturalWidth, h, 0, y, img.naturalWidth, h);
      y += h;
    }
  };
  img.onerror = function(){
    // 加载失败时直接显示原图
    document.body.innerHTML = '<img src="' + '${safeUrl}' + '" style="max-width:100%;max-height:100vh;object-fit:contain">';
  };
  img.src = '${safeUrl}';
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
