# JMComic iOS — 禁漫天堂第三方客户端

基于 **React Native (Expo)** + **TypeScript** 的禁漫天堂 iOS 第三方客户端。
支持分类浏览、搜索、漫画阅读、收藏、设置等功能。

## 快速开始

```bash
# 安装依赖
npm install

# 启动本地开发（Expo Go 扫码预览）
npx expo start

# 云端编译 IPA
npx eas build --platform ios --profile production
```

## Stitch AI UI 集成

本 App 支持 **@google/stitch-sdk** 进行 AI 驱动的 UI 设计生成。

### 工作流程

```
① 跑 Stitch 生成 UI 设计  →  ② 获取 HTML + 截图  →  ③ 截图作为参考复现原生 UI
```

### 生成 UI 设计

```bash
# 需要在一台能访问 Google API 的机器上运行
STITCH_API_KEY="你的key" node stitch-runner.mjs
```

生成内容包括 6 个页面：

| 页面 | 描述 |
|------|------|
| 首页-分类浏览 | 分类标签 + 排序 + 双列网格 |
| 搜索页面 | 搜索框 + 快捷标签 + 结果列表 |
| 漫画详情页 | 封面 + 信息 + 章节列表 |
| 漫画阅读器 | 全屏暗色阅读器 |
| 收藏页面 | 收藏列表 + 空状态 |
| 设置页面 | 阅读模式 + 显示 + 关于 |

### Stitch HTML 预览

生成的 HTML 可通过 `StitchScreen` 组件在 App 内用 WebView 实时预览：

```tsx
import { StitchScreen } from '../components/StitchScreen';

// 在设置中开启 Stitch 预览模式后
// Native 页面会自动替换为 Stitch 生成的 WebView 版本
```

## 项目结构

```
jmcomic-ios/
├── App.tsx                     # 主入口（导航）
├── stitch-runner.mjs           # Stitch UI 生成脚本
├── src/
│   ├── api/                    # API 层（加解密、HTTP 客户端）
│   │   ├── crypto.ts           # AES-256-ECB 解密
│   │   ├── client.ts           # HTTP 客户端
│   │   ├── mobile.ts           # 移动端 API 封装
│   │   └── types.ts            # 类型定义
│   ├── components/
│   │   ├── ComicCard.tsx        # 漫画卡片
│   │   └── StitchScreen.tsx     # Stitch HTML WebView
│   ├── screens/                # 页面
│   │   ├── HomeScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── AlbumDetailScreen.tsx
│   │   ├── ReaderScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   └── SettingsScreen.tsx
│   └── store/                  # 状态管理
│       ├── useSettings.ts
│       ├── useFavorites.ts
│       └── useReader.ts
├── eas.json                    # EAS Build 配置
└── package.json
```

## API 加密说明

禁漫天堂移动端 API 使用 AES-256-ECB 加密，详情：

- **Token**: `MD5("{timestamp}18comicAPP")` → header `token`
- **TokenParam**: `"{timestamp},2.0.13"` → header `tokenparam`
- **响应解密**: `AES-256-ECB(PKCS7, key=MD5("{ts}185Hcomic3PAPP7R"))`

## 自签部署

1. `npx eas build --platform ios --profile production`
2. 下载 `.ipa` 文件
3. 使用 AltStore / SideStore / Sideloadly 自签安装
4. 仅限个人使用

## 免责声明

本应用为第三方客户端，仅供学习交流使用。
所有内容版权归原作者及禁漫天堂所有。
