// 聚合源统一类型
// @author Jason

export type SourceId = 'jmcomic' | 'pica';

export interface SourceItem {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description?: string;
  categories: string[];
  tags?: string[];
  source: SourceId;
}

export interface SourceChapter {
  id: string;
  title: string;
  order: number;
  source: SourceId;
}

export interface SourceDetail {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  categories: string[];
  tags: string[];
  chapters: SourceChapter[];
  source: SourceId;
  isFavourite?: boolean;
  isLiked?: boolean;
  likesCount?: number;
  totalLikes?: number;
  viewsCount?: number;
  totalViews?: number;
  commentsCount?: number;
  pagesCount?: number;
  epsCount?: number;
}

export interface SourceImage {
  url: string;
  index: number;
}

export interface ComicSource {
  readonly id: SourceId;
  readonly label: string;

  search(query: string, page?: number, filters?: Record<string, string>): Promise<{ items: SourceItem[]; total: number }>;
  fetchDetail(comicId: string): Promise<SourceDetail>;
  fetchChapters(comicId: string): Promise<SourceChapter[]>;
  fetchImages(comicId: string, chapterOrder: number): Promise<SourceImage[]>;
}
