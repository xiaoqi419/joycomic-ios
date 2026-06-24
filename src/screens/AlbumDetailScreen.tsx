// 漫画详情 - 樱花绯红主题
// @author Jason

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getAlbumDetail, getChapterDetail, getImageUrl, getCoverUrl } from '../api/mobile';
import { useFavoritesStore, LocalFavorite } from '../store/useFavorites';
import { useReaderStore } from '../store/useReader';
import { IMAGE_DOMAINS } from '../constants';
import { Colors, Radius, Spacing, FontSize } from '../theme';

export function AlbumDetailScreen({ route, navigation }: any) {
  const { albumId } = route.params;
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState('');
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const { startReading } = useReaderStore();
  const fav = isFavorite(albumId);

  useEffect(() => { load(); }, [albumId]);
  const load = async () => {
    try { setLoading(true); const d = await getAlbumDetail(albumId); setAlbum(d); setCoverUrl(d.coverUrl || getCoverUrl(IMAGE_DOMAINS[0], albumId)); } catch {} finally { setLoading(false); }
  };

  const openChapter = async (chId: string) => {
    try {
      const ch = await getChapterDetail(chId);
      const imgs = ch.images && ch.images.length > 0
        ? ch.images
        : ch.pageArr.length > 0
          ? ch.pageArr.map((a: number[], i: number) => `https://${ch.dataOriginalDomain || IMAGE_DOMAINS[0]}/media/photos/${chId}/${String(a[0] || i + 1).padStart(5, '0')}.jpg`)
          : Array.from({ length: ch.pageCount || 20 }, (_, i) => getImageUrl(IMAGE_DOMAINS[0], chId, i + 1));
      startReading(albumId, chId, imgs);
      navigation.navigate('Reader', { chapterId: chId, albumId });
    } catch {}
  };

  const fmt = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n || 0);

  if (loading) return <SafeAreaView style={styles.container}><StatusBar style="dark" /><View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View></SafeAreaView>;
  if (!album) return <SafeAreaView style={styles.container}><View style={styles.center}><Text style={{ color: Colors.error }}>加载失败</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}>
        <View style={{ flexDirection: 'row', padding: Spacing.md, margin: Spacing.marginEdge, marginTop: Spacing.md, backgroundColor: Colors.surfaceLowest, borderRadius: Radius.card, gap: Spacing.md }}>
          <Image source={{ uri: coverUrl }} style={{ width: 130, height: 185, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} resizeMode="cover" />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: FontSize.title, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs }}>{album.title}</Text>
            <Text style={{ fontSize: FontSize.body, color: Colors.textSecondary, marginBottom: Spacing.xs }}>{album.author.join(' / ') || '未知'}</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs }}>
              <Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>👁 {fmt(album.views)}</Text>
              <Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>❤ {fmt(album.likes)}</Text>
            </View>
            <Text style={{ fontSize: FontSize.label, color: Colors.textTertiary }}>更新 {album.updateDate || album.publishDate || '未知'}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: Spacing.md }}>
          <TouchableOpacity style={{ height: 44, borderRadius: Radius.button, backgroundColor: fav ? Colors.primary : Colors.surfaceLowest, borderWidth: 1.5, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              if (!album) return;
              const f: LocalFavorite = { id: album.id, title: album.title, coverUrl, author: album.author.join(', '), addedAt: Date.now() };
              fav ? removeFavorite(album.id) : addFavorite(f);
            }} activeOpacity={0.8}>
            <Text style={{ fontSize: FontSize.bodyLarge, fontWeight: '600', color: fav ? Colors.textOnPrimary : Colors.primary }}>{fav ? '❤ 已收藏' : '♡ 收藏'}</Text>
          </TouchableOpacity>
        </View>

        {album.tags?.length > 0 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm }}>标签</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {album.tags.map((t: string, i: number) => (
                <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.chip, backgroundColor: Colors.surfaceLowest, borderWidth: 1, borderColor: Colors.primaryLight }}>
                  <Text style={{ fontSize: FontSize.label, color: Colors.primary, fontWeight: '500' }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: Spacing.lg }}>
          <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm }}>章节 ({album.episodes.length})</Text>
          {album.episodes.map((ep: any) => (
            <TouchableOpacity key={ep.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.surfaceLowest, borderRadius: Radius.sm, marginBottom: Spacing.sm }}
              onPress={() => openChapter(ep.id)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: '500' }}>第{ep.index}话 {ep.title}</Text></View>
              <Text style={{ fontSize: FontSize.label, color: Colors.textSecondary, marginHorizontal: Spacing.sm }}>{ep.pageCount}P</Text>
              <Text style={{ fontSize: 20, color: Colors.textTertiary, fontWeight: '300' }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
