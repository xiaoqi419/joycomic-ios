// 阅读器 v3 — PicaComic 风格 UI
// @author Jason

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions, StatusBar,
  Pressable, ActivityIndicator, Modal, Alert, StyleSheet, Animated,
} from 'react-native';
import { SafeImage } from '../components/SafeImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useReaderStore } from '../store/useReader';
import { useHistoryStore } from '../store/useHistory';
import { useSettingsStore } from '../store/useSettings';
import { fetchComicRead, fetchAlbumDetail } from '../api/endpoints';
import { useLegacyColors } from '../theme';
import * as Brightness from 'expo-brightness';
import * as MediaLibrary from 'expo-media-library';
import type { Episode } from '../api/types';

const W = require('react-native').Dimensions.get('window').width;
const ANIM_DUR = 150;
const TAP_ZONE = 0.2;

export function ReaderScreen() {
  const { height: H } = useWindowDimensions();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { albumId, chapterId, chapterTitle, initialPage } = route.params || {};
  const C = useLegacyColors();

  const store = useReaderStore();
  const setReadingMode = useSettingsStore((s) => s.setReadingMode);
  const readingMode = useSettingsStore((s) => s.readingMode);

  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [brightness, setBrightnessVal] = useState(1);
  const flatRef = useRef<FlatList>(null);
  const [imageHeights, setImageHeights] = useState<Record<number, number>>({});

  const topAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const [showUI, setShowUI] = useState(true);

  // 读取器的当前状态
  const imageUrls = store.imageUrls;
  const currentPage = store.currentPage;
  const isVertical = store.isVertical;

  const toggleUI = useCallback(() => {
    const next = showUI ? 0 : 1;
    Animated.parallel([
      Animated.timing(topAnim, { toValue: next, duration: ANIM_DUR, useNativeDriver: true }),
      Animated.timing(bottomAnim, { toValue: next, duration: ANIM_DUR, useNativeDriver: true }),
    ]).start();
    setShowUI(!showUI);
  }, [showUI, topAnim, bottomAnim]);

  useEffect(() => {
    Brightness.getBrightnessAsync().then(setBrightnessVal).catch(() => {});
    topAnim.setValue(1);
    bottomAnim.setValue(1);
    store.setVertical(readingMode === 'scroll');
  }, []);

  useEffect(() => {
    if (albumId) {
      fetchAlbumDetail(albumId).then((d) => setEpisodes(d.series || [])).catch(() => {});
    }
  }, [albumId]);

  useEffect(() => {
    if (initialPage && initialPage > 0) {
      store.setPage(initialPage);
      setTimeout(() => flatRef.current?.scrollToIndex({ index: initialPage, animated: false, viewPosition: 0 }), 300);
    }
  }, [initialPage]);

  const switchChapter = async (chId: string, chName: string) => {
    setShowChapterModal(false);
    setLoading(true);
    setImageHeights({});
    try {
      const data = await fetchComicRead(chId);
      const host = data.data_original_domain || (await import('../api/endpoints')).getImgHost();
      let images: string[];
      if (data.images?.length) {
        images = data.images.map((item: any) => item.image);
      } else {
        const count = data.page_count || 20;
        images = [];
        for (let i = 1; i <= count; i++) {
          images.push(`https://${host}/media/photos/${chId}/${String(i).padStart(5, '0')}.webp`);
        }
      }
      store.startReading(albumId || data.album_id, chId, chName, images, 220980);
      useHistoryStore.getState().add({
        id: albumId || data.album_id, title: chapterTitle || chName, coverUrl: '',
        chapterId: chId, chapterTitle: chName, page: 0, readAt: Date.now(),
      });
    } catch {}
    setLoading(false);
  };

  const goNext = useCallback(() => {
    if (currentPage < imageUrls.length - 1) store.setPage(currentPage + 1);
  }, [currentPage, imageUrls.length]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) store.setPage(currentPage - 1);
  }, [currentPage]);

  const handleTap = useCallback((evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < W * TAP_ZONE) { if (currentPage > 0) store.setPage(currentPage - 1); }
    else if (x > W * (1 - TAP_ZONE)) { if (currentPage < imageUrls.length - 1) store.setPage(currentPage + 1); }
    else toggleUI();
  }, [currentPage, imageUrls.length, toggleUI]);

  const handleSaveImage = async () => {
    const url = imageUrls[currentPage];
    if (!url) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('', '需要相册权限才能保存'); return; }
      const response = await fetch(url);
      await MediaLibrary.saveToLibraryAsync(URL.createObjectURL(await response.blob()));
      Alert.alert('', '已保存到相册');
    } catch {}
  };

  const totalPages = imageUrls.length;
  const currentEpIdx = episodes.findIndex((ep) => ep.id === (store.chapterId || chapterId));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden={!showUI} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#E85D3A" />
        </View>
      ) : isVertical ? (
        <FlatList
          ref={vertRef}
          data={imageUrls}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <Pressable style={{ width: W }} onPress={toggleUI}>
              <SafeImage imageUrl={item} epsId={store.chapterId || chapterId}
                pictureName={item.split('/').pop()?.split('.')[0] || ''}
                containerWidth={W}
                onDimension={(w, h) => { if (w > 0 && h > 0) setImageHeights((p) => ({ ...p, [index]: (W * h) / w })); }}
                style={{ width: W, height: imageHeights[index] || W * 1.4 }}
              />
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          ref={flatRef}
          horizontal pagingEnabled
          data={imageUrls}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={toggleUI} style={{ width: W, height: H }}>
              <SafeImage imageUrl={item} epsId={store.chapterId || chapterId}
                pictureName={item.split('/').pop()?.split('.')[0] || ''}
                containerWidth={W} style={{ width: W, height: H }}
              />
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => { store.setPage(Math.round(e.nativeEvent.contentOffset.x / W)); }}
          getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
        />
      )}

      {/* 顶部栏 */}
      <Animated.View style={[s.topBar, { transform: [{ translateY: topAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }] }]}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
              {chapterTitle || `第${currentEpIdx + 1}话`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
            <MaterialIcons name="settings" size={22} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* 底部栏 */}
      <Animated.View style={[s.bottomBar, { transform: [{ translateY: bottomAnim.interpolate({ inputRange: [0, 1], outputRange: [130, 0] }) }] }]}>
        <SafeAreaView edges={['bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, paddingTop: 6 }}>
            <TouchableOpacity onPress={() => store.setPage(0)} disabled={currentPage === 0}>
              <MaterialIcons name="first-page" size={20} color={currentPage === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
            <Pressable
              style={{ flex: 1, height: 24, justifyContent: 'center' }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (W - 80)));
                store.setPage(Math.round(ratio * (totalPages - 1)));
              }}
            >
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                <View style={{ width: `${totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0}%`, height: 4, backgroundColor: '#E85D3A', borderRadius: 2 }} />
              </View>
            </Pressable>
            <TouchableOpacity onPress={() => store.setPage(totalPages - 1)} disabled={currentPage === totalPages - 1}>
              <MaterialIcons name="last-page" size={20} color={currentPage === totalPages - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 4 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>P{currentPage + 1}/{totalPages}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <TouchableOpacity onPress={handleSaveImage}><MaterialIcons name="save-alt" size={22} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowChapterModal(true)}><MaterialIcons name="format-list-numbered" size={22} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={() => { store.setVertical(!isVertical); setReadingMode(!isVertical ? 'scroll' : 'page'); }}>
                <MaterialIcons name={isVertical ? 'view-carousel' : 'view-stream'} size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* 设置弹窗 */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowSettings(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1C1C24', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>阅读设置</Text>
            <TouchableOpacity style={s.sr} onPress={() => { store.setVertical(!isVertical); setReadingMode(!isVertical ? 'scroll' : 'page'); }}>
              <MaterialIcons name="swap-vert" size={20} color="#fff" />
              <Text style={{ color: '#fff', flex: 1, marginLeft: 12 }}>滚动模式</Text>
              <Text style={{ color: '#999' }}>{isVertical ? '竖滑' : '分页'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sr} onPress={() => { const b = brightness > 0.5 ? 0.3 : 1; Brightness.setBrightnessAsync(b); setBrightnessVal(b); }}>
              <MaterialIcons name={brightness > 0.5 ? 'brightness-high' : 'brightness-low'} size={20} color="#fff" />
              <Text style={{ color: '#fff', flex: 1, marginLeft: 12 }}>亮度</Text>
              <Text style={{ color: '#999' }}>{Math.round(brightness * 100)}%</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 章节选择弹窗 */}
      <Modal visible={showChapterModal} transparent animationType="slide" onRequestClose={() => setShowChapterModal(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowChapterModal(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1C1C24', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 400 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>章节</Text>
              <TouchableOpacity onPress={() => setShowChapterModal(false)}><MaterialIcons name="close" size={22} color="#fff" /></TouchableOpacity>
            </View>
            <FlatList
              data={episodes}
              keyExtractor={(i) => i.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity onPress={() => switchChapter(item.id, item.name)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ color: item.id === chapterId ? '#E85D3A' : '#fff', fontWeight: item.id === chapterId ? '700' : '400', fontSize: 14, flex: 1 }}>
                    {item.name || `第${index + 1}话`}
                  </Text>
                  {item.id === chapterId && <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(232,93,58,0.2)' }}><Text style={{ color: '#E85D3A', fontSize: 11 }}>当前</Text></View>}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  sr: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
});
