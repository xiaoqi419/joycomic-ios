// 禁漫天堂 API 响应类型定义
// @author Jason

// API 通用响应包装
export interface JmApiResponse {
  code: number;
  data: string; // base64 加密后的 JSON
  errorMsg?: string;
}

// ===== 搜索相关 =====

export interface SearchResult {
  id: string;
  name: string;
  coverUrl: string;
  tags: string[];
  category?: string;
}

export interface SearchResponse {
  content: SearchResult[];
  total: number;
  page: number;
  pageCount: number;
}

// 搜索重定向（单结果直接跳到详情）
export interface RedirectResponse {
  search_query: string;
  total: number;
  redirect_aid: string;
  content: [];
}

// ===== 漫画详情 =====

export interface AlbumDetail {
  id: string;
  title: string;
  author: string[];
  tags: string[];
  actors: string[];
  works: string[];
  coverUrl: string;
  description: string;
  views: number;
  likes: number;
  commentCount: number;
  publishDate: string;
  updateDate: string;
  episodes: Episode[];
  pageCount: number;
  scrambleId: number;
}

export interface Episode {
  id: string;
  albumId: string;
  title: string;
  index: number;
  pageCount: number;
  sort: number;
}

// ===== 章节详情 =====

export interface ChapterDetail {
  id: string;
  albumId: string;
  title: string;
  pageArr: number[][];
  dataOriginalDomain: string;
  scrambleId: number;
  seriesId: number;
  sort: number;
  tags: string[];
  pageCount: number;
  /** 图片 URL 列表 */
  images?: string[];
}

export interface PageImage {
  index: number;
  url: string;
  width: number;
  height: number;
}

// ===== 收藏夹 =====

export interface FavoriteItem {
  id: string;
  name: string;
  coverUrl: string;
}

export interface FavoriteResponse {
  content: FavoriteItem[];
  total: number;
  folders: FavoriteFolder[];
}

export interface FavoriteFolder {
  id: string;
  name: string;
}

// ===== 排行榜 =====

export interface WeeklyInfo {
  // 每周必看信息
}

// ===== 用户 =====

export interface UserProfile {
  username: string;
  photo: string;
  // 其他用户信息
}

// ===== 图片解密 =====

export interface ScrambleResponse {
  scrambleId: number;
}
