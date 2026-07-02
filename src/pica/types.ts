// Pica — 数据类型
// 参考 PicaComic (https://github.com/Pacalini/PicaComic) 响应结构

/** 通用 Pica API 响应包装 */
export interface PicaResponse<T> {
  code: number;
  message: string;
  data: T;
}

/** Pica 缩略图对象 */
export interface PicaThumb {
  fileServer: string;
  path: string;
  /** 原始 URL（可选，兼容旧数据） */
  originalName?: string;
}

/** Pica 漫画创作者 */
export interface PicaCreator {
  _id: string;
  name: string;
  title: string;
  avatar?: PicaThumb;
  level: number;
  exp: number;
  slogan?: string;
  character?: string;
}

/** 漫画列表项 (ComicItemBrief) */
export interface PicaComicBrief {
  _id: string;
  title: string;
  author: string;
  thumb: PicaThumb;
  tags?: string[];
  categories?: string[];
  likesCount: number;
  pagesCount?: number;
  totalLikes?: number;
}

/** 漫画详情 (ComicItem) */
export interface PicaComic {
  _id: string;
  title: string;
  description: string;
  author: string;
  chineseTeam?: string;
  thumb: PicaThumb;
  tags: string[];
  categories: string[];
  likesCount: number;
  commentsCount: number;
  isFavourite: boolean;
  isLiked: boolean;
  epsCount: number;
  pagesCount: number;
  updated_at: string;
  _creator: PicaCreator;
}

/** 漫画章节 (Eps) */
export interface PicaChapter {
  _id: string;
  id: string;
  title: string;
  order: number;
  updated_at: string;
}

/** 漫画页面图片 */
export interface PicaPageMedia {
  fileServer: string;
  path: string;
}

/** 漫画页面 */
export interface PicaPage {
  _id: string;
  id: string;
  media: PicaPageMedia;
}

/** ===== API 响应数据包装 ===== */

/** comics 列表响应 (来自 /comics, /comics/leaderboard 等) */
export interface PicaComicsData {
  comics: {
    docs: PicaComicBrief[];
    total: number;
    limit: number;
    page: number;
    pages: number;
  };
}

/** comic 详情响应 (来自 /comics/:id) */
export interface PicaComicData {
  comic: PicaComic;
}

/** eps 列表响应 (来自 /comics/:id/eps) */
export interface PicaEpsData {
  eps: {
    docs: PicaChapter[];
    total: number;
    limit: number;
    page: number;
    pages: number;
  };
}

/** pages 列表响应 (来自 /comics/:id/order/:order/pages) */
export interface PicaPagesData {
  pages: {
    docs: PicaPage[];
    total: number;
    limit: number;
    page: number;
    pages: number;
  };
}

/** 用户信息 */
export interface PicaUser {
  user: {
    _id: string;
    name: string;
    title: string;
    email: string;
    level: number;
    exp: number;
    avatar?: PicaThumb;
    isPunched?: boolean;
    slogan?: string;
    character?: string;
  };
}

/** ===== 工具函数 ===== */

/** 从 PicaThumb 构建完整图片 URL */
export function thumbUrl(t: PicaThumb): string {
  if (!t) return '';
  const fs = (t.fileServer || '').replace('picacomic', 'go2778');
  return `${fs}/static/${t.path}`;
}

/** 从 PicaPageMedia 构建完整图片 URL */
export function mediaUrl(m: PicaPageMedia): string {
  if (!m) return '';
  const fs = (m.fileServer || '').replace('picacomic', 'go2778');
  return `${fs}/static/${m.path}`;
}
