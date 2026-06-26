// 设置存储 — 含动态域名
// @author nyx

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import type { SettingData } from '../api/types';

interface Shunt {
  key: number;
  title: string;
  main_web_host?: string;
  img_host?: string;
}

interface SettingsState {
  language: 'zh' | 'en';
  darkMode: boolean;
  readingMode: 'scroll' | 'page';
  readingDirection: 'ltr' | 'rtl';
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
  setReadingMode: (m: 'scroll' | 'page') => void;
  setReadingDirection: (d: 'ltr' | 'rtl') => void;

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
  readingMode: 'scroll',
  readingDirection: 'ltr',
  loaded: false,

  mainWebHost: '',
  imgHost: 'cdn-msp.18comic.vip',
  shunts: [],
  selectedShuntKey: 0,
  rawSetting: null,

  setLanguage: (v) => { set({ language: v }); get().save(); },
  setDarkMode: (v) => { set({ darkMode: v }); get().save(); },
  setReadingMode: (v) => { set({ readingMode: v }); get().save(); },
  setReadingDirection: (v) => { set({ readingDirection: v }); get().save(); },

  updateFromSetting: (data: SettingData) => {
    const shunts: Shunt[] = (data.app_shunts || []).map((s) => ({
      key: s.key,
      title: s.title,
      main_web_host: data.main_web_host,
      img_host: data.img_host,
    }));

    // 不更新 apiClient 的域名（CDN 域名用硬编码兜底，setting 的域名可能不可用）

    // 如果有被选中 shunt，使用它的域名
    const { selectedShuntKey } = get();

    set({
      mainWebHost: data.main_web_host || '',
      imgHost: data.img_host || 'cdn-msp.18comic.vip',
      shunts,
      rawSetting: data,
    });

    get().save();
  },

  selectShunt: (key: number) => {
    const { shunts } = get();
    const shunt = shunts.find((s) => s.key === key);
    if (shunt) {
      // shunts 只是 UI 标签，不切换 API 域名
      apiClient.setImgHost(shunt.img_host || apiClient.getImgHost());
    }
    set({ selectedShuntKey: key });
    get().save();
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
