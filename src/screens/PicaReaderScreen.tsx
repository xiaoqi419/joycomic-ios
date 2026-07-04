// Pica 阅读器 v4 — 无缝纵向滚动 + 毛玻璃工具栏
// @author Jason

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, ActivityIndicator, Dimensions,
  FlatList, Text, Pressable, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize } from '../theme';
import { picaSource } from '../sources/pica';
import type { SourceImage, SourceChapter } from '../sources/types';

const { width: W, height: H } = Dimensions.get('window');
const BAR_HEIGHT = 48;

export function PicaReaderScreen() {
  const nav = useNavigation<any>();
  const { comicId, chapterOrder, chapterId, title } = useRoute<any>().params;

  const [images, setImages] = useState<SourceImage[]>([]);
  const [chapters, setChapters] = useState<SourceChapter[]>([]);
  const [currentChIdx, setCurrentChIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUI, setShowUI] = useState(false);
  const [imgLayout, setImgLayout] = useState<'contain' | 'fitWidth'>('fitWidth');
  const [imgHeights, setImgHeights] = useState<Record<number, number>>({});
  const flatRef = useRef<FlatList>(null);
  const uiOpacity = useRef(new Animated.Value(0)).current;

  // 控制工具栏淡入淡出
  const toggleUI = useCallback(() => {
    const toValue = showUI ? 0 : 1;
    Animated.timing(uiOpacity, {
      toValue, duration: 200, useNativeDriver: true,
    }).start();
    setShowUI(!showUI);
  }, [showUI, uiOpacity]);

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
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [comicId, chapterOrder, chapterId]);

  const goChapter = useCallback((order: number) => {
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
    return (
      <SafeAreaView edges={["top"]} style={styles.cont}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
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
                <Image
                  source={{ uri: item.url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit={imgLayout === 'fitWidth' ? 'contain' : 'cover'}
                  cachePolicy="memory-disk" placeholder={null}
                  onLoad={(e) => { const { width: nw, height: nh } = e.source; if (nw && nh) handleLoad(index, nw, nh); }}
                />
              </View>
            </Pressable>
          );
        }}
        horizontal={false} showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={5} initialNumToRender={3} maxToRenderPerBatch={5}
      />

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
          <Text style={styles.titleText} numberOfLines={1}>{chTitle}</Text>
          <Pressable onPress={() => setImgLayout(imgLayout === 'contain' ? 'fitWidth' : 'contain')} hitSlop={8} style={styles.iconBtn}>
            <MaterialIcons name={imgLayout === 'contain' ? 'fullscreen' : 'fullscreen-exit'} size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: '#000' },
  bar: { position: 'absolute', left: 8, right: 8, borderRadius: 14, backgroundColor: 'rgba(20,20,30,0.85)', overflow: 'hidden' },
  topBar: { top: Platform.OS === 'ios' ? 50 : 8, paddingHorizontal: 4, paddingVertical: 2, height: BAR_HEIGHT },
  bottomBar: { bottom: Platform.OS === 'ios' ? 34 : 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2, height: BAR_HEIGHT },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  titleText: { flex: 1, color: '#fff', fontSize: 15, textAlign: 'center', fontWeight: '600', letterSpacing: 0.3 },
  sliderWrap: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  sliderTrack: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, position: 'relative', justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  sliderThumb: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff', top: -4, marginLeft: -6 },
  sliderLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
