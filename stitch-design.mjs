// 使用 Stitch SDK 为禁漫天堂 iOS 客户端生成 UI 设计
// @author Jason
// 用法: STITCH_API_KEY=你的key node jmcomic-ios/stitch-design.mjs

import { stitch } from '@google/stitch-sdk';

const API_KEY = process.env.STITCH_API_KEY || 'AQ.Ab8RN6Io8QhdZQy5ROaOoXkSLyXPWwnSEqbTNX82uSg_I7wdZQ';

async function main() {
  process.env.STITCH_API_KEY = API_KEY;
  console.log('🚀 开始为禁漫天堂 App 生成 UI 设计...\n');

  // 1. 查看可用工具
  const { tools } = await stitch.listTools();
  console.log('可用工具:', tools.map(t => t.name), '\n');

  // 2. 创建项目
  console.log('📁 创建项目...');
  const createResult = await stitch.callTool('create_project', {
    title: 'JMComic iOS - 禁漫天堂第三方客户端',
  });

  const text = createResult.content?.[0]?.text || '';
  console.log('创建结果:', text.slice(0, 500));

  // 从返回文本中提取 projectId
  const projectIdMatch = text.match(/project[Ii][Dd]\s*["“]?\s*(\d+)/) || text.match(/"projectId"\s*:\s*"(\d+)"/);
  const projectId = projectIdMatch?.[1];
  
  if (!projectId) {
    console.log('⚠️ 未能从返回中提取 projectId，尝试直接使用文本:', text);
    console.log('\n📌 请手动设置 projectId，然后重试');
    return;
  }

  console.log(`📌 项目 ID: ${projectId}\n`);

  // 3. 引用项目
  const proj = stitch.project(projectId);

  // 4. 生成各个页面
  const screens = [
    {
      name: '首页-分类浏览',
      prompt: 'A dark themed manga browsing home page for a mobile comic app. Top has horizontal scrolling category chips: 全部, 同人, 单行本, CG, 漫画, 韩漫, 美漫. Below that: sort option chips: 最多观看, 本月热门, 本周热门, 今日热门. Main content shows a 2 column grid of manga cover images with titles. Dark background (#0f0f23), card background (#1a1a2e), red accent (#e94560). iOS status bar style.',
      deviceType: 'MOBILE',
    },
    {
      name: '搜索页',
      prompt: 'A dark themed manga search page for a mobile app. Top has a rounded search bar with "搜索漫画、作者、标签..." placeholder text and a red search button. Quick search tag chips below: 全彩, 无修正, 同人, CG, 韩漫, 纯爱, NTR. Search results shown as 2 column grid of manga covers. Dark theme with #0f0f23 background, #1a1a2e cards, #e94560 accent.',
      deviceType: 'MOBILE',
    },
    {
      name: '漫画详情页',
      prompt: 'A dark themed manga detail page for mobile. Left side shows large cover image, right side shows: title, author names, view count and like count stats, and update date. Below that is a red "❤ 收藏" favorite button. Then tag chips section. Then a list of episode/chapter rows showing "第X话 title" with page count. Dark background #0f0f23, cards #1a1a2e, accent #e94560.',
      deviceType: 'MOBILE',
    },
    {
      name: '漫画阅读器',
      prompt: 'A full screen dark manga reader for iOS mobile. Black background. A manga page image displayed fitting the screen width. Top overlay bar: back arrow "← 返回" on left, page number "1/32" on right. Bottom overlay has a thin progress indicator. Clean minimal design, no distractions. Tapping the center toggles the overlay UI on and off.',
      deviceType: 'MOBILE',
    },
    {
      name: '收藏页',
      prompt: 'A dark themed favorites page for a mobile comic app. Header text "我的收藏 (5)". List of saved manga items as horizontal rows: small cover thumbnail (60x80), title text, author name, and a small "删除" remove button. Empty state shows "还没有收藏" message. Dark background #0f0f23, cards #1a1a2e, red accent #e94560.',
      deviceType: 'MOBILE',
    },
    {
      name: '设置页',
      prompt: 'A dark themed settings page for a mobile iOS app. Large "设置" header. Section "阅读设置" with red uppercase label. Reading mode toggle between "滚动" and "翻页". Reading direction toggle between "从左到右" and "从右到左". Section "显示" with dark mode toggle switch. Section "关于" showing app name JMComic iOS, version 1.0.0, data source 18comic.vip. Small disclaimer text at bottom. Dark theme #0f0f23, #1a1a2e cards, #e94560 accent.',
      deviceType: 'MOBILE',
    },
  ];

  for (const screen of screens) {
    console.log(`🎨 生成页面: ${screen.name}...`);
    try {
      const result = await proj.generate(screen.prompt, screen.deviceType);
      const htmlUrl = await result.getHtml();
      const imageUrl = await result.getImage();
      console.log(`   ✅ HTML: ${htmlUrl}`);
      console.log(`   🖼️  截图: ${imageUrl}\n`);
    } catch (err) {
      console.error(`   ❌ 失败:`, err.message, '\n');
    }
  }

  console.log('✨ 所有 UI 设计生成完成！');
}

main().catch(err => {
  console.error('💥 脚本错误:', err);
  process.exit(1);
});
