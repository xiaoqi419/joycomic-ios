// Pica 认证存储 + API 源设置
// @author Jason

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { picaClient } from '../pica/client';
import { login as picaLogin } from '../pica/endpoints';

export type PicaApiSource = 'go2778' | 'picacomic';

const API_HOSTS: Record<PicaApiSource, string> = {
  go2778: 'https://picaapi.go2778.com/',
  picacomic: 'https://picaapi.picacomic.com/',
};

interface PicaState {
  username: string;
  token: string;
  loggedIn: boolean;
  apiSource: PicaApiSource;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  load: () => Promise<void>;
  setApiSource: (source: PicaApiSource) => Promise<void>;
}

const KEY = '@pica.auth';
const API_KEY = '@pica.api_source';

export const usePicaStore = create<PicaState>((set, get) => ({
  username: '',
  token: '',
  loggedIn: false,
  apiSource: 'go2778',

  login: async (username, password) => {
    const res = await picaLogin(username, password);
    const token = res.token;
    picaClient.setToken(token);
    set({ username, token, loggedIn: true });
    await AsyncStorage.setItem(KEY, JSON.stringify({ username, token }));
  },

  logout: async () => {
    picaClient.setToken('');
    set({ username: '', token: '', loggedIn: false });
    await AsyncStorage.removeItem(KEY);
  },

  load: async () => {
    try {
      const apiSource = await AsyncStorage.getItem(API_KEY);
      if (apiSource === 'picacomic' || apiSource === 'go2778') {
        const source = apiSource as PicaApiSource;
        picaClient.setBaseUrl(API_HOSTS[source]);
        set({ apiSource: source });
      }
      const json = await AsyncStorage.getItem(KEY);
      if (json) {
        const d = JSON.parse(json);
        if (d.token) {
          picaClient.setToken(d.token);
          set({ username: d.username || '', token: d.token, loggedIn: true });
        }
      }
    } catch {}
  },

  setApiSource: async (source: PicaApiSource) => {
    picaClient.setBaseUrl(API_HOSTS[source]);
    set({ apiSource: source });
    await AsyncStorage.setItem(API_KEY, source);
  },
}));
