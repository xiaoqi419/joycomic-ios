// 本地收藏存储（离线收藏）
// @author Jason

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalFavorite {
  id: string;
  title: string;
  coverUrl: string;
  author: string;
  addedAt: number;
}

interface FavoritesState {
  items: LocalFavorite[];
  isLoading: boolean;

  // actions
  addFavorite: (item: LocalFavorite) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  loadFavorites: () => Promise<void>;
}

const FAV_KEY = '@jmcomic.favorites';

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  items: [],
  isLoading: false,

  addFavorite: async (item: LocalFavorite) => {
    const items = [...get().items, item];
    set({ items });
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(items));
  },

  removeFavorite: async (id: string) => {
    const items = get().items.filter((f) => f.id !== id);
    set({ items });
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(items));
  },

  isFavorite: (id: string) => {
    return get().items.some((f) => f.id === id);
  },

  loadFavorites: async () => {
    set({ isLoading: true });
    try {
      const json = await AsyncStorage.getItem(FAV_KEY);
      if (json) {
        set({ items: JSON.parse(json) });
      }
    } catch {
      // 使用空列表
    } finally {
      set({ isLoading: false });
    }
  },
}));
