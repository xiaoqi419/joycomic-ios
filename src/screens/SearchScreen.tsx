// 搜索页 v3 — 双源聚合搜索 (JMComic + Pica)
// @author Jason

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, RefreshControl,
  ActivityIndicator, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLegacyColors, LegacyColors, Spacing, FontSize, Radius } from '../theme';
import { ComicCard } from '../components/ComicCard';
import { fetchHotTags, fetchRandomRecommend, getCoverUrl as getCover } from '../api/endpoints';
import { aggregateSearch } from '../sources/pica';
import { jmLogger } from '../utils/JmLogger';
import type { SourceItem } from '../sources/types';
import type { ComicItem } from '../api/types';

const { width: W } = Dimensions.get('window');

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
  const [results, setResults] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('tf');
  const [history, setHistory] = useState<string[]>([]);
  const [hotTags, setHotTags] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<ComicItem[]>([]);
  const searchingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((json) => {
      if (json) setHistory(JSON.parse(json));
    });
    fetchHotTags().then(setHotTags).catch(() => {});
    fetchRandomRecommend().then(setRecommend).catch(() => {});
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

    // 纯数字 → 直接跳到 JMComic 详情（兼容旧行为）
    if (/^\d{4,}$/.test(q.trim())) {
      setSearched(true);
      nav.navigate('ComicDetail', { albumId: q.trim() });
      return;
    }

    searchingRef.current = true;
    setLoading(true);
    jmLogger.log(`搜索: q="${q}" page=${p} sort=${sort}`);

    try {
      // 双源聚合搜索（内含 JM 重定向检查）
      const agg = await aggregateSearch(q, p);
      jmLogger.log(`搜索: 聚合结果 items=${agg.items.length} total=${agg.total} redirect=${agg.redirect_aid}`);

      // 重定向到详情
      if (agg.redirect_aid) {
        nav.navigate('ComicDetail', { albumId: agg.redirect_aid });
        setLoading(false);
        return;
      }

      if (refresh || p === 1) setResults(agg.items);
      else setResults((prev) => [...prev, ...agg.items]);

      setHasMore(agg.items.length >= 20);
      setSearched(true);

      // 写入历史
      if (p === 1) {
        const newHistory = [q, ...history.filter((h) => h !== q)].slice(0, 20);
        setHistory(newHistory);
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch (e: any) {
      jmLogger.err(`搜索: 异常 ${e?.message || e}`);
    }
    setLoading(false);
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

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <StatusBar style="light" />
      <FlatList
        data={results}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        keyExtractor={(i) => `${i.source}:${i.id}`}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={C.primary} />}
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
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

            <Pressable onPress={onSearch} style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <MaterialIcons name="search" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>{t('search.title')}</Text>
            </Pressable>

            {!searched && (
              <>
                {hotTags.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.sectionTitle}>{t('search.hot_tags')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                          <Pressable onPress={() => { setQuery(h); setTimeout(onSearch, 100); }}>
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
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <MaterialIcons name="search-off" size={48} color={C.textTertiary} />
                <Text style={{ color: C.textSecondary, marginTop: 10, fontSize: FontSize.body }}>{t('search.no_result')}</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.jmcomic;
          return (
            <View style={styles.cardWrap}>
              <ComicCard id={item.id} title={item.title} coverUrl={item.coverUrl} onPress={() => openDetail(item)} />
              <View style={[styles.badge, { backgroundColor: badge.color }]}>
                <Text style={styles.badgeText}>{badge.label}</Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color={C.primary} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    sectionTitle: { fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: C.border,
    },
    input: { flex: 1, height: 44, paddingHorizontal: 8, color: C.textPrimary, fontSize: FontSize.body },
    searchBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      height: 44, borderRadius: Radius.button, backgroundColor: C.primary, gap: 6, marginBottom: 4,
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
    cardWrap: { position: 'relative', width: (W - 32 - 20) / 3 },
    badge: {
      position: 'absolute', top: 6, left: 6,
      paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  });
}
