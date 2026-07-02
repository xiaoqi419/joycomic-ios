// 首页 v3 — 自动轮播 + 高清图
// @author Jason

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, RefreshControl,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLegacyColors, Spacing, FontSize, Radius } from '../theme';
import type { LegacyColors } from '../theme';
import { ComicCard } from '../components/ComicCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { fetchMainPromote, fetchLatest, getCoverUrl } from '../api/endpoints';
import { useHistoryStore } from '../store/useHistory';
import type { ComicItem } from '../api/types';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.marginEdge * 2 + 10);
const AUTO_PLAY_MS = 3000;

const QUICK_LINKS = [
  { icon: 'flash-on', labelKey: 'banner.latest', route: 'Categories', params: { slug: 'all', sort: 'tf' } },
  { icon: 'whatshot', labelKey: 'banner.hot_ranking', route: 'WeekRank', params: {} },
  { icon: 'auto-stories', labelKey: 'banner.novels', route: 'Novels', params: {} },
  { icon: 'video-library', labelKey: 'banner.movies', route: 'Movies', params: {} },
  { icon: 'search', label: '搜索', route: 'Search', params: {} },
  { icon: 'bookmark', labelKey: 'banner.library', route: 'Library', params: {} },
];

export function MainScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const [promoData, setPromoData] = useState<ComicItem[]>([]);
  const [latest, setLatest] = useState<ComicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [promoIndex, setPromoIndex] = useState(0);
  const promoRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyItems = useHistoryStore((s) => s.items);
  const loadHistory = useHistoryStore((s) => s.load);

  const load = useCallback(async () => {
    try {
      const p = await fetchMainPromote();
      const items: ComicItem[] = [];
      p?.forEach((section) => {
        (section.content || []).forEach((c) => {
          if (!items.find((x) => x.id === c.id)) items.push(c);
        });
      });
      setPromoData(items.slice(0, 8));
      const l = await fetchLatest(1);
      setLatest(l || []);
      setPage(1);
      setHasMore(true);
    } catch (e) {
      console.warn('MainScreen load error:', e);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); loadHistory(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    try {
      const np = page + 1;
      const l = await fetchLatest(np);
      if (l?.length) { setLatest((p) => [...p, ...l]); setPage(np); }
      else setHasMore(false);
    } catch {}
  }, [page, hasMore]);

  // 自动轮播
  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPromoIndex((prev) => {
        const next = (prev + 1) % Math.min(promoData.length, 8);
        promoRef.current?.scrollToIndex({ index: next, animated: true, viewPosition: 0 });
        return next;
      });
    }, AUTO_PLAY_MS);
  }, [promoData.length]);

  const stopAutoPlay = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (promoData.length > 1) { startAutoPlay(); }
    return stopAutoPlay;
  }, [promoData.length, startAutoPlay, stopAutoPlay]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems?.length) setPromoIndex(viewableItems[0].index || 0);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.cont}>
        <StatusBar style="light" />
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  const renderPromoItem = ({ item }: { item: ComicItem }) => {
    const cover = item.image || getCoverUrl(item.id);
    return (
      <Pressable
        onPress={() => nav.navigate('ComicDetail', { albumId: item.id })}
        onPressIn={stopAutoPlay}
        onPressOut={startAutoPlay}
        style={styles.promoCard}
      >
        <Image source={{ uri: cover }} style={styles.promoCover} contentFit="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.promoOverlay}
          pointerEvents="none"
        />
        <View style={styles.promoInfo}>
          <Text style={styles.promoTitle} numberOfLines={2}>{item.name}</Text>
          {item.author ? <Text style={styles.promoAuthor}>{item.author}</Text> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.cont} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>JOYComic</Text>
          <Text style={styles.appSub}>聚合漫画</Text>
        </View>
        <Pressable onPress={() => nav.navigate('Search', {} as any)} style={styles.searchBtn}>
          <MaterialIcons name="search" size={24} color={C.textPrimary} />
        </Pressable>
      </View>

      <FlatList
        data={latest}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        ListHeaderComponent={
          <View style={{ paddingBottom: Spacing.md }}>
            <View style={styles.quickGrid}>
              {QUICK_LINKS.map((link, i) => (
                <Pressable
                  key={i}
                  onPress={() => nav.navigate(link.route as never, link.params as never)}
                  style={styles.quickItem}
                >
                  <View style={styles.quickIcon}>
                    <MaterialIcons name={link.icon as any} size={22} color={C.primary} />
                  </View>
                  <Text style={styles.quickLabel}>
                    {link.label || t(link.labelKey || '')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {promoData.length > 0 && (
              <View style={styles.promoSec}>
                <FlatList
                  ref={promoRef}
                  data={promoData}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_W}
                  decelerationRate="fast"
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                  onScrollBeginDrag={stopAutoPlay}
                  onScrollEndDrag={startAutoPlay}
                  renderItem={renderPromoItem}
                  keyExtractor={(i) => i.id}
                />
                {promoData.length > 1 && (
                  <View style={styles.dotsRow}>
                    {promoData.map((_, i) => (
                      <Pressable key={i} onPress={() => {
                        promoRef.current?.scrollToIndex({ index: i, animated: true });
                        setPromoIndex(i);
                      }}>
                        <View style={[styles.dot, i === promoIndex && styles.dotActive]} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {historyItems.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.secTitle, { marginBottom: 10 }]}>{t('home.continue_reading')}</Text>
                <FlatList
                  data={historyItems.slice(0, 5)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(h) => h.id}
                  renderItem={({ item: h }) => (
                    <Pressable
                      onPress={() => nav.navigate('ComicDetail', { albumId: h.id })}
                      style={{ marginRight: 10, width: 120 }}
                    >
                      <Image
                        source={{ uri: h.coverUrl || getCoverUrl(h.id) }}
                        style={{ width: 120, height: 160, borderRadius: Radius.sm, backgroundColor: C.surfaceContainer }}
                        contentFit="cover"
                      />
                      <Text style={{ fontSize: FontSize.label, fontWeight: '600', color: C.textPrimary, marginTop: 6 }} numberOfLines={1}>{h.title}</Text>
                      <Text style={{ fontSize: FontSize.caption, color: C.textSecondary }} numberOfLines={1}>{h.chapterTitle}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
            <View style={styles.secHeader}>
              <Text style={styles.secTitle}>{t('home.new_update')}</Text>
              <Pressable onPress={() => nav.navigate('Search', {} as any)}>
                <Text style={styles.secMore}>{t('home.continue_reading') ? '查看更多' : '查看更多'}</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ComicCard
            id={item.id}
            title={item.name}
            coverUrl={getCoverUrl(item.id)}
            onPress={(id) => nav.navigate('ComicDetail', { albumId: id })}
          />
        )}
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={{ padding: 20 }} color={C.primary} /> : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) { return StyleSheet.create({
  cont: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginEdge,
    paddingVertical: 12,
  },
  appTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 0.5,
  },
  appSub: {
    fontSize: FontSize.caption,
    color: C.textTertiary,
    marginTop: 1,
  },
  searchBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },

  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: C.surface, borderRadius: Radius.card,
    marginBottom: 16, padding: 6,
  },
  quickItem: { width: '16.66%', alignItems: 'center', paddingVertical: 8 },
  quickIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  quickLabel: { fontSize: FontSize.caption, color: C.textSecondary, textAlign: 'center' },

  promoSec: { marginBottom: 20 },
  promoCard: {
    width: CARD_W, marginRight: 10,
    height: 210, borderRadius: Radius.lg,
    overflow: 'hidden', backgroundColor: C.surfaceContainer,
  },
  promoCover: { width: '100%', height: '100%' },
  promoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
  },
  promoInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 30,
  },
  promoTitle: {
    fontSize: FontSize.headline, fontWeight: '700',
    color: '#FFFFFF', lineHeight: 24,
  },
  promoAuthor: {
    fontSize: FontSize.label, color: 'rgba(255,255,255,0.7)', marginTop: 2,
  },

  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textTertiary },
  dotActive: { width: 20, backgroundColor: C.primary, borderRadius: 3 },

  secHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  secTitle: { fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary },
  secMore: { fontSize: FontSize.body, color: C.primary, fontWeight: '600' },
}); }
