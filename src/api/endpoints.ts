// 禁漫天堂 API 封装 — 路径从 APK JS bundle 精确提取
// @author nyx

import CryptoJS from 'crypto-js';
import { apiClient } from './client';
import { decryptAndParse, nowTs, generateToken } from './crypto';
import { jmLogger } from '../utils/JmLogger';
import { apiCache, CACHE_TTL } from '../utils/ApiCache';
import type {
  ApiResponse, SettingData, PromoteItem, LatestItem,
  SearchData, MoreListData, AlbumDetail, ComicReadData, Episode,
  CommentItem, CommentReply, FavoriteData, FavoriteFolder,
  LoginData, MemberData, SignData, AchievementData,
  MovieItem, VideoDetailData,
  NovelItem, NovelChapter, NovelContent,
  BlogItem, ForumPost, GameItem, GameData,
  NotificationItem, ComicItem,
} from './types';

async function encryptedGet<T>(path: string, q?: Record<string, string | number>): Promise<T> {
  const ts = nowTs();
  const data = await apiClient.get<string>(path, q);
  return decryptAndParse<T>(ts, data);
}

/** 带缓存的 GET */
async function cachedGet<T>(path: string, q: Record<string, string | number> | undefined, ttl: number): Promise<T> {
  const key = path + '?' + JSON.stringify(q);
  const cached = apiCache.get<T>(key);
  if (cached) return cached;
  const result = await encryptedGet<T>(path, q);
  apiCache.set(key, result, ttl);
  return result;
}

async function encryptedPost<T>(path: string, f?: Record<string, string | number>): Promise<T> {
  const ts = nowTs();
  const data = await apiClient.post<string>(path, f);
  return decryptAndParse<T>(ts, data);
}

// 路径对照 APK 源码: {token:"185Hcomic3PAPP7R", API_APP_SETTING:"setting", API_COMIC_PROMOTE:"promote", ...}
// 注意: 路径无 /api/ 前缀，直接拼接在域名后

export async function fetchSetting(): Promise<SettingData> {
  try { return await encryptedGet<SettingData>('setting'); } catch {}
  const res = await apiClient.getWeb('setting');
  return JSON.parse(res).data;
}

export async function fetchMainPromote(): Promise<PromoteItem[]> {
  return cachedGet<PromoteItem[]>('promote', undefined, CACHE_TTL.promote);
}

export async function fetchLatest(page = 1): Promise<LatestItem[]> {
  return cachedGet<LatestItem[]>('latest', { page }, CACHE_TTL.latest);
}

export async function fetchWeekData(): Promise<{ categories: { id: string; title: string; time: string }[]; type: { id: string; title: string }[] }> {
  return encryptedGet('week'); // 原版可能不同
}

export async function fetchBanners(): Promise<{ adv: { link: string; image: string; adv_type: number }[] }> {
  return encryptedGet('ad_content_all');
}

export async function searchComics(params: { search_query: string; page?: number; o?: string }): Promise<SearchData> {
  return encryptedGet<SearchData>('search', { search_query: params.search_query, page: params.page || 1, o: params.o || 'tf' });
}

export async function fetchHotTags(): Promise<string[]> {
  return encryptedGet<string[]>('hot_tags');
}

export async function fetchRandomRecommend(): Promise<ComicItem[]> {
  return encryptedGet('random_recommend');
}

export async function fetchMoreList(id: string, page = 1): Promise<MoreListData> {
  return encryptedGet<MoreListData>('serialization', { id, page });
}

export async function fetchCategoriesFilter(params: { page?: number; o?: string } = {}): Promise<MoreListData> {
  return encryptedGet<MoreListData>('categories/filter', {
    page: params.page || 1,
    o: params.o || 'mv',
  });
}

/**
 * 从可能的字段名中提取章节列表
 * JM API 可能使用不同的字段名
 */
function extractEpisodes(data: any): Episode[] {
  const candidates = ['series', 'episodes', 'chapter_list', 'album_series', 'list', 'album_series_list', 'chapters'];
  for (const key of candidates) {
    const raw = data?.[key];
    if (Array.isArray(raw) && raw.length > 0) {
      jmLogger.log(`fetchAlbumDetail: episodes found in field "${key}" count=${raw.length}`);
      // 归一化字段名
      return raw.map((ep: any) => ({
        id: String(ep.id || ep.chapter_id || ep.album_id || ''),
        name: ep.name || ep.title || ep.chapter_name || `第${ep.sort || ep.order || '?'}话`,
        sort: String(ep.sort || ep.order || ep.sort_order || '0'),
        page_count: ep.page_count || ep.pageCount || ep.total_page || undefined,
      }));
    }
  }
  return [];
}

/**
 * 用指定 secret 生成 token 并请求 album 端点
 */
async function tryAlbumWithSecret(albumId: string, tokenSecret: string, version: string, path = 'album'): Promise<AlbumDetail | null> {
  const ts = nowTs();
  try {
    const token = CryptoJS.MD5(`${ts}${tokenSecret}`).toString(CryptoJS.enc.Hex);
    const tokenparam = `${ts},${version}`;
    const domain = apiClient.getMainHost() || apiClient.getDomains()[0];
    const url = `https://${domain}/${path}?id=${albumId}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'X-Requested-With': 'com.example.app',
        token,
        tokenparam,
        Authorization: 'Bearer',
        'Sec-Fetch-Storage-Access': 'active',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        Connection: 'keep-alive',
        Origin: 'https://localhost',
        Referer: 'https://localhost/',
      },
    });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = JSON.parse(text);
    const detail = decryptAndParse<AlbumDetail>(ts, json.data) as any;
    if (!detail.series?.length) detail.series = extractEpisodes(detail);
    jmLogger.log(`tryAlbumWithSecret(${tokenSecret.slice(0,8)}...) OK series=${detail.series?.length}`);
    return detail as AlbumDetail;
  } catch (e: any) {
    jmLogger.warn(`tryAlbumWithSecret(${tokenSecret.slice(0,8)}...) fail: ${e.message}`);
    return null;
  }
}

export async function fetchAlbumDetail(albumId: string): Promise<AlbumDetail> {
  // 版本轮询: 从 APK 提取的实际版本号
  const versions = ['2.0.26', '2.0.25', '2.0.24', '1.7.2'];
  // secret 轮询: PicaComic 用 18comicAPPContent, APK 用 185Hcomic3PAPP7R
  const secrets = ['18comicAPPContent', '185Hcomic3PAPP7R'];
  // 路径轮询
  const paths = ['album', '/api/album'];

  for (const secret of secrets) {
    for (const version of versions) {
      for (const path of paths) {
        const result = await tryAlbumWithSecret(albumId, secret, version, path);
        if (result) return result;
      }
    }
  }

  // 最后尝试: 明文 JSON
  try {
    const text = await apiClient.getWeb('album', { id: albumId });
    const parsed = JSON.parse(text);
    const detail = (parsed.data || parsed) as any;
    if (!detail.series?.length) detail.series = extractEpisodes(detail);
    jmLogger.log(`fetchAlbumDetail OK (plain) id=${albumId} series=${detail.series?.length || 0}`);
    return detail as AlbumDetail;
  } catch (e: any) {
    jmLogger.err(`fetchAlbumDetail all attempts failed for id=${albumId}: ${e.message}`);
  }

  throw new Error(`获取漫画详情失败: ${albumId}`);
}

export async function fetchComicRead(chapterId: string): Promise<ComicReadData> {
  const key = 'comic_read:' + chapterId;
  const cached = apiCache.get<ComicReadData>(key);
  if (cached) return cached;
  try {
    const result = await encryptedGet<ComicReadData>('comic_read', { id: chapterId });
    apiCache.set(key, result, CACHE_TTL.comic_read);
    return result;
  } catch {
    const result = await encryptedGet<ComicReadData>('chapter', { id: chapterId });
    apiCache.set(key, result, CACHE_TTL.comic_read);
    return result;
  }
}

export async function fetchScrambleId(photoId: string | number): Promise<number> {
  try {
    const ts = nowTs();
    const { token, tokenparam } = generateToken(ts, true);
    const resp = await fetch(
      `https://18comic.vip/chapter_view_template?id=${photoId}&v=${ts}&mode=vertical&page=0&app_img_shunt=1&express=off`,
      { headers: { token, tokenparam, 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' } },
    );
    const text = await resp.text();
    const match = text.match(/var scramble_id\s*=\s*(\d+);/);
    if (match) return parseInt(match[1], 10);
  } catch {}
  return 220980;
}

export async function buyAlbum(albumId: string): Promise<{ status: string; msg: string }> {
  return encryptedPost('coin_buy_nc', { id: albumId });
}

export async function fetchComments(albumId: string, page = 1, mode = 'manhua'): Promise<{ list: CommentItem[]; total: string }> {
  return encryptedGet('forum', { mode, aid: albumId, page });
}

export async function postComment(albumId: string, content: string): Promise<any> {
  return encryptedPost('comment', { video_id: albumId, comment: content, status: 'true' });
}

export async function fetchFavorites(params: { page?: number; o?: string; folder_id?: string } = {}): Promise<FavoriteData> {
  return encryptedGet<FavoriteData>('favorite', { page: params.page || 1, o: params.o || 'mr', folder_id: params.folder_id || '0' });
}

export async function toggleFavorite(albumId: string): Promise<any> {
  return encryptedGet('favorite', { aid: Number(albumId) });
}

export async function createFolder(name: string): Promise<any> {
  return encryptedPost('favorite_folder', { name });
}

export async function login(username: string, password: string): Promise<LoginData> {
  const data = await encryptedPost<LoginData>('login', { username, password });
  if (data.s) { apiClient.setAvs(data.s); }
  return data;
}

export async function register(params: { username: string; password: string; password_confirm: string; email: string; gender: string; adult: boolean }): Promise<any> {
  return encryptedPost('register', params as any);
}

export async function forgotPassword(email: string): Promise<any> {
  return encryptedPost('forgot', { email });
}

export async function fetchMemberInfo(): Promise<MemberData> {
  return encryptedGet<MemberData>('member');
}

export async function fetchSignData(): Promise<SignData> {
  return encryptedGet<SignData>('sign');
}

export async function doSign(): Promise<SignData> {
  return encryptedPost<SignData>('sign');
}

export async function fetchAchievements(): Promise<AchievementData[]> {
  return encryptedGet<AchievementData[]>('achievement');
}

export async function fetchNotifications(page = 1): Promise<{ list: NotificationItem[]; total: string; unread: { comic_follow: number; site_notice: number } }> {
  return encryptedGet('notification', { page });
}

export async function fetchMovies(params: { page?: number; videoType?: string; searchQuery?: string } = {}): Promise<{ list: MovieItem[]; total: string }> {
  return encryptedGet('videos', { page: params.page || 1, video_type: params.videoType || '', search_query: params.searchQuery || '' });
}

export async function fetchLatestHanime(): Promise<{ id: string; photo: string; title: string }[]> {
  return encryptedGet('latest_hanime');
}

export async function fetchVideoDetail(vid: string): Promise<VideoDetailData> {
  return encryptedGet<VideoDetailData>('video', { vid });
}

export async function fetchNovels(page = 1): Promise<{ list: NovelItem[]; total: string }> {
  return encryptedGet('novels', { page });
}

export async function fetchNovelDetail(novelId: string): Promise<{ novel: NovelItem; chapters: NovelChapter[] }> {
  return encryptedGet('novel', { id: novelId });
}

export async function fetchNovelContent(chapterId: string): Promise<NovelContent> {
  return encryptedGet<NovelContent>('novelchapters', { id: chapterId });
}

export async function fetchBlogs(page = 1): Promise<{ list: BlogItem[]; total: string }> {
  return encryptedGet('blog', { page });
}

export async function fetchBlogDetail(blogId: string): Promise<{ blog: BlogItem; content: string; related_comics: ComicItem[]; related_blogs: BlogItem[] }> {
  return encryptedGet('blog_detail', { id: blogId });
}

export async function fetchForumPosts(page = 1): Promise<{ list: ForumPost[]; total: string }> {
  return encryptedGet('forum', { mode: 'forum', page });
}

export async function fetchGames(): Promise<GameData> {
  return encryptedGet<GameData>('allgames');
}

export async function fetchDownloadInfo(albumId: string): Promise<{ download_url: string; quality: string; size: string }> {
  return encryptedGet('download', { id: albumId });
}

// ===================== 图片 URL =====================

export function getImgHost(): string { return apiClient.getImgHost(); }
export function getMainHost(): string { return apiClient.getMainHost(); }

export function getCoverUrl(albumId: string, host?: string, v?: string): string {
  const base = `https://${host || apiClient.getImgHost()}/media/albums/${albumId}_3x4.jpg`;
  const url = v ? `${base}?v=${v}` : base;
  return url;
}

export function getChapterImageUrl(chapterId: string, pageNum: number, host?: string): string {
  return `https://${host || apiClient.getImgHost()}/media/photos/${chapterId}/${String(pageNum).padStart(5, '0')}.jpg`;
}

export function getPhotoUrl(chapterId: string, filename: string, host?: string): string {
  return `https://${host || apiClient.getImgHost()}/media/photos/${chapterId}/${filename}`;
}
