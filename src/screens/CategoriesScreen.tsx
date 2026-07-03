// 分类浏览 v4 — JM + Pica 双源分类
// @author nyx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, ActivityIndicator, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, Spacing, FontSize, Radius } from '../theme';
import { ComicCard } from '../components/ComicCard';
import { fetchCategoriesFilter, fetchCategories, fetchHotTags, getCoverUrl as getCover } from '../api/endpoints';
import { picaCategories, comicsByCategory } from '../pica/endpoints';
import { thumbUrl } from '../pica/types';
import type { ComicItem } from '../api/types';
import type { PicaCategory, PicaComicBrief } from '../pica/types';
import { isPicaEnabled } from '../sources/pica';

const { width: W } = Dimensions.get('window');
const GRID_GAP = 10;
const CAT_COLS = 3;
const CAT_CARD_W = (W - Spacing.marginEdge * 2 - GRID_GAP * (CAT_COLS - 1)) / CAT_COLS;

const SORTS = [
  { id: 'tf', labelKey: 'search.sort_tf' },
  { id: 'mv', labelKey: 'search.sort_mv' },
  { id: 'mp', labelKey: 'search.sort_mp' },
  { id: 'mr', labelKey: 'search.sort_mr' },
];

interface CatItem {
  name: string;
  slug: string;
}

export function CategoriesScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const [source, setSource] = useState<'jm' | 'pica'>('jm');

  // JM 分类
  const [list, setList] = useState<ComicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cats, setCats] = useState<CatItem[]>([]);
  const [subCats, setSubCats] = useState<{ CID: string; name: string; slug: string }[]>([]);
  const [slug, setSlug] = useState(route.params?.slug || '');
  const [sort, setSort] = useState(route.params?.sort || 'tf');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hotTags, setHotTags] = useState<string[]>([]);

  // Pica 分类
  const [picaCatList, setPicaCatList] = useState<PicaCategory[]>([]);
  const [picaComics, setPicaComics] = useState<PicaComicBrief[]>([]);
  const [picaLoading, setPicaLoading] = useState(false);
  const [selectedPicaCat, setSelectedPicaCat] = useState<string | null>(null);
  const [picaSort, setPicaSort] = useState<'ua' | 'dd' | 'da' | 'ld'>('ua');

  // 加载 JM 分类列表
  useEffect(() => {
    if (source !== 'jm') return;
    (async () => {
      try {
        const data = await fetchCategories();
        const categories = data.categories || [];
        const mainCats: CatItem[] = categories.map((c: any) => ({
          name: c.name || c.title || '',
          slug: (c.slug || '0'),
        }));
        const subs: { CID: string; name: string; slug: string }[] = [];
        categories.forEach((c: any) => {
          (c.sub_categories || []).forEach((sc: any) => {
            subs.push({ CID: sc.CID || sc.id || '', name: sc.name || '', slug: sc.slug || '0' });
          });
        });
        setCats(mainCats);
        setSubCats(subs);
        if (!slug && mainCats.length > 0) setSlug(mainCats[0].slug);
      } catch {}
    })();
    fetchHotTags().then(setHotTags).catch(() => {});
  }, [source]);

  // 加载 Pica 分类
  useEffect(() => {
    if (source !== 'pica') return;
    picaCategories().then((d) => {
      const all = (d as any).categories || [];
      // 过滤掉 isWeb 的分类（同 haka_comic）
      setPicaCatList(all.filter((c: PicaCategory) => c.isWeb !== true));
    }).catch(() => {});
  }, [source]);

  // JM 分类漫画加载
  const load = useCallback(async (p: number, refresh = false) => {
    try {
      const params: any = { page: p, o: sort };
      if (slug) params.c = slug;
      const data = await fetchCategoriesFilter(params);
      const items = data.content || data.list || [];
      if (refresh || p === 1) setList(items);
      else setList((prev) => [...prev, ...items]);
      setHasMore(items.length >= 30);
    } catch (e) {
      console.warn('分类加载失败:', e);
    }
  }, [slug, sort]);

  useEffect(() => {
    if (source !== 'jm') return;
    setLoading(true);
    load(1, true).finally(() => setLoading(false));
  }, [slug, sort, source]);

  // Pica 分类漫画加载
  const loadPicaComics = useCallback(async (catTitle: string, p = 1) => {
    setPicaLoading(true);
    try {
      const data = await comicsByCategory(catTitle, p, picaSort);
      const docs = ((data as any).comics?.docs) || [];
      if (p === 1) setPicaComics(docs);
      else setPicaComics((prev) => [...prev, ...docs]);
    } catch {}
    setPicaLoading(false);
  }, [picaSort]);

  useEffect(() => {
    if (source !== 'pica' || !selectedPicaCat) return;
    setPicaComics([]);
    loadPicaComics(selectedPicaCat, 1);
  }, [selectedPicaCat, picaSort, source]);

  const onRefresh = useCallback(async () => {
    if (source === 'jm') {
      setRefreshing(true);
      await load(1, true);
      setRefreshing(false);
    }
  }, [load, source]);

  const loadMore = useCallback(() => {
    if (source === 'jm') {
      if (!hasMore || loading) return;
      const np = page + 1;
      setPage(np);
      load(np);
    }
  }, [page, hasMore, loading, load, source]);

  // 渲染 Pica 分类网格
  const renderPicaCategories = () => (
    <View style={{ padding: Spacing.marginEdge }}>
      <Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: C.textPrimary, marginBottom: 14 }}>Pica 分类</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
        {picaCatList.map((cat) => {
          const active = selectedPicaCat === cat.title;
          const url = thumbUrl(cat.thumb);
          return (
            <Pressable
              key={cat._id}
              onPress={() => {
                setSelectedPicaCat(active ? null : cat.title);
                setPicaComics([]);
              }}
              style={{ width: CAT_CARD_W, alignItems: 'center', marginBottom: 12 }}
            >
              <View style={[styles.picaCatIcon, active && { borderColor: C.primary, borderWidth: 2 }]}>
                {url ? (
                  <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <MaterialIcons name="folder" size={28} color={C.primary} />
                )}
              </View>
              <Text style={{ fontSize: FontSize.caption, color: C.textPrimary, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{cat.title}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Pica 分类漫画列表 */}
      {selectedPicaCat && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['ua', 'dd', 'da', 'ld'] as const).map((s) => (
              <Pressable key={s} onPress={() => setPicaSort(s)} style={[styles.sortBtn, picaSort === s && styles.sortBtnActive]}>
                <Text style={[styles.sortText, picaSort === s && styles.sortTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {picaComics.length === 0 && picaLoading && <ActivityIndicator color={C.primary} />}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {picaComics.map((comic) => (
              <Pressable
                key={comic._id}
                onPress={() => nav.navigate('PicaDetail', { albumId: comic._id })}
                style={{ width: CAT_CARD_W, marginBottom: 14 }}
              >
                <Image
                  source={{ uri: thumbUrl(comic.thumb) }}
                  style={{ width: '100%', aspectRatio: 0.7, borderRadius: Radius.card, backgroundColor: C.surfaceContainer }}
                  contentFit="cover"
                />
                <Text style={{ fontSize: FontSize.label, fontWeight: '600', color: C.textPrimary, marginTop: 6 }} numberOfLines={2}>{comic.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.background }}>
      {/* 源切换 Tab */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.marginEdge, paddingTop: 8, paddingBottom: 4 }}>
        <Pressable onPress={() => { setSource('jm'); setSlug(''); }} style={[styles.sourceTab, source === 'jm' && styles.sourceTabActive]}>
          <Text style={[styles.sourceTabText, source === 'jm' && styles.sourceTabTextActive]}>JM</Text>
        </Pressable>
        <Pressable onPress={() => {
          if (!isPicaEnabled()) {
            Alert.alert('提示', '请先登录 Pica 账号', [
              { text: '取消', style: 'cancel' },
              { text: '去登录', onPress: () => nav.navigate('Member' as never) },
            ]);
            return;
          }
          setSource('pica'); setSelectedPicaCat(null);
        }} style={[styles.sourceTab, source === 'pica' && styles.sourceTabActive]}>
          <Text style={[styles.sourceTabText, source === 'pica' && styles.sourceTabTextActive]}>Pica</Text>
        </Pressable>
      </View>

      {source === 'jm' ? (
        <FlatList
          data={list}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
          ListHeaderComponent={
            <View style={{ paddingBottom: Spacing.md }}>
              <Text style={styles.title}>{t('nav.categories')}</Text>
              {cats.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {cats.map((c, ci) => (
                    <Pressable key={c.slug + '-' + ci} onPress={() => { setSlug(c.slug); setPage(1); }} style={[styles.chip, slug === c.slug && styles.chipActive]}>
                      <Text style={[styles.chipText, slug === c.slug && styles.chipTextActive]}>{c.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              {subCats.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {subCats.map((sc, si) => (
                    <Pressable key={sc.slug + '-' + (sc.CID || si)} onPress={() => nav.navigate('Search', { query: sc.name })} style={styles.subChip}>
                      <Text style={styles.chipText}>{sc.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                {SORTS.map((s) => (
                  <Pressable key={s.id} onPress={() => { setSort(s.id); setPage(1); }} style={[styles.sortBtn, sort === s.id && styles.sortBtnActive]}>
                    <Text style={[styles.sortText, sort === s.id && styles.sortTextActive]}>{t(s.labelKey)}</Text>
                  </Pressable>
                ))}
              </View>
              {hotTags.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: FontSize.label, color: C.textSecondary, marginBottom: 6 }}>🔥 热搜</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {hotTags.slice(0, 10).map((tag, i) => (
                      <Pressable key={i} onPress={() => nav.navigate('Search', { query: tag })} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ComicCard id={item.id} title={item.name} coverUrl={getCover(item.id)} onPress={(id) => nav.navigate('ComicDetail', { albumId: id })} />
          )}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: 20 }} color={C.primary} /> : null}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      ) : (
        <ScrollView>{renderPicaCategories()}</ScrollView>
      )}
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    title: { fontSize: FontSize.largeTitle, fontWeight: '800', color: C.textPrimary, marginBottom: 14, marginTop: 4 },
    sourceTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.xl, marginRight: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    sourceTabActive: { backgroundColor: C.primary, borderColor: C.primary },
    sourceTabText: { fontSize: FontSize.body, fontWeight: '600', color: C.textSecondary },
    sourceTabTextActive: { color: '#fff' },
    chip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: Radius.xl, backgroundColor: C.surface, marginRight: 8, borderWidth: 1, borderColor: C.border },
    subChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.xl, backgroundColor: C.surfaceLight, marginRight: 6, borderWidth: 1, borderColor: C.border },
    chipActive: { backgroundColor: C.primary, borderColor: C.primary },
    chipText: { fontSize: FontSize.label, fontWeight: '600', color: C.textSecondary },
    chipTextActive: { color: C.textOnPrimary },
    sortBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    sortBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    sortText: { fontSize: FontSize.label, color: C.textSecondary },
    sortTextActive: { color: C.textOnPrimary, fontWeight: '600' },
    tagChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.xl, backgroundColor: C.surfaceLight },
    tagText: { fontSize: FontSize.caption, color: C.primary, fontWeight: '500' },
    picaCatIcon: { width: CAT_CARD_W, height: CAT_CARD_W, borderRadius: Radius.card, backgroundColor: C.surfaceContainer, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  });
}
