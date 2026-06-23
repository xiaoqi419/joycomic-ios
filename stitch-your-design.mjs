# Stitch UI 生成器 - 你只需要跑这一条命令
# 用法: STITCH_API_KEY="你的key" node stitch-your-design.mjs
# 跑完后把输出的 项目ID 告诉我就行，我来转 React Native

import { stitch } from '@google/stitch-sdk';

const API_KEY = process.env.STITCH_API_KEY;
if (!API_KEY) { console.error('请设置 STITCH_API_KEY'); process.exit(1); }

process.env.STITCH_API_KEY = API_KEY;

// ═══════════════════════════════════════════════
//  在这里修改你的设计偏好
// ═══════════════════════════════════════════════
const BRAND = {
  name: 'JMComic',
  primary: '#2563EB',   // 主色（蓝）
  accent: '#F97316',    // 强调色（橙）
  bg: '#F8FAFC',        // 背景色
  surface: '#FFFFFF',   // 卡片色
  text: '#1E293B',      // 文字色
  style: '干净、现代、iOS原生风格，不是暗黑系',
};

const COLOR_PROMPT = `
配色：
- 主色: ${BRAND.primary}
- 强调色: ${BRAND.accent}
- 背景: ${BRAND.bg}
- 卡片/表面: ${BRAND.surface}
- 文字: ${BRAND.text}
- 整体风格: ${BRAND.style}
`;

// 每个页面的提示词
const PAGES = [
  {
    name: '首页',
    prompt: `为漫画App设计一个iOS首页，${COLOR_PROMPT}

布局：
1. 顶部标题栏：App名称"JMComic"
2. 分类标签（横向滚动）：全部、同人、单行本、CG、漫画、韩漫、美漫
   - 选中态：蓝色${BRAND.primary}底白字圆角胶囊
   - 未选中：白底灰字描边
3. 排序标签（横向滚动）：最多观看、本月热门、本周热门、今日热门
4. 主内容：两列网格漫画卡片，白色圆角卡片带轻微阴影
   每张卡片=封面图+标题+标签
5. 底部Tab栏4个：首页、搜索、收藏、设置
6. 不要emoji图标，用简洁线条图标`,
  },
  {
    name: '搜索页',
    prompt: `为漫画App设计iOS搜索页，${COLOR_PROMPT}

布局：
1. 顶部圆角搜索框，白色背景，占位文字"搜索漫画、作者、标签..."
   右侧橙色${BRAND.accent}搜索按钮
2. "热门搜索"标签区：全彩、无修正、同人、CG、韩漫、纯爱、NTR
   白底描边圆角标签
3. 搜索结果双列网格（同首页卡片风格）
4. 空状态：居中书本图标 + "搜索你感兴趣的漫画"
5. 干净清爽，iOS风格`,
  },
  {
    name: '漫画详情',
    prompt: `为漫画App设计iOS漫画详情页，${COLOR_PROMPT}

布局：
1. 头部白卡片：左侧封面图(圆角)、右侧标题+作者+观看数+点赞数+更新日期
2. 收藏按钮：橙色${BRAND.accent}底白色字"❤ 收藏"，圆角
3. 标签区：蓝色描边圆角标签
4. 章节列表：白色卡片行 = 章节名 + 页码 + 箭头
5. 干净信息型页面，蓝色${BRAND.primary}点缀`,
  },
  {
    name: '阅读器',
    prompt: `为漫画App设计iOS阅读器，阅读背景浅灰#F1F5F9

布局：
1. 顶部半透明白色栏：← 返回（蓝色）+ 居中章节名 + ···更多
2. 中间漫画图片居中显示，宽度适配
3. 底部蓝色进度条
4. 点击区域切换顶底栏显隐
5. 清爽阅读体验，不干扰图片`,
  },
  {
    name: '收藏页',
    prompt: `为漫画App设计iOS收藏页，${COLOR_PROMPT}

布局：
1. 标题"我的收藏" + 数量
2. 收藏列表：白色卡片行 = 小封面(60x80圆角) + 标题 + 作者 + "继续阅读"按钮
3. 空状态：📚图标 + "还没有收藏"
4. 白底蓝灰文字`,
  },
  {
    name: '设置页',
    prompt: `为漫画App设计iOS设置页，${COLOR_PROMPT}

布局：
1. 大标题"设置"
2. 分区（蓝色大写标签）：
   - 阅读设置：阅读模式(滚动|翻页)分段控件、阅读方向(从左到右|从右到左)分段控件
   - 关于：应用名、版本号1.0.0、数据来源18comic.vip
3. 底部灰色免责声明
4. 白底蓝灰文字`,
  },
];

async function main() {
  console.log('🎨 JMComic iOS - Stitch UI 生成器\n');
  console.log(`主色: ${BRAND.primary}  强调色: ${BRAND.accent}\n`);

  // 创建项目
  console.log('📁 创建项目中...');
  const result = await stitch.callTool('create_project', {
    title: `JMComic iOS - ${BRAND.primary}/${BRAND.accent}`,
  });
  const text = result.content?.[0]?.text || JSON.stringify(result);
  const projectId = text.match(/"projects\/(\d+)"/)?.[1];
  if (!projectId) { console.error('取项目ID失败:', text); process.exit(1); }

  console.log(`\n✅ 项目ID: ${projectId}\n`);
  console.log('═'.repeat(50));
  console.log('📌 重要：把这个项目ID发给我！');
  console.log('═'.repeat(50));
  console.log('');

  const project = stitch.project(projectId);

  for (const page of PAGES) {
    console.log(`🎨 生成: ${page.name}...`);
    const t0 = Date.now();
    try {
      const screen = await project.generate(page.prompt, 'MOBILE');
      const sec = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`   ✅ ${sec}s - screenId: ${screen.screenId || 'ok'}`);
    } catch (err) {
      console.error(`   ❌ ${err.message}`);
    }
  }

  console.log(`\n✨ 全部生成完毕！`);
  console.log(`📌 请把项目ID发给我: ${projectId}`);
}

main().catch(console.error);
