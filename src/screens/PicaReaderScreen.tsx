// Pica 阅读器 v5 — 全功能（亮度/章节弹窗/布局切换/保存）
// @author Jason

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, ActivityIndicator, Dimensions,
  FlatList, Text, Pressable, Platform, Animated, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import * as MediaLibrary from 'expo-media-library';
import { Colors, FontSize } from '../theme';
import { picaSource } from '../sources/pica';
import type { SourceImage, SourceChapter } from '../sources/types';

const { width: W, height: H } = Dimensions.get('window');
const BAR_HEIGHT = 48;

export function PicaReaderScreen() {
  const nav = useNavigation<any>();
  const { comicId, chapterOrder, chapterId, title } = useRoute<any>().params || {};

  const [images, setImages] = useState<SourceImage[]>([]);
  const [chapters, setChapters] = useState<SourceChapter[]>([]);
  const [currentChIdx, setCurrentChIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUI, setShowUI] = useState(false);
  const [imgLayout, setImgLayout] = useState<'contain' | 'fitWidth' | 'fitHeight'>('fitWidth');
  const [imgHeights, setImgHeights] = useState<Record<number, number>>({});
  const [brightness, setBrightnessVal] = useState(1);
  const [showBrightness, setShowBrightness] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const uiOpacity = useRef(new Animated.Value(0)).current;

  const toggleUI = useCallback(() => {
    const toValue = showUI ? 0 : 1;
    Animated.timing(uiOpacity, { toValue, duration: 200, useNativeDriver: true }).start();
    setShowUI(!showUI);
  }, [showUI, uiOpacity]);

  useEffect(() => {
    Brightness.getBrightnessAsync().then(setBrightnessVal).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const chs = await picaSource.fetchChapters(comicId);
        if (cancelled) return;
        setChapters(chs);
        const idx = chs.findIndex((c) => c.id === chapterId || c.order === chapterOrder);
        setCurrentChIdx(idx >= 0 ? idx : 0);
      } catch {}
    })();
    picaSource.fetchImages(comicId, chapterOrder ?? 1)
      .then((imgs) => { if (!cancelled) setImages(imgs); })
      .catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [comicId, chapterOrder, chapterId]);

  const goChapter = useCallback((order: number) => {
    setShowChapterModal(false);
    setLoading(true); setImages([]); setImgHeights({}); setCurrentIndex(0);
    picaSource.fetchImages(comicId, order).then(setImages).catch(() => {}).finally(() => setLoading(false));
  }, [comicId]);

  const goPrev = useCallback(() => {
    const prev = chapters[currentChIdx - 1];
    if (prev) { setCurrentChIdx(currentChIdx - 1); goChapter(prev.order); }
  }, [chapters, currentChIdx, goChapter]);

  const goNext = useCallback(() => {
    const next = chapters[currentChIdx + 1];
    if (next) { setCurrentChIdx(currentChIdx + 1); goChapter(next.order); }
  }, [chapters, currentChIdx, goChapter]);

  const handleSaveImage = useCallback(async () => {
    if (images.length === 0) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') { Alert.alert('需要权限', '请在设置中允许保存图片'); return; }
    try {
      await MediaLibrary.saveToLibraryAsync(images[currentIndex]?.url || images[0]?.url || '');
      Alert.alert('', '已保存');
    } catch { Alert.alert('', '保存失败'); }
  }, [images, currentIndex]);

  const handleLoad = useCallback((index: number, w: number, h: number) => {
    if (w > 0 && h > 0) {
      setImgHeights((prev) => {
        const nh = (W * h) / w;
        if (prev[index] === nh) return prev;
        return { ...prev, [index]: nh };
      });
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;

  const totalPages = images.length;
  const pageStr = totalPages > 0 ? `${currentIndex + 1} / ${totalPages}` : '';
  const hasPrev = currentChIdx > 0;
  const hasNext = currentChIdx < chapters.length - 1;
  const chTitle = chapters[currentChIdx]?.title || title || '';
  const progress = totalPages > 0 ? ((currentIndex + 1) / totalPages) * 100 : 0;

  if (loading) {
    return <SafeAreaView edges={["top"]} style={styles.cont}><ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  return (
    <View style={styles.cont}>
      <StatusBar style="light" />

      <FlatList
        ref={flatRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => {
          const imgH = imgHeights[index];
          return (
            <Pressable onPress={toggleUI}>
              <View style={{ width: W, height: imgH || W * 1.4, backgroundColor: '#000' }}>
                <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }}
                  contentFit={imgLayout === 'fitWidth' ? 'contain' : imgLayout === 'fitHeight' ? 'cover' : 'contain'}
                  cachePolicy="memory-disk" placeholder={null}
                  onLoad={(e) => { const { width: nw, height: nh } = e.source; if (nw && nh) handleLoad(index, nw, nh); }} />
              </View>
            </Pressable>
          );
        }}
        horizontal={false} showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={5} initialNumToRender={3} maxToRenderPerBatch={5} />

      {/* 底栏 */}
      <Animated.View style={[styles.bar, styles.bottomBar, { opacity: uiOpacity }]}>
        <Pressable onPress={goPrev} disabled={!hasPrev} style={[styles.iconBtn, { opacity: hasPrev ? 1 : 0.25 }]}>
          <MaterialIcons name="skip-previous" size={24} color="#fff" />
        </Pressable>
        <View style={styles.sliderWrap}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${Math.min(100, progress)}%` }]} />
            <View style={[styles.sliderThumb, { left: `${Math.min(96, progress)}%` }]} />
          </View>
          <Text style={styles.sliderLabel}>{pageStr}</Text>
        </View>
        <Pressable onPress={goNext} disabled={!hasNext} style={[styles.iconBtn, { opacity: hasNext ? 1 : 0.25 }]}>
          <MaterialIcons name="skip-next" size={24} color="#fff" />
        </Pressable>
      </Animated.View>

      {/* 顶栏 */}
      <Animated.View style={[styles.bar, styles.topBar, { opacity: uiOpacity }]}>
        <SafeAreaView edges={["top"]} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setShowChapterModal(true)} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <Text style={styles.titleText} numberOfLines={1}>{chTitle}</Text>
          </Pressable>
          {/* 布局切换 */}
          <Pressable onPress={() => setImgLayout(imgLayout === 'contain' ? 'fitWidth' : imgLayout === 'fitWidth' ? 'fitHeight' : 'contain')} hitSlop={8} style={styles.iconBtn}>
            <MaterialIcons name={imgLayout === 'contain' ? 'fullscreen' : imgLayout === 'fitWidth' ? 'photo-size-select-large' : 'photo-size-select-small'} size={22} color="#fff" />
          </Pressable>
          {/* 保存 */}
          <Pressable onPress={handleSaveImage} hitSlop={8} style={styles.iconBtn}>
            <MaterialIcons name="save-alt" size={22} color="#fff" />
          </Pressable>
          {/* 亮度 */}
          <Pressable onPress={() => setShowBrightness(!showBrightness)} hitSlop={8} style={styles.iconBtn}>
            <MaterialIcons name={showBrightness ? 'brightness-high' : 'brightness-low'} size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
        {/* 亮度滑块 */}
        {showBrightness && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6, gap: 8 }}>
            <MaterialIcons name="brightness-low" size={18} color="rgba(255,255,255,0.6)" />
            <View style={styles.brightTrack}>
              <View style={[styles.brightFill, { width: `${brightness * 100}%` }]} />
              <View style={[styles.brightThumb, { left: `${brightness * 96}%` }]} />
            </View>
            <MaterialIcons name="brightness-high" size={18} color="rgba(255,255,255,0.6)" />
          </View>
        )}
      </Animated.View>

      {/* 章节弹窗 */}
      <Modal visible={showChapterModal} transparent animationType="slide" onRequestClose={() => setShowChapterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#F0EDE8' }}>选择章节</Text>
              <Pressable onPress={() => setShowChapterModal(false)} hitSlop={8}>
                <MaterialIcons name="close" size={24} color="#9895A0" />
              </Pressable>
            </View>
            <FlatList
              data={chapters}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    setCurrentChIdx(index);
                    goChapter(item.order);
                  }}
                  style={[styles.chapterItem, index === currentChIdx && { backgroundColor: Colors.primary + '30' }]}>
                  <Text style={{ color: index === currentChIdx ? Colors.primary : '#F0EDE8', fontWeight: index === currentChIdx ? '700' : '500' }}>
                    {item.title}
                  </Text>
                  {index === currentChIdx && <MaterialIcons name="check" size={16} color={Colors.primary} />}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: '#000' },
  bar: { position: 'absolute', left: 8, right: 8, borderRadius: 14, backgroundColor: 'rgba(20,20,30,0.85)', overflow: 'hidden' },
  topBar: { top: Platform.OS === 'ios' ? 50 : 8, },
  bottomBar: { bottom: Platform.OS === 'ios' ? 34 : 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2, height: BAR_HEIGHT },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  titleText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  sliderWrap: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  sliderTrack: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, position: 'relative', justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  sliderThumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff', top: -4, marginLeft: -6 },
  sliderLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  // 亮度
  brightTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, position: 'relative', justifyContent: 'center' },
  brightFill: { position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  brightThumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', top: -4, marginLeft: -6 },
  // 章节弹窗
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A24', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  chapterItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
});
