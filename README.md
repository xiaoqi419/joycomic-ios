<div align="center">
  <img src="website/public/logo.svg" width="96" height="96" alt="JOYComic Logo"/>
  <h1 align="center">JOYComic</h1>
  <p align="center">聚合 JMComic + Pica 双源漫画阅读器 — React Native (Expo SDK 54)</p>
  <p align="center">
    <a href="https://joycomic.ojason.top">官网</a> ·
    <a href="https://github.com/xiaoqi419/joycomic-ios/releases">下载 IPA</a>
  </p>
  <p align="center">
    <a href="https://linux.do/">学AI，上L站</a>
  </p>
</div>

---

JOYComic 是一个基于 React Native (Expo SDK 54) + TypeScript 的 iOS 漫画阅读 App，聚合 JMComic（禁漫天堂）和 Pica（哔咔漫画）双源，提供统一的搜索、阅读、收藏、下载体验。

## 功能总览

### 📚 双源聚合
- **JMComic** — 分类浏览、搜索、周榜、热门标签、小说
- **Pica** — 分类浏览、搜索、创作者筛选、点赞/收藏、评论回复
- **双源同时搜索** — 一次输入，两个源并行展示结果
- **布尔搜索** — `+` 包含 / `-` 排除 / `"` 精确匹配

### 🎨 阅读体验
- **竖滑模式** — 连续滚动，自适应图片高度
- **分页模式** — 左右翻页，仿真书感
- **布局切换** — 竖滑 / 分页一键切换
- **阅读进度** — 自动记录阅读位置，继续阅读跳转
- **自动翻页** — 可配置 1-20 秒间隔
- **图片解扰** — Canvas WebView 解密 JMComic 加密图片
- **预加载** — 提前加载相邻页面
- **亮度调节** — 系统亮度实时控制

### 🔍 搜索系统
- **双源并行搜索** — JM + Pica 同时搜索，合并结果
- **分类筛选** — BottomSheet 按源/分类过滤
- **排序** — 最多点击 / 最新发布 / 最多喜欢
- **搜索历史** — 本地持久化，点击重新搜索
- **热搜标签** — 热门搜索词推荐
- **以图搜图** — SauceNAO API 图片搜索 + soutubot WebView 入口

### 📥 下载管理
- **当前话下载** — 下载正在阅读的章节
- **全部话下载** — 一键下载整本漫画所有章节
- **下载位置** — 图库 / 应用文件夹可选
- **下载管理** — 进度追踪、暂停/恢复、删除、PDF 导出
- **下载队列** — 并发控制（同时最多 2 个下载）

### ❤️ 收藏系统
- **本地收藏** — 无需登录即可收藏，离线可用
- **云端收藏** — 登录后同步 JMComic/Pica 在线收藏
- **收藏模式** — 本地 / 云端 可切换
- **文件夹管理** — 创建/重命名/删除文件夹
- **合并显示** — 云端 + 本地去重，显示来源标签（云端/本地）
- **Pica 点赞** — 支持点赞/取消点赞

### 💬 评论系统
- **JMComic 评论** — 查看/发送，无限滚动加载
- **Pica 评论** — 查看/发送/回复/点赞
- **去重加载** — 防止重复评论无限循环

### 🎬 影视模块
- **视频分类** — 成人小电影 / H动漫 / Cos 片
- **搜索视频** — 搜索视频资源
- **播放器** — 原生视频播放 + WebView 回退

### ⚙️ 设置与个性化
- **阅读模式** — 竖滑 / 分页
- **主题** — 自动 / 浅色 / 深色（Material 3 珊瑚橙配色）
- **图片布局** — 适应 / 适应宽度 / 适应高度
- **屏幕方向** — 自动 / 横屏 / 竖屏
- **预加载页数** — 自定义预加载量
- **源/线路** — 一页测速切换（快速通道优先）
- **自定义 CDN** — 自建配置加速（fetchSetting 双源取最新）
- **动画系统** — Moti 驱动的入场/列表/交互动画
- **国际化** — 中文 / 英文

### 📊 日志系统
- **全局日志** — 7 级分级（trace~fatal）
- **API 自动埋点** — 每个请求自动记录成功/失败
- **全局错误捕获** — JS 异常 + Promise rejection + 渲染崩溃
- **日志查看** — 分级筛选、完整 JSON 复制、一键导出分享

### 🚀 性能优化
- **FlashList** — 高性能列表替代 FlatList
- **React.memo + useCallback** — 图片项函数组件化
- **预渲染控制** — windowSize + maxToRenderPerBatch
- **图片缓存** — 7 天磁盘缓存 + 内存缓存

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React Native 0.81, Expo SDK 54 |
| 语言 | TypeScript |
| 导航 | React Navigation (Native Stack + Bottom Tabs) |
| 状态管理 | Zustand (7 个 Store) |
| 动画 | Moti (Reanimated 4) + React Native Animated |
| 列表 | @shopify/flash-list |
| 图片 | expo-image + 自定义 WebView Canvas 解扰 |
| 存储 | AsyncStorage + expo-sqlite |
| 国际化 | react-i18next (zh/en) |
| 手势 | react-native-gesture-handler v2 |
| API 加密 | MD5 Token (JM) + HMAC-SHA256 签名 (Pica) |
| 日志 | 自定义 HaKaLogger（文件持久化 + 7 级分级） |

## 项目结构

```
joycomic-ios/
├── App.tsx                       # 主入口 + 导航栈 + 全局错误捕获
├── src/
│   ├── api/                      # JMComic API 层（AES 加解密 + HTTP 客户端）
│   │   ├── client.ts             #   自动重试 + 域名切换 + AVS 认证
│   │   ├── crypto.ts             #   加密工具（MD5 Token + AES 解密）
│   │   ├── endpoints.ts          #   ~40 个 JM API 函数
│   │   └── types.ts              #   JM API 类型定义
│   ├── pica/                     # Pica API 层（HMAC 签名 + HTTP 客户端）
│   │   ├── client.ts             #   Pica HTTP 客户端 + 签名
│   │   ├── crypto.ts             #   HMAC-SHA256 签名
│   │   ├── endpoints.ts          #   ~20 个 Pica API 函数
│   │   └── types.ts              #   Pica API 类型定义
│   ├── sources/                  # 双层抽象 — 统一 ComicSource 接口
│   │   ├── pica.ts               #   Pica 源实现
│   │   └── types.ts              #   SourceDetail / SourceChapter 等
│   ├── store/                    # Zustand 状态管理（7 个 Store）
│   ├── screens/                  # 所有页面（~25 个）
│   ├── components/               # 可复用组件（~20 个）
│   ├── utils/                    # 工具函数（~15 个）
│   ├── theme/                    # Material 3 主题系统
│   └── i18n/                     # 国际化（zh/en）
├── clone/                        # 第三方源码参考
├── apk_analysis/                 # APK 逆向分析资源
└── website/                      # 官网（Vite + React 19 + HeroUI）
```

## 快速开始

```bash
npm install                # 安装依赖
npx expo start             # 开发（Expo Go 扫码）
npx expo start --web       # Web 预览
npx eas build --platform ios --profile production  # 打包 IPA
```

## API 说明

### JMComic（AES 加密）
- **Token**: `MD5("{timestamp}18comicAPP")`
- **TokenParam**: `"{timestamp},2.0.13"`
- **基础路径**: `/api/` 前缀，拼接在 CDN 域名后

### Pica（HMAC 签名）
- **签名**: `HMAC-SHA256(time + apiKey + nonce + query)`
- **代理**: 默认 go2778，可切直连 picacomic
- **源选择**: 快速通道 / 线路 1-4

## 免责声明

本应用为第三方客户端，仅供学习交流使用。所有内容版权归原作者及对应平台。请支持正版。
