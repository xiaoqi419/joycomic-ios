// 视频 v4 — expo-av Video 原生播放 (HLS/mp4) + WebView 兜底
// @author Jason

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator, Dimensions,
  Linking, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { fetchMovies, fetchVideoDetail, getImgHost } from '../api/endpoints';
import { fetchImageAsDataUri } from '../utils/fetchImage';
import { jmLogger } from '../utils/JmLogger';
import type { MovieItem } from '../api/types';

const movieLog = jmLogger;

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.marginEdge * 2 - 10) / 2;

function AuthImage({ uri }: { uri: string }) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const fullUri = uri.startsWith('http') ? uri : `https://${getImgHost()}/${uri.replace(/^\//, '')}`;
  useEffect(() => {
    let cancelled = false;
    if (!uri) { movieLog.warn('AuthImage: empty uri'); return; }
    movieLog.log('AuthImage: fetching ' + fullUri.slice(0, 80));
    fetchImageAsDataUri(fullUri).then((d) => {
      if (cancelled) return;
      if (d) { movieLog.log('AuthImage: success ' + d.slice(0, 40)); setDataUri(d); }
      else { movieLog.warn('AuthImage: returned null for ' + fullUri.slice(0, 80)); }
    }).catch((e: any) => {
      movieLog.err('AuthImage: failed ' + fullUri.slice(0, 80) + ' ' + (e?.message || e));
    });
    return () => { cancelled = true; };
  }, [fullUri]);
  if (!dataUri) return <View style={{ width: CARD_W, height: CARD_W * 0.75, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} />;
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
    movieLog.log('fetchMovies: start');
    fetchMovies().then((d) => {
      const list = d.list || [];
      movieLog.log('fetchMovies: got ' + list.length + ' items');
      setMovies(list);
    }).catch((e: any) => {
      movieLog.err('fetchMovies: failed ' + (e?.message || e));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={movies}
        numColumns={2}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={<Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, marginBottom: 14 }}>{t('movies.title')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.navigate('MoviePlayer' as never, { vid: item.id } as never)}
            style={{ width: CARD_W, margin: 4, marginBottom: 14 }}
          >
            <AuthImage uri={item.photo} />
            <Text style={{ fontSize: FontSize.body, fontWeight: '600', color: Colors.text, marginTop: 6 }} numberOfLines={2}>{item.title}</Text>
            {item.tags?.length > 0 && (
              <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary, marginTop: 2 }}>{item.tags.slice(0, 3).join(', ')}</Text>
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
  const videoRef = useRef<Video>(null);

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [useWebView, setUseWebView] = useState(false);
  const [nativeFailed, setNativeFailed] = useState(false);

  useEffect(() => {
    movieLog.log('fetchVideoDetail: start vid=' + vid);
    fetchVideoDetail(vid).then((d) => {
      const v = d.video;
      movieLog.log('fetchVideoDetail: keys=' + Object.keys(v || {}).join(','));
      movieLog.log('fetchVideoDetail: video_src=' + (v?.video_src?.slice(0, 80) || '(none)'));
      movieLog.log('fetchVideoDetail: full_url=' + (v?.full_url?.slice(0, 80) || '(none)'));
      movieLog.log('fetchVideoDetail: title=' + (v?.title || '(none)'));
      movieLog.log('fetchVideoDetail: photo=' + (v?.photo?.slice(0, 60) || '(none)'));
      movieLog.log('fetchVideoDetail: view=' + v?.view + ' factory=' + v?.factory);
      setVideo(v);
      if (!v?.video_src) {
        movieLog.warn('fetchVideoDetail: no video_src, falling back to WebView');
        setUseWebView(true);
      } else {
        movieLog.log('fetchVideoDetail: will use native player with src=' + v.video_src);
      }
    }).catch((e: any) => {
      movieLog.err('fetchVideoDetail: failed ' + (e?.message || e));
      setErr(e.message || '加载失败');
    }).finally(() => setLoading(false));
  }, [vid]);

  if (loading) return <LoadingScreen />;
  if (err) return <ErrorScreen msg={err} />;
  if (!video) return <ErrorScreen msg={t('common.error')} />;

  const fullUrl = video.full_url || `https://18comic.vip/video/${vid}`;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000' }}>
      {/* 顶栏 */}
      <View style={S.topBar}>
        <Pressable onPress={() => nav.goBack()}><MaterialIcons name="arrow-back" size={24} color="#fff" /></Pressable>
        <Text style={S.titleText} numberOfLines={1}>{video.title}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {video.video_src && (
            <Pressable onPress={() => { movieLog.log('toggle mode ' + (useWebView ? '→native' : '→webview')); setUseWebView((v) => !v); }} hitSlop={8}>
              <MaterialIcons name={useWebView ? 'videocam' : 'web'} size={22} color={Colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={() => Linking.openURL(fullUrl)} hitSlop={8}>
            <MaterialIcons name="open-in-new" size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* 播放器区域 */}
      <View style={S.playerWrap}>
        {useWebView || nativeFailed ? (
          <WebView
            key={fullUrl}
            source={{ uri: fullUrl }}
            style={{ flex: 1 }}
            onLoad={() => movieLog.log('WebView: loaded ' + fullUrl.slice(0, 60))}
            onError={(e: any) => movieLog.err('WebView: error ' + (e?.nativeEvent?.description || e?.message || JSON.stringify(e)))}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            renderLoading={() => <PlayerLoading />}
          />
        ) : (
          <>
            <Video
              ref={videoRef}
              source={{ uri: video.video_src }}
              style={{ flex: 1 }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              onError={(e) => { movieLog.err('Video.onError ' + JSON.stringify(e)); setNativeFailed(true); }}
            />
            {nativeFailed && (
              <View style={S.fallbackOverlay}>
                <Text style={{ color: '#aaa', marginBottom: 12 }}>原生播放失败</Text>
                <Pressable onPress={() => setUseWebView(true)} style={S.fallbackBtn}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>切换网页播放</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>

      {/* 信息 */}
      <View style={{ padding: Spacing.marginEdge }}>
        <Text style={{ color: '#fff', fontSize: FontSize.headline, fontWeight: '700', marginBottom: 6 }}>{video.title}</Text>
        {video.view ? <Text style={{ color: '#aaa', fontSize: FontSize.body }}>{t('movies.views', { count: video.view })}</Text> : null}
        {video.factory ? <Text style={{ color: '#aaa', fontSize: FontSize.body }}>{t('movies.studio')}: {video.factory}</Text> : null}
        {video.girls?.length > 0 ? <Text style={{ color: '#aaa', fontSize: FontSize.body }}>{t('movies.actress')}: {video.girls.join(', ')}</Text> : null}
        {video.tags?.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {video.tags.map((tag: string, i: number) => (
              <View key={i} style={S.tag}><Text style={S.tagText}>{tag}</Text></View>
            ))}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={Colors.primary} />
    </SafeAreaView>
  );
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#666' }}>{msg}</Text>
    </SafeAreaView>
  );
}

function PlayerLoading() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

const S = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#111',
  },
  titleText: {
    color: '#fff', fontSize: FontSize.headline, fontWeight: '600',
    marginLeft: 12, flex: 1,
  },
  playerWrap: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  fallbackOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  fallbackBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: Radius.button,
  },
  tag: { backgroundColor: Colors.surfaceContainer, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.chip },
  tagText: { color: Colors.textTertiary, fontSize: FontSize.caption },
});
