// Stitch UI 设计生成器 v2 - 全新设计系统
// 参照 ui-ux-pro-max 设计规范：
//   Primary: #2563EB (蓝)  Accent: #F97316 (橙)
//   Bg: #F8FAFC   Card: #FFFFFF   Text: #1E293B
//   Font: Noto Sans JP (日系漫画风)
// @author Jason

import { stitch } from '@google/stitch-sdk';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const API_KEY = 'AQ.Ab8RN6Io8QhdZQy5ROaOoXkSLyXPWwnSEqbTNX82uSg_I7wdZQ';
const PROXY_URL = 'http://127.0.0.1:7897';
const OUTPUT_DIR = 'stitch-output-v2';

if (PROXY_URL) {
  setGlobalDispatcher(new ProxyAgent(PROXY_URL));
}
process.env.STITCH_API_KEY = API_KEY;

const DESIGN_SYSTEM = `
设计规范（必须严格遵守）：
- 整体风格：Flat Design，干净清爽，NOT dark，NOT black
- 配色：主色 #2563EB（蓝色） 辅色 #3B82F6 强调色 #F97316（橙色）
- 背景：#F8FAFC 卡片：#FFFFFF 文字：#1E293B 次要文字：#64748B
- 字体风格：Noto Sans JP，有日系漫画感
- 圆角：iOS风格 12-16px
- 间距：iOS标准 16px
- 不要 emoji 作为图标，用简洁的线条图标
- 看起来像正规的高质量漫画App（如 哔咔漫画、Tachiyomi），不是成人网站
- iOS原生风格，标签栏在底部
`;

async function main() {
  console.log('🎨 JMComic iOS - Stitch UI v2（蓝橙日系风）\n');
  console.log('🔌 使用代理:', PROXY_URL);

  // 创建新项目
  console.log('\n📁 创建新项目...');
  const result = await stitch.callTool('create_project', {
    title: 'JMComic iOS v2 - 蓝橙日系设计',
  });
  const resultText = result.content?.[0]?.text || JSON.stringify(result);
  const projectId = resultText.match(/"projects\/(\d+)"/)?.[1];
  if (!projectId) {
    console.error('❌ 无法获取项目ID:', resultText);
    process.exit(1);
  }
  console.log(`📌 项目 ID: ${projectId}\n`);
  const project = stitch.project(projectId);

  const pages = [
    {
      name: '首页-分类浏览',
      prompt: `${DESIGN_SYSTEM}
为禁漫天堂漫画App设计【首页-分类浏览】页面，iOS 移动端。

顶部分类标签（横向滚动）：全部、同人、单行本、CG、漫画、韩漫、美漫
  - 未选中：白底灰字圆角胶囊
  - 选中：#2563EB 蓝底白字

排序标签（横向滚动）：最多观看、本月热门、本周热门、今日热门、最新发布
  - 设计同分类标签

内容区：双列网格展示漫画封面。
  - 每张卡片：白色圆角(12px)卡片，带轻微阴影
  - 封面图占卡片大部分区域
  - 卡片底部：漫画标题（粗体 #1E293B 14px）+ 标签（灰色 #64748B 11px）
  - 两列之间有 12px 间距

底部 Tab 栏（4个）：首页、搜索、收藏、设置
  - 选中态：蓝色 #2563EB
  - 未选中：灰色 #94A3B8
  - 不要 emoji 图标，用简洁线条图标

背景色：#F8FAFC，整体干净明亮。`,
    },
    {
      name: '搜索页面',
      prompt: `${DESIGN_SYSTEM}
为禁漫天堂漫画App设计【搜索页面】，iOS 移动端。

顶部搜索栏：
  - 圆角搜索框（背景白色，有轻微阴影）
  - 占位文字："搜索漫画、作者、标签..."
  - 右侧：#F97316（橙色）搜索按钮
  - 搜索框下方：取消按钮（蓝色）

快捷搜索标签区：
  - 文案："热门搜索"
  - 标签云：全彩、无修正、同人、CG、韩漫、纯爱、NTR、姐系、母系、后宫
  - 白底灰字圆角标签，点击变蓝色边框

搜索结果：
  - 双列网格，同首页卡片风格
  - 每张卡片白色圆角，带封面+标题

空状态：
  - 中间显示插画风格的搜索图标
  - "搜索你感兴趣的漫画"
  - 灰色小字提示

背景：#F8FAFC，白色卡片，#1E293B 文字。`,
    },
    {
      name: '漫画详情页',
      prompt: `${DESIGN_SYSTEM}
为禁漫天堂漫画App设计【漫画详情页】，iOS 移动端。

顶部区域：
  - 左侧：封面大图（约140宽，白边圆角12px，轻微阴影）
  - 右侧信息区：标题（18px #1E293B 粗体）、作者（14px #64748B）、
    观看数（带眼睛图标）、点赞数（带心图标）、更新日期
  - 所有统计数字用 #64748B 灰色

操作按钮区（横向排列）：
  - "❤ 收藏" 按钮：橙色实心 #F97316，白色文字，圆角20px
  - "⬇ 下载" 按钮：白色边框，灰色文字

标签区：
  - 标题："标签"
  - 圆角标签：白底灰字，蓝色边框

章节列表：
  - 每行：章节序号+标题（#1E293B）← 页码（#64748B）→ 箭头 >
  - 白色卡片式行，底部分割线

评论区：
  - 显示最新几条评论
  - 头像+用户名+评论内容+时间

背景：#F8FAFC，整体明亮干净。`,
    },
    {
      name: '漫画阅读器',
      prompt: `${DESIGN_SYSTEM}
为禁漫天堂漫画App设计【漫画阅读器页面】，iOS 移动端。

注意：这是阅读漫画的核心页面，但保持 App 的整体明亮风格。

阅读模式切换（顶部）：
  - 分段控件：滚动 | 双页 | 单页
  - 选中态：蓝色 #2563EB

阅读器主体：
  - 背景：浅灰色 #F1F5F9（不是纯黑）
  - 漫画页面图片居中显示，宽度适配屏幕
  - 图片之间有 2px 间距

顶部操作栏（点击图片区域切换显隐）：
  - 左侧："← 返回" 蓝色文字
  - 中间：章节标题
  - 右侧：更多（···）图标

底部进度栏（点击切换显隐）：
  - 页码显示："第 12/32 页"
  - 细进度条，蓝色 #2563EB
  - 阅读方向设置：← → 箭头

整体保持干净阅读体验，不干扰图片内容。`,
    },
    {
      name: '收藏页面',
      prompt: `${DESIGN_SYSTEM}
为禁漫天堂漫画App设计【收藏页面】，iOS 移动端。

头部：
  - 标题："我的收藏"（#1E293B 20px 粗体）
  - 右侧：总数显示 "共 12 本"

筛选标签（横向滚动）：
  - 全部、最近、已下载、进行中
  - 灰色圆角胶囊，选中蓝色

收藏列表：
  - 每行是一个白色卡片
  - 左侧：小封面图（60×80，圆角8px）
  - 中间：漫画标题（15px #1E293B）+ 作者（12px #64748B）
  - 右侧：蓝色"继续阅读"按钮 或 橙色"已收藏"标记
  - 卡片之间有 8px 间距

空状态：
  - 中间显示书本图标
  - "还没有收藏"
  - 灰色小字："在漫画详情页点击收藏按钮即可添加"

背景：#F8FAFC。`,
    },
    {
      name: '设置页面',
      prompt: `${DESIGN_SYSTEM}
为禁漫天堂漫画App设计【设置页面】，iOS 移动端。

页面标题："设置"（#1E293B 22px 粗体）

分区一「阅读设置」：
  - 分区标题：蓝色 #2563EB 小字大写
  - 阅读模式：分段控件（滚动 | 翻页）
  - 阅读方向：分段控件（从左到右 | 从右到左）
  - 图片质量：选择器（标准 | 高清 | 原画）
  - 每行之间白色分割线

分区二「下载与缓存」：
  - 下载路径：白色输入框
  - 清除缓存：灰色按钮 + 显示缓存大小
  - 自动下载：开关

分区三「关于」：
  - App名称：JMComic
  - 版本：1.0.0
  - 数据来源：18comic.vip
  - 底部免责声明：小字灰色

整体风格：#F8FAFC 背景，白色卡片区，蓝色 #2563EB 强调，灰色 #64748B 次要文字。`,
    },
  ];

  // 逐个生成
  for (const page of pages) {
    console.log(`🎨 生成: ${page.name}...`);
    const startTime = Date.now();
    try {
      const screen = await project.generate(page.prompt, 'MOBILE');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const [htmlUrl, imageUrl] = await Promise.all([
        screen.getHtml(),
        screen.getImage(),
      ]);
      console.log(`   ✅ 完成 (${elapsed}s)`);
      console.log(`   📄 HTML: ${htmlUrl}`);
      console.log(`   🖼️  截图: ${imageUrl}\n`);
    } catch (err) {
      console.error(`   ❌ 失败 (${((Date.now() - startTime) / 1000).toFixed(1)}s):`, err.message, '\n');
    }
  }

  console.log('='.repeat(60));
  console.log('✨ v2 设计生成完成！');
  console.log(`📌 项目 ID: ${projectId}`);
}

main().catch(err => {
  console.error('💥 错误:', err);
  process.exit(1);
});
