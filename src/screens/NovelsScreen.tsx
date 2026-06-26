// 小说模块 — 列表 + 详情 + 阅读器
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { fetchNovels, fetchNovelDetail, fetchNovelContent } from '../api/endpoints';
import type { NovelItem, NovelChapter, NovelContent } from '../api/types';

export function NovelsScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const [list, setList] = useState<NovelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNovels().then((d) => setList(d.list || [])).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={<Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 }}>{t('novels.title')}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('NovelDetail', { novelId: item.id })} style={{ flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 10, marginBottom: 8 }}>
            <Image source={{ uri: item.photo }} style={{ width: 60, height: 80, borderRadius: Radius.xs, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: '600', color: Colors.textPrimary, fontSize: FontSize.bodyLarge }}>{item.title}</Text>
              <Text style={{ fontSize: FontSize.body, color: Colors.textSecondary, marginTop: 2 }}>{item.author}</Text>
              <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 }} numberOfLines={2}>{item.description}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color={Colors.primary} /> : <Text style={{ color: Colors.textTertiary, textAlign: 'center', marginTop: 40 }}>{t('common.empty')}</Text>}
      />
    </SafeAreaView>
  );
}

export function NovelDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { novelId } = route.params;
  const { t } = useTranslation();
  const [novel, setNovel] = useState<NovelItem | null>(null);
  const [chapters, setChapters] = useState<NovelChapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNovelDetail(novelId).then((d) => {
      setNovel(d.novel);
      setChapters(d.chapters || []);
    }).finally(() => setLoading(false));
  }, [novelId]);

  if (loading) return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center' }}><ActivityIndicator color={Colors.primary} /></SafeAreaView>;
  if (!novel) return null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.marginEdge }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Image source={{ uri: novel.photo }} style={{ width: 100, height: 140, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.title, fontWeight: '700', color: Colors.textPrimary }}>{novel.title}</Text>
            <Text style={{ color: Colors.primary, marginTop: 4 }}>{novel.author}</Text>
            <Text style={{ color: Colors.textTertiary, fontSize: FontSize.body, marginTop: 4 }} numberOfLines={3}>{novel.description}</Text>
          </View>
        </View>
        <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary, marginTop: 20, marginBottom: 8 }}>{t('novels.chapters')} ({chapters.length})</Text>
        {chapters.map((ch) => (
          <Pressable key={ch.id} onPress={() => nav.navigate('NovelReader', { novelId, chapterId: ch.id, title: ch.title })} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.surface, borderRadius: Radius.sm, marginBottom: 4 }}>
            <Text style={{ color: Colors.textPrimary, flex: 1 }}>{ch.title}</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
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
  const { novelId, chapterId } = route.params;
  const [content, setContent] = useState<NovelContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNovelContent(chapterId).then(setContent).finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center' }}><ActivityIndicator color={Colors.primary} /></SafeAreaView>;
  if (!content) return null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.surface }}>
        <Pressable onPress={() => nav.goBack()}><MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} /></Pressable>
        <Text style={{ color: Colors.textPrimary, fontSize: 17, fontWeight: '600', marginLeft: 12, flex: 1 }} numberOfLines={1}>{content.title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 60 }}>
        <Text style={{ color: Colors.textPrimary, fontSize: FontSize.bodyLarge, lineHeight: 26 }}>{content.content}</Text>
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: Colors.surface }}>
        {content.prev_id ? (
          <Pressable onPress={() => { nav.replace('NovelReader', { novelId, chapterId: content.prev_id }); }}>
            <Text style={{ color: Colors.primary }}>{t('novels.prev')}</Text>
          </Pressable>
        ) : <View />}
        {content.next_id ? (
          <Pressable onPress={() => { nav.replace('NovelReader', { novelId, chapterId: content.next_id }); }}>
            <Text style={{ color: Colors.primary }}>{t('novels.next')}</Text>
          </Pressable>
        ) : <View />}
      </View>
    </SafeAreaView>
  );
}
