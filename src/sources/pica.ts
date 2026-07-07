// Pica 源适配器
// @author Jason

import type { ComicSource, SourceItem, SourceDetail, SourceChapter, SourceImage } from './types';
import { jmLogger } from '../utils/JmLogger';
import { picaClient } from '../pica/client';
import { searchComics, comicDetail, comicEps, epPages, comicsByCategory } from '../pica/endpoints';
import { thumbUrl, mediaUrl } from '../pica/types';
import { usePicaStore } from '../store/usePica';
import { searchComics as jmSearch, getCoverUrl } from '../api/endpoints';

function getPicaToken(): string {
  return usePicaStore.getState().token;
}

async function ensureAuth(): Promise<boolean> {
  const token = getPicaToken();
  if (token) {
    picaClient.setToken(token);
    return true;
  }
  return false;
}

function toSourceItem(comic: any): SourceItem {
  return {
    id: comic._id,
    title: comic.title || '',
    author: comic.author || '',
    coverUrl: thumbUrl(comic.thumb),
    description: comic.description || '',
    categories: Array.isArray(comic.categories) ? comic.categories : [],
    tags: Array.isArray(comic.tags) ? comic.tags : [],
    source: 'pica',
  };
}

function toSourceChapter(ep: any): SourceChapter {
  return {
    id: ep._id,
    title: ep.title || `第 ${ep.order} 话`,
    order: ep.order || 0,
    source: 'pica',
  };
}

function imageUrl(media: any): string {
  return thumbUrl(media);
}

export const picaSource: ComicSource = {
  id: 'pica',
  label: 'Pica',

  async search(query: string, page = 1, filters?: Record<string, string>): Promise<{ items: SourceItem[]; total: number }> {
    const authed = await ensureAuth();
    if (!authed) return { items: [], total: 0 };
    try {
      // 如果有分类筛选参数，用 GET /comics?c=xxx 否则用 POST /comics/advanced-search
      if (filters?.c) {
        const res = await comicsByCategory(filters.c, page);
        const data = (res as any).comics || res;
        const docs = Array.isArray(data) ? data : (data.docs || []);
        return { items: docs.map(toSourceItem), total: docs.length };
      }
      const res = await searchComics(query, page);
      const data = (res as any).comics || res;
      const docs = Array.isArray(data) ? data : (data.docs || []);
      const total = typeof data.total === 'number' ? data.total : docs.length;
      return { items: docs.map(toSourceItem), total };
    } catch {
      return { items: [], total: 0 };
    }
  },

  async fetchDetail(id: string): Promise<SourceDetail> {
    await ensureAuth();
    const res = await comicDetail(id);
    // 响应结构: { comic: { ... } }
    const info = (res as any).comic || res;
    const item = toSourceItem(info);
    const chapters = await this.fetchChapters(id);
    return {
      ...item,
      description: info.description || '',
      tags: Array.isArray(info.tags) ? info.tags : [],
      chapters,
      isFavourite: info.isFavourite,
      isLiked: info.isLiked,
      likesCount: info.likesCount,
      totalLikes: info.totalLikes,
      viewsCount: info.viewsCount,
      totalViews: info.totalViews,
      commentsCount: info.commentsCount,
      pagesCount: info.pagesCount,
      epsCount: info.epsCount,
    };
  },

  async fetchChapters(id: string): Promise<SourceChapter[]> {
    await ensureAuth();
    const first = await comicEps(id);
    const eps = (first as any).eps || first;
    let docs: any[] = eps?.docs || [];
    const pages = eps.pages || 1;
    // 多页并行加载
    if (pages > 1) {
      const pageReqs = [];
      for (let p = 2; p <= pages; p++) pageReqs.push(comicEps(id, p));
      const rest = await Promise.allSettled(pageReqs);
      for (const result of rest) {
        if (result.status === 'fulfilled') {
          const rd = (result.value as any).eps?.docs || (result.value as any).docs || [];
          docs = [...docs, ...rd];
        }
      }
    }
    return docs.map(toSourceChapter);
  },

  async fetchImages(comicId: string, chapterOrder: number): Promise<SourceImage[]> {
    await ensureAuth();
    // epPages 需要 comicId 和 order，而非 epId
    const res = await epPages(comicId, chapterOrder);
    // 响应结构: { pages: { docs: [{ media: { fileServer, path } }] } }
    const docs = (res as any).pages?.docs || (res as any).docs || [];
    return docs.map((p: any, i: number) => ({
      url: p.media ? mediaUrl(p.media) : '',
      index: i,
    }));
  },
};

// 双源聚合搜索 — Pica 未登录时只返回 JMComic
export async function aggregateSearch(
  query: string,
  page = 1,
): Promise<{ items: SourceItem[]; total: number; redirect_aid?: string }> {
  const picaAuthed = getPicaToken().length > 0;
  jmLogger.log(`聚合搜索: q="${query}" page=${page} picaAuthed=${picaAuthed}`);

  // JM 搜索（直接调 API 绕过 jmcomicSource 模块）
  let jmResult: { items: SourceItem[]; total: number; redirect_aid?: string };
  try {
    const res = await jmSearch({ search_query: query, page, o: 'tf' });
    jmLogger.log(`聚合搜索: JM API返回 keys=${Object.keys(res || {}).join(',')}`);
    if (res.redirect_aid) {
      jmResult = { items: [], total: 0, redirect_aid: res.redirect_aid };
    } else {
      const items = (res.content || []).map((c: any) => {
        const catRaw = c.tags || c.category || c.category_sub || [];
        return {
          id: String(c.id || c.album_id),
          title: c.name || c.title || '',
          author: c.author?.name || (typeof c.author === 'string' ? c.author : ''),
          coverUrl: getCoverUrl(String(c.id)),
          categories: Array.isArray(catRaw) ? catRaw.map((t: any) => typeof t === 'string' ? t : t.name || t.tag || '') : [],
          source: 'jmcomic' as const,
        };
      });
      jmResult = { items, total: Number(res.total) || items.length };
    }
    jmLogger.log(`聚合搜索: JM结果 items=${jmResult.items.length} redirect=${jmResult.redirect_aid}`);
  } catch (e: any) {
    jmLogger.err(`聚合搜索: JM失败 ${e?.message || e} stack=${(e?.stack || '').slice(0, 200)}`);
    jmResult = { items: [], total: 0 };
  }
  // 有重定向时直接返回
  if (jmResult.redirect_aid) {
    return { items: [], total: 0, redirect_aid: jmResult.redirect_aid };
  }

  // Pica 搜索
  let picaItems: SourceItem[] = [];
  if (picaAuthed) {
    try {
      const picaRes = await picaSource.search(query, page);
      picaItems = picaRes.items;
      jmLogger.log(`聚合搜索: Pica结果 items=${picaItems.length}`);
    } catch (e: any) {
      jmLogger.err(`聚合搜索: Pica失败 ${e?.message || e}`);
    }
  }

  const items = [...jmResult.items, ...picaItems];
  jmLogger.log(`聚合搜索: 完成 total=${items.length}`);
  return { items, total: items.length };
}

// 检查是否启用了 Pica 双源
let _picaLoaded = false;
export function isPicaEnabled(): boolean {
  if (!_picaLoaded) {
    _picaLoaded = true;
    usePicaStore.getState().load();
  }
  return getPicaToken().length > 0;
}
