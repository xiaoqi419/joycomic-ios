// Stitch UI 设计生成器（带代理支持）
// @author Jason
// 用法: node stitch-runner.mjs

import { stitch } from '@google/stitch-sdk';

// === 配置区 ===
const API_KEY = 'AQ.Ab8RN6Io8QhdZQy5ROaOoXkSLyXPWwnSEqbTNX82uSg_I7wdZQ';
const PROXY_URL = 'http://127.0.0.1:7897'; // 本机代理
// ============

// Node.js < 20 用 undici 设置全局代理
import { setGlobalDispatcher, ProxyAgent } from 'undici';
if (PROXY_URL) {
  const proxyAgent = new ProxyAgent(PROXY_URL);
  setGlobalDispatcher(proxyAgent);
  console.log(`🔌 使用代理: ${PROXY_URL}\n`);
}

process.env.STITCH_API_KEY = API_KEY;

async function main() {
  console.log('🚀 Stitch UI 设计生成器 - 禁漫天堂 iOS 客户端\n');

  // 1. 查看可用工具
  console.log('📋 检查 Stitch 连接...');
  const { tools } = await stitch.listTools();
  console.log(`✅ 已连接！可用工具: ${tools.map(t => t.name).join(', ')}\n`);

  // 2. 创建项目
  console.log('📁 创建项目...');
  const result = await stitch.callTool('create_project', {
    title: 'JMComic iOS - 禁漫天堂第三方客户端',
  });

  const resultText = result.content?.[0]?.text || JSON.stringify(result);
  console.log('创建结果:', resultText.slice(0, 300));

  // 提取 projectId - 格式: "name":"projects/6044425693006422396"
  const projectId = resultText.match(/"projects\/(\d+)"/)?.[1]
    || resultText.match(/"projectId"\s*:\s*"(\d+)"/)?.[1]
    || resultText.match(/projectId["']?\s*[:=]\s*["']?(\d+)/)?.[1];

  if (!projectId) {
    console.error('❌ 无法获取项目 ID');
    console.error('完整返回:', resultText);
    process.exit(1);
  }

  console.log(`📌 项目 ID: ${projectId}\n`);
  const project = stitch.project(projectId);

  // 3. 生成各页面
  const pages = [
    {
      name: '首页-分类浏览',
      prompt: `设计一个暗色风格的漫画浏览 App 首页。顶部状态栏显示"禁漫天堂"标题。分类标签横向滚动：全部、同人、单行本、CG、漫画、韩漫、美漫（圆角胶囊样式，选中态红色#e94560）。排序选项：最多观看、本月热门、本周热门、今日热门（横向滚动）。内容区域：两列网格展示漫画封面，每张卡片带渐变遮罩 + 标题 + 标签。背景色#0f0f23，卡片色#1a1a2e，强调色#e94560。下方 Tab 栏：首页、搜索、收藏、设置。iOS 风格。`,
    },
    {
      name: '搜索页面',
      prompt: `暗色漫画搜索页。顶部：圆角搜索框，占位文字"搜索漫画、作者、标签..."，右侧红色搜索按钮。快捷搜索标签区：全彩、无修正、同人、CG、韩漫、纯爱、NTR（圆角标签）。搜索结果以两列网格展示漫画封面+标题。空状态显示"搜索你喜欢的漫画"。暗色主题 #0f0f23 / #1a1a2e / #e94560。iOS 风格。`,
    },
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

  const results = [];

  for (const page of pages) {
    console.log(`🎨 正在生成: ${page.name}...`);
    try {
      const screen = await project.generate(page.prompt, 'MOBILE');
      const [htmlUrl, imageUrl] = await Promise.all([
        screen.getHtml(),
        screen.getImage(),
      ]);
      results.push({ name: page.name, screenId: screen.screenId, htmlUrl, imageUrl });
      console.log(`   ✅ 页面: ${page.name}`);
      console.log(`   📄 HTML: ${htmlUrl}`);
      console.log(`   🖼️  截图: ${imageUrl}\n`);
    } catch (err) {
      console.error(`   ❌ ${page.name} 失败:`, err.message, '\n');
    }
  }

  // 总结
  console.log('='.repeat(60));
  console.log('✨ 所有页面生成完成！\n');
  console.log(`📌 项目 ID: ${projectId}\n`);
  for (const r of results) {
    console.log(`${r.name}:`);
    console.log(`  截图: ${r.imageUrl}`);
  }
}

main().catch(err => {
  console.error('💥 脚本错误:', err);
  process.exit(1);
});
