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
  const episodes: Episode[] = (data.episode || data.episodes || []).map((ep: any, i: number) => ({
    id: String(ep.id || ep.photo_id || ep.chapter_id || ''),
    albumId: id,
    title: ep.name || ep.title || `第${ep.index || i + 1}话`,
    index: ep.index || i + 1,
    pageCount: ep.page_count || ep.pageCount || 0,
    sort: ep.sort || i,
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

export async function getFavorites(params: { page?: number; folderId?: string; sort?: string } = {}): Promise<FavoriteResponse> {
  const ts = nowTs();
  const { page = 1, folderId = '0', sort = 'mv' } = params;
  try {
    const encrypted = await apiClient.getMobile<string>(API_PATHS.FAVORITE, { page, o: sort, folder_id: folderId });
    const data = decryptAndParse<any>(ts, encrypted);
    const content: FavoriteItem[] = (data.content || []).map((item: any) => ({
      id: String(item.id || item.album_id || ''), name: item.name || item.title || '',
      coverUrl: item.cover || item.coverUrl || '',
    }));
    return { content, total: data.total || content.length, folders: [] };
  } catch { return { content: [], total: 0, folders: [] }; }
}

export async function toggleFavorite(albumId: string | number): Promise<boolean> {
  const ts = nowTs();
  try { decryptAndParse(ts, await apiClient.getMobile<string>(API_PATHS.FAVORITE, { aid: Number(albumId) })); return true; } catch { return false; }
}

// ===================== 登录 =====================

export async function login(username: string, password: string): Promise<{ success: boolean; username?: string; error?: string }> {
  const ts = nowTs();
  try {
    const data = decryptAndParse<any>(ts, await apiClient.getMobile<string>(API_PATHS.LOGIN, { username, password }));
    return { success: true, username: data.username || username };
  } catch (e: any) { return { success: false, error: e.message || '登录失败' }; }
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
export function getPhotoUrl(imageDomain: string, chapterId: string | number, filename: string): string {
  return `https://${imageDomain}/media/photos/${chapterId}/${filename}`;
}
