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
import { fetchComicRead, fetchAlbumDetail } from '../api/endpoints';
import { extractFilename } from '../utils/scramble';
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
  const { albumId, chapterId, chapterTitle } = route.params || {};
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);

  const { imageUrls, currentPage, setPage, isVertical, setVertical, startReading } = useReaderStore();
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

  // 竖向 FlatList 可见项变化追踪当前页
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems?.length) {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number') {
        setPage(first.index);
      }
    }
  }, [setPage]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 30 }), []);

  const renderVerticalItem = useCallback(({ item, index }: { item: string; index: number }) => {
    const picName = extractFilename(item);
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
    const picName = extractFilename(item);
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
          windowSize={3}
          maxToRenderPerBatch={3}
          initialNumToRender={3}
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
        <SafeAreaView edges={['top']} style={styles.topBar}>
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
            <TouchableOpacity onPress={handleSaveImage}>
              <MaterialIcons name="save-alt" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBrightness(!showBrightness)}>
              <MaterialIcons name={showBrightness ? 'brightness-high' : 'brightness-low'} size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVertical(!isVertical)}>
              <MaterialIcons name={isVertical ? 'view-carousel' : 'view-stream'} size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const prev = episodes[currentEpIdx - 1];
                if (prev) switchChapter(prev.id, prev.name);
              }}
              disabled={currentEpIdx <= 0}
            >
              <MaterialIcons name="skip-previous" size={22} color={currentEpIdx > 0 ? '#fff' : '#555'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const next = episodes[currentEpIdx + 1];
                if (next) switchChapter(next.id, next.name);
              }}
              disabled={currentEpIdx >= episodes.length - 1}
            >
              <MaterialIcons name="skip-next" size={22} color={currentEpIdx < episodes.length - 1 ? '#fff' : '#555'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* 底部栏 */}
      {showUI && (
        <SafeAreaView edges={['top']} style={styles.bottomBar}>
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
        </SafeAreaView>
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
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    topText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
      paddingHorizontal: 14, paddingBottom: 24, paddingTop: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressLabel: { color: '#aaa', fontSize: 11, width: 30, textAlign: 'center' },
    sliderTrack: { flex: 1, height: 32, justifyContent: 'center', position: 'relative' },
    sliderFill: { height: 4, backgroundColor: C.primary, borderRadius: 2 },
    sliderThumb: {
      position: 'absolute', width: 16, height: 16, borderRadius: 8,
      backgroundColor: C.primary, marginLeft: -8, top: 8,
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
