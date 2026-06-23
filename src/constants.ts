// 禁漫天堂 API 常量
// @author Jason

// API 域名列表（按优先级排列）
export const API_DOMAINS = [
  '18comic.vip',
  'jmcomic.me',
  '18comic.org',
  'jmcomic1.com',
];

// 图片 CDN 域名
export const IMAGE_DOMAINS = [
  'cdn-msp.18comic.vip',
  'cdn-msp2.18comic.vip',
  'cdn-msp3.18comic.vip',
];

// APP 接口加密常量
export const APP_TOKEN_SECRET = '18comicAPP';
export const APP_TOKEN_SECRET_2 = '18comicAPPContent';
export const APP_DATA_SECRET = '185Hcomic3PAPP7R';
export const APP_VERSION = '2.0.13';

// API 路径
export const API_PATHS = {
  SEARCH: '/search',
  ALBUM: '/album',
  CHAPTER: '/chapter',
  SCRAMBLE: '/chapter_view_template',
  FAVORITE: '/favorite',
  WEEKLY_INFO: '/week',
  WEEKLY: '/week/filter',
  LOGIN: '/login',
} as const;

// 分类常量
export const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'doujin', label: '同人' },
  { id: 'single', label: '单行本' },
  { id: 'cg', label: 'CG' },
  { id: 'comic', label: '漫画' },
  { id: 'hanman', label: '韩漫' },
  { id: 'meiman', label: '美漫' },
] as const;

// 排序方式
export const SORT_OPTIONS = [
  { id: 'mv', label: '最多观看' },
  { id: 'mv_m', label: '本月热门' },
  { id: 'mv_w', label: '本周热门' },
  { id: 'mv_t', label: '今日热门' },
  { id: 'mp', label: '最多点赞' },
  { id: 'tf', label: '新发布' },
  { id: 'ts', label: '最新更新' },
] as const;

// 时间范围
export const TIME_RANGES = [
  { id: 'a', label: '全部' },
  { id: 't', label: '今日' },
  { id: 'w', label: '本周' },
  { id: 'm', label: '本月' },
] as const;
