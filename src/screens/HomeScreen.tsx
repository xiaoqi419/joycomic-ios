// 首页 - 樱花绯红主题
// @author Jason

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ComicCard } from '../components/ComicCard';
import { getCategoryAlbums } from '../api/mobile';
import type { SearchResult } from '../api/types';
import { CATEGORIES, SORT_OPTIONS } from '../constants';
import { Colors, Radius, Spacing, FontSize } from '../theme';

export function HomeScreen({ navigation }: any) {
  const [albums, setAlbums] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('mv');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetch = useCallback(async (p: number, refresh = false) => {
    try {
      setError('');
      const r = await getCategoryAlbums({ page: p, category: cat, sort });
      if (refresh || p === 1) setAlbums(r.content);
      else setAlbums(prev => [...prev, ...r.content]);
      setHasMore(r.content.length >= 20);
    } catch (e: any) {
      console.error('首页加载失败:', e.message);
      setError(e.message || '加载失败');
    }
  }, [cat, sort]);

  useEffect(() => { setLoading(true); setPage(1); fetch(1, true).finally(() => setLoading(false)); }, [fetch]);

  const Chip = ({ items, active, onPress }: any) => (
    <FlatList horizontal showsHorizontalScrollIndicator={false} data={items} keyExtractor={i => i.id}
      contentContainerStyle={{ paddingVertical: Spacing.xs, gap: Spacing.sm }}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.chip, active === item.id && styles.chipActive]} onPress={() => onPress(item.id)} activeOpacity={0.7}>
          <Text style={[styles.chipText, active === item.id && styles.chipTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      )}
    />
  );

  if (loading) return <SafeAreaView style={styles.container}><StatusBar style="dark" /><View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <FlatList data={albums} numColumns={2} keyExtractor={i => i.id} columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingBottom: Spacing.xl }}
        ListHeaderComponent={
          <View>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.sm }]}>分类</Text>
            <Chip items={CATEGORIES} active={cat} onPress={(val: string) => { setCat(val); setPage(1); }} />
            <Text style={styles.sectionTitle}>排序</Text>
            <Chip items={SORT_OPTIONS} active={sort} onPress={(val: string) => { setSort(val); setPage(1); }} />
            <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.md }} />
          </View>
        }
        renderItem={({ item }) => <ComicCard id={item.id} title={item.name} coverUrl={item.coverUrl} tags={item.tags} onPress={id => navigation.navigate('AlbumDetail', { albumId: id })} />}
        ListEmptyComponent={!loading && error ? <View style={{ alignItems: 'center', marginTop: 40, padding: 20 }}><Text style={{ color: Colors.error, fontSize: FontSize.body, textAlign: 'center' }}>{error}</Text><Text style={{ color: Colors.textTertiary, fontSize: FontSize.label, marginTop: 8, textAlign: 'center' }}>请确保网络连接正常，或尝试切换分类</Text></View> : null}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ paddingVertical: Spacing.lg }} color={Colors.primary} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetch(1, true); setRefreshing(false); }} tintColor={Colors.primary} />}
        onEndReached={async () => { if (!hasMore || loadingMore) return; setLoadingMore(true); const np = page + 1; await fetch(np); setPage(np); setLoadingMore(false); }}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.chip, backgroundColor: Colors.surfaceLowest, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.label, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
});
