// 设置存储 — 含动态域名 + 主题偏好
// @author nyx

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import type { SettingData } from '../api/types';
import type { ThemeMode } from '../theme';

interface Shunt {
  key: number;
  title: string;
  main_web_host?: string;
  img_host?: string;
}

interface SettingsState {
  language: 'zh' | 'en';
  darkMode: boolean;
  /** 主题模式：auto / light / dark */
  theme: ThemeMode;
  readingMode: 'page' | 'scroll';
  readingDirection: 'ltr' | 'rtl';
  showDebugLog: boolean;
  prefetchCount: number;
  imageLayout: 'contain' | 'fitWidth' | 'fitHeight';
  lockOrientation: 0 | 1 | 2;
  downloadToGallery: boolean;
  loaded: boolean;

  // 动态域名（从 /api/setting 获取）
  mainWebHost: string;
  imgHost: string;
  shunts: Shunt[];
  selectedShuntKey: number;

  // 全量 setting 缓存，供其他页面使用
  rawSetting: SettingData | null;

  setLanguage: (lang: 'zh' | 'en') => void;
  setDarkMode: (v: boolean) => void;
  /** 设置主题模式 */
  setTheme: (v: ThemeMode) => void;
  setReadingMode: (m: 'scroll' | 'page') => void;
  setReadingDirection: (d: 'ltr' | 'rtl') => void;
  setShowDebugLog: (v: boolean) => void;
  setPrefetchCount: (n: number) => void;
  setImageLayout: (v: 'contain' | 'fitWidth' | 'fitHeight') => void;
  setLockOrientation: (v: 0 | 1 | 2) => void;
  setDownloadToGallery: (v: boolean) => void;

  /** 从 /api/setting 响应更新域名 */
  updateFromSetting: (data: SettingData) => void;
  /** 切换源 */
  selectShunt: (key: number) => void;

  load: () => Promise<void>;
  save: () => Promise<void>;
}

const KEY = '@jmcomic.settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'zh',
  darkMode: true,
  theme: 'auto',
  readingMode: 'scroll',
  readingDirection: 'ltr',
  showDebugLog: false,
  prefetchCount: 3,
  imageLayout: 'contain',
  lockOrientation: 0,
  downloadToGallery: true,
  loaded: false,

  mainWebHost: '',
  imgHost: 'cdn-msp.18comic.vip',
  shunts: [],
  selectedShuntKey: 0,
  rawSetting: null,

  setLanguage: (v) => { set({ language: v }); get().save(); },
  setDarkMode: (v) => { set({ darkMode: v }); get().save(); },
  setTheme: (v) => { set({ theme: v, darkMode: v === 'dark' || (v === 'auto' && false) }); get().save(); },
  setReadingMode: (v) => { set({ readingMode: v }); get().save(); },
  setReadingDirection: (v) => { set({ readingDirection: v }); get().save(); },
  setShowDebugLog: (v) => { set({ showDebugLog: v }); get().save(); },
  setPrefetchCount: (n) => { set({ prefetchCount: n }); get().save(); },
  setImageLayout: (v) => { set({ imageLayout: v }); get().save(); },
  setLockOrientation: (v) => { set({ lockOrientation: v }); get().save(); },
  setDownloadToGallery: (v) => { set({ downloadToGallery: v }); get().save(); },

  updateFromSetting: (data: SettingData) => {
    const shunts: Shunt[] = (data.app_shunts || []).map((s) => ({
      key: s.key,
      title: s.title,
      main_web_host: data.main_web_host,
      img_host: data.img_host,
    }));

    const cleanHost = (data.img_host || '').replace(/^https?:\/\//, '');
    if (cleanHost) apiClient.setImgHost(cleanHost);

    const { selectedShuntKey } = get();

    set({
      mainWebHost: data.main_web_host || '',
      imgHost: data.img_host || 'cdn-msp.18comic.vip',
      shunts,
      rawSetting: data,
    });

    get().save();
  },

  selectShunt: async (key: number) => {
    set({ selectedShuntKey: key });
    get().save();
    try {
      const { getShuntImgHost } = await import('../utils/SourceSelector');
      const imgHost = await getShuntImgHost(key);
      if (imgHost) {
        apiClient.setImgHost(imgHost);
        set({ imgHost });
        get().save();
      }
    } catch {}
  },

  load: async () => {
    try {
      const json = await AsyncStorage.getItem(KEY);
      if (json) set({ ...JSON.parse(json), loaded: true });
      else set({ loaded: true });
    } catch { set({ loaded: true }); }
  },

  save: async () => {
    const { loaded, save, load, rawSetting, ...data } = get();
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  },
}));
