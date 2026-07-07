// 阅读器 v2 — 竖向 FlatList 虚拟化无缝滑动
// 去掉点击翻页覆盖层，纯自然滚动体验
// @author nyx

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions, StatusBar,
  Pressable, ActivityIndicator, Modal, Alert, StyleSheet, Platform,
} from 'react-native';
import { SafeImage } from '../components/SafeImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useReaderStore } from '../store/useReader';
import { useHistoryStore } from '../store/useHistory';
import { useSettingsStore } from '../store/useSettings';
import { fetchComicRead, fetchAlbumDetail } from '../api/endpoints';
import { extractFilenameWithoutExt } from '../utils/scramble';
import { useLegacyColors, LegacyColors, FontSize, Radius, Spacing } from '../theme';
// DebugOverlay moved to App.tsx
import type { Episode } from '../api/types';
import * as Brightness from 'expo-brightness';
import * as MediaLibrary from 'expo-media-library';

export function ReaderScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { albumId, chapterId, chapterTitle, initialPage } = route.params || {};
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);

  const { imageUrls, currentPage, setPage, isVertical, setVertical, startReading } = useReaderStore();
  const prefetchCount = useSettingsStore((s) => s.prefetchCount);
  const imageLayout = useSettingsStore((s) => s.imageLayout);
  const setImageLayout = useSettingsStore((s) => s.setImageLayout);
  const [showUI, setShowUI] = useState(true);
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [brightness, setBrightnessVal] = useState(1);
  const [showBrightness, setShowBrightness] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const vertRef = useRef<FlatList>(null);
  const [imageHeights, setImageHeights] = useState<Record<number, number>>({});

  const toggleUI = () => setShowUI((p) => !p);

  useEffect(() => {
    Brightness.getBrightnessAsync().then(setBrightnessVal).catch(() => {});
  }, []);

  // 加载章节列表
  useEffect(() => {
    if (albumId) {
      fetchAlbumDetail(albumId).then((d) => {
        setEpisodes(d.series || []);
      }).catch(() => {});
    }
  }, [albumId]);

  // 初始页面定位
  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setPage(initialPage);
      // 等渲染完成后 scroll
      const timer = setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: initialPage, animated: false, viewPosition: 0 });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialPage, setPage]);

  const switchChapter = async (chId: string, chName: string) => {
    setShowChapterModal(false);
    setLoading(true);
    setImageHeights({});
    try {
      const data = await fetchComicRead(chId);
      const host = data.data_original_domain || (await import('../api/endpoints')).getImgHost();
      let images: string[];
      if (data.images?.length) {
        images = data.images.map((item) => item.image);
      } else {
        const count = data.page_count || 20;
        images = [];
        for (let i = 1; i <= count; i++) {
          const fn = String(i).padStart(5, '0') + '.webp';
          images.push(`https://${host}/media/photos/${chId}/${fn}`);
        }
      }
      startReading(albumId || data.album_id, chId, chName, images, 220980);
      useHistoryStore.getState().add({
        id: albumId || data.album_id,
        title: chapterTitle || chName,
        coverUrl: '',
        chapterId: chId,
        chapterTitle: chName,
        page: 0,
        readAt: Date.now(),
      });
    } catch {}
    setLoading(false);
  };

  const goPage = (p: number) => {
    const clamped = Math.max(0, Math.min(p, imageUrls.length - 1));
    setPage(clamped);
    if (!isVertical) {
      flatRef.current?.scrollToIndex({ index: clamped, animated: true });
    }
  };

  const goPrev = () => {
    if (currentPage > 0) {
      setPage(currentPage - 1);
      if (!isVertical) {
        flatRef.current?.scrollToIndex({ index: currentPage - 1, animated: true });
      }
    }
  };

  const goNext = () => {
    if (currentPage < totalPages - 1) {
      setPage(currentPage + 1);
      if (!isVertical) {
        flatRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
      }
    }
  };

  const handleSaveImage = async () => {
    const url = imageUrls[currentPage];
    if (!url) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('', '需要相册权限才能保存');
        return;
      }
      const response = await fetch(url);
      const blob = await response.blob();
      const uri = URL.createObjectURL(blob);
      await MediaLibrary.saveToLibraryAsync(uri);
      URL.revokeObjectURL(uri);
      Alert.alert('', '已保存到相册');
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    }
  };

  const handleBrightness = async (val: number) => {
    setBrightnessVal(val);
    try { await Brightness.setBrightnessAsync(val); } catch {}
  };

  const handleDimension = useCallback((index: number, w: number, h: number) => {
    if (w > 0 && h > 0) {
      setImageHeights((prev) => ({ ...prev, [index]: (W * h) / w }));
    }
  }, [W]);

  const totalPages = imageUrls.length;

  const currentEpIdx = episodes.findIndex((ep) => ep.id === (useReaderStore.getState().chapterId || chapterId));

  // 竖向模式 — 追加上一章/下一章
  const hasPrevChapter = currentEpIdx > 0;
  const hasNextChapter = currentEpIdx < episodes.length - 1;

  // 竖向 FlatList 可见项变化追踪当前页 + 保存阅读进度
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems?.length) {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number') {
        setPage(first.index);
        // 保存阅读进度
        const s = useReaderStore.getState();
        useHistoryStore.getState().add({
          id: albumId || s.albumId || '',
          title: chapterTitle || '',
          coverUrl: '',
          chapterId: s.chapterId || chapterId,
          chapterTitle: s.chapterTitle || chapterTitle,
          page: first.index,
          readAt: Date.now(),
        });
      }
    }
  }, [setPage, albumId, chapterId, chapterTitle]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 30 }), []);

  const renderVerticalItem = useCallback(({ item, index }: { item: string; index: number }) => {
    const picName = extractFilenameWithoutExt(item);
    const store = useReaderStore.getState();
    const h = imageHeights[index];
    return (
      <View key={index} style={{ width: W, height: h || W * 1.4 }}>
        <Pressable style={{ flex: 1 }} onPress={toggleUI}>
          <SafeImage
            imageUrl={item}
            epsId={store.chapterId || chapterId}
            pictureName={picName}
            containerWidth={W}
            onDimension={(w, imgH) => handleDimension(index, w, imgH)}
          />
        </Pressable>
      </View>
    );
  }, [W, chapterId, imageHeights, handleDimension, toggleUI]);

  const renderHorizontalItem = useCallback(({ item, index }: { item: string; index: number }) => {
    const picName = extractFilenameWithoutExt(item);
    const store = useReaderStore.getState();
    return (
      <TouchableOpacity activeOpacity={1} onPress={toggleUI} style={{ width: W, height: H }}>
        <SafeImage
          imageUrl={item}
          epsId={store.chapterId || chapterId}
          pictureName={picName}
          containerWidth={W}
        />
      </TouchableOpacity>
    );
  }, [W, H, chapterId, handleDimension, toggleUI]);

  // 底部"下一章"按钮（竖向模式底部）
  const listFooter = useMemo(() => {
    if (!isVertical) return null;
    return (
      <View style={styles.footer}>
        {hasPrevChapter && (
          <TouchableOpacity
            onPress={() => {
              const prev = episodes[currentEpIdx - 1];
              if (prev) switchChapter(prev.id, prev.name);
            }}
            style={styles.chapterBtn}
          >
            <MaterialIcons name="skip-previous" size={20} color={C.textPrimary} />
            <Text style={styles.chapterBtnText}>上一章</Text>
          </TouchableOpacity>
        )}
        {hasNextChapter && (
          <TouchableOpacity
            onPress={() => {
              const next = episodes[currentEpIdx + 1];
              if (next) switchChapter(next.id, next.name);
            }}
            style={styles.chapterBtn}
          >
            <Text style={styles.chapterBtnText}>下一章</Text>
            <MaterialIcons name="skip-next" size={20} color={C.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isVertical, hasPrevChapter, hasNextChapter, episodes, currentEpIdx]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden={!showUI} />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      {/* 竖向模式 — FlatList 虚拟化自然滑动 */}
      {isVertical ? (
        <FlatList
          key={'v' + (useReaderStore.getState().chapterId || chapterId)}
          ref={vertRef}
          data={imageUrls}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderVerticalItem}
          windowSize={prefetchCount}
          maxToRenderPerBatch={prefetchCount}
          initialNumToRender={prefetchCount}
          removeClippedSubviews={Platform.OS === 'android'}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <View style={{ width: W, height: H, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          }
        />
      ) : (
        <FlatList
          ref={flatRef}
          key={'h' + (useReaderStore.getState().chapterId || chapterId)}
          data={imageUrls}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={0}
          getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / W);
            setPage(page);
          }}
          renderItem={renderHorizontalItem}
        />
      )}

      {/* 竖向模式去掉点击翻页覆盖层，纯自然滑动 */}
      {/* 横屏保留点击翻页 */}
      {!isVertical && (
        <View style={styles.tapZones} pointerEvents="box-none">
          <Pressable style={{ flex: 3 }} onPress={goPrev} />
          <View style={{ flex: 4 }} />
          <Pressable style={{ flex: 3 }} onPress={goNext} />
        </View>
      )}

      {/* 顶部栏 */}
      {showUI && (
        <View style={styles.topBar}>
          <SafeAreaView edges={['top']} style={styles.topBarInner}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.topText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowChapterModal(true)} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
            <Text style={[styles.topText, { fontSize: 13 }]} numberOfLines={1}>
              {chapterTitle || `第${currentEpIdx + 1}话`}
            </Text>
            <Text style={{ color: '#aaa', fontSize: 11 }}>
              {currentPage + 1}/{totalPages}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* 切换源 */}
            <TouchableOpacity onPress={() => Alert.alert('切换源', '未找到其他源的同名漫画', [{ text: '确定' }])}>
              <MaterialIcons name="swap-horiz" size={22} color="#fff" />
            </TouchableOpacity>
            {/* 下载 */}
            <TouchableOpacity onPress={() => {
              if (!albumId || !chapterTitle) { Alert.alert('', '无法下载'); return; }
              Alert.alert('下载', '选择下载方式', [
                { text: '取消', style: 'cancel' },
                { text: '当前话', onPress: async () => {
                  try {
                    const pages = await fetchComicRead(albumId, chapterId || '');
                    await downloadManager.addDownload({
                      comicId: albumId,
                      title: chapterTitle || `第${currentEpIdx + 1}话`,
                      coverUrl: '',
                      chapterCount: 1,
                      downloadFn: async (onProgress) => {
                        const urls = (Array.isArray(pages) ? pages : (pages as any)?.images || (pages as any)?.pages || []).map((p: any) => typeof p === 'string' ? p : p.url || p.image || '').filter(Boolean);
                        for (let i = 0; i < urls.length; i++) {
                          const local = FileSystem.documentDirectory + 'downloads/' + albumId + '/' + i + '.jpg';
                          await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'downloads/' + albumId, { intermediates: true }).catch(() => {});
                          await FileSystem.downloadAsync(urls[i], local);
                          onProgress(i + 1, urls.length);
                        }
                      },
                    });
                    Alert.alert('', '已添加下载任务');
                  } catch { Alert.alert('', '下载失败'); }
                }},
                { text: '全部话', style: 'destructive', onPress: async () => {
                  try {
                    const detail = await fetchAlbumDetail(albumId);
                    const chs = detail?.series || [];
                    await downloadManager.addDownload({
                      comicId: albumId,
                      title: chapterTitle || '全部章节',
                      coverUrl: '',
                      chapterCount: chs.length,
                      downloadFn: async (onProgress) => {
                        for (let ci = 0; ci < chs.length; ci++) {
                          try {
                            const pages = await fetchComicRead(albumId, chs[ci].id);
                            const urls = (Array.isArray(pages) ? pages : (pages as any)?.images || (pages as any)?.pages || []).map((p: any) => typeof p === 'string' ? p : p.url || p.image || '').filter(Boolean);
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
                    Alert.alert('', '已添加全部下载任务');
                  } catch { Alert.alert('', '下载失败'); }
                }},
              ]);
            }}>
              <MaterialIcons name="download" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveImage}>
              <MaterialIcons name="save-alt" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBrightness(!showBrightness)}>
              <MaterialIcons name={showBrightness ? 'brightness-high' : 'brightness-low'} size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVertical(!isVertical)}>
              <MaterialIcons name={isVertical ? 'view-carousel' : 'view-stream'} size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        </View>
      )}

      {/* 底部栏 */}
      {showUI && (
        <View style={styles.bottomBar}>
          <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: 0 }}>
          {/* 上/下一章 按钮 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <TouchableOpacity
              onPress={() => {
                const prev = episodes[currentEpIdx - 1];
                if (prev) switchChapter(prev.id, prev.name);
              }}
              disabled={currentEpIdx <= 0}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <MaterialIcons name="skip-previous" size={20} color={currentEpIdx > 0 ? '#fff' : '#555'} />
              <Text style={{ color: currentEpIdx > 0 ? '#fff' : '#555', fontSize: 12 }}>上一章</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowChapterModal(true)} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {chapterTitle || `第${currentEpIdx + 1}话`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const next = episodes[currentEpIdx + 1];
                if (next) switchChapter(next.id, next.name);
              }}
              disabled={currentEpIdx >= episodes.length - 1}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text style={{ color: currentEpIdx < episodes.length - 1 ? '#fff' : '#555', fontSize: 12 }}>下一章</Text>
              <MaterialIcons name="skip-next" size={20} color={currentEpIdx < episodes.length - 1 ? '#fff' : '#555'} />
            </TouchableOpacity>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.progressLabel}>1</Text>
            <View
              style={styles.sliderTrack}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const x = e.nativeEvent.locationX;
                const trackW = W - 120;
                const ratio = Math.max(0, Math.min(1, x / trackW));
                goPage(Math.round(ratio * (totalPages - 1)));
              }}
              onResponderMove={(e) => {
                const x = e.nativeEvent.locationX;
                const trackW = W - 120;
                const ratio = Math.max(0, Math.min(1, x / trackW));
                goPage(Math.round(ratio * (totalPages - 1)));
              }}
            >
              <View style={[styles.sliderFill, { width: `${((currentPage + 1) / Math.max(1, totalPages)) * 100}%` }]} />
              <View style={[styles.sliderThumb, { left: `${((currentPage + 1) / Math.max(1, totalPages)) * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{totalPages}</Text>
          </View>

          {showBrightness && (
            <View style={styles.sliderContainer}>
              <MaterialIcons name="brightness-low" size={16} color="#aaa" />
              <View
                style={styles.sliderTrack}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                  const x = e.nativeEvent.locationX;
                  const trackW = W - 80;
                  handleBrightness(Math.max(0, Math.min(1, x / trackW)));
                }}
                onResponderMove={(e) => {
                  const x = e.nativeEvent.locationX;
                  const trackW = W - 80;
                  handleBrightness(Math.max(0, Math.min(1, x / trackW)));
                }}
              >
                <View style={[styles.sliderFill, { width: `${brightness * 100}%` }]} />
                <View style={[styles.sliderThumb, { left: `${brightness * 100}%` }]} />
              </View>
              <MaterialIcons name="brightness-high" size={16} color="#aaa" />
            </View>
          )}

            {/* 布局模式 + 亮度 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  const modes: ('contain' | 'fitWidth' | 'fitHeight')[] = ['contain', 'fitWidth', 'fitHeight'];
                  const idx = modes.indexOf(imageLayout);
                  setImageLayout(modes[(idx + 1) % modes.length]);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <MaterialIcons name="photo-size-select-large" size={16} color={C.primary} />
                <Text style={{ color: C.primary, fontSize: 11 }}>{imageLayout === 'contain' ? '适配' : imageLayout === 'fitWidth' ? '宽屏' : '高屏'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowBrightness(!showBrightness)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name={showBrightness ? 'brightness-high' : 'brightness-low'} size={16} color="#aaa" />
                <Text style={{ color: '#aaa', fontSize: 11 }}>亮度</Text>
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </View>
      )}

      {/* 章节选择弹窗 */}
      <Modal visible={showChapterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('reader.chapter')}</Text>
              <TouchableOpacity onPress={() => setShowChapterModal(false)}>
                <MaterialIcons name="close" size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={episodes}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (item.id !== chapterId) switchChapter(item.id, item.name);
                    else setShowChapterModal(false);
                  }}
                  style={[styles.chapterItem, item.id === chapterId && styles.chapterItemActive]}
                >
                  <Text style={[styles.chapterItemText, item.id === chapterId && styles.chapterItemTextActive]}>
                    {item.name}
                  </Text>
                  {item.id === chapterId && <MaterialIcons name="check" size={18} color={C.primary} />}
                </TouchableOpacity>
              )}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    loadingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 200, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    tapZones: {
      position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
      flexDirection: 'row',
    },
    topBar: {
      position: 'absolute', top: 0, left: 8, right: 8, zIndex: 100,
      borderRadius: 14, overflow: 'hidden',
      backgroundColor: 'rgba(20,20,30,0.85)',
    },
    topBarInner: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 4, paddingVertical: 2, height: 48,
    },
    topText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 8, right: 8, zIndex: 100,
      borderRadius: 14, overflow: 'hidden',
      backgroundColor: 'rgba(20,20,30,0.85)',
      paddingHorizontal: 4, paddingBottom: 4, paddingTop: 4,
    },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
    progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', width: 36, textAlign: 'center', fontVariant: ['tabular-nums'] },
    sliderTrack: { flex: 1, height: 4, justifyContent: 'center', position: 'relative', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
    sliderFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
    sliderThumb: {
      position: 'absolute', width: 14, height: 14, borderRadius: 7,
      backgroundColor: C.primary, borderWidth: 2, borderColor: '#fff',
      marginLeft: -7, top: -5,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: C.surface, borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl, maxHeight: '70%', paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    modalTitle: { fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary },
    chapterItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: Spacing.md,
      borderBottomWidth: 0.5, borderBottomColor: C.divider,
    },
    chapterItemActive: { backgroundColor: C.primary + '15' },
    chapterItemText: { fontSize: FontSize.body, color: C.textSecondary },
    chapterItemTextActive: { color: C.primary, fontWeight: '600' },
    footer: {
      paddingVertical: 24,
      paddingHorizontal: Spacing.marginEdge,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
    },
    chapterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.surface,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: Radius.button,
      borderWidth: 1,
      borderColor: C.border,
    },
    chapterBtnText: { color: C.textPrimary, fontSize: FontSize.body, fontWeight: '600' },
  });
}
