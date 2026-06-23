// 从项目ID拉取 Stitch 设计 + 下载 HTML/截图
// @author Jason

import { stitch } from '@google/stitch-sdk';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import fs from 'fs';

const API_KEY = 'AQ.Ab8RN6Io8QhdZQy5ROaOoXkSLyXPWwnSEqbTNX82uSg_I7wdZQ';
const PROXY_URL = 'http://127.0.0.1:7897';
const PROJECT_ID = '17349483788264270523';
const OUT = 'stitch-output-v3';

if (PROXY_URL) setGlobalDispatcher(new ProxyAgent(PROXY_URL));
process.env.STITCH_API_KEY = API_KEY;

async function download(url, filepath) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (resp.ok) {
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(filepath, buf);
      return buf.length;
    }
    return -1;
  } catch { return -1; }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const project = stitch.project(PROJECT_ID);

  console.log(`📌 项目: ${PROJECT_ID}\n`);

  // 列出所有 screens
  const screens = await project.screens();
  console.log(`📋 共 ${screens.length} 个页面:\n`);

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    const name = `page-${String(i + 1).padStart(2, '0')}`;
    console.log(`[${i + 1}/${screens.length}] 获取页面 ${s.screenId || s.id}...`);

    try {
      const htmlUrl = await s.getHtml();
      const imgUrl = await s.getImage();

      console.log(`   📄 HTML: ${htmlUrl}`);
      console.log(`   🖼️  截图: ${imgUrl}`);

      // 下载
      const hSize = await download(htmlUrl, `${OUT}/${name}.html`);
      const iSize = await download(imgUrl, `${OUT}/${name}.png`);

      console.log(`   💾 ${hSize > 0 ? `HTML ${(hSize / 1024).toFixed(0)}KB` : 'HTML失败'} | ${iSize > 0 ? `截图 ${(iSize / 1024).toFixed(0)}KB` : '截图失败'}\n`);
    } catch (err) {
      console.error(`   ❌ ${err.message}\n`);
    }
  }

  console.log('✅ 完成！');
}

main().catch(console.error);
