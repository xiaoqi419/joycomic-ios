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
import { PicaReaderScreen } from './src/screens/PicaReaderScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { DownloadListScreen } from './src/screens/DownloadListScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 错误边界包裹组件（避免匿名函数导致 RN 重新挂载）
function ComicDetailWrapper() {
  return <ErrorBoundary title="漫画详情"><ComicDetailScreen /></ErrorBoundary>;
}
function PicaDetailWrapper() {
  return <ErrorBoundary title="Pica 详情"><PicaDetailScreen /></ErrorBoundary>;
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
      <Tab.Screen name="Home" component={MainScreen}
        options={{ tabBarLabel: t('nav.home'), tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tab.Screen name="Categories" component={CategoriesScreen}
        options={{ tabBarLabel: t('nav.categories'), tabBarIcon: ({ focused }) => <TabIcon name="window" focused={focused} /> }} />
      <Tab.Screen name="Search" component={SearchScreen}
        options={{ tabBarLabel: '搜索', tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} /> }} />
      <Tab.Screen name="Movies" component={MoviesScreen}
        options={{ tabBarLabel: t('nav.movie'), tabBarIcon: ({ focused }) => <TabIcon name="video-library" focused={focused} /> }} />
      <Tab.Screen name="Member" component={MemberScreen}
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
        <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ComicDetail" component={ComicDetailWrapper}
          options={{ title: '详情', headerBackTitle: '返回' }} />
        <Stack.Screen name="Reader" component={ReaderScreen}
          options={{ headerShown: false, orientation: 'default' as const }} />        <Stack.Screen name="MoviePlayer" component={MoviePlayerScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="PicaDetail" component={PicaDetailWrapper}
          options={{ title: '详情', headerBackTitle: '返回' }} />
        <Stack.Screen name="PicaCreatorResult" component={PicaCreatorResultScreen}
          options={{ title: '' }} />
        <Stack.Screen name="PicaCategoryResult" component={PicaCategoryResultScreen}
          options={{ title: '分类结果' }} />
        <Stack.Screen name="PicaReader" component={PicaReaderScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="Blogs" component={BlogsScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="BlogDetail" component={BlogDetailScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="Library" component={LibraryScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="WeekRank" component={WeekRankScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="ComicComment" component={ComicCommentScreen}
          options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen}
          options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}
          options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="DownloadList" component={DownloadListScreen}
          options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  // 全局 JS 错误捕获
  useEffect(() => {
    const origHandler = (ErrorUtils as any).getGlobalHandler?.();
    (ErrorUtils as any).setGlobalHandler?.((e: any, isFatal?: boolean) => {
      console.error('[GlobalError]', e?.message || e, 'isFatal:', isFatal);
      // 仍然保留原始处理，避免完全静默
      if (origHandler) origHandler(e, isFatal);
    });
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

      try {
        const setting = await fetchSetting();
        updateFromSetting(setting);
        if (saved !== null) {
          selectShunt(saved);
        }
      } catch {}

      try { downloadManager.init(); } catch {}
      try { await useHistoryStore.getState().load(); } catch {}

      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready && savedShunt === null) {
      const { shunts } = useSettingsStore.getState();
      if (shunts.length > 0) {
        setShowSourceSelect(true);
      }
    }
  }, [ready, savedShunt]);

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
