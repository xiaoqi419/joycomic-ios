// 主入口 - 樱花绯红主题
// @author Jason

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { AlbumDetailScreen } from './src/screens/AlbumDetailScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useSettingsStore, useFavoritesStore } from './src/store';
import { detectServers } from './src/utils/serverDetect';
import { Colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme: Theme = {
  dark: false,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surfaceLowest,
    text: Colors.textPrimary,
    border: Colors.tabBarBorder,
    notification: Colors.primary,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

// MaterialIcons 图标组件
function TabIcon({ name, focused }: { name: keyof typeof MaterialIcons.glyphMap; focused: boolean }) {
  return (
    <MaterialIcons
      name={name}
      size={24}
      color={focused ? Colors.tabActive : Colors.tabInactive}
    />
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(60,60,67,0.08)',
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: 'rgba(60,60,67,0.4)',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
    }}>
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarLabel: '首页', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tab.Screen name="Search" component={SearchScreen}
        options={{ tabBarLabel: '搜索', tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} /> }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen}
        options={{ tabBarLabel: '收藏', tabBarIcon: ({ focused }) => <TabIcon name="favorite" focused={focused} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen}
        options={{ tabBarLabel: '设置', tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const { loadSettings, autoSelectServer, setServers, setDetectingServers, selectedServer } = useSettingsStore();

  useEffect(() => {
    (async () => {
      await loadSettings();
      await useFavoritesStore.getState().loadFavorites();

      // 检测服务器
      if (autoSelectServer || !selectedServer) {
        setDetectingServers(true);
        const servers = await detectServers();
        setServers(servers);
        setDetectingServers(false);

        // 自动选择最快的
        if (autoSelectServer) {
          const fastest = servers.find(s => s.available);
          if (fastest) {
            useSettingsStore.getState().setSelectedServer(fastest.domain);
          }
        }
      }

      // 预热 API
      import('./src/api/client').then(m => m.apiClient.warmUp().catch(() => {}));
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{
          headerStyle: { backgroundColor: Colors.surfaceLowest },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
        }}>
          <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen}
            options={{ title: '详情', headerBackTitle: '返回' }} />
          <Stack.Screen name="Reader" component={ReaderScreen}
            options={{ headerShown: false, orientation: 'landscape' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
