// 分类浏览 — 复刻 APK Categories.tsx
// @author nyx

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSize, Radius } from '../theme';
import { ComicCard } from '../components/ComicCard';
import { fetchCategoriesFilter, getCoverUrl as getCover } from '../api/endpoints';
import type { ComicItem } from '../api/types';

const SORTS = [
  { id: 'tf', labelKey: 'search.sort_tf' },
  { id: 'mv', labelKey: 'search.sort_mv' },
  { id: 'mp', labelKey: 'search.sort_mp' },
  { id: 'mr', labelKey: 'search.sort_mr' },
];

const CATS = [
  { id: 'doujin', label: '同人' },
  { id: 'single', label: '单行本' },
  { id: 'cg', label: 'CG' },
  { id: 'comic', label: '漫画' },
  { id: 'hanman', label: '韩漫' },
  { id: 'meiman', label: '美漫' },
];

export function CategoriesScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const [list, setList] = useState<ComicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slug, setSlug] = useState('doujin');
  const [sort, setSort] = useState('tf');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (p: number, refresh = false) => {
    try {
      const data = await fetchCategoriesFilter({ c: slug, page: p, o: sort });
      if (refresh || p === 1) setList(data.list || []);
      else setList((prev) => [...prev, ...(data.list || [])]);
      setHasMore((data.list || []).length >= 30);
    } catch {}
  }, [slug, sort]);

  useEffect(() => {
    setLoading(true);
    load(1, true).finally(() => setLoading(false));
  }, [slug, sort]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const np = page + 1;
    setPage(np);
    load(np);
  }, [page, hasMore, loading, load]);

  const getCoverUrl = (id: string) => getCover(id);

  return (
    <SafeAreaView style={styles.cont}>
      <FlatList
        data={list}
        numColumns={3}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>分类</Text>
            {/* 分类标签 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {CATS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => { setSlug(c.id); setPage(1); }}
                  style={[styles.chip, slug === c.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, slug === c.id && styles.chipTextActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* 排序 */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {SORTS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => { setSort(s.id); setPage(1); }}
                  style={[styles.sortBtn, sort === s.id && styles.sortBtnActive]}
                >
                  <Text style={[styles.sortText, sort === s.id && styles.sortTextActive]}>{t(s.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ComicCard id={item.id} title={item.name} coverUrl={getCoverUrl(item.id)} onPress={(id) => nav.navigate('ComicDetail', { albumId: id })} />
        )}
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: 20 }} color={Colors.primary} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.xl, backgroundColor: Colors.surfaceLight, marginRight: 6, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.label, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textOnPrimary },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  sortBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortText: { fontSize: FontSize.label, color: Colors.textSecondary },
  sortTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
});
