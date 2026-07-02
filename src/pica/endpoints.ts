// Pica — 所有 API 端点
// 参考 PicaComic (https://github.com/Pacalini/PicaComic) 实现
// @author Jason

import { picaClient as c } from './client';
import type {
  PicaResponse,
  PicaComicsData,
  PicaComicData,
  PicaEpsData,
  PicaPagesData,
  PicaUser,
} from './types';

const PAGE_LIMIT = 20;

// POST /auth/sign-in — 登录
export function login(username: string, password: string) {
  return c.post<{ token: string }>('auth/sign-in', { email: username, password });
}

// POST /comics/advanced-search — 搜索（注意：Pica 搜索是 POST，不是 GET）
export function searchComics(keyword: string, page = 1, sort = 'ua') {
  return c.post<PicaComicsData>(`comics/advanced-search?page=${page}`, {
    keyword,
    sort,
  });
}

// GET /comics/:id — 漫画详情
export function comicDetail(id: string) {
  return c.get<PicaComicData>(`comics/${id}`);
}

// GET /comics/:id/eps?page= — 章节列表
export function comicEps(id: string, page = 1) {
  return c.get<PicaEpsData>(`comics/${id}/eps`, { page });
}

// GET /comics/:id/order/:order/pages?page= — 章节图片
export function epPages(comicId: string, order: number, page = 1) {
  return c.get<PicaPagesData>(`comics/${comicId}/order/${order}/pages`, { page });
}

// GET /categories — 分类列表
export function categories() {
  return c.get<{ categories: { title: string; thumb: any }[] }>('categories');
}

// GET /comics — 分类筛选
export function comicsByCategory(category: string, page = 1, sort: 'ua' | 'dd' | 'da' | 'ld' = 'ua') {
  return c.get<PicaComicsData>('comics', {
    c: category,
    page,
    s: sort,
  });
}

// GET /users/profile — 用户信息
export function userProfile() {
  return c.get<PicaUser>('users/profile');
}

// GET /users/favourite — 漫画收藏
export function myFavourites(page = 1) {
  return c.get<PicaComicsData>('users/favourite', { page });
}

// GET /users/likes — 喜欢列表
export function myLikes(page = 1) {
  return c.get<PicaComicsData>('users/likes', { page });
}

// GET /comics/leaderboard — 排行榜
export function leaderboard(tt: 'H24' | 'D7' | 'D30' = 'H24', page = 1) {
  return c.get<PicaComicsData>('comics/leaderboard', { tt, page });
}

// GET /comics/:id/recommendation — 相关推荐
export function recommendation(id: string) {
  return c.get<{ comics: any[] }>(`comics/${id}/recommendation`);
}

// POST /comics/:id/like — 点赞/取消点赞
export function likeComic(id: string) {
  return c.post(`comics/${id}/like`, {});
}

// POST /comics/:id/favourite — 收藏/取消收藏
export function favouriteComic(id: string) {
  return c.post(`comics/${id}/favourite`, {});
}

// POST /users/punch-in — 签到
export function punchIn() {
  return c.post('users/punch-in', null);
}
