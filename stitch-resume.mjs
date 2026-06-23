// 继续生成剩余页面 + 下载模板
// @author Jason

import { stitch } from '@google/stitch-sdk';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import fs from 'fs';
import path from 'path';

const API_KEY = 'AQ.Ab8RN6Io8QhdZQy5ROaOoXkSLyXPWwnSEqbTNX82uSg_I7wdZQ';
const PROXY_URL = 'http://127.0.0.1:7897';
const PROJECT_ID = '17046454996638942117'; // 已有项目

if (PROXY_URL) {
  setGlobalDispatcher(new ProxyAgent(PROXY_URL));
}
process.env.STITCH_API_KEY = API_KEY;

async function download(url, name) {
  const resp = await fetch(url);
  if (resp.ok) {
    const ext = url.includes('googleusercontent') ? '.png' : '.html';
    const filepath = path.join('stitch-output', `${name}${ext}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    console.log(`   💾 已保存: ${filepath}`);
    return filepath;
  }
  console.log(`   ⚠️  下载失败 ${name}: HTTP ${resp.status}`);
}

async function main() {
  fs.mkdirSync('stitch-output', { recursive: true });
  const project = stitch.project(PROJECT_ID);
  console.log(`📌 已有项目: ${PROJECT_ID}\n`);

  // 剩余的页面
  const remaining = [
    {
      name: '漫画详情页',
      prompt: `暗色漫画详情页面。顶部：左侧封面大图（140x200，圆角），右侧显示标题（18px粗体）、作者、观看数/点赞数、更新日期。操作栏：红色实心"❤ 收藏"按钮。标签区：圆角标签横向排列。章节列表：每行显示"第X话 标题"（白色）+ 页码（灰色），底部分割线。暗色主题 #0f0f23 / #1a1a2e / #e94560。iOS 风格。`,
    },
    {
      name: '漫画阅读器',
      prompt: `全屏暗色漫画阅读器。纯黑背景。顶部半透明遮罩层：左侧"← 返回"按钮，右侧页码"1/32"。中间显示漫画页面图片，铺满屏幕宽度（保持比例）。底部半透明进度条。点击画面中央切换顶部/底部栏显隐。极简设计，无干扰元素。iOS 风格。`,
    },
    {
      name: '收藏页面',
      prompt: `暗色收藏页面。标题"我的收藏"(18px粗体) + 数量。收藏列表：横向布局，左侧小封面图(60x80圆角)、中间标题+作者、右侧红色"删除"按钮。空状态：中间显示"还没有收藏"，副标题"在漫画详情页点击收藏按钮即可添加"。暗色主题 #0f0f23 / #1a1a2e / #e94560。iOS 风格。`,
    },
    {
      name: '设置页面',
      prompt: `暗色设置页面。大标题"设置"。分区标题红色大写：阅读设置、显示、关于。阅读模式分段控件：滚动/翻页（左右两段）。阅读方向：从左到右/从右到左。深色模式开关：iOS 风格 toggle。关于信息：应用名、版本号1.0.0、数据来源18comic.vip。底部灰色免责声明小字。暗色主题 #0f0f23 / #1a1a2e / #e94560。iOS 风格。`,
    },
  ];

  for (const page of remaining) {
    console.log(`🎨 生成: ${page.name}...`);
    try {
      const screen = await project.generate(page.prompt, 'MOBILE');
      const [htmlUrl, imageUrl] = await Promise.all([
        screen.getHtml(),
        screen.getImage(),
      ]);
      console.log(`   ✅ 成功`);
      console.log(`   📄 HTML: ${htmlUrl}`);
      console.log(`   🖼️  截图: ${imageUrl}`);
      await download(htmlUrl, page.name).catch(() => {});
      await download(imageUrl, page.name + '-screenshot').catch(() => {});
    } catch (err) {
      console.error(`   ❌ 失败:`, err.message);
    }
    console.log('');
  }

  // 列出所有 screens
  console.log('📋 项目中的所有页面:');
  const screens = await project.screens();
  for (const s of screens) {
    console.log(`  - ${s.screenId}`);
  }
}

main().catch(console.error);
