// 阅读器 v3 — PicaComic 风格 UI
// @author Jason

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions, StatusBar,
  Pressable, ActivityIndicator, Modal, Alert, StyleSheet, Platform, Animated,
  Dimensions,
} from 'react-native';
import { SafeImage } from '../components/SafeImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useReaderStore } from '../store/useReader';
import { useHistoryStore } from '../store/useHistory';
import { useSettingsStore } from '../store/useSettings';
import { fetchComicRead, fetchAlbumDetail, searchComics } from '../api/endpoints';
import { extractFilenameWithoutExt } from '../utils/scramble';
import { useLegacyColors, FontSize } from '../theme';
import { SimpleErrorBoundary as ErrorBoundary } from '../components/SimpleErrorBoundary';
import * as Brightness from 'expo-brightness';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { downloadManager } from '../utils/DownloadManager';
import type { Episode } from '../api/types';

const { width: W } = Dimensions.get('window');
const TOOLBAR_ANIM_DURATION = 150;
const TAP_ZONE_RATIO = 0.2; // 边缘 20% 为翻页区

export function ReaderScreen() {
  const { height: H } = useWindowDimensions();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { albumId, chapterId, chapterTitle, initialPage } = route.params || {};
  const C = useLegacyColors();

  const { imageUrls, currentPage, setPage, isVertical, setVertical, startReading } = useReaderStore();
  const prefetchCount = useSettingsStore((s) => s.prefetchCount);
  const imageLayout = useSettingsStore((s) => s.imageLayout);
  const setImageLayout = useSettingsStore((s) => s.setImageLayout);
  const downloadToGallery = useSettingsStore((s) => s.downloadToGallery);
  const readingMode = useSettingsStore((s) => s.readingMode);
  const setReadingMode = useSettingsStore((s) => s.setReadingMode);

  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [brightness, setBrightnessVal] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const vertRef = useRef<FlatList>(null);
  const [imageHeights, setImageHeights] = useState<Record<number, number>>({});

  // 工具栏动画
  const topAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const [showUI, setShowUI] = useState(true);

  const toggleUI = useCallback(() => {
    const to = showUI ? 0 : 1;
    Animated.parallel([
      Animated.timing(topAnim, { toValue: to, duration: TOOLBAR_ANIM_DURATION, useNativeDriver: true }),
      Animated.timing(bottomAnim, { toValue: to, duration: TOOLBAR_ANIM_DURATION, useNativeDriver: true }),
    ]).start();
    setShowUI(!showUI);
  }, [showUI, topAnim, bottomAnim]);

  useEffect(() => {
    // 同步设置到阅读器
    setVertical(readingMode === 'scroll');
  }, []);

  useEffect(() => {
    Brightness.getBrightnessAsync().then(setBrightnessVal).catch(() => {});
    topAnim.setValue(1);
    bottomAnim.setValue(1);
  }, []);

  // 加载章节列表
  useEffect(() => {
    if (albumId) {
      fetchAlbumDetail(albumId).then((d) => setEpisodes(d.series || [])).catch(() => {});
    }
  }, [albumId]);

  // 初始页面定位
  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setPage(initialPage);
      setTimeout(() => flatRef.current?.scrollToIndex({ index: initialPage, animated: false, viewPosition: 0 }), 300);
    }
  }, [initialPage, setPage]);

  const switchChapter = async (chId: string, chName: string) => {
    setShowChapterModal(false);
    setLoading(true);
    setImageHeights({});
    try {
      const pages = await fetchComicRead(albumId, chId);
      const urls = (Array.isArray(pages) ? pages : (pages as any)?.images || (pages as any)?.pages || []).map((p: any) => typeof p === 'string' ? p : p.url || p.image || '').filter(Boolean);
      startReading(urls, 0);
      setPage(0);
      if (albumId) useHistoryStore.getState().add({ id: albumId, title: chName || '', coverUrl: '', episode: chId, progress: 0 });
    } catch {}
    setLoading(false);
  };

  // 下载
  const handleDownload = (all: boolean) => {
    if (!albumId) return;
    Alert.alert('下载', all ? '下载全部章节？' : '下载当前章节？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: async () => {
        try {
          const chs = all ? episodes : [{ id: chapterId || '', title: chapterTitle || `第${1}话` }];
          await downloadManager.addDownload({
            comicId: albumId,
            title: chapterTitle || '漫画',
            coverUrl: '',
            chapterCount: chs.length,
            downloadFn: async (onProgress) => {
              for (let ci = 0; ci < chs.length; ci++) {
                try {
                  const pages = await fetchComicRead(albumId, chs[ci].id);
                  const urls = (Array.isArray(pages) ? pages : (pages as any)?.images || []).map((p: any) => typeof p === 'string' ? p : p.url || '').filter(Boolean);
                  for (let i = 0; i < urls.length; i++) {
                    const local = FileSystem.documentDirectory + 'downloads/' + albumId + '/' + ci + '_' + i + '.jpg';
                    await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'downloads/' + albumId, { intermediates: true }).catch(() => {});
                    await FileSystem.downloadAsync(urls[i], local);
                  }
                } catch {}
                onProgress(ci + 1, chs.length);
              }
            },
          });
          Alert.alert('', '下载任务已添加');
        } catch { Alert.alert('', '下载失败'); }
      }},
    ]);
  };

  // 保存当前图片
  const handleSaveImage = async () => {
    if (!imageUrls[currentPage]) return;
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('需要权限', '请允许访问相册'); return; }
      const local = FileSystem.cacheDirectory + 'tmp_save.jpg';
      await FileSystem.downloadAsync(imageUrls[currentPage], local);
      if (downloadToGallery) {
        await MediaLibrary.saveToLibraryAsync(local);
        Alert.alert('', '已保存到相册');
      } else {
        Alert.alert('', '已保存到应用文件夹');
      }
    } catch {}
  };

  // 切换源
  const handleSwitchSource = async () => {
    if (!albumId) return;
    try {
      const res = await searchComics({ search_query: chapterTitle || albumId, page: 1 });
      const list = (res as any)?.list || [];
      if (list.length > 0) {
        nav.replace('Reader', { albumId: list[0].id, chapterTitle: list[0].name });
      } else {
        Alert.alert('切换源', '未找到其他源的匹配漫画');
      }
    } catch { Alert.alert('', '搜索失败'); }
  };

  // 翻页
  const goNext = useCallback(() => {
    if (currentPage < imageUrls.length - 1) setPage(currentPage + 1);
  }, [currentPage, imageUrls.length, setPage]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) setPage(currentPage - 1);
  }, [currentPage, setPage]);

  // 点击处理
  const handleTap = useCallback((evt: any) => {
    const x = evt.nativeEvent.locationX;
    const leftZone = W * TAP_ZONE_RATIO;
    const rightZone = W * (1 - TAP_ZONE_RATIO);
    if (x < leftZone) goPrev();
    else if (x > rightZone) goNext();
    else toggleUI();
  }, [goPrev, goNext, toggleUI]);

  // 渲染当前页
  const totalPages = imageUrls.length;
  const currentEpIdx = episodes.findIndex((e) => e.id === chapterId);

  return (
    <ErrorBoundary title="阅读器">
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden={!showUI} />

      {/* 漫画图片 */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#E85D3A" />
        </View>
      ) : imageUrls.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: '#000' }} />
      ) : (
        <Pressable style={{ flex: 1 }} onPress={handleTap}>
          {isVertical ? (
            <FlatList
              ref={vertRef}
              data={imageUrls}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <View style={{ width: W }}>
                  <SafeImage
                    uri={item}
                    style={{ width: W, height: imageHeights[index] || W * 1.4 }}
                    onLoad={(e) => {
                      const h = (e.nativeEvent?.source?.height || e.height || 1);
                      const w = (e.nativeEvent?.source?.width || e.width || 1);
                      const ratio = Math.min(h / w, 3);
                      setImageHeights((prev) => ({ ...prev, [index]: W * ratio }));
                    }}
                  />
                </View>
              )}
              pagingEnabled
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              ref={flatRef}
              horizontal
              pagingEnabled
              data={imageUrls}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={{ width: W, alignItems: 'center', justifyContent: 'center' }}>
                  <SafeImage uri={item} style={{ width: W, height: H }} contentFit="contain" />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={currentPage}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / W);
                if (idx !== currentPage) setPage(idx);
              }}
              getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
            />
          )}
        </Pressable>
      )}

      {/* 顶部栏 */}
      <Animated.View style={[styles.topBar, { transform: [{ translateY: topAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }] }]}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 }}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowChapterModal(true)} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
              {chapterTitle || `第${currentEpIdx + 1}话`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
            <MaterialIcons name="settings" size={22} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* 底部栏 */}
      <Animated.View style={[styles.bottomBar, { transform: [{ translateY: bottomAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) }] }]}>
        <SafeAreaView edges={['bottom']}>
          {/* 进度条 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
            <TouchableOpacity onPress={() => setPage(0)}><MaterialIcons name="first-page" size={22} color="#fff" /></TouchableOpacity>
            <View style={{ flex: 1, height: 30, justifyContent: 'center' }}>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, position: 'relative' }}>
                <View style={{ width: `${totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0}%`, height: 4, backgroundColor: '#E85D3A', borderRadius: 2 }} />
              </View>
              {/* Slider thumb */}
              <View style={{ position: 'absolute', left: `${totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0}%`, marginLeft: -8, top: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#E85D3A' }} />
            </View>
            <TouchableOpacity onPress={() => setPage(totalPages - 1)}><MaterialIcons name="last-page" size={22} color="#fff" /></TouchableOpacity>
          </View>
          {/* 操作行 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>P{currentPage + 1}/{totalPages}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={handleSaveImage}><MaterialIcons name="save-alt" size={22} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowChapterModal(true)}><MaterialIcons name="format-list-numbered" size={22} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={() => handleDownload(false)}><MaterialIcons name="download" size={22} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const next = !isVertical;
                setVertical(next);
                setReadingMode(next ? 'scroll' : 'page');
              }}>
                <MaterialIcons name={isVertical ? 'view-carousel' : 'view-stream'} size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSwitchSource}><MaterialIcons name="swap-horiz" size={22} color="#fff" /></TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* 设置弹窗 */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowSettings(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 }}>
            <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>阅读设置</Text>
            <TouchableOpacity style={styles.settingRow} onPress={() => { setImageLayout(imageLayout === 'contain' ? 'fitWidth' : imageLayout === 'fitWidth' ? 'fitHeight' : 'contain'); }}>
              <MaterialIcons name="fit-screen" size={20} color={C.textPrimary} />
              <Text style={{ color: C.textPrimary, flex: 1, marginLeft: 12 }}>图片缩放</Text>
              <Text style={{ color: C.textSecondary }}>{imageLayout === 'contain' ? '适应' : imageLayout === 'fitWidth' ? '适配宽度' : '适配高度'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              const next = !isVertical;
              setVertical(next);
              setReadingMode(next ? 'scroll' : 'page');
            }}>
              <MaterialIcons name="swap-vert" size={20} color={C.textPrimary} />
              <Text style={{ color: C.textPrimary, flex: 1, marginLeft: 12 }}>滚动模式</Text>
              <Text style={{ color: C.textSecondary }}>{isVertical ? '竖滑' : '分页'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={() => { const b = brightness > 0.5 ? 0.3 : 1; Brightness.setBrightnessAsync(b); setBrightnessVal(b); }}>
              <MaterialIcons name={brightness > 0.5 ? 'brightness-high' : 'brightness-low'} size={20} color={C.textPrimary} />
              <Text style={{ color: C.textPrimary, flex: 1, marginLeft: 12 }}>亮度</Text>
              <Text style={{ color: C.textSecondary }}>{Math.round(brightness * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={() => handleDownload(true)}>
              <MaterialIcons name="download" size={20} color={C.textPrimary} />
              <Text style={{ color: C.textPrimary, flex: 1, marginLeft: 12 }}>下载全部章节</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 章节选择弹窗 */}
      <Modal visible={showChapterModal} transparent animationType="slide" onRequestClose={() => setShowChapterModal(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowChapterModal(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 400 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.divider }}>
              <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: '700' }}>章节</Text>
              <TouchableOpacity onPress={() => setShowChapterModal(false)}><MaterialIcons name="close" size={22} color={C.textPrimary} /></TouchableOpacity>
            </View>
            <FlatList
              data={episodes}
              keyExtractor={(i) => i.id}
              style={{ maxHeight: 350 }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => switchChapter(item.id, item.title)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider }}
                >
                  <Text style={{ color: item.id === chapterId ? C.primary : C.textPrimary, fontWeight: item.id === chapterId ? '700' : '400', fontSize: 14 }}>
                    {item.title || `第${index + 1}话`}
                  </Text>
                  {item.id === chapterId && <View style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: C.primary + '20' }}><Text style={{ color: C.primary, fontSize: 11 }}>当前</Text></View>}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
    </View>
    </ErrorBoundary>
  );

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 4,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
});
