// 设置存储
// @author Jason

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  /** 阅读方向: 'ltr' | 'rtl' */
  readingDirection: 'ltr' | 'rtl';
  /** 阅读模式: 'scroll' | 'page' */
  readingMode: 'scroll' | 'page';
  /** 图片域名的索引 */
  imageDomainIndex: number;
  /** 是否使用移动端 API */
  useMobileApi: boolean;
  /** 已登录用户名 */
  username: string;
  /** 深色模式 */
  darkMode: boolean;

  // actions
  setReadingDirection: (d: 'ltr' | 'rtl') => void;
  setReadingMode: (m: 'scroll' | 'page') => void;
  setImageDomainIndex: (i: number) => void;
  setUseMobileApi: (v: boolean) => void;
  setUsername: (name: string) => void;
  setDarkMode: (v: boolean) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = '@jmcomic.settings';

const defaultSettings = {
  readingDirection: 'ltr' as const,
  readingMode: 'scroll' as const,
  imageDomainIndex: 0,
  useMobileApi: true,
  username: '',
  darkMode: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,

  setReadingDirection: (readingDirection) => set({ readingDirection }),
  setReadingMode: (readingMode) => set({ readingMode }),
  setImageDomainIndex: (imageDomainIndex) => set({ imageDomainIndex }),
  setUseMobileApi: (useMobileApi) => set({ useMobileApi }),
  setUsername: (username) => set({ username }),
  setDarkMode: (darkMode) => set({ darkMode }),

  loadSettings: async () => {
    try {
      const json = await AsyncStorage.getItem(SETTINGS_KEY);
      if (json) {
        const saved = JSON.parse(json);
        set({ ...defaultSettings, ...saved });
      }
    } catch {
      // 使用默认值
    }
  },
}));

// 自动持久化
export async function saveSettings(
  settings: Partial<SettingsState>
): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    const current = json ? JSON.parse(json) : {};
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...current, ...settings })
    );
  } catch {
    // 静默
  }
}
