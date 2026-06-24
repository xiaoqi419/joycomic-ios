// 禁漫天堂 API 封装 - 支持移动端加密 + 网页端双引擎
// @author Jason

import { apiClient } from './client';
import { decryptAndParse, nowTs, generateToken } from './crypto';
import { API_PATHS, IMAGE_DOMAINS } from '../constants';
import type { SearchResponse, SearchResult, AlbumDetail, Episode, ChapterDetail, FavoriteResponse, FavoriteItem } from './types';

// ===================== 搜索 =====================

export async function searchAlbums(params: {
  keyword: string; page?: number; sort?: string; mainTag?: number;
}): Promise<SearchResponse> {
  const ts = nowTs();
  const { keyword, page = 1, sort = 'mv', mainTag = 0 } = params;
  const encrypted = await apiClient.getMobile<string>(API_PATHS.SEARCH, {
    main_tag: mainTag, search_query: keyword, page, o: sort,
  });
  const data = decryptAndParse<any>(ts, encrypted);

  if (data.redirect_aid) {
    const album = await getAlbumDetail(data.redirect_aid);
    return { content: [albumToSearchResult(album)], total: 1, page: 1, pageCount: 1 };
  }

  const content: SearchResult[] = (data.content || []).map((item: any) => {
    const id = String(item.id || item.album_id || '');
    return {
      id,
      name: item.name || item.title || '',
      coverUrl: item.cover || item.coverUrl || getCoverUrl(IMAGE_DOMAINS[0], id),
      tags: item.tags || [],
      category: item.category || '',
    };
  });

  return { content, total: data.total || content.length, page: data.page || page, pageCount: Math.ceil((data.total || 1) / 20) };
}

// ===================== 分类/排行 =====================

export async function getCategoryAlbums(params: {
  page?: number; category?: string; sort?: string;
} = {}): Promise<SearchResponse> {
  const ts = nowTs();
  const { page = 1, category = 'all', sort = 'mv' } = params;
  try {
    const encrypted = await apiClient.getMobile<string>('/categories/filter', { page, order: '', c: category, o: sort });
    const data = decryptAndParse<any>(ts, encrypted);
    const content: SearchResult[] = (data.content || []).map((item: any) => {
      const id = String(item.id || item.album_id || '');
      return {
        id,
        name: item.name || item.title || '',
        coverUrl: item.cover || item.coverUrl || getCoverUrl(IMAGE_DOMAINS[0], id),
        tags: item.tags || [],
      };
    });
    return { content, total: data.total || content.length, page: data.page || page, pageCount: Math.ceil((data.total || 1) / 20) };
  } catch (e: any) {
    console.warn('获取分类失败, 尝试网页端API:', e.message);
    // 降级: 网页端 HTML 解析
    const html = await apiClient.getWeb('/albums', { page, o: sort, t: 'a' });
    const ids = html.match(/\/album\/(\d+)\//g) || [];
    const titles = html.match(/title="([^"]+?)"/g) || [];
    const content: SearchResult[] = ids.slice(0, 20).map((m: string, i: number) => ({
      id: m.replace(/\/album\//, '').replace(/\//, ''),
      name: (titles[i + 1] || '').replace(/title="/, '').replace(/"/, '') || '未知',
      coverUrl: '',
      tags: [],
    }));
    return { content, total: content.length, page, pageCount: 1 };
  }
}

// ===================== 漫画详情 =====================

function parseAlbumData(data: any, id: string): AlbumDetail {
  // 官方 App 用 series 字段
  const rawEpisodes = data.episode || data.episodes || data.series || [];
  const episodes: Episode[] = rawEpisodes.map((ep: any, i: number) => ({
    id: String(ep.id || ep.photo_id || ep.chapter_id || ''),
    albumId: id,
    title: ep.name || ep.title || `第${ep.sort || i + 1}話`,
    index: parseInt(ep.sort) || i + 1,
    pageCount: ep.page_count || ep.pageCount || 0,
    sort: parseInt(ep.sort) || i,
  }));
  return {
    id, title: data.name || data.title || '',
    author: parseArr(data.author), tags: parseArr(data.tags),
    actors: parseArr(data.actor || data.actors), works: parseArr(data.work || data.works),
    coverUrl: data.cover || data.coverUrl || '', description: data.description || '',
    views: data.view || data.views || 0, likes: data.like || data.likes || 0,
    commentCount: data.comment_count || data.commentCount || 0,
    publishDate: data.publish_date || data.publishDate || '',
    updateDate: data.update_date || data.updateDate || '',
    episodes, pageCount: data.page_count || data.pageCount || 0,
    scrambleId: data.scramble_id || data.scrambleId || 0,
  };
}

function parseArr(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [String(val)];
}

export async function getAlbumDetail(albumId: string | number): Promise<AlbumDetail> {
  const ts = nowTs();
  const id = String(albumId).replace(/^JM/i, '');
  const encrypted = await apiClient.getMobile<string>(API_PATHS.ALBUM, { id });
  return parseAlbumData(decryptAndParse<any>(ts, encrypted), id);
}

// ===================== 章节详情 =====================

export async function getChapterDetail(photoId: string | number): Promise<ChapterDetail> {
  const ts = nowTs();
  const id = String(photoId);
  const encrypted = await apiClient.getMobile<string>(API_PATHS.CHAPTER, { id });
  const data = decryptAndParse<any>(ts, encrypted);
  const scrambleId = await getScrambleId(photoId);

  // 构建图片 URL 列表 (data.images = ["00001.webp", "00002.webp", ...])
  const imageFiles: string[] = Array.isArray(data.images) ? data.images : [];
  const imageUrls = imageFiles.map(fn => getPhotoUrl(IMAGE_DOMAINS[0], id, fn));

  return {
    id, albumId: String(data.album_id || data.aid || ''),
    title: data.name || data.title || '',
    pageArr: data.page_arr || data.pageArr || [],
    dataOriginalDomain: data.data_original_domain || '',
    scrambleId, seriesId: data.series_id || data.seriesId || 0,
    sort: data.sort || 0, tags: parseArr(data.tags),
    pageCount: imageFiles.length,
    images: imageUrls,
  };
}

async function getScrambleId(photoId: string | number): Promise<number> {
  // Web 端直接返回默认值（CORS 限制）
  if (typeof window !== 'undefined') return 220980;
  const ts = nowTs();
  const { token, tokenparam } = generateToken(ts, true);
  try {
    const resp = await fetch(`https://18comic.vip${API_PATHS.SCRAMBLE}?id=${photoId}&v=${ts}&mode=vertical&page=0&app_img_shunt=1&express=off`, {
      headers: { token, tokenparam, 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
    });
    const match = (await resp.text()).match(/var scramble_id\s*=\s*(\d+);/);
    if (match) return parseInt(match[1], 10);
  } catch {}
  return 220980;
}

// ===================== 收藏 =====================

export async function getOnlineFavorites(params: { page?: number; folderId?: string; sort?: string } = {}): Promise<FavoriteResponse> {
  const ts = nowTs();
  const { page = 1, folderId = '0', sort = 'mv' } = params;
  try {
    const encrypted = await apiClient.getMobile<string>(API_PATHS.FAVORITE, { page, o: sort, folder_id: folderId });
    const data = decryptAndParse<any>(ts, encrypted);
    // API returns { list: [...], folder_list: [...], total: "..." }
    const raw = data.list || data.content || [];
    const content: FavoriteItem[] = raw.map((item: any) => ({
      id: String(item.id || item.album_id || ''), name: item.name || item.title || '',
      coverUrl: item.cover || item.coverUrl || getCoverUrl(IMAGE_DOMAINS[0], item.id || item.album_id),
    }));
    const folders = (data.folder_list || []).map((f: any) => ({ id: f.FID || '0', name: f.name || '默认' }));
    return { content, total: parseInt(data.total) || content.length, folders };
  } catch { return { content: [], total: 0, folders: [] }; }
}

// 兼容旧接口
export async function getFavorites(params: { page?: number; folderId?: string; sort?: string } = {}): Promise<FavoriteResponse> {
  return getOnlineFavorites(params);
}

export async function toggleFavorite(albumId: string | number): Promise<boolean> {
  const ts = nowTs();
  try { decryptAndParse(ts, await apiClient.getMobile<string>(API_PATHS.FAVORITE, { aid: Number(albumId) })); return true; } catch { return false; }
}

// ===================== 热门标签 / 推荐 / 每周 =====================

/** 获取热门搜索标签 */
export async function getHotTags(): Promise<string[]> {
  try {
    const ts = nowTs();
    const encrypted = await apiClient.getMobile<string>(API_PATHS.HOT_TAGS);
    const data = decryptAndParse<any>(ts, encrypted);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

/** 获取随机推荐 */
export async function getRandomRecommend(): Promise<SearchResult[]> {
  try {
    const ts = nowTs();
    const encrypted = await apiClient.getMobile<string>(API_PATHS.RANDOM_RECOMMEND);
    const data = decryptAndParse<any>(ts, encrypted);
    return (data || []).map((item: any) => ({
      id: String(item.id || ''), name: item.name || '',
      coverUrl: item.image || getCoverUrl(IMAGE_DOMAINS[0], item.id),
      tags: item.tags || [],
    }));
  } catch { return []; }
}

/** 获取每周必看 */
export async function getWeekRecommend(): Promise<{ categories: { id: string; name: string }[] } | null> {
  try {
    const ts = nowTs();
    const encrypted = await apiClient.getMobile<string>(API_PATHS.WEEK);
    return decryptAndParse(ts, encrypted);
  } catch { return null; }
}

// ===================== 登录/注册 =====================

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const ts = nowTs();
    const encrypted = await apiClient.postMobile<string>(API_PATHS.LOGIN, { username, password });
    const data = decryptAndParse<any>(ts, encrypted);
    // 保存 AVS token 到全局客户端，后续请求自动携带
    if (data.s || data.token) {
      apiClient.setAvs(data.s || data.token);
    }
    if (data.avs) {
      apiClient.setAvs(data.avs);
    }
    return {
      success: true,
      username: data.username || username,
      token: data.s || data.token || '',
      photo: data.photo || data.avatar || '',
    };
  } catch (e: any) { return { success: false, error: e.message || '登录失败' }; }
}

// 更新 LoginResult 类型
export interface LoginResult {
  success: boolean;
  username?: string;
  token?: string;
  photo?: string;
  error?: string;
}

// ===================== 工具 =====================

function albumToSearchResult(album: AlbumDetail): SearchResult {
  return { id: album.id, name: album.title, coverUrl: album.coverUrl, tags: album.tags };
}

export function getImageUrl(imageDomain: string, photoId: string | number, pageNum: number, _scrambleId?: number): string {
  return `https://${imageDomain}/media/photos/${photoId}/${String(pageNum).padStart(5, '0')}.jpg`;
}

/** 获取封面图 URL（使用 CDN 域名） */
export function getCoverUrl(imageDomain: string, albumId: string | number): string {
  return `https://${imageDomain}/media/albums/${albumId}.jpg`;
}

/** 获取图片 URL（章节内页） */
// ===================== 更多用户 =====================

export async function register(username: string, password: string, email?: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.postMobile<string>(API_PATHS.REGISTER, { username, password });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.postMobile<string>(API_PATHS.FORGOT, { email });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ===================== 评论 =====================

export interface CommentItem {
  id: string;
  username: string;
  content: string;
  time: string;
  photo: string;
  replies: CommentItem[];
}

export async function getComments(albumId: string, page = 1, mode = 'manhua'): Promise<{ list: CommentItem[]; total: number }> {
  try {
    const ts = nowTs();
    const encrypted = await apiClient.getMobile<string>(API_PATHS.FORUM, { mode, aid: albumId, page });
    const data = decryptAndParse<any>(ts, encrypted);
    const list = (data.list || []).map((c: any) => ({
      id: c.CID, username: c.username, content: c.content || '',
      time: c.addtime, photo: c.photo || '',
      replies: (c.replys || []).map((r: any) => ({
        id: r.CID, username: r.username, content: r.content || '',
        time: r.addtime, photo: r.photo || '', replies: [],
      })),
    }));
    return { list, total: parseInt(data.total) || list.length };
  } catch { return { list: [], total: 0 }; }
}

export async function postComment(albumId: string, content: string): Promise<boolean> {
  try {
    await apiClient.postMobile<string>(API_PATHS.COMMENT, { video_id: albumId, comment: content, status: 'true' });
    return true;
  } catch { return false; }
}

export function getPhotoUrl(imageDomain: string, chapterId: string | number, filename: string): string {
  return `https://${imageDomain}/media/photos/${chapterId}/${filename}`;
}
