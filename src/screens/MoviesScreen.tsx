// 视频列表 + 播放器 — 复刻 APK Movies + MoviesPlayer
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { fetchMovies, fetchVideoDetail, fetchLatestHanime } from '../api/endpoints';
import type { MovieItem } from '../api/types';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.marginEdge * 2 - 8) / 2;

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
            <Image source={{ uri: item.photo }} style={{ width: CARD_W, height: CARD_W * 0.75, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
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

  useEffect(() => {
    fetchVideoDetail(vid).then((d) => setVideo(d.video)).catch(() => {}).finally(() => setLoading(false));
  }, [vid]);

  if (loading) return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={Colors.primary} /></SafeAreaView>;
  if (!video) return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>{t('common.error')}</Text></SafeAreaView>;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#111' }}>
        <Pressable onPress={() => nav.goBack()}><MaterialIcons name="arrow-back" size={24} color="#fff" /></Pressable>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', marginLeft: 12 }} numberOfLines={1}>{video.title}</Text>
      </View>
      {/* Video player (uses external browser since HLS is complex in Expo Go) */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <MaterialIcons name="play-circle-outline" size={80} color={Colors.primary} />
        <Text style={{ color: '#fff', fontSize: 16, marginTop: 12 }}>{t('movies.play')}</Text>
        <Text style={{ color: '#888', marginTop: 8, textAlign: 'center' }}>{video.description}</Text>
        <Pressable
          onPress={() => {
            // In Expo Go we can't use native video. Open in browser.
            const { Linking } = require('react-native');
            Linking.openURL(video.video_src || video.full_url || `https://18comic.vip/video/${vid}`);
          }}
          style={{ marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: Radius.button }}
        >
          <Text style={{ color: Colors.textOnPrimary, fontWeight: '700' }}>{t('movies.play')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
