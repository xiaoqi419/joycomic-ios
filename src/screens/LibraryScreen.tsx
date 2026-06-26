// 收藏库 — 复刻 APK Library.tsx
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { useAuthStore } from '../store/useAuth';
import { useFavoritesStore } from '../store/useFavorites';
import { fetchFavorites, getCoverUrl as getCover } from '../api/endpoints';
import type { FavoriteItem, FavoriteFolder } from '../api/types';

export function LibraryScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const { loggedIn } = useAuthStore();
  const { local, loadLocal } = useFavoritesStore();
  const [online, setOnline] = useState<FavoriteItem[]>([]);
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocal();
    if (loggedIn) {
      fetchFavorites().then((d) => {
        setOnline(d.list || []);
        setFolders(d.folder_list || []);
        setTotal(parseInt(d.total) || 0);
      }).finally(() => setLoading(false));
    } else setLoading(false);
  }, [loggedIn]);

  const items = loggedIn && online.length > 0 ? online : local;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary }}>{t('library.title')}</Text>
              <Text style={{ color: Colors.textSecondary }}>{t('library.total', { n: total || items.length })}</Text>
            </View>
            {folders.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {folders.map((f) => (
                  <Pressable key={f.FID} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.surfaceLight, marginRight: 6, borderWidth: 1, borderColor: Colors.border }}>
                    <Text style={{ fontSize: FontSize.label, color: Colors.textSecondary }}>{f.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('ComicDetail', { albumId: item.id })} style={{ flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 10, marginBottom: 8 }}>
            <Image source={{ uri: (item as any).image || (item as any).coverUrl || getCover(item.id) }} style={{ width: 60, height: 80, borderRadius: Radius.xs, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
              <Text style={{ fontWeight: '600', color: Colors.textPrimary }} numberOfLines={2}>{(item as any).name || (item as any).title}</Text>
              {(item as any).author && <Text style={{ fontSize: FontSize.label, color: Colors.textSecondary, marginTop: 2 }}>{(item as any).author}</Text>}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 60 }}><MaterialIcons name="bookmark-border" size={48} color={Colors.textTertiary} /><Text style={{ color: Colors.textSecondary, marginTop: 12 }}>{t('library.empty')}</Text></View>}
      />
    </SafeAreaView>
  );
}

import { ScrollView } from 'react-native';
