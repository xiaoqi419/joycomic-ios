// 博客 — 复刻 APK Blogs.tsx + BlogsDetail.tsx
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, Radius, Spacing, FontSize } from '../theme';
import { fetchBlogs, fetchBlogDetail, getCoverUrl as getCover } from '../api/endpoints';
import type { BlogItem, ComicItem } from '../api/types';
import { formatTime } from '../utils/helpers';
import { HtmlText } from '../components/HtmlText';

export function BlogsScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const C = useLegacyColors();
  const [list, setList] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs().then((d) => setList(d.list || [])).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.background }}>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={<Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: C.textPrimary, marginBottom: 12 }}>{t('blogs.title')}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('BlogDetail', { blogId: item.id })} style={{ marginBottom: 12 }}>
            <Image source={{ uri: item.photo }} style={{ width: '100%', height: 180, borderRadius: Radius.sm, backgroundColor: C.surfaceContainer }} contentFit="cover" />
            <View style={{ padding: 8 }}>
              <Text style={{ fontSize: FontSize.bodyLarge, fontWeight: '600', color: C.text }}>{item.title}</Text>
              <Text style={{ fontSize: FontSize.caption, color: C.textTertiary, marginTop: 2 }}>{item.author} · {formatTime(item.addtime)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color={C.primary} /> : <Text style={{ color: C.textTertiary, textAlign: 'center', marginTop: 40 }}>{t('common.empty')}</Text>}
      />
    </SafeAreaView>
  );
}

export function BlogDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { blogId } = route.params;
  const { t } = useTranslation();
  const C = useLegacyColors();
  const [blog, setBlog] = useState<BlogItem | null>(null);
  const [content, setContent] = useState('');
  const [related, setRelated] = useState<ComicItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogDetail(blogId).then((d) => {
      setBlog(d.blog);
      setContent(d.content);
      setRelated(d.related_comics || []);
    }).finally(() => setLoading(false));
  }, [blogId]);

  if (loading) return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center' }}><ActivityIndicator color={C.primary} /></SafeAreaView>;
  if (!blog) return null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Image source={{ uri: blog.photo }} style={{ width: '100%', height: 220 }} contentFit="cover" />
        <View style={{ padding: Spacing.marginEdge }}>
          <Text style={{ fontSize: FontSize.title, fontWeight: '700', color: C.textPrimary }}>{blog.title}</Text>
          <Text style={{ color: C.textTertiary, fontSize: FontSize.caption, marginTop: 4 }}>{blog.author} · {formatTime(blog.addtime)}</Text>
          <HtmlText html={content} style={{ color: C.textSecondary, lineHeight: 22, marginTop: 12 }} linkColor={C.primary} />

          {related.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary, marginBottom: 8 }}>{t('blogs.related_comics')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {related.map((c) => (
                  <Pressable key={c.id} onPress={() => nav.navigate('ComicDetail', { albumId: c.id })} style={{ marginRight: 10, width: 100 }}>
                    <Image source={{ uri: c.image || getCover(c.id) }} style={{ width: 100, height: 140, borderRadius: Radius.sm, backgroundColor: C.surfaceContainer }} contentFit="cover" />
                    <Text style={{ fontSize: FontSize.caption, color: C.text, marginTop: 4 }} numberOfLines={2}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
