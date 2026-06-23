// 阅读器状态管理
// @author Jason

import { create } from 'zustand';

interface ReaderState {
  /** 当前正在阅读的漫画 ID */
  currentAlbumId: string | null;
  /** 当前章节 ID */
  currentChapterId: string | null;
  /** 当前页码（从 0 开始） */
  currentPage: number;
  /** 图片列表 */
  imageUrls: string[];
  /** 阅读方向 */
  direction: 'ltr' | 'rtl';

  // actions
  startReading: (albumId: string, chapterId: string, images: string[]) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  clearReader: () => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  currentAlbumId: null,
  currentChapterId: null,
  currentPage: 0,
  imageUrls: [],
  direction: 'ltr',

  startReading: (albumId, chapterId, images) => {
    set({
      currentAlbumId: albumId,
      currentChapterId: chapterId,
      imageUrls: images,
      currentPage: 0,
    });
  },

  setPage: (page) => {
    const { imageUrls } = get();
    if (page >= 0 && page < imageUrls.length) {
      set({ currentPage: page });
    }
  },

  nextPage: () => {
    const { currentPage, imageUrls } = get();
    if (currentPage < imageUrls.length - 1) {
      set({ currentPage: currentPage + 1 });
    }
  },

  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 0) {
      set({ currentPage: currentPage - 1 });
    }
  },

  clearReader: () => {
    set({
      currentAlbumId: null,
      currentChapterId: null,
      imageUrls: [],
      currentPage: 0,
    });
  },
}));
