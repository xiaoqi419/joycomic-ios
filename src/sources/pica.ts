// Pica 源适配器
// @author Jason

import type { ComicSource, SourceItem, SourceDetail, SourceChapter, SourceImage } from './types';
import { jmLogger } from '../utils/JmLogger';
import { picaClient } from '../pica/client';
import { searchComics, comicDetail, comicEps, epPages } from '../pica/endpoints';
import { thumbUrl } from '../pica/types';
import { usePicaStore } from '../store/usePica';
import { jmcomicSource } from './jmcomic';

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
    categories: comic.categories || [],
    tags: comic.tags || [],
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

  async search(query: string, page = 1): Promise<{ items: SourceItem[]; total: number }> {
    const authed = await ensureAuth();
    if (!authed) return { items: [], total: 0 };
    try {
      const res = await searchComics(query, page);
      return { items: res.docs.map(toSourceItem), total: res.total };
    } catch {
      return { items: [], total: 0 };
    }
  },

  async fetchDetail(id: string): Promise<SourceDetail> {
    await ensureAuth();
    const info = await comicDetail(id);
    const item = toSourceItem(info);
    const chapters = await this.fetchChapters(id);
    return {
      ...item,
      description: info.description || '',
      tags: info.tags || [],
      chapters,
    };
  },

  async fetchChapters(id: string): Promise<SourceChapter[]> {
    await ensureAuth();
    const eps = await comicEps(id);
    return eps.docs.map(toSourceChapter);
  },

  async fetchImages(_comicId: string, chapterOrder: number): Promise<SourceImage[]> {
    await ensureAuth();
    const pages = await epPages(String(chapterOrder));
    return pages.docs.map((p, i) => ({
      url: imageUrl(p.media),
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

  // JM 搜索
  let jmResult: { items: SourceItem[]; total: number; redirect_aid?: string };
  try {
    jmResult = await jmcomicSource.search(query, page);
    jmLogger.log(`聚合搜索: JM结果 items=${jmResult.items.length} redirect=${jmResult.redirect_aid}`);
  } catch (e: any) {
    jmLogger.err(`聚合搜索: JM失败 ${e?.message || e}`);
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
export function isPicaEnabled(): boolean {
  return getPicaToken().length > 0;
}
