// 小说 v3 — 搜索 + 分页
// @author nyx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, Radius, Spacing, FontSize } from '../theme';
import { fetchNovels, fetchNovelDetail, fetchNovelContent, getImgHost } from '../api/endpoints';
import { jmLogger } from '../utils/JmLogger';
import type { NovelItem, NovelChapter, NovelContent } from '../api/types';

export function NovelsScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const [list, setList] = useState<NovelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState('');

  const loadData = useCallback(async (p: number, refresh = false) => {
    try {
      const d = await fetchNovels(p, query || undefined);
      const items = d.list || [];
      if (refresh || p === 1) setList(items);
      else setList((prev) => [...prev, ...items]);
      setHasMore(items.length >= 20);
    } catch {}
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadData(1, true).finally(() => setLoading(false));
  }, [query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1, true);
    setRefreshing(false);
  }, [loadData]);

  const handleEndReached = useCallback(() => {
    if (!hasMore || loading) return;
    const np = page + 1;
    setPage(np);
    loadData(np);
  }, [page, hasMore, loading, loadData]);

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <FlashList
        data={list}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>{t('novels.title')}</Text>
            {/* 搜索框 */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TextInput
                style={{
                  flex: 1, height: 40, backgroundColor: C.surface, borderRadius: Radius.sm,
                  paddingHorizontal: 12, color: C.textPrimary, fontSize: FontSize.body,
                  borderWidth: 1, borderColor: C.border,
                }}
                placeholder="搜索小说..."
                placeholderTextColor={C.textTertiary}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                  <MaterialIcons name="close" size={20} color={C.textTertiary} />
                </Pressable>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('NovelDetail' as never, { novelId: item.id } as never)} style={styles.card}>
            <Image source={{ uri: item.photo?.startsWith('http') ? item.photo : `https://${getImgHost()}/${String(item.photo || '').replace(/^\//, '')}` }} style={styles.cardCover} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardAuthor}>{item.author}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={loading ? <ActivityIndicator color={C.primary} /> : null}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>{t('common.empty')}</Text> : null}
      />
    </SafeAreaView>
  );
}

export function NovelDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { novelId } = route.params || {};
  const { t } = useTranslation();
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const [novel, setNovel] = useState<NovelItem | null>(null);
  const [chapters, setChapters] = useState<NovelChapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNovelDetail(novelId).then((d) => {
      setNovel(d.novel);
      setChapters(d.series || []);
    }).finally(() => setLoading(false));
  }, [novelId]);

  if (loading) return <SafeAreaView edges={["top"]} style={styles.cont}><View style={styles.center}><ActivityIndicator color={C.primary} /></View></SafeAreaView>;
  if (!novel) return null;

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <ScrollView contentContainerStyle={{ padding: Spacing.marginEdge }}>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Image source={{ uri: novel.photo?.startsWith('http') ? novel.photo : `https://${getImgHost()}/${String(novel.photo || '').replace(/^\//, '')}` }} style={styles.novelCover} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.novelTitle}>{novel.title}</Text>
            <Text style={styles.novelAuthor}>{novel.author}</Text>
            <Text style={styles.novelDesc} numberOfLines={3}>{novel.description}</Text>
          </View>
        </View>
        <Text style={styles.chapterHeader}>
          {t('novels.chapters')} ({chapters.length})
        </Text>
        {chapters.map((ch) => (
          <Pressable
            key={ch.id}
            onPress={() => nav.navigate('NovelReader' as never, { novelId, chapterId: ch.id, title: ch.title } as never)}
            style={styles.chapterItem}
          >
            <Text style={styles.chapterText} numberOfLines={1}>{ch.title}</Text>
            <MaterialIcons name="chevron-right" size={20} color={C.textTertiary} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function NovelReaderScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { novelId, chapterId } = route.params || {};
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const [content, setContent] = useState<NovelContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jmLogger.log(`小说阅读: chapterId=${chapterId}`);
    fetchNovelContent(chapterId).then((d) => {
      jmLogger.log(`小说阅读: 返回 keys=${Object.keys(d || {}).join(',')}  sample=${JSON.stringify(d).slice(0, 200)}`);
      setContent(d);
    }).catch((e) => {
      jmLogger.err(`小说阅读: 失败 ${e?.message || e}`);
      setLoading(false);
    }).finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) return <SafeAreaView edges={["top"]} style={styles.cont}><View style={styles.center}><ActivityIndicator color={C.primary} /></View></SafeAreaView>;
  if (!content) {
    return (
      <SafeAreaView edges={["top"]} style={styles.cont}>
        <View style={styles.center}>
          <Text style={{ color: C.error, marginBottom: 8 }}>加载失败</Text>
          <Pressable onPress={() => { setLoading(true); fetchNovelContent(chapterId).then(setContent).catch(() => {}).finally(() => setLoading(false)); }}>
            <Text style={{ color: C.primary }}>重试</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <View style={styles.readerHeader}>
        <Pressable onPress={() => nav.goBack()}><MaterialIcons name="arrow-back" size={24} color={C.textPrimary} /></Pressable>
        <Text style={styles.readerTitle} numberOfLines={1}>{content.name || content.title || ''}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 60 }}>
        <Text style={styles.readerContent}>{content.content}</Text>
      </ScrollView>
      <View style={styles.readerNav}>
        {content.prev_id ? (
          <Pressable onPress={() => { nav.replace('NovelReader' as never, { novelId, chapterId: content.prev_id } as never); }}>
            <Text style={styles.navBtn}>{t('novels.prev')}</Text>
          </Pressable>
        ) : <View />}
        {content.next_id ? (
          <Pressable onPress={() => { nav.replace('NovelReader' as never, { novelId, chapterId: content.next_id } as never); }}>
            <Text style={styles.navBtn}>{t('novels.next')}</Text>
          </Pressable>
        ) : <View />}
      </View>
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    pageTitle: { fontSize: FontSize.largeTitle, fontWeight: '800', color: C.textPrimary, marginBottom: 14 },
    empty: { color: C.textTertiary, textAlign: 'center', marginTop: 40 },

    card: {
      flexDirection: 'row',
      backgroundColor: C.surface, borderRadius: Radius.card,
      padding: 12, marginBottom: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
    },
    cardCover: { width: 60, height: 80, borderRadius: Radius.sm, backgroundColor: C.surfaceContainer },
    cardTitle: { fontWeight: '600', color: C.textPrimary, fontSize: FontSize.bodyLarge },
    cardAuthor: { color: C.primary, fontSize: FontSize.body, marginTop: 2 },
    cardDesc: { color: C.textTertiary, fontSize: FontSize.body, marginTop: 4, lineHeight: 18 },

    novelCover: { width: 100, height: 140, borderRadius: Radius.card, backgroundColor: C.surfaceContainer },
    novelTitle: { fontSize: FontSize.title, fontWeight: '700', color: C.textPrimary },
    novelAuthor: { color: C.primary, fontSize: FontSize.body, marginTop: 4 },
    novelDesc: { color: C.textTertiary, fontSize: FontSize.body, marginTop: 6, lineHeight: 20 },
    chapterHeader: { fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary, marginTop: 20, marginBottom: 10 },
    chapterItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 14,
      backgroundColor: C.surface, borderRadius: Radius.card,
      marginBottom: 6,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15, shadowRadius: 3, elevation: 1,
    },
    chapterText: { color: C.textPrimary, flex: 1, fontSize: FontSize.body },

    readerHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.surface,
    },
    readerTitle: { color: C.textPrimary, fontSize: FontSize.headline, fontWeight: '600', flex: 1, textAlign: 'center' },
    readerContent: { color: C.textPrimary, fontSize: FontSize.bodyLarge, lineHeight: 26 },
    readerNav: {
      flexDirection: 'row', justifyContent: 'space-between',
      padding: Spacing.marginEdge, backgroundColor: C.surface,
    },
    navBtn: { color: C.primary, fontSize: FontSize.body, fontWeight: '600' },
  });
}
