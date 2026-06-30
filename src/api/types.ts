// JMComic API 类型定义（从 APK 源码完整提取）
// @author nyx

// ===== 通用 =====
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  dateYmdHis?: string;
}

// ===== 设置 =====
export interface SettingData {
  logo_path: string;
  main_web_host: string;
  img_host: string;
  base_url: string;
  is_cn: number;
  cn_base_url: string;
  version: string;
  test_version: string;
  store_link: string;
  ios_version: string;
  ios_test_version: string;
  ios_store_link: string;
  ad_cache_version: number;
  bundle_url: string;
  is_hot_update: boolean;
  api_banner_path: string;
  version_info: string;
  app_shunts: Array<{ key: number; title: string }>;
  download_url: string;
  app_landing_page: string;
  float_ad: boolean;
  newYearEvent: boolean;
  foolsDayEvent: boolean;
  dateYmdHis: string;
}

// ===== 首页推荐 =====
export interface PromoteItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  filter_val: string;
  content: ComicItem[];
}

export interface ComicItem {
  id: string;
  name: string;
  author: string;
  image: string;
  category: { id: string | null; title: string | null };
  category_sub: { id: string | null; title: string | null };
  update_at: number;
  liked: boolean;
  is_favorite: boolean;
  description?: string;
}

// ===== 最新更新 =====
export interface LatestItem {
  id: string;
  name: string;
  author: string;
  image: string;
  description: string;
  category: { id: string; title: string };
  category_sub: { id: string | null; title: string | null };
  liked: boolean;
  is_favorite: boolean;
  update_at: number;
}

// ===== 搜索 =====
export interface SearchResult {
  id: string;
  name: string;
  author: string;
  image: string;
  description: string | null;
  category: { id: string; title: string };
  category_sub: { id: string | null; title: string | null } | null;
  liked: boolean;
  is_favorite: boolean;
  update_at: number;
}

export interface SearchData {
  search_query: string;
  total: string;
  content: SearchResult[];
  redirect_aid?: string;
}

// ===== 分类列表 =====
export interface MoreListData {
  total: string | number;
  list?: ComicItem[];
  content?: ComicItem[];
  search_query?: string;
  tags?: string[];
}

// ===== 漫画详情 =====
export interface AlbumDetail {
  id: string;
  name: string;
  author: string[];
  tags: string[];
  actors: string[];
  works: string[];
  image: string;
  images?: string[];
  description: string;
  total_views: string | number;
  likes: string | number;
  comment_total: string | number;
  addtime: string;
  update_at?: string;
  purchased?: string;
  bought?: boolean;
  liked?: boolean;
  is_favorite?: boolean;
  related_list?: ComicItem[];
  price?: string;
  series: Episode[];
  series_id?: number;
  page_count?: number;
  scramble_id?: number;
  real_link?: string;
}

export interface Episode {
  id: string;
  name: string;
  sort: string;
  page_count?: number;
}

// ===== 章节阅读 =====
export interface ComicReadData {
  id: string;
  album_id: string;
  name: string;
  /** API 返回 [{page, image}, ...] */
  images: { page: number; image: string }[];
  total_page?: number;
  page_arr: number[][];
  data_original_domain: string;
  scramble_id: number;
  series_id: number;
  sort: number;
  tags: string[];
  page_count: number;
}

// ===== 评论 =====
export interface CommentItem {
  CID: string;
  username: string;
  content: string;
  addtime: string;
  photo: string;
  replys: CommentReply[];
}

export interface CommentReply {
  CID: string;
  username: string;
  content: string;
  addtime: string;
  photo: string;
}

// ===== 收藏 =====
export interface FavoriteItem {
  id: string;
  name: string;
  image: string;
  author?: string;
}

export interface FavoriteData {
  total: string;
  list: FavoriteItem[];
  folder_list: FavoriteFolder[];
}

export interface FavoriteFolder {
  FID: string;
  folder_id?: string;
  name: string;
  count?: string;
}

// ===== 用户 =====
export interface LoginData {
  s: string; // AVS token
  username: string;
  photo: string;
  photo_other: string;
}

export interface MemberData {
  id: string;
  username: string;
  photo: string;
  coin: string;
  point: string;
  experience: string;
  level: string;
  online_ip: string;
}

export interface SignData {
  days: number;
  coin: number;
  exp: number;
}

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
}

// ===== 视频 =====
export interface MovieItem {
  id: string;
  title: string;
  photo: string;
  tags: string[];
  backlink: string;
}

export interface VideoDetailData {
  video: {
    vid: string;
    title: string;
    description: string;
    video_src: string;
    channel: string;
    factory: string;
    view: string;
    date: string;
    photo: string;
    full_url: string;
    tags: string[];
    girls: string[];
    duration: string;
    backlink: string;
  };
  related_videos: MovieItem[];
  videoSeries: any[];
}

// ===== 小说 =====
export interface NovelItem {
  id: string;
  title: string;
  author: string;
  photo: string;
  description: string;
  tags: string[];
}

export interface NovelChapter {
  id: string;
  title: string;
  sort: string;
  content?: string;
}

export interface NovelContent {
  id: string;
  title: string;
  content: string;
  prev_id?: string;
  next_id?: string;
}

// ===== 博客 =====
export interface BlogItem {
  id: string;
  title: string;
  photo: string;
  description: string;
  author: string;
  addtime: string;
}

// ===== 论坛 =====
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  username: string;
  photo: string;
  addtime: string;
  reply_count: string;
}

// ===== 游戏 =====
export interface GameItem {
  gid: string;
  title: string;
  description: string;
  tags: string;
  link: string;
  photo: string;
  type: string[];
  categories: { name: string };
}

export interface GameData {
  games: GameItem[];
  hot_games: GameItem[];
  categories: { name: string; slug: string; game_types: { name: string; slug: string }[] }[];
}

// ===== 通知 =====
export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  addtime: string;
  type: string;
  is_read: boolean;
}
