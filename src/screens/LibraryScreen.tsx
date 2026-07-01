// 收藏库 v2
// @author nyx

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, Radius, Spacing, FontSize, Shadow } from '../theme';
import { useAuthStore } from '../store/useAuth';
import { useFavoritesStore } from '../store/useFavorites';
import { fetchFavorites, getCoverUrl as getCover } from '../api/endpoints';
import type { FavoriteItem, FavoriteFolder } from '../api/types';

export function LibraryScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const { loggedIn } = useAuthStore();
  const { local, loadLocal } = useFavoritesStore();
  const [online, setOnline] = useState<FavoriteItem[]>([]);
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loggedIn) {
      Alert.alert('提示', '请先登录后再查看收藏', [
        { text: '取消', onPress: () => nav.goBack() },
        { text: '去登录', onPress: () => nav.navigate('Member') },
      ]);
      setLoading(false);
      return;
    }
    loadLocal();
    fetchFavorites().then((d) => {
      setOnline(d.list || []);
      setFolders(d.folder_list || []);
      setTotal(parseInt(d.total) || 0);
    }).finally(() => setLoading(false));
  }, [loggedIn]);

  const items: any[] = loggedIn && online.length > 0 ? online : local;

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={styles.title}>{t('library.title')}</Text>
              <Text style={styles.total}>{t('library.total', { n: total || items.length })}</Text>
            </View>
            {folders.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {folders.map((f) => (
                  <Pressable key={f.FID} style={styles.folderChip}>
                    <MaterialIcons name="folder" size={14} color={C.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.folderChipText}>{f.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('ComicDetail', { albumId: item.id })} style={styles.item}>
            <Image
              source={{ uri: (item as any).image || (item as any).coverUrl || getCover(item.id) }}
              style={styles.itemCover}
              contentFit="cover"
            />
            <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
              <Text style={styles.itemTitle} numberOfLines={2}>{(item as any).name || (item as any).title}</Text>
              {(item as any).author && <Text style={styles.itemAuthor}>{(item as any).author}</Text>}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <MaterialIcons name="bookmark-border" size={48} color={C.textTertiary} />
            <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: FontSize.body }}>{t('library.empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    title: { fontSize: FontSize.largeTitle, fontWeight: '800', color: C.textPrimary },
    total: { color: C.textSecondary, fontSize: FontSize.body },
    folderChip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.xl,
      backgroundColor: C.surface, marginRight: 8,
      borderWidth: 1, borderColor: C.border,
    },
    folderChipText: { fontSize: FontSize.label, color: C.textSecondary },
    item: {
      flexDirection: 'row',
      backgroundColor: C.surface, borderRadius: Radius.card,
      padding: 12, marginBottom: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
    },
    itemCover: { width: 60, height: 80, borderRadius: Radius.sm, backgroundColor: C.surfaceContainer },
    itemTitle: { fontWeight: '600', color: C.textPrimary, fontSize: FontSize.body },
    itemAuthor: { fontSize: FontSize.label, color: C.textSecondary, marginTop: 4 },
  });
}
