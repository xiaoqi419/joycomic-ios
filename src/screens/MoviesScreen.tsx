// 视频列表 + 播放器 — 复刻 APK Movies + MoviesPlayer
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { fetchMovies, fetchVideoDetail } from '../api/endpoints';
import { fetchImageAsDataUri } from '../utils/fetchImage';
import type { MovieItem } from '../api/types';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.marginEdge * 2 - 8) / 2;

function AuthImage({ uri }: { uri: string }) {
  const [dataUri, setDataUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchImageAsDataUri(uri).then((d) => { if (!cancelled) setDataUri(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [uri]);

  if (!dataUri) {
    return <View style={{ width: CARD_W, height: CARD_W * 0.75, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} />;
  }

  return (
    <Image source={{ uri: dataUri }} style={{ width: CARD_W, height: CARD_W * 0.75, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
  );
}

export function MoviesScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies().then((d) => setMovies(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={movies}
        numColumns={2}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={<Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 }}>{t('movies.title')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.navigate('MoviePlayer', { vid: item.id })}
            style={{ width: CARD_W, margin: 4, marginBottom: 12 }}
          >
            <AuthImage uri={item.photo} />
            <Text style={{ fontSize: FontSize.body, fontWeight: '600', color: Colors.text, marginTop: 4 }} numberOfLines={2}>{item.title}</Text>
            {item.tags?.length > 0 && (
              <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary }}>{item.tags.slice(0, 3).join(', ')}</Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color={Colors.primary} /> : null}
      />
    </SafeAreaView>
  );
}

export function MoviePlayerScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { vid } = route.params;
  const { t } = useTranslation();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    fetchVideoDetail(vid).then((d) => {
      setVideo(d.video);
      if (d.video?.photo) {
        fetchImageAsDataUri(d.video.photo).then(setPhotoUri).catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [vid]);

  if (loading) return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={Colors.primary} /></SafeAreaView>;
  if (!video) return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>{t('common.error')}</Text></SafeAreaView>;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#111' }}>
        <Pressable onPress={() => nav.goBack()}><MaterialIcons name="arrow-back" size={24} color="#fff" /></Pressable>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', marginLeft: 12 }} numberOfLines={1}>{video.title}</Text>
      </View>

      {/* 视频封面/播放按钮 */}
      <View style={{ aspectRatio: 16 / 9, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : null}
        <Pressable
          onPress={() => {
            // full_url 是外部视频站页面，手机浏览器可直接播放
            Linking.openURL(video.full_url || video.video_src || `https://18comic.vip/video/${vid}`);
          }}
          style={{ position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}
        >
          <MaterialIcons name="play-arrow" size={40} color="#fff" />
        </Pressable>
      </View>

      {/* 视频信息 */}
      <View style={{ padding: 14, flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>{video.title}</Text>
        {video.view ? <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{t('movies.views', { count: video.view })}: {video.view}</Text> : null}
        {video.factory ? <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{t('movies.studio')}: {video.factory}</Text> : null}
        {video.girls?.length > 0 ? <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{t('movies.actress')}: {video.girls.join(', ')}</Text> : null}
        {video.tags?.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {video.tags.map((tag: string, i: number) => (
              <View key={i} style={{ backgroundColor: Colors.surfaceContainer, paddingHorizontal: 10, paddingVertical: 4,                 borderRadius: Radius.chip }}>
                <Text style={{ color: Colors.textTertiary, fontSize: FontSize.caption }}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {video.description ? (
          <Text style={{ color: '#aaa', fontSize: 13, marginTop: 8, lineHeight: 18 }}>{video.description}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
