// 网页端 API (HTML 解析) — 优化版
// 专门从 HTML 页面提取数据，绕开 CloudFlare API 封锁
// @author Jason

import { apiClient } from './client';
import type { SearchResult, AlbumDetail, Episode } from './types';

/**
 * 从分类/搜索页 HTML 提取漫画列表
 * 支持 /albums 和 /search/photos 两种页面
 */
export function parseComicList(html: string): SearchResult[] {
  const map = new Map<string, SearchResult>();
  
  // 方案1: 匹配 <a href="/album/123/"><img src="..." title="名称">
  const re1 = /\/album\/(\d+)\/[^>]*>[\s\S]{0,200}?(?:src|data-src)="([^"]*)"[\s\S]{0,200}?title="([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(html)) !== null) {
    if (!map.has(m[1])) {
      map.set(m[1], {
        id: m[1],
        name: m[3].trim(),
        coverUrl: m[2].startsWith('http') ? m[2] : 'https:' + m[2],
        tags: [],
      });
    }
  }
  
  // 方案2: 从 JSON 数据中提取 (页面可能内嵌 JSON)
  const jsonMatch = html.match(/"comic"\s*:\s*\{[^}]+"id"\s*:\s*(\d+)/g);
  if (jsonMatch) {
    jsonMatch.forEach(j => {
      const idMatch = j.match(/"id"\s*:\s*(\d+)/);
      const nameMatch = j.match(/"name"\s*:\s*"([^"]+)"/);
      const coverMatch = j.match(/"cover"\s*:\s*"([^"]+)"/);
      if (idMatch && !map.has(idMatch[1])) {
        map.set(idMatch[1], {
          id: idMatch[1],
          name: nameMatch?.[1] || '',
          coverUrl: coverMatch?.[1] || '',
          tags: [],
        });
      }
    });
  }

  return Array.from(map.values());
}

/**
 * 网页端 - 分类浏览
 */
export async function webCategory(page = 1): Promise<SearchResult[]> {
  const html = await apiClient.getWeb('/albums', { page, o: 'mv' });
  return parseComicList(html);
}

/**
 * 网页端 - 搜索
 */
export async function webSearch(keyword: string, page = 1): Promise<SearchResult[]> {
  const html = await apiClient.getWeb('/search/photos', { search_query: keyword, page, o: 'mv' });
  return parseComicList(html);
}

/**
 * 网页端 - 漫画详情
 */
export async function webAlbumDetail(albumId: string): Promise<AlbumDetail | null> {
  const html = await apiClient.getWeb(`/album/${albumId}/`);
  
  const titleMatch = html.match(/<h2[^>]*id="book-name"[^>]*>([\s\S]*?)<\/h2>/i)
    || html.match(/<title>([\s\S]*?)\s*[|｜]\s*禁漫天堂/i)
    || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 提取章节
  const episodes: Episode[] = [];
  const epRe = /data-album="(\d+)"[^>]*>[\s\S]{0,200}?第(\d+)[话話]([\s\S]*?)<\//gi;
  let ep: RegExpExecArray | null;
  while ((ep = epRe.exec(html)) !== null) {
    episodes.push({
      id: ep[1], albumId,
      title: `第${ep[2]}话 ${ep[3].trim()}`,
      index: parseInt(ep[2]), pageCount: 0, sort: parseInt(ep[2]),
    });
  }

  if (!title && episodes.length === 0) return null;

  return {
    id: albumId, title,
    author: [], tags: [], actors: [], works: [],
    coverUrl: '', description: '',
    views: 0, likes: 0, commentCount: 0,
    publishDate: '', updateDate: '',
    episodes, pageCount: 0, scrambleId: 0,
  };
}
