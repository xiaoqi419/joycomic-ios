// 搜索页 v3 — 双源聚合搜索 (JMComic + Pica)
// @author Jason

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, RefreshControl,
  ActivityIndicator, ScrollView, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLegacyColors, LegacyColors, Spacing, FontSize, Radius } from '../theme';
import { fetchHotTags, fetchRandomRecommend, searchComics, getCoverUrl as getCover } from '../api/endpoints';
import { picaCategories } from '../pica/endpoints';
import { jmLogger } from '../utils/JmLogger';
import { setCache, getCache } from '../utils/cache';
import { parseBooleanQuery, applyBooleanFilter } from '../utils/booleanSearch';
import { SortAndFilterToolbar } from '../components/SortAndFilterToolbar';
import { CategoryFilterSheet } from '../components/CategoryFilterSheet';
import { EmptyState } from '../components/EmptyState';
import type { SourceItem } from '../sources/types';
import type { ComicItem } from '../api/types';
import { isPicaEnabled } from '../sources/pica';
import { picaSource } from '../sources/pica';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.marginEdge * 2 - 10 * 2) / 3;

const SORT_OPTS = ['tf', 'mv', 'mp', 'mr'];
const HISTORY_KEY = '@jmcomic.search';

export function SearchScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const routeParams = useRoute<any>().params;
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);

  const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
    jmcomic: { label: 'JM', color: C.primary },
    pica: { label: 'Pica', color: '#9B59B6' },
  };

  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<SourceItem[]>([]);
  const [jmResults, setJmResults] = useState<SourceItem[]>([]);
  const [picaResults, setPicaResults] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('tf');
  const [history, setHistory] = useState<string[]>([]);
  const [hotTags, setHotTags] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<ComicItem[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'jmcomic' | 'pica'>('all');
  const [picaCatList, setPicaCatList] = useState<{title: string}[]>([]);
  const [picaCatFilter, setPicaCatFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<{ jm?: string[]; pica?: string[] }>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlatList>(null);
  const searchingRef = useRef(false);

  const displayedResults = useMemo(() => {
    if (filterMode === 'jmcomic') return jmResults;
    if (filterMode === 'pica') return picaResults;
    return results;
  }, [filterMode, jmResults, picaResults, results]);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((json) => {
      if (json) setHistory(JSON.parse(json));
    });
    fetchHotTags().then(setHotTags).catch(() => {});
    fetchRandomRecommend().then(setRecommend).catch(() => {});
    picaCategories().then((d) => {
      const all = ((d as any).categories || []).filter((c: any) => c.isWeb !== true);
      setPicaCatList(all);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const q = routeParams?.query;
    if (q && typeof q === 'string' && q !== query) {
      setQuery(q);
      setTimeout(() => doSearch(q, 1, true), 100);
    }
  }, [routeParams?.query]);

  const doSearch = useCallback(async (q: string, p = 1, refresh = false) => {
    if (!q.trim() || searchingRef.current) return;

    // 尝试从缓存读取
    if (!refresh && p === 1) {
      const cached = getCache<{ items: SourceItem[]; total: number }>(`search:${q}:${sort}`);
      if (cached) {
        setResults(cached.items);
        setJmResults(cached.items.filter((i) => i.source === 'jmcomic'));
        setPicaResults(cached.items.filter((i) => i.source === 'pica'));
        setHasMore(cached.items.length >= 20);
        setSearched(true);
        setLoading(false);
        searchingRef.current = false;
        return;
      }
    }

    // 纯数字 → 直接跳到 JMComic 详情（兼容旧行为）
    if (/^\d{4,}$/.test(q.trim())) {
      setSearched(true);
      nav.navigate('ComicDetail', { albumId: q.trim() });
      return;
    }

    searchingRef.current = true;
    setLoading(true);
    jmLogger.log(`搜索: q="${q}" page=${p} sort=${sort}`);

    let agg: { items: SourceItem[]; total: number; redirect_aid?: string };

    jmLogger.log(`搜索: 检查 isPicaEnabled`);
    const picaAuthed = isPicaEnabled();
    jmLogger.log(`搜索: isPicaEnabled=${picaAuthed}`);

    try {
      jmLogger.log(`搜索: 并行执行 JM + Pica 搜索 q=${q} p=${p} sort=${sort}`);

      // 并行执行 JM 搜索 + Pica 搜索
      const [jmResult, picaResult] = await Promise.allSettled([
        (async () => {
          const res = await searchComics({ search_query: q, page: p, o: sort });
          return res;
        })(),
        (async () => {
          if (!picaAuthed) return null;
          return await picaSource.search(q, p, picaCatFilter ? { c: picaCatFilter } : undefined);
        })(),
      ]);

      // 处理 JM 结果
      let redirect_aid: string | undefined;
      let jmItems: SourceItem[] = [];
      if (jmResult.status === 'fulfilled' && jmResult.value) {
        const jmRes = jmResult.value;
        jmLogger.log(`搜索: JM 返回 keys=${Object.keys(jmRes).join(',')}`);
        if (jmRes.redirect_aid) {
          redirect_aid = jmRes.redirect_aid;
        } else {
          const content = jmRes.content || [];
          jmItems = await Promise.all(content.map(async (raw: any) => {
            const c: any = raw;
            const id = String(c.id || c.album_id || '');
            const title = c.name || c.title || '';
            const author = c.author?.name || (typeof c.author === 'string' ? c.author : '');
            const catRaw = c.tags || c.category || c.category_sub || [];
            let categories: string[] = [];
            if (Array.isArray(catRaw)) {
              categories = catRaw.map((t: any) => typeof t === 'string' ? t : (t.name || t.tag || String(t)));
            } else if (typeof catRaw === 'object' && catRaw !== null) {
              categories = Object.values(catRaw).filter(Boolean).map(String);
            }
            return { id, title, author, coverUrl: getCover(id), categories, source: 'jmcomic' as const };
          }));
        }
      } else {
        jmLogger.err(`搜索: JM 失败 ${(jmResult as any).reason?.message || (jmResult as any).reason}`);
      }

      // 处理 Pica 结果
      let picaItems: SourceItem[] = [];
      if (picaResult.status === 'fulfilled' && picaResult.value) {
        picaItems = picaResult.value.items;
        jmLogger.log(`搜索: Pica 返回 items=${picaItems.length}`);
      }

      if (redirect_aid) {
        agg = { items: [], total: 0, redirect_aid };
      } else {
        agg = { items: [...jmItems, ...picaItems], total: jmItems.length + picaItems.length };
      }
    } catch (e) {
      const err = e as any;
      jmLogger.err(`搜索内联失败: ${err?.message || e} stack=${(err?.stack || '').slice(0, 300)}`);
      agg = { items: [], total: 0 };
    }

    jmLogger.log(`搜索: 聚合结果 items=${agg.items.length} total=${agg.total} redirect=${agg.redirect_aid}`);

    // 布尔搜索客户端过滤（AND/NOT 条件）
    const parsed = parseBooleanQuery(q);
    if (parsed.andTerms.length > 0 || parsed.notTerms.length > 0) {
      const filtered = applyBooleanFilter(agg.items, parsed);
      jmLogger.log(`布尔过滤: ${agg.items.length} → ${filtered.length}`);
      agg.items = filtered;
    }

    // 重定向到详情
    if (agg.redirect_aid) {
      nav.navigate('ComicDetail', { albumId: agg.redirect_aid });
      setLoading(false);
      return;
    }

    if (refresh || p === 1) {
      setResults(agg.items);
      setJmResults(agg.items.filter((i) => i.source === 'jmcomic'));
      setPicaResults(agg.items.filter((i) => i.source === 'pica'));
    } else {
      setResults((prev) => [...prev, ...agg.items]);
      setJmResults((prev) => [...prev, ...agg.items.filter((i) => i.source === 'jmcomic')]);
      setPicaResults((prev) => [...prev, ...agg.items.filter((i) => i.source === 'pica')]);
    }

    setHasMore(agg.items.length >= 20);
    setSearched(true);

    // 写入缓存（仅第一页）
    if (p === 1 && agg.items.length > 0) {
      setCache(`search:${q}:${sort}`, { items: agg.items, total: agg.total }, 60_000);
    }

    // 写入历史
    if (p === 1) {
      const newHistory = [q, ...history.filter((h) => h !== q)].slice(0, 20);
      setHistory(newHistory);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }
    setLoading(false);
    searchingRef.current = false;
  }, [sort, history]);

  const onSearch = () => { setPage(1); doSearch(query, 1, true); };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const np = page + 1;
    setPage(np);
    doSearch(query, np);
  };

  const openDetail = (item: SourceItem) => {
    if (item.source === 'pica') {
      nav.navigate('PicaDetail', { comicId: item.id });
    } else {
      nav.navigate('ComicDetail', { albumId: item.id, sourceItem: item });
    }
  };

  const renderResultItem = ({ item }: { item: SourceItem }) => {
    const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.jmcomic;
    return (
      <Pressable
        onPress={() => openDetail(item)}
        style={({ pressed }) => [styles.resultCard, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.cardCoverWrap}>
          <Image source={{ uri: item.coverUrl }} style={styles.cardCover} contentFit="cover" />
          <View style={[styles.cardBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.cardBadgeText}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.author ? <Text style={styles.cardAuthor} numberOfLines={1}>{item.author}</Text> : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={searched ? displayedResults : []}
        keyExtractor={(i) => `${i.source}:${i.id}`}
        numColumns={3}
        columnWrapperStyle={searched && displayedResults.length > 0 ? { justifyContent: 'space-between' } : undefined}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
          if (!query.trim() || searchingRef.current) return;
          setRefreshing(true);
          await doSearch(query, 1, true);
          setRefreshing(false);
        }} tintColor={C.primary} />}
        onEndReached={searched ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        onScroll={(e) => setShowScrollTop(e.nativeEvent.contentOffset.y > 400)}
        scrollEventThrottle={100}
        renderItem={renderResultItem}
        ListHeaderComponent={
          <View style={{ paddingTop: 8 }}>
            <View style={styles.searchWrap}>
              <MaterialIcons name="search" size={20} color={C.textTertiary} style={{ marginLeft: 12 }} />
              <TextInput
                key="search-input"
                style={styles.input}
                placeholder={t('search.placeholder')}
                placeholderTextColor={C.textTertiary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={onSearch}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => { setQuery(''); setSearched(false); setResults([]); }} hitSlop={8}>
                  <MaterialIcons name="close" size={18} color={C.textTertiary} style={{ marginRight: 10 }} />
                </Pressable>
              )}
            </View>

            {/* 排序+筛选工具栏 */}
            {searched && (
              <SortAndFilterToolbar
                sort={sort as any}
                onSortChange={(s) => { setSort(s); if (searched) doSearch(query, 1, true); }}
                onFilterPress={() => setShowFilter(true)}
                hasFilter={(categoryFilter.jm?.length || categoryFilter.pica?.length || 0) > 0}
                source={filterMode === 'pica' ? 'pica' : 'jm'}
              />
            )}

            <Pressable onPress={onSearch} style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <MaterialIcons name="search" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>{t('search.title')}</Text>
            </Pressable>

            {searched && (
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
                {(['all', 'jmcomic', 'pica'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => {
                      if (m === 'pica' && !isPicaEnabled()) {
                        Alert.alert('提示', '请先登录 Pica 账号', [
                          { text: '取消', style: 'cancel' },
                          { text: '去登录', onPress: () => nav.navigate('Member') },
                        ]);
                        return;
                      }
                      setFilterMode(m);
                    }}
                    style={[styles.filterBtn, filterMode === m && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterBtnText, filterMode === m && styles.filterBtnTextActive]}>
                      {m === 'all' ? '聚合' : m === 'jmcomic' ? 'JM' : 'Pica'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Pica 分类筛选项 */}
            {searched && filterMode === 'pica' && picaCatList.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                <Pressable
                  onPress={() => setPicaCatFilter('')}
                  style={[styles.tag, !picaCatFilter && { backgroundColor: C.primary, borderColor: C.primary }]}
                >
                  <Text style={[styles.tagText, !picaCatFilter && { color: '#fff' }]}>全部</Text>
                </Pressable>
                {picaCatList.slice(0, 10).map((cat) => (
                  <Pressable
                    key={cat.title}
                    onPress={() => { setPicaCatFilter(cat.title); setPage(1); doSearch(query, 1, true); }}
                    style={[styles.tag, picaCatFilter === cat.title && { backgroundColor: C.primary, borderColor: C.primary }]}
                  >
                    <Text style={[styles.tagText, picaCatFilter === cat.title && { color: '#fff' }]}>{cat.title}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {!searched && (
              <>
                {hotTags.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.sectionTitle}>{t('search.hot_tags')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {hotTags.slice(0, 15).map((tag) => (
                        <Pressable
                          key={tag}
                          onPress={() => doSearch(tag, 1, true)}
                          style={styles.tag}
                        >
                          <Text style={styles.tagText}>{tag}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {history.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.sectionTitle}>{t('search.history')}</Text>
                      <Pressable onPress={() => { setHistory([]); AsyncStorage.removeItem(HISTORY_KEY); }}>
                        <Text style={{ color: C.error, fontSize: FontSize.label }}>{t('search.clear_history')}</Text>
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {history.map((h) => (
                        <View key={h} style={styles.historyChip}>
                          <Pressable onPress={() => doSearch(h, 1, true)}>
                            <Text style={styles.tagText}>{h}</Text>
                          </Pressable>
                          <Pressable onPress={() => {
                            const newHistory = history.filter((x) => x !== h);
                            setHistory(newHistory);
                            AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
                          }} hitSlop={8} style={{ marginLeft: 6 }}>
                            <MaterialIcons name="close" size={14} color={C.textTertiary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {recommend.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={styles.sectionTitle}>随机推荐</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {recommend.slice(0, 6).map((item) => (
                        <Pressable key={item.id} onPress={() => nav.navigate('ComicDetail', { albumId: item.id })} style={{ marginRight: 10, width: W * 0.35 }}>
                          <Image source={{ uri: getCover(item.id) }} style={{ width: '100%', aspectRatio: 0.7, borderRadius: Radius.card, backgroundColor: C.surfaceContainer }} contentFit="cover" />
                          <Text style={styles.recommendTitle} numberOfLines={2}>{item.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            {searched && results.length === 0 && !loading && (
              <EmptyState
                icon="search-off"
                title={t('search.no_result')}
                message="试试修改关键词或筛选条件"
                onRefresh={() => doSearch(query, 1, true)}
                refreshLabel="重新搜索"
              />
            )}

            {searched && loading && (
              <ActivityIndicator style={{ padding: 20 }} color={C.primary} />
            )}
          </View>
        }
        ListEmptyComponent={!loading && searched ? null : <View style={{ height: 1 }} />}
        keyboardShouldPersistTaps="handled"
      />
      {showScrollTop && (
        <Pressable onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} style={styles.scrollTopBtn}>
          <MaterialIcons name="keyboard-arrow-up" size={28} color="#fff" />
        </Pressable>
      )}
      <CategoryFilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onConfirm={(cats) => {
          setCategoryFilter(cats);
          setPage(1);
          if (searched) doSearch(query, 1, true);
        }}
        initialSelected={categoryFilter}
        source={filterMode === 'pica' ? 'pica' : filterMode === 'jmcomic' ? 'jm' : 'all'}
      />
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    sectionTitle: { fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: C.border,
    },
    input: { flex: 1, height: 44, paddingHorizontal: 8, color: C.textPrimary, fontSize: FontSize.body },
    searchBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      height: 44, borderRadius: Radius.button, backgroundColor: C.primary, gap: 6, marginTop: 8, marginBottom: 4,
    },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
    sortBtn: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl,
      backgroundColor: C.surface, marginRight: 8,
      borderWidth: 1, borderColor: C.border,
    },
    sortBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    sortText: { fontSize: FontSize.label, color: C.textSecondary },
    sortTextActive: { color: C.textOnPrimary, fontWeight: '600' },
    tag: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    },
    tagText: { fontSize: FontSize.label, color: C.textSecondary },
    historyChip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.xl,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    },
    recommendTitle: {
      fontSize: FontSize.label, color: C.textPrimary,
      marginTop: 6, fontWeight: '500',
    },
    resultCard: { width: CARD_W, marginBottom: 14 },
    cardCoverWrap: { position: 'relative', width: '100%', aspectRatio: 0.7, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: C.surfaceContainer },
    cardCover: { width: '100%', height: '100%' },
    cardBadge: {
      position: 'absolute', top: 4, right: 4,
      paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: 4,
    },
    cardBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    cardTitle: { fontSize: FontSize.label, fontWeight: '600', color: C.textPrimary, marginTop: 6, lineHeight: 18 },
    cardAuthor: { fontSize: FontSize.caption, color: C.textSecondary, marginTop: 2 },
    hTag: { fontSize: 10, color: C.textTertiary, backgroundColor: C.surfaceContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    sourceBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 4,
    },
    sourceBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    filterBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 8,
      borderRadius: Radius.xl, backgroundColor: C.surface,
      borderWidth: 1, borderColor: C.border,
    },
    filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterBtnText: { fontSize: FontSize.label, color: C.textSecondary, fontWeight: '600' },
    filterBtnTextActive: { color: C.textOnPrimary },
    scrollTopBtn: {
      position: 'absolute', bottom: 30, right: 20,
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
    },
  });
}
