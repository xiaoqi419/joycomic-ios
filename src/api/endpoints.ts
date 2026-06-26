// 禁漫天堂 API 封装 — 路径从 APK JS bundle 精确提取
// @author nyx

import { apiClient, setGlobalAvs } from './client';
import { decryptAndParse, nowTs, generateToken } from './crypto';
import type {
  ApiResponse, SettingData, PromoteItem, LatestItem,
  SearchData, MoreListData, AlbumDetail, ComicReadData,
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
  return encryptedGet<PromoteItem[]>('promote');
}

export async function fetchLatest(page = 1): Promise<LatestItem[]> {
  return encryptedGet<LatestItem[]>('latest', { page });
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

export async function fetchHotTags(): Promise<{ name: string; value: string }[]> {
  return encryptedGet('hot_tags');
}

export async function fetchRandomRecommend(): Promise<ComicItem[]> {
  return encryptedGet('random_recommend');
}

export async function fetchMoreList(id: string, page = 1): Promise<MoreListData> {
  return encryptedGet<MoreListData>('serialization', { id, page });
}

export async function fetchCategoriesFilter(params: { c?: string; page?: number; o?: string }): Promise<MoreListData> {
  return encryptedGet<MoreListData>('categories/filter', {
    c: params.c || 'all',
    page: params.page || 1,
    o: params.o || 'mv',
  });
}

export async function fetchAlbumDetail(albumId: string): Promise<AlbumDetail> {
  return encryptedGet<AlbumDetail>('album', { id: albumId });
}

export async function fetchComicRead(chapterId: string): Promise<ComicReadData> {
  return encryptedGet<ComicReadData>('comic_read', { id: chapterId });
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
  if (data.s) { apiClient.setAvs(data.s); setGlobalAvs(data.s); }
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

/** Web 环境图片走代理，iOS 原生直接请求 */
function proxyUrl(url: string): string {
  // 只在浏览器 web 环境走代理，RN/iOS 直连
  if (typeof navigator === 'undefined' || navigator.product === 'ReactNative') return url;
  // localhost:3456/{host}{path}
  const match = url.match(/https:\/\/([^/]+)(\/.*)/);
  if (match) return `http://localhost:3456/${match[1]}${match[2]}`;
  return url;
}

export function getCoverUrl(albumId: string, host?: string, v?: string): string {
  const base = `https://${host || apiClient.getImgHost()}/media/albums/${albumId}_3x4.jpg`;
  const url = v ? `${base}?v=${v}` : base;
  return proxyUrl(url);
}

export function getChapterImageUrl(chapterId: string, pageNum: number, host?: string): string {
  const url = `https://${host || apiClient.getImgHost()}/media/photos/${chapterId}/${String(pageNum).padStart(5, '0')}.jpg`;
  return proxyUrl(url);
}

export function getPhotoUrl(chapterId: string, filename: string, host?: string): string {
  return proxyUrl(`https://${host || apiClient.getImgHost()}/media/photos/${chapterId}/${filename}`);
}
