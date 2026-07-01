// JMComic 源适配器
// @author Jason

import type { ComicSource, SourceItem, SourceDetail, SourceChapter, SourceImage } from './types';
import { searchComics, fetchAlbumDetail, getCoverUrl } from '../api/endpoints';
import { jmLogger } from '../utils/JmLogger';

function toSourceItem(raw: any, coverUrl?: string): SourceItem {
  const category = raw.tags || raw.category || raw.category_sub || [];
  return {
    id: String(raw.id || raw.album_id),
    title: raw.name || raw.title || '',
    author: raw.author?.name || (typeof raw.author === 'string' ? raw.author : ''),
    coverUrl: coverUrl || raw.cover || raw.thumb || '',
    description: raw.description || '',
    categories: category.map((t: any) => typeof t === 'string' ? t : t.name || t.tag || ''),
    source: 'jmcomic',
  };
}

function toSourceChapter(item: any): SourceChapter {
  return {
    id: String(item.id || ''),
    title: item.name || item.title || '',
    order: parseInt(String(item.sort || item.order || '0'), 10),
    source: 'jmcomic',
  };
}

export const jmcomicSource: ComicSource = {
  id: 'jmcomic',
  label: 'JMComic',

  async search(query: string, page = 1): Promise<{ items: SourceItem[]; total: number; redirect_aid?: string }> {
    try {
      const res = await searchComics({ search_query: query, page, o: 'tf' });
      if (res.redirect_aid) {
        return { items: [], total: 0, redirect_aid: res.redirect_aid };
      }
      const items = (res.content || []).map((c: any) =>
        toSourceItem(c, getCoverUrl(String(c.id)))
      );
      return { items, total: Number(res.total) || items.length };
    } catch (e: any) {
      jmLogger.err(`jmcomicSource.search error: ${e?.message || e} stack=${(e?.stack || '').slice(0, 200)}`);
      throw e;
    }
  },

  async fetchDetail(albumId: string): Promise<SourceDetail> {
    const raw = await fetchAlbumDetail(albumId);
    const item = toSourceItem(raw, getCoverUrl(albumId));
    const chapters = (raw.series || []).map(toSourceChapter);
    return {
      ...item,
      description: raw.description || '',
      tags: item.categories,
      chapters,
    };
  },

  async fetchChapters(albumId: string): Promise<SourceChapter[]> {
    const raw = await fetchAlbumDetail(albumId);
    return (raw.series || []).map(toSourceChapter);
  },

  async fetchImages(_comicId: string, _chapterOrder: number): Promise<SourceImage[]> {
    // JMComic 图片走 ReaderScreen 原有 SafeImage + fetchComicRead 逻辑
    return [];
  },
};
