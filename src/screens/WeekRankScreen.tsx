// 每周推荐 — 完整版
// 支持类型筛选（横向滚动 Chip）+ 分类筛选（弹窗）
// 数据来源：week API（获取分类/类型元数据）+ week/filter API（分页漫画列表）
// @author Jason

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl,
  ActivityIndicator, ScrollView, StyleSheet, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { fetchWeekData, fetchWeekFilter, getCoverUrl } from '../api/endpoints';
import { useAppTheme } from '../theme';
import { Spacing, FontSize, Radius } from '../theme';
import type { ComicItem } from '../api/types';

interface WeekCategory {
  id: string;
  title: string;
  time: string;
}

interface WeekType {
  id: string;
  title: string;
}

interface WeekMeta {
  categories: WeekCategory[];
  types: WeekType[];
}

interface ComicWrap {
  id: string;
  name: string;
  author: string;
  image: string;
}

/** 将 API ComicItem 归一化 */
function toComicWrap(c: any): ComicWrap {
  return { id: c.id, name: c.name, author: c.author || '', image: c.image || '' };
}

const PAGE_SIZE = 36;

export function WeekRankScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  // 元数据
  const [meta, setMeta] = useState<WeekMeta | null>(null);
  // 当前筛选
  const [typeId, setTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // 漫画列表
  const [list, setList] = useState<ComicWrap[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 分类弹窗
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const currentCategory = meta?.categories.find((c) => c.id === categoryId);
  const currentType = meta?.types.find((t) => t.id === typeId);

  /** 加载一页数据 */
  const loadPage = useCallback(async (p: number, type: string, cat: string, append: boolean) => {
    try {
      const res = await fetchWeekFilter({ page: p, id: cat, type });
      const items = ((res as any).list || []).map(toComicWrap);
      if (items.length < PAGE_SIZE) setHasMore(false);
      else setHasMore(true);
      if (append) {
        setList((prev) => [...prev, ...items]);
      } else {
        setList(items);
      }
      setPage(p);
    } catch {
      if (!append) setList([]);
    }
  }, []);

  /** 首次加载 / 切换筛选项 */
  const reload = useCallback(async (type: string, cat: string) => {
    setLoading(true);
    setHasMore(true);
    await loadPage(1, type, cat, false);
    setLoading(false);
  }, [loadPage]);

  /** 初始化：获取元数据 + 首次列表 */
  useEffect(() => {
    (async () => {
      try {
        const weekData: any = await fetchWeekData();
        const cats: WeekCategory[] = (weekData.categories || []).map((c: any) => ({
          id: String(c.id || c.key || ''),
          title: c.title || c.name || '',
          time: c.time || '',
        }));
        const types: WeekType[] = (weekData.type || weekData.types || []).map((t: any) => ({
          id: String(t.id || t.key || ''),
          title: t.title || t.name || '',
        }));
        setMeta({ categories: cats, types });

        // 默认选中第一个 type
        const defaultType = types[0]?.id || '';
        const defaultCat = cats[0]?.id || '';
        setTypeId(defaultType);
        setCategoryId(defaultCat);
        await loadPage(1, defaultType, defaultCat, false);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await loadPage(1, typeId, categoryId, false);
    setRefreshing(false);
  }, [typeId, categoryId, loadPage]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPage(page + 1, typeId, categoryId, true);
    setLoadingMore(false);
  }, [page, typeId, categoryId, loadingMore, hasMore, loadPage]);

  const handleTypeChange = useCallback((id: string) => {
    setTypeId(id);
    setPage(1);
    setHasMore(true);
    reload(id, categoryId);
  }, [categoryId, reload]);

  const handleCategoryChange = useCallback((id: string) => {
    setCategoryId(id);
    setShowCategoryModal(false);
    setPage(1);
    setHasMore(true);
    reload(typeId, id);
  }, [typeId, reload]);

  const renderItem = ({ item }: { item: ComicWrap }) => (
    <Pressable
      onPress={() => nav.navigate('ComicDetail', { albumId: item.id })}
      style={({ pressed }) => [
        css.cardOuter,
        { backgroundColor: colors.surfaceContainer },
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <View style={css.cardInner}>
        <Image
          source={{ uri: getCoverUrl(item.id) }}
          style={css.cover}
          contentFit="cover"
        />
        <Text style={[css.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.author ? (
          <Text style={[css.cardAuthor, { color: colors.outline }]} numberOfLines={1}>
            {item.author}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[css.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[css.title, { color: colors.onSurface }]}>
        每周推荐
      </Text>

      {/* 筛选栏 */}
      {meta && (
        <View>
          <View style={css.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={css.chipRow}
            >
              {meta.types.map((typ) => {
                const active = typ.id === typeId;
                return (
                  <Pressable
                    key={typ.id}
                    onPress={() => handleTypeChange(typ.id)}
                    style={[
                      css.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceContainerHigh,
                        borderColor: active ? colors.primary : colors.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        css.chipLabel,
                        { color: active ? colors.onPrimary : colors.onSurface },
                      ]}
                    >
                      {typ.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 分类选择按钮 */}
            {currentCategory && (
              <Pressable
                onPress={() => setShowCategoryModal(true)}
                style={[css.categoryBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              >
                <Text style={[css.categoryBtnLabel, { color: colors.onSurface }]}>
                  {currentCategory.title}
                </Text>
                <Text style={[css.categoryArrow, { color: colors.outline }]}>▼</Text>
              </Pressable>
            )}
          </View>
          <View style={[css.divider, { backgroundColor: colors.outlineVariant }]} />
        </View>
      )}

      {/* 列表 */}
      {loading ? (
        <View style={css.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={list}
          numColumns={3}
          keyExtractor={(i) => i.id}
          contentContainerStyle={css.listContent}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={[css.emptyText, { color: colors.outline }]}>暂无数据</Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={css.footer}><ActivityIndicator size="small" color={colors.primary} /></View>
            ) : null
          }
        />
      )}

      {/* 分类选择弹窗 */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <Pressable style={css.modalOverlay} onPress={() => setShowCategoryModal(false)}>
          <View style={[css.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[css.modalTitle, { color: colors.onSurface }]}>选择分类</Text>
            {meta?.categories.map((cat) => {
              const active = cat.id === categoryId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryChange(cat.id)}
                  style={[
                    css.modalItem,
                    { backgroundColor: active ? colors.primaryContainer : 'transparent' },
                  ]}
                >
                  <Text
                    style={[
                      css.modalItemText,
                      { color: active ? colors.onPrimaryContainer : colors.onSurface },
                    ]}
                  >
                    {cat.title}
                  </Text>
                  {active && <Text style={{ color: colors.primary }}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const css = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: FontSize.largeTitle, fontWeight: '800', marginBottom: 8, paddingHorizontal: Spacing.marginEdge, paddingTop: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  chipRow: { paddingHorizontal: Spacing.marginEdge, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.chip, borderWidth: 1 },
  chipLabel: { fontSize: FontSize.label, fontWeight: '600' },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.chip, marginRight: Spacing.marginEdge, marginLeft: 4 },
  categoryBtnLabel: { fontSize: FontSize.label, fontWeight: '600', marginRight: 4 },
  categoryArrow: { fontSize: 9 },
  divider: { height: 0.5, marginHorizontal: Spacing.marginEdge, marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: Spacing.marginEdge, paddingBottom: 100 },
  cardOuter: { flex: 1, margin: 4, borderRadius: Radius.card, overflow: 'hidden', marginBottom: 12 },
  cardInner: { padding: 0 },
  cover: { width: '100%', aspectRatio: 0.7, backgroundColor: '#2C2C30' },
  cardTitle: { fontSize: FontSize.label, fontWeight: '600', paddingHorizontal: 8, paddingTop: 6, lineHeight: 18 },
  cardAuthor: { fontSize: FontSize.caption, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: FontSize.body },
  footer: { paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '60%', borderRadius: Radius.lg, padding: 20 },
  modalTitle: { fontSize: FontSize.headline, fontWeight: '700', marginBottom: 16 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: Radius.sm, marginBottom: 4 },
  modalItemText: { fontSize: FontSize.body },
});
