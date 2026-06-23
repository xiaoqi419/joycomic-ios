// 主入口 - 樱花绯红主题
// @author Jason

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { AlbumDetailScreen } from './src/screens/AlbumDetailScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useSettingsStore, useFavoritesStore } from './src/store';
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

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <View style={{ alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22, color: focused ? Colors.tabActive : Colors.tabInactive }}>{icon}</Text></View>;
}

function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: Colors.tabBar, borderTopColor: Colors.tabBarBorder, borderTopWidth: 1 }, tabBarActiveTintColor: Colors.tabActive, tabBarInactiveTintColor: Colors.tabInactive, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '首页', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: '搜索', tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} /> }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarLabel: '收藏', tabBarIcon: ({ focused }) => <TabIcon icon="⭐" focused={focused} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: '设置', tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    useSettingsStore.getState().loadSettings();
    useFavoritesStore.getState().loadFavorites();
    // 预热 API（获取 CloudFlare cookies）
    import('./src/api/client').then(m => m.apiClient.warmUp().catch(() => {}));
  }, []);
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: Colors.surfaceLowest }, headerTintColor: Colors.textPrimary, headerTitleStyle: { fontWeight: '700' }, headerShadowVisible: false, contentStyle: { backgroundColor: Colors.background } }}>
          <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} options={{ title: '详情', headerBackTitle: '返回' }} />
          <Stack.Screen name="Reader" component={ReaderScreen} options={{ headerShown: false, orientation: 'landscape' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
