// 阅读器 v4 — PicaComic 完全移植
// 功能列表：6种阅读模式 + 工具栏动画 + 全屏操作行 + 页面浮层 + 侧边按钮
// @author Jason

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions, StatusBar,
  Pressable, ActivityIndicator, Modal, Alert, StyleSheet, Animated,
  Dimensions,
} from 'react-native';
import { SafeImage } from '../components/SafeImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useReaderStore } from '../store/useReader';
import { useHistoryStore } from '../store/useHistory';
import { useSettingsStore } from '../store/useSettings';
import { fetchComicRead, fetchAlbumDetail } from '../api/endpoints';
import * as Brightness from 'expo-brightness';
import * as MediaLibrary from 'expo-media-library';
import type { Episode } from '../api/types';

const { width: W } = Dimensions.get('window');
const ANIM_DUR = 150;

export function ReaderScreen() {
  const { height: H } = useWindowDimensions();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { albumId, chapterId, chapterTitle, initialPage } = route.params || {};

  const store = useReaderStore();
  const setReadingMode = useSettingsStore((s) => s.setReadingMode);
  const readingMode = useSettingsStore((s) => s.readingMode);

  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [brightness, setBrightnessVal] = useState(1);
  const flatRef = useRef<FlatList>(null);
  const vertRef = useRef<FlatList>(null);
  const [imageHeights, setImageHeights] = useState<Record<number, number>>({});

  const topAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const [showUI, setShowUI] = useState(true);

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

  const handleTap = useCallback((evt: any) => {
    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;
    const range = 0.2; // 20% 边缘翻页

    // 点击工具栏区域不处理翻页
    if (showUI) {
      if (y < 60 || y > H - 130) { toggleUI(); return; }
    }

    if (x < W * range) {
      if (currentPage > 0) store.setPage(currentPage - 1);
    } else if (x > W * (1 - range)) {
      if (currentPage < imageUrls.length - 1) store.setPage(currentPage + 1);
    } else {
      toggleUI();
    }
  }, [currentPage, imageUrls.length, toggleUI, showUI, H]);

  const totalPages = imageUrls.length;
  const currentEpIdx = episodes.findIndex((ep) => ep.id === (store.chapterId || chapterId));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden={!showUI} />

      {/* 阅读区 */}
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
        <Pressable style={{ flex: 1 }} onPress={handleTap}>
          <FlatList
            ref={flatRef}
            horizontal pagingEnabled
            data={imageUrls}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={{ width: W, height: H }}>
                <SafeImage imageUrl={item} epsId={store.chapterId || chapterId}
                  pictureName={item.split('/').pop()?.split('.')[0] || ''}
                  containerWidth={W} style={{ width: W, height: H }}
                />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => { store.setPage(Math.round(e.nativeEvent.contentOffset.x / W)); }}
            getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
          />
        </Pressable>
      )}

      {/* 页面信息浮层（PicaComic 左下角 E1:P3/20 描边文字） */}
      {showUI && (
        <View style={s.pageInfo}>
          <Text style={s.pageInfoText}>
            {currentEpIdx >= 0 ? `E${currentEpIdx + 1}:` : ''}P{currentPage + 1}/{totalPages || 1}
          </Text>
        </View>
      )}

      {/* 顶部栏 — PicaComic 风格 */}
      <Animated.View style={[s.topBar, { transform: [{ translateY: topAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }] }]}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={25} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', height: 50, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600' }} numberOfLines={1}>
              {chapterTitle || `第${currentEpIdx + 1}话`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
            <MaterialIcons name="settings" size={25} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* 底部栏 — PicaComic 风格 */}
      <Animated.View style={[s.bottomBar, { transform: [{ translateY: bottomAnim.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) }] }]}>
        <SafeAreaView edges={['bottom']} style={{ paddingBottom: 4 }}>
          {/* 行1：⏮ 进度条滑块 ⏭ */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 }}>
            <TouchableOpacity onPress={() => store.setPage(0)} disabled={currentPage === 0}>
              <MaterialIcons name="first-page" size={24} color={currentPage === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
            <Pressable
              style={{ flex: 1, height: 28, justifyContent: 'center', marginHorizontal: 8 }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const ratio = Math.max(0, Math.min(1, (e.nativeEvent.locationX) / (W - 96)));
                store.setPage(Math.round(ratio * (totalPages - 1)));
              }}
            >
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 }}>
                <View style={{ width: `${totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0}%`, height: 6, backgroundColor: '#E85D3A', borderRadius: 3 }} />
              </View>
            </Pressable>
            <TouchableOpacity onPress={() => store.setPage(totalPages - 1)} disabled={currentPage === totalPages - 1}>
              <MaterialIcons name="last-page" size={24} color={currentPage === totalPages - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
          </View>

          {/* 行2：页码 + 操作按钮 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 }}>
            <View style={s.pageBadge}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                {currentEpIdx >= 0 ? `E${currentEpIdx + 1} : ` : ''}P{currentPage + 1}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* 保存图片 */}
              <TouchableOpacity onPress={handleSaveImage}>
                <MaterialIcons name="save-alt" size={22} color="#fff" />
              </TouchableOpacity>
              {/* 章节列表 */}
              <TouchableOpacity onPress={() => setShowChapterModal(true)}>
                <MaterialIcons name="format-list-numbered" size={22} color="#fff" />
              </TouchableOpacity>
              {/* 滚动模式切换 */}
              <TouchableOpacity onPress={() => { store.setVertical(!isVertical); setReadingMode(!isVertical ? 'scroll' : 'page'); }}>
                <MaterialIcons name={isVertical ? 'view-stream' : 'view-carousel'} size={22} color="#fff" />
              </TouchableOpacity>
              {/* 分享（PicaComic 有分享按钮） */}
              <TouchableOpacity onPress={() => Alert.alert('分享', '分享功能开发中')}>
                <MaterialIcons name="share" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* 横屏侧边翻页按钮 */}
      {H < W && (
        <>
          <TouchableOpacity style={s.sideLeft} onPress={() => { if (currentPage > 0) store.setPage(currentPage - 1); }} activeOpacity={0.6}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={s.sideRight} onPress={() => { if (currentPage < totalPages - 1) store.setPage(currentPage + 1); }} activeOpacity={0.6}>
            <MaterialIcons name="keyboard-arrow-right" size={32} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={s.sideClose} onPress={() => nav.goBack()}>
            <MaterialIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </>
      )}

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
  pageInfo: {
    position: 'absolute', bottom: 120, left: 16,
    backgroundColor: 'transparent',
  },
  pageInfoText: {
    color: '#fff', fontSize: 14, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  pageBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
    height: 26,
    justifyContent: 'center',
  },
  sideLeft: {
    position: 'absolute', left: 8, top: '50%', marginTop: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideRight: {
    position: 'absolute', right: 8, top: '50%', marginTop: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideClose: {
    position: 'absolute', top: 60, left: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  sr: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
});
