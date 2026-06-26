// 搜索页 — 复刻 APK Search.tsx
// 搜索历史 + 热门标签 + 随机推荐 + 多类型切换 + 排序
// @author nyx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, RefreshControl,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Radius } from '../theme';
import { ComicCard } from '../components/ComicCard';
import { searchComics, fetchHotTags, fetchRandomRecommend, getCoverUrl as getCover } from '../api/endpoints';
import type { ComicItem } from '../api/types';

const SORT_OPTS = ['tf', 'mv', 'mp', 'mr'];
const HISTORY_KEY = '@jmcomic.search';

export function SearchScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const queryParams = useRoute<any>().params;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComicItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('tf');
  const [history, setHistory] = useState<string[]>([]);
  const [hotTags, setHotTags] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<ComicItem[]>([]);

  // 加载历史、热标签、推荐
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((json) => {
      if (json) setHistory(JSON.parse(json));
    });
    fetchHotTags().then(setHotTags).catch(() => {});
    fetchRandomRecommend().then(setRecommend).catch(() => {});
  }, []);

  const doSearch = useCallback(async (q: string, p = 1, refresh = false) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await searchComics({ search_query: q, page: p, o: sort });
      if (data.redirect_aid) {
        nav.navigate('ComicDetail', { albumId: data.redirect_aid });
        return;
      }
      const items = (data.content || []).map((c) => ({
        id: c.id, name: c.name, author: c.author, image: c.image,
        category: c.category, category_sub: c.category_sub,
        update_at: c.update_at, liked: c.liked, is_favorite: c.is_favorite,
      }));
      if (refresh || p === 1) setResults(items);
      else setResults((prev) => [...prev, ...items]);
      setTotal(parseInt(data.total) || items.length);
      setHasMore(items.length >= 80);
      setSearched(true);
      // 存历史
      if (p === 1) {
        const newHistory = [q, ...history.filter((h) => h !== q)].slice(0, 20);
        setHistory(newHistory);
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch {}
    setLoading(false);
  }, [sort, history]);

  const onSearch = () => {
    setPage(1);
    doSearch(query, 1, true);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const np = page + 1;
    setPage(np);
    doSearch(query, np);
  };

  const getCoverUrl = (id: string) => getCover(id);

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <StatusBar style="light" />
      <FlatList
        data={results}
        numColumns={3}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={{ paddingTop: 8 }}>
            {/* 搜索框 */}
            <View style={styles.searchWrap}>
              <MaterialIcons name="search" size={20} color={Colors.textTertiary} style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.input}
                placeholder={t('search.placeholder')}
                placeholderTextColor={Colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={onSearch}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => { setQuery(''); setSearched(false); setResults([]); }} hitSlop={8}>
                  <MaterialIcons name="close" size={18} color={Colors.textTertiary} style={{ marginRight: 8 }} />
                </Pressable>
              )}
            </View>

            {/* 排序 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {SORT_OPTS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { setSort(s); if (searched) doSearch(query, 1, true); }}
                  style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
                >
                  <Text style={[styles.sortText, sort === s && styles.sortTextActive]}>
                    {t(`search.sort_${s}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* 搜索按钮 */}
            <Pressable onPress={onSearch} style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <MaterialIcons name="search" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>{t('search.title')}</Text>
            </Pressable>

            {!searched && (
              <>
                {/* 热门标签 */}
                {hotTags.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.sectionTitle}>{t('search.hot_tags')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {hotTags.slice(0, 15).map((tag) => (
                        <Pressable
                          key={tag}
                          onPress={() => { setQuery(tag); setTimeout(onSearch, 100); }}
                          style={styles.tag}
                        >
                          <Text style={styles.tagText}>{tag}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* 搜索历史 */}
                {history.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.sectionTitle}>{t('search.history')}</Text>
                      <Pressable onPress={() => { setHistory([]); AsyncStorage.removeItem(HISTORY_KEY); }}>
                        <Text style={{ color: Colors.error, fontSize: FontSize.label }}>{t('search.clear_history')}</Text>
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {history.map((h) => (
                        <Pressable
                          key={h}
                          onPress={() => { setQuery(h); setTimeout(onSearch, 100); }}
                          style={styles.tag}
                        >
                          <Text style={styles.tagText}>{h}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* 随机推荐 */}
                {recommend.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.sectionTitle}>随机推荐</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {recommend.slice(0, 3).map((item) => (
                        <Pressable key={item.id} onPress={() => nav.navigate('ComicDetail', { albumId: item.id })}>
                          <View style={{ width: (W - Spacing.marginEdge * 2 - 16) / 3 }}>
                            <Image source={{ uri: getCoverUrl(item.id) }} style={{ width: '100%', aspectRatio: 0.72, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
                            <Text style={[styles.tagText, { marginTop: 4 }]} numberOfLines={2}>{item.name}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {searched && results.length === 0 && !loading && (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <MaterialIcons name="search-off" size={48} color={Colors.textTertiary} />
                <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>{t('search.no_result')}</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ComicCard id={item.id} title={item.name} coverUrl={getCoverUrl(item.id)} onPress={(id) => nav.navigate('ComicDetail', { albumId: id })} />
        )}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color={Colors.primary} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}

import { Image } from 'expo-image';

const { width: W } = Dimensions.get('window');
import { Dimensions } from 'react-native';

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  sectionTitle: { fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  input: { flex: 1, height: 40, paddingHorizontal: 8, color: Colors.textPrimary, fontSize: 15 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, backgroundColor: Colors.primary, gap: 6, marginBottom: 8 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.surfaceLight, marginRight: 6, borderWidth: 1, borderColor: Colors.border },
  sortBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortText: { fontSize: FontSize.label, color: Colors.textSecondary },
  sortTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontSize: 12, color: Colors.textSecondary },
});
