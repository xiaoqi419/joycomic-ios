// JOYComic 主入口 — 完整导航结构
// Tab: 首页 | 分类 | 影视 | 我的
// Stack: 所有子页面
// 已集成 ThemeProvider，支持 auto/light/dark 主题切换
// @author nyx

import React, { useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import './src/i18n';
import { ThemeProvider, useAppTheme, Radius } from './src/theme';
import { useSettingsStore } from './src/store/useSettings';
import { useAuthStore } from './src/store/useAuth';
import { usePicaStore } from './src/store/usePica';
import { fetchSetting } from './src/api/endpoints';
import { SourceSelectModal } from './src/components/SourceSelectModal';
import { DebugOverlay } from './src/components/DebugOverlay';
import { loadSelectedShunt } from './src/utils/SourceSelector';
import { downloadManager } from './src/utils/DownloadManager';
import { useHistoryStore } from './src/store/useHistory';
import { logger } from './src/utils/HaKaLogger';
import type { ThemeMode } from './src/theme';

// Screens
import { MainScreen } from './src/screens/MainScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { ComicDetailScreen } from './src/screens/ComicDetailScreen';
import { SimpleErrorBoundary as ErrorBoundary } from './src/components/SimpleErrorBoundary';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { MoviesScreen, MoviePlayerScreen } from './src/screens/MoviesScreen';
import { BlogsScreen, BlogDetailScreen } from './src/screens/BlogsScreen';

import { LibraryScreen } from './src/screens/LibraryScreen';
import { MemberScreen } from './src/screens/MemberScreen';
import { WeekRankScreen } from './src/screens/WeekRankScreen';
import { ComicCommentScreen } from './src/screens/ComicCommentScreen';
import { RegisterScreen, ForgotPasswordScreen } from './src/screens/AuthScreens';
import { PicaDetailScreen } from './src/screens/PicaDetailScreen';
import { PicaCategoryResultScreen } from './src/screens/PicaCategoryResultScreen';
import { PicaCreatorResultScreen } from './src/screens/PicaCreatorResultScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { ImageSearchScreen } from './src/screens/ImageSearchScreen';
import { DownloadListScreen } from './src/screens/DownloadListScreen';
import { LogsScreen } from './src/screens/LogsScreen';
import { ShuntSelectorScreen } from './src/screens/ShuntSelectorScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 错误边界包裹组件（避免匿名函数导致 RN 重新挂载）
function ComicDetailWrapper() {
  return <ErrorBoundary title="漫画详情"><ComicDetailScreen /></ErrorBoundary>;
}
function PicaDetailWrapper() {
  return <ErrorBoundary title="Pica 详情"><PicaDetailScreen /></ErrorBoundary>;
}
function ReaderScreenWrapper() {
  return <ErrorBoundary title="阅读器"><ReaderScreen /></ErrorBoundary>;
}

// 通用错误边界包裹
function withErrorBoundary(Comp: React.ComponentType<any>, title: string) {
  return function Wrapped() {
    return <ErrorBoundary title={title}><Comp /></ErrorBoundary>;
  };
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { colors } = useAppTheme();
  return (
    <MaterialIcons
      name={name as any}
      size={24}
      color={focused ? colors.primary : colors.outlineVariant}
    />
  );
}

function HomeTabs() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web' ? colors.surfaceContainer : undefined,
          borderTopWidth: 0.5,
          borderTopColor: colors.outlineVariant,
          paddingBottom: insets.bottom || 8,
          height: 56 + (insets.bottom || 8),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outlineVariant,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginBottom: 4 },
        tabBarIconStyle: { marginTop: 4 },
      }}
    >
            <Tab.Screen name="Home" component={withErrorBoundary(MainScreen, '首页')}
        options={{ tabBarLabel: t('nav.home'), tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tab.Screen name="Categories" component={withErrorBoundary(CategoriesScreen, '分类')}
        options={{ tabBarLabel: t('nav.categories'), tabBarIcon: ({ focused }) => <TabIcon name="window" focused={focused} /> }} />
      <Tab.Screen name="Search" component={withErrorBoundary(SearchScreen, '搜索')}
        options={{ tabBarLabel: '搜索', tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} /> }} />
            <Tab.Screen name="Movies" component={withErrorBoundary(MoviesScreen, '影视')}
        options={{ tabBarLabel: t('nav.movie'), tabBarIcon: ({ focused }) => <TabIcon name="video-library" focused={focused} /> }} />
            <Tab.Screen name="Member" component={withErrorBoundary(MemberScreen, '我的')}
        options={{ tabBarLabel: t('nav.member'), tabBarIcon: ({ focused }) => <TabIcon name="account-circle" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function AppInner() {
  const { colors, resolvedScheme } = useAppTheme();

  const navTheme = useMemo<Theme>(() => ({
    dark: resolvedScheme === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outline,
      notification: colors.primary,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  }), [colors, resolvedScheme]);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: '返回',
        }}
      >
        <Stack.Screen name="Main" component={withErrorBoundary(HomeTabs, '首页')} options={{ headerShown: false }} />
        <Stack.Screen name="Search" component={withErrorBoundary(SearchScreen, '搜索')}
          options={{ headerShown: false }} />
        <Stack.Screen name="ComicDetail" component={ComicDetailWrapper}
          options={{ title: '详情', headerBackTitle: '返回' }} />
        <Stack.Screen name="Reader" component={ReaderScreenWrapper}
          options={{ headerShown: false, orientation: 'default' as const }} />
        <Stack.Screen name="MoviePlayer" component={withErrorBoundary(MoviePlayerScreen, '播放器')}
          options={{ headerShown: false }} />
        <Stack.Screen name="PicaDetail" component={PicaDetailWrapper}
          options={{ title: '详情', headerBackTitle: '返回' }} />
        <Stack.Screen name="PicaCreatorResult" component={withErrorBoundary(PicaCreatorResultScreen, '创作者')}
          options={{ title: '' }} />
        <Stack.Screen name="PicaCategoryResult" component={withErrorBoundary(PicaCategoryResultScreen, '分类结果')}
          options={{ title: '分类结果' }} />
        <Stack.Screen name="PicaReader" component={ReaderScreenWrapper}
          options={{ headerShown: false }} />
        <Stack.Screen name="Blogs" component={withErrorBoundary(BlogsScreen, '公告')}
          options={{ headerShown: false }} />
        <Stack.Screen name="BlogDetail" component={withErrorBoundary(BlogDetailScreen, '公告详情')}
          options={{ headerShown: false }} />
        <Stack.Screen name="Library" component={withErrorBoundary(LibraryScreen, '收藏')}
          options={{ headerShown: false }} />
        <Stack.Screen name="WeekRank" component={withErrorBoundary(WeekRankScreen, '周榜')}
          options={{ headerShown: false }} />
        <Stack.Screen name="ComicComment" component={withErrorBoundary(ComicCommentScreen, '评论')}
          options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="Register" component={withErrorBoundary(RegisterScreen, '注册')}
          options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={withErrorBoundary(ForgotPasswordScreen, '忘记密码')}
          options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="ImageSearch" component={withErrorBoundary(ImageSearchScreen, '以图搜图')}
          options={{ title: '以图搜图', headerBackTitle: '返回' }} />
        <Stack.Screen name="About" component={withErrorBoundary(AboutScreen, '关于')}
          options={{ headerShown: false }} />
        <Stack.Screen name="DownloadList" component={withErrorBoundary(DownloadListScreen, '下载')}
          options={{ headerShown: false }} />
        <Stack.Screen name="Logs" component={withErrorBoundary(LogsScreen, '日志')}
          options={{ headerShown: false }} />
        <Stack.Screen name="ShuntSelector" component={withErrorBoundary(ShuntSelectorScreen, '源')}
          options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  // 全局错误 + Promise rejection 捕获
  useEffect(() => {
    // ErrorUtils
    try {
      const origHandler = (ErrorUtils as any).getGlobalHandler?.();
      (ErrorUtils as any).setGlobalHandler?.((e: any, isFatal?: boolean) => {
        logger.fatal('unhandled', e);
        logger.init();
        if (origHandler) origHandler(e, isFatal);
      });
    } catch {}

    // Promise rejection
    const onUnhandledRejection = (event: any) => {
      const reason = event?.reason || event;
      logger.error('unhandled_rejection', reason);
    };
    // @ts-ignore
    if (global.addEventListener) {
      // @ts-ignore
      global.addEventListener('unhandledrejection', onUnhandledRejection);
    }
  }, []);
  const { load: loadSettings, updateFromSetting, selectShunt, theme } = useSettingsStore();
  const { load: loadAuth } = useAuthStore();
  const [showSourceSelect, setShowSourceSelect] = useState(false);
  const [savedShunt, setSavedShunt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadAuth();
      await usePicaStore.getState().load();

      const saved = await loadSelectedShunt();
      setSavedShunt(saved);

      try { const { cleanImageCache } = await import('./src/utils/ImageCache'); cleanImageCache(); } catch {}

      // 先用缓存的 shunts 显示首页，后台拉取最新
      setReady(true);

      try {
        const url = useSettingsStore.getState().customConfigUrl;
        const setting = await fetchSetting(url || undefined);
        updateFromSetting(setting);
        if (saved !== null) selectShunt(saved);
      } catch {}

      try { logger.init(); } catch {}
      try { downloadManager.init(); } catch {}
      try { await useHistoryStore.getState().load(); } catch {}
    })();
  }, []);

  useEffect(() => {
    if (ready) {
      // 默认为快速通道
      const { shunts, selectedShuntKey } = useSettingsStore.getState();
      if (selectedShuntKey === 0 && shunts.some((s) => s.key === 0)) {
        selectShunt(0);
      }
    }
  }, [ready]);

  if (!ready) {
    const { colors } = useSettingsStore.getState().theme === 'light'
      ? (() => { const { lightColors } = require('./src/theme/colors'); return { colors: lightColors }; })()
      : { colors: null };
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1210' }}>
          <ActivityIndicator size="large" color="#FFB59F" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider themeMode={theme}>
        <AppInner />
        <SourceSelectModal visible={showSourceSelect} onDone={() => setShowSourceSelect(false)} />
        <DebugOverlay />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
