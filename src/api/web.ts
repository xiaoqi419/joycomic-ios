// 禁漫天堂 网页端 API（HTML 解析，无需加密）
// 降级方案：当移动端 API 被 CloudFlare 拦截时使用
// @author Jason

import { apiClient } from './client';
import type { SearchResult, AlbumDetail, Episode } from './types';

/**
 * 从 HTML 中提取漫画列表
 */
function parseAlbumList(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  // 匹配 /album/12345/ 格式的链接
  const albumRegex = /<a\s+href="\/album\/(\d+)\/[^"]*"[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*title="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = albumRegex.exec(html)) !== null) {
    results.push({
      id: match[1],
      name: match[3],
      coverUrl: match[2].startsWith('http') ? match[2] : `https:${match[2]}`,
      tags: [],
    });
  }
  // 如果上面没匹配到，试试更宽松的匹配
  if (results.length === 0) {
    const simpleRegex = /album\/(\d+)\/[^>]*>[\s\S]*?title="([^"]+)"/g;
    let match2: RegExpExecArray | null;
    while ((match2 = simpleRegex.exec(html)) !== null) {
      const m2 = match2;
      if (m2 && !results.some(r => r.id === m2[1])) {
        results.push({ id: m2[1], name: m2[2], coverUrl: '', tags: [] });
      }
    }
  }
  return results;
}

/**
 * 网页端搜索
 */
export async function webSearch(keyword: string, page = 1): Promise<SearchResult[]> {
  const html = await apiClient.getWeb('/search/photos', {
    search_query: keyword,
    page,
    o: 'mv',
  });
  return parseAlbumList(html);
}

/**
 * 网页端分类浏览
 */
export async function webCategory(page = 1, sort = 'mv'): Promise<SearchResult[]> {
  const html = await apiClient.getWeb('/albums', { page, o: sort });
  return parseAlbumList(html);
}

/**
 * 从 HTML 提取专辑详情（标题+章节）
 */
function parseAlbumDetail(html: string, id: string): AlbumDetail | null {
  const titleMatch = html.match(/<h2[^>]*id="book-name"[^>]*>([\s\S]*?)<\/h2>/);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 提取章节列表
  const episodes: Episode[] = [];
  const epRegex = /data-album="(\d+)"[^>]*>[\s\S]*?第(\d+)[话話]([\s\S]*?)<\//g;
  let match;
  while ((match = epRegex.exec(html)) !== null) {
    episodes.push({
      id: match[1],
      albumId: id,
      title: `第${match[2]}话 ${match[3].trim()}`,
      index: parseInt(match[2]),
      pageCount: 0,
      sort: parseInt(match[2]),
    });
  }

  if (!title && episodes.length === 0) return null;

  return {
    id, title,
    author: [], tags: [], actors: [], works: [],
    coverUrl: '', description: '',
    views: 0, likes: 0, commentCount: 0,
    publishDate: '', updateDate: '',
    episodes, pageCount: 0, scrambleId: 0,
  };
}

/**
 * 网页端获取漫画详情
 */
export async function webAlbumDetail(albumId: string): Promise<AlbumDetail | null> {
  const html = await apiClient.getWeb(`/album/${albumId}/`);
  return parseAlbumDetail(html, albumId);
}

/**
 * 从 HTML 提取章节图片地址
 */
export function parsePhotoImages(html: string, photoId: string): string[] {
  const urls: string[] = [];
  const imgRegex = /data-original="(https:[^"]+)"[^>]*id="album_photo/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}
