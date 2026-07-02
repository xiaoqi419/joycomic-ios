// 视频 v5 — 分类 Tabs + 搜索
// @author Jason

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator, Dimensions,
  Linking, StyleSheet, RefreshControl, TextInput,
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

const VIDEO_TABS = [
  { key: '', label: '全部' },
  { key: 'movie', label: '小電影' },
  { key: 'hanime', label: 'H動漫' },
  { key: 'cos', label: 'Cos' },
] as const;

function getVideoType(tabKey: string): string | undefined {
  if (!tabKey) return undefined;
  // H動漫 和 Cos 都走 video, 但用 searchQuery 区分
  if (tabKey === 'hanime' || tabKey === 'cos') return 'video';
  return tabKey;
}

function getSearchQuery(tabKey: string): string | undefined {
  if (tabKey === 'hanime') return 'H動漫';
  if (tabKey === 'cos') return 'Cos';
  return undefined;
}

function AuthImage({ uri }: { uri: string }) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const fullUri = uri.startsWith('http') ? uri : `https://${getImgHost()}/${uri.replace(/^\//, '')}`;
  useEffect(() => {
    let cancelled = false;
    if (!uri) return;
    fetchImageAsDataUri(fullUri).then((d) => {
      if (cancelled) return;
      if (d) setDataUri(d);
    }).catch(() => {});
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
  const route = useRoute<any>();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState(route.params?.tab || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const loadMovies = useCallback(async (p: number, append = false) => {
    try {
      const vt = getVideoType(tab);
      const sq = searchQuery || getSearchQuery(tab);
      const params: any = { page: p };
      if (vt) params.videoType = vt;
      if (sq) params.searchQuery = sq;
      const d = await fetchMovies(params);
      const list = d.list || [];
      if (append) {
        setMovies((prev) => [...prev, ...list]);
      } else {
        setMovies(list);
      }
      setHasMore(list.length >= 20);
    } catch (e: any) {
      movieLog.err('fetchMovies: failed ' + (e?.message || e));
    }
  }, [tab, searchQuery]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadMovies(1).finally(() => setLoading(false));
  }, [tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadMovies(1);
    setRefreshing(false);
  }, [loadMovies]);

  const handleEndReached = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    await loadMovies(next, true);
    setPage(next);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, loadMovies]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setPage(1);
    loadMovies(1).then(() => setShowSearch(false));
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={movies}
        numColumns={2}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            {/* 标题 + 搜索按钮 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary }}>
                {t('movies.title')}
              </Text>
              <Pressable onPress={() => setShowSearch(!showSearch)} hitSlop={8}>
                <MaterialIcons name={showSearch ? 'close' : 'search'} size={24} color={Colors.primary} />
              </Pressable>
            </View>

            {/* 搜索框 */}
            {showSearch && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={{
                    flex: 1, height: 40, backgroundColor: Colors.surface, borderRadius: Radius.sm,
                    paddingHorizontal: 12, color: Colors.textPrimary, fontSize: FontSize.body,
                    borderWidth: 1, borderColor: Colors.border,
                  }}
                  placeholder="搜索视频..."
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  autoFocus
                />
                <Pressable onPress={handleSearch} style={{
                  width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.primary,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <MaterialIcons name="search" size={20} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* 分类 Tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {VIDEO_TABS.map((vt) => (
                <Pressable
                  key={vt.key}
                  onPress={() => { setTab(vt.key); setSearchQuery(''); setShowSearch(false); }}
                  style={[
                    S.tabChip,
                    tab === vt.key && S.tabChipActive,
                  ]}
                >
                  <Text style={[
                    S.tabText,
                    tab === vt.key && S.tabTextActive,
                  ]}>{vt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} /> : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.navigate('MoviePlayer' as never, { vid: item.id, backlink: item.backlink, title: item.title, photo: item.photo } as never)}
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

// ========== Movie Player (unchanged) ==========

const EXTRACT_VIDEO_JS = `
(function(){
  function _log(m){ try{ window.ReactNativeWebView.postMessage(JSON.stringify({type:'log',msg:m})); }catch(e){} }
  function _found(src){ try{ window.ReactNativeWebView.postMessage(JSON.stringify({type:'video_src',src:src})); }catch(e){} }
  _log('extract: start');
  var origFetch = window.fetch;
  window.fetch = function(){
    var url = arguments[0];
    if(typeof url==='string' && !url.includes('video')) return origFetch.apply(this,arguments);
    return origFetch.apply(this,arguments).then(function(r){
      var c = r.clone();
      c.text().then(function(t){
        try{ var j=JSON.parse(t);
          if(j&&j.data){
            var vs=j.data.video_src||(j.data.video&&j.data.video.video_src);
            if(vs){ _log('extract: fetch interceptor found video_src='+vs.slice(0,80)); _found(vs); }
            var fu=j.data.full_url||(j.data.video&&j.data.video.full_url);
            if(fu&&j.data.video_src){ var vs2=j.data.video_src; if(vs2){ _log('extract: via full_url fetch'); _found(vs2); } }
          }
        }catch(e){}
      });
      return r;
    });
  };
  function pollDOM(){
    var v=document.querySelector('video');
    if(v&&v.src&&!v.src.startsWith('blob:')&&v.src!==location.href){ _log('extract: DOM video.src='+v.src.slice(0,80)); _found(v.src); return; }
    var s=document.querySelector('source');
    if(s&&s.src&&!s.src.startsWith('blob:')){ _log('extract: DOM source='+s.src.slice(0,80)); _found(s.src); return; }
    setTimeout(pollDOM,2000);
  }
  setTimeout(pollDOM,3000);
})();
`;

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
  const [scrapedSrc, setScrapedSrc] = useState<string | null>(null);

  useEffect(() => {
    fetchVideoDetail(vid).then((d: any) => {
      const v = d?.video || d;
      if (v && Object.keys(v).length > 0) {
        setVideo(v);
        if (v?.video_src) return;
      }
      setUseWebView(true);
      setVideo({ vid, title: route.params?.title, full_url: route.params?.backlink || `https://18comic.vip/video/${vid}` });
    }).catch(() => {
      setUseWebView(true);
      setVideo({ vid, title: route.params?.title, full_url: route.params?.backlink || `https://18comic.vip/video/${vid}` });
    }).finally(() => setLoading(false));
  }, [vid]);

  useEffect(() => {
    if (scrapedSrc && video) {
      setVideo({ ...video, video_src: scrapedSrc });
      setUseWebView(false);
      setNativeFailed(false);
    }
  }, [scrapedSrc]);

  const handleWebViewMessage = (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'video_src' && msg.src) setScrapedSrc(msg.src);
    } catch {}
  };

  if (loading) return <LoadingScreen />;
  if (err) return <ErrorScreen msg={err} />;
  if (!video) return <ErrorScreen msg={t('common.error')} />;

  const fullUrl = video.full_url || `https://18comic.vip/video/${vid}`;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={S.topBar}>
        <Pressable onPress={() => nav.goBack()}><MaterialIcons name="arrow-back" size={24} color="#fff" /></Pressable>
        <Text style={S.titleText} numberOfLines={1}>{video.title}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {video.video_src && (
            <Pressable onPress={() => setUseWebView((v) => !v)} hitSlop={8}>
              <MaterialIcons name={useWebView ? 'videocam' : 'web'} size={22} color={Colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={() => Linking.openURL(fullUrl)} hitSlop={8}>
            <MaterialIcons name="open-in-new" size={22} color={Colors.primary} />
          </Pressable>
        </View>
      </View>
      <View style={S.playerWrap}>
        {useWebView || nativeFailed ? (
          <WebView
            key={fullUrl}
            source={{ uri: fullUrl }}
            style={{ flex: 1 }}
            onMessage={handleWebViewMessage}
            injectedJavaScript={EXTRACT_VIDEO_JS}
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
              onError={() => setNativeFailed(true)}
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
  tabChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.xl,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.label, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
});
